# Craft 跨机执行器（craft_local）

> Mac 的 Craft 派发任务 → Conductor(task.sant.ltd) 中转 → Windows 的 Craft 执行并回报。
> 上线日期：2026-08-12 | 状态：已验证（端到端全自动跑通）

## 为什么要它

Conductor 原有的本地执行器是裸的 Codex / Claude CLI（`codex_local` / `claude_local`），
不具备 Craft 的 sources、skills、本地工具生态。`craft_local` 让 **Windows 上的 Craft
本体**成为一个执行器，从而带上全套能力执行跨机下发的任务。

## 架构

```
Mac Craft ──POST /tasks (capability=craft)──▶ Conductor(task.sant.ltd)
                                                    │ router 路由到 craft_local
                                                    ▼
                                              Postgres run 队列
                                                    ▲ claim / report
                                                    │
Windows Craft「Craft Runner」自动化 ────────────────┘
   ├─ 心跳(webhook, 每1分钟)  → 保持 craft_local 在线
   └─ 执行(prompt, 每2分钟)   → claim-mcp → 全套工具执行 → report
```

关键点：Craft **没有无头 CLI**，无法像 claude/codex 那样被 Python runner 子进程拉起。
因此 `craft_local` 不由 `runner/local_runner.py` 驱动，而是由 **Craft 内的自动化循环**
充当 runner（runner 名 `yuhao-craft`），与现有 `yuhao-desktop` runner 能力不重叠、互不抢单。

## 从 Mac 派发

在 Mac 的 Craft 里，用 `@conductor` 下发（capability 固定为 `craft` 即定向到 Windows Craft）：

```
@conductor POST /tasks
{
  "title": "任务标题",
  "objective": "要做什么、边界、什么算完成",
  "capability": "craft",
  "auto_start": true,
  "created_by": "craft-mac"
}
```

任务会路由到 `craft_local`（评分最优），Windows Craft 在 ≤2 分钟内认领执行，
结果实时显示在 task.sant.ltd 看板，并按 L2 策略进入人工验收。

## Windows 端执行器 = 两条自动化

在 Windows 工作区 `automations.json` 的 `SchedulerTick` 下：

### 1) 心跳（保持在线，无 session，成本可忽略）
```json
{
  "name": "Craft Runner 心跳",
  "cron": "* * * * *",
  "timezone": "Asia/Shanghai",
  "labels": ["craft-runner"],
  "actions": [{
    "type": "webhook",
    "url": "https://task.sant.ltd/runners/heartbeat",
    "method": "POST",
    "auth": { "type": "bearer", "token": "${CRAFT_WH_CONDUCTOR_KEY}" },
    "body": { "name": "yuhao-craft", "capabilities": ["craft_local"], "version": "craft-0.1.0" }
  }]
}
```
> 用 `${CRAFT_WH_CONDUCTOR_KEY}`（shell 环境变量，重启 App 生效）保存 Conductor Bearer Key，
> 避免把密钥写进配置文件。

### 2) 执行（认领 → 全套工具执行 → 回报）
`cron: */2 * * * *`，`permissionMode: allow-all`，prompt 让 Craft：
1. `@conductor POST /runners/yuhao-craft/claim-mcp` body `{"capabilities":["craft_local"],"limit":3}`
2. 无 run 直接结束；有 run 则先 report `state=running`
3. 用全套工具执行 `run.prompt`，遵守其中权限边界
4. 完成后 report `state=succeeded` + `output`（失败则 `failed` + `error`），`lock_token` 原样回传

## 后端改动（isaint/conductor）

| 文件 | 改动 |
|------|------|
| `conductor/router.py` | 注册 `craft_local` 执行器（能力 `craft`，cost_tier=1，needs_local_fs） |
| `sql/009_craft.sql` | `ALTER TYPE executor_kind ADD VALUE 'craft_local'`（启动时自动迁移） |
| `conductor/main.py` | 新增 `POST /runners/{name}/claim-mcp` 对象体认领（Craft 自动化经 MCP 只能发对象） |
| `conductor/static/app.js` | `craft_local` / `craft` 能力中文标签 |
| `Dockerfile` | `ARG CACHEBUST` 强制重拷贝源码层 |

部署：`az acr build --registry acrgrafana4485 --image conductor:<tag> --build-arg CACHEBUST=$(date +%s) .`
→ `az containerapp update -n task-control -g ms-aoai-prod --image acrgrafana4485.azurecr.io/conductor:<tag>`

## 已验证

- #A49 连通测试：路由 craft_local → 认领 → 回报 → 看板完成 ✅
- #A50 全自动：Mac 派发「统计 sql 目录 .sql 文件」→ Craft 自动化用真实 bash 执行 →
  正确产出 9 个文件名 → 看板显示，全程 ~36 秒，无人工介入 ✅

## 局限与后续

- **MVP 只保证单 turn 可完成的任务**；长任务的分段/续跑待迭代。
- **执行自动化每 2 分钟起一个后台 session**（空跑即退，带 `craft-runner` 标签可过滤）。
  如需更省，可调大 cron 间隔（延迟换清净）。
- craft_local **不走 Conductor 模型 grant**（用 Craft 自身 LLM 连接），成本记 0。
