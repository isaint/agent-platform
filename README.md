# Agent Platform

Mac → Conductor (task.sant.ltd) → Windows 执行 → GitHub 归档

## 实际架构

```
Mac (浏览器)
  └── task.sant.ltd (Conductor v0.13.1)
       ├── 看板 UI + 一句话下发
       ├── 审批中心
       ├── 策略治理
       ├── SSE 实时事件流
       └── 记忆系统
            │
            ▼
       Windows Runner (yuhao-desktop)
       ├── workiq_local  → M365 邮件/日历/Teams
       ├── claude_local  → 分析/代码/Vault
       ├── codex_local   → 代码/脚本/本地文件
       ├── copilot_cloud → GitHub PR/重构/测试
       └── litellm_worker → ai.sant.ltd 100+模型
            │
            ▼
       GitHub (isaint/agent-platform)
       └── 代码/specs/ADR 归档
```

## Craft Agent 对接

Craft Agent 同时对接所有通道：

| Source | 用途 |
|--------|------|
| conductor (task.sant.ltd) | 下发/管理/审计任务 |
| workiq (M365 Copilot) | 直查公司资料 |
| litellm (ai.sant.ltd) | 直调 100+ 模型 |
| github | 代码仓库读写 |

## 已验证的 7 个能力

| 能力 | 实现 |
|------|------|
| Memory | Conductor /memories API |
| Scheduling | Conductor reconciler (30s 轮询) |
| Event Trigger | Conductor /stream SSE + chains |
| Agent Team | 6 执行器 (workiq/claude/codex/copilot/litellm) |
| Audit | Conductor /stats + /usage + transcript |
| Governance | Conductor /policies + /approvals + /permissions |
| Long Running | Conductor chains + pause/resume/retry |

## 快速下发

```bash
# 通过 Craft Agent
mcp__conductor__api_conductor POST /quick {"text":"总结今天邮件","auto_start":true}

# 通过 curl
curl -X POST https://task.sant.ltd/quick \
  -H "Authorization: Bearer sk-cond-xxx" \
  -H "Content-Type: application/json" \
  -d '{"text":"总结今天邮件","auto_start":true}'
```

## 统计

- 已完成: 26 任务
- 失败: 4
- 总花费: $0.09
- Runner: yuhao-desktop (在线)
