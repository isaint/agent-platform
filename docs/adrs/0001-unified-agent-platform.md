# ADR-0001: 统一 Agent 平台架构

## 状态
Accepted (2026-08-11 全部验证通过)

## 决策

### Conductor (task.sant.ltd) = 已有的控制面板
不需要另建 task-app。task.sant.ltd 已运行 Conductor v0.13.1，具备：
- 任务 CRUD + 一句话下发 (/quick)
- 链式多步骤任务 (/chains)
- 审批中心 (/approvals)
- 策略治理 (/policies)
- 记忆系统 (/memories)
- SSE 实时事件 (/stream)
- 执行器管理 (/runners)
- 费用追踪 (/usage)

### Craft Agent = Conductor 的对接入口
Craft 同时连接 4 个 source：
- conductor → 下发/管理任务
- workiq → 直查 M365 公司资料
- litellm → 直调 100+ 模型
- github → 代码仓库

### 执行器 = 已注册的 6 个
- workiq_local: M365 (邮件/日历/Teams/OneDrive)
- claude_local: 分析/代码/本地文件/Vault
- codex_local: 代码/脚本/本地文件
- copilot_cloud: GitHub PR/重构/测试
- litellm_worker: 研究/分类/总结 (ai.sant.ltd)
- codex_cloud: 长时间代码任务 (离线)

### 不再需要的
- ❌ 自建 task-app（Conductor 已有）
- ❌ 自建 Task Runner（yuhao-desktop 已在跑）
- ❌ 单独 LiteLLM proxy（ai.sant.ltd 已对接）
- ❌ 单独 Scout 对接（WorkIQ MCP 已接入）

## 验证记录 (2026-08-11)
- [x] Conductor API 连接正常
- [x] WorkIQ 读邮件/日历成功
- [x] ai.sant.ltd 文本/图片生成成功
- [x] GitHub 仓库读写成功
- [x] 一句话下发 → 自动路由 → 执行完成
