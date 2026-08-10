# ADR-0001: 统一 Agent 平台架构

## 状态
Accepted

## 日期
2026-08-10

## 背景
需要一个跨设备的 AI 任务管理和执行平台：
- Mac 上能看板管理、下发任务
- Windows 上自动执行（M365 公司资料、代码、分析）
- 代码归档到 GitHub
- 多模型能力（文本/图片/语音）通过 LiteLLM

## 决策

### 1. task.sant.ltd = 看板 + 任务下发
- Next.js 应用，部署在 Azure Web App
- Azure AD 认证（已有）
- 职责：创建任务、展示状态、审计日志

### 2. Windows Task Runner = 执行底座
- Bun 常驻进程，轮询 task.sant.ltd API
- 路由逻辑内置，按 type 分发到执行器

### 3. 执行器分工
- `company-data` → Microsoft Scout (M365 原生) 或 Graph API
- `code` → OMA 多代理 → GitHub 归档
- `analysis` → LiteLLM (多模型统一入口)
- `automation` → Shell / Craft Agent

### 4. LiteLLM = 统一模型网关
- 文本: Claude / GPT / Gemini
- 图片: DALL-E / Flux
- 语音: Whisper (STT) / TTS
- 统一 API 接口，支持 fallback

### 5. 不引入的组件
- ❌ Kubernetes / Docker（单机够用）
- ❌ 消息队列（轮询够用）
- ❌ 独立 Gateway（Runner 内置路由）

## 后果
- 简单：4 个组件，Mac → Azure → Windows → GitHub
- 可扩展：后续可加 Azure Queue、SignalR 等
- 可治理：所有任务有审计轨迹
