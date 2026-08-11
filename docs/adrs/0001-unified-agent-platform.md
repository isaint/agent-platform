# ADR-0001: 统一 Agent 平台架构

## 状态
Accepted (2026-08-11 已验证)

## 背景
需要一个跨设备 AI 任务平台：Mac 下发任务 → Windows 执行 → GitHub 归档。

## 决策

### 1. 不需要独立 Scout 对接
WorkIQ（Scout 内置的 M365 Copilot MCP）已作为 Craft Source 直接接入。
通过 Scout 缓存的 AAD 认证，直接读取邮件/日历/Teams/OneDrive/SharePoint。

### 2. 不需要独立 LiteLLM proxy
ai.sant.ltd 已部署运行，100+ 模型统一接口（文本/图片/语音/视频/嵌入）。
已验证：claude-opus-5, gpt-5.4, gpt-image-2, whisper, sora-2 等。

### 3. 不需要 OMA（当前阶段）
Craft Agent 自身能力（spawn_session + skills + call_llm）覆盖当前需求。
复杂工程流程（PM→架构→实现→QA→Review）再引入 OMA。

### 4. 不需要消息队列/Gateway
Task Runner 轮询 task.sant.ltd API，30s 间隔，足够简单。

### 5. 所有认证复用本机
- Azure: `az login` 已有 session
- GitHub: `gh auth` keyring
- M365: Scout 缓存的 AAD token
- 模型: ai.sant.ltd API key

## 后果
- 4 个组件，零额外基础设施
- 所有认证零配置（复用本机已登录状态）
- 可随时扩展（加 OMA、加 Azure Queue、加 SignalR）
