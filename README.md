# Agent Platform

Mac 看板下发 → Windows 自动执行 → GitHub 归档

## 架构

```
Mac (浏览器) → task.sant.ltd → Windows Task Runner
                                ├── WorkIQ (M365 公司资料)
                                ├── ai.sant.ltd (100+ 模型)
                                ├── Azure CLI (云资源)
                                └── GitHub (代码归档)
```

## 已验证通路

| 通道 | 认证方式 | 能力 |
|------|---------|------|
| WorkIQ | Scout 缓存 AAD | 邮件/日历/Teams/OneDrive/SharePoint |
| ai.sant.ltd | API Key | 文本/图片/语音/视频/嵌入 (100+ 模型) |
| GitHub | gh CLI keyring | 仓库读写 |
| Azure CLI | az login | 资源管理/部署 |
| git.sant.ltd | 环境变量 | Anthropic 代理（备用） |

## 可用模型 (ai.sant.ltd)

**文本**: claude-opus-5, claude-sonnet-5, gpt-5.5, gpt-5.4, gemini-3.5-flash, DeepSeek-V4-Pro, Kimi-K2.6
**图片**: gpt-image-2, FLUX.1-Kontext-pro, MAI-Image-2.5
**语音**: whisper (STT), gpt-4o-mini-tts (TTS)
**视频**: sora-2
**代码**: gpt-5.3-codex, codex-mini
**嵌入**: text-embedding-3-large/small

## 目录结构

```
├── task-app/              # task.sant.ltd (Next.js 看板)
│   ├── app/page.tsx       # 看板 UI (todo/doing/done)
│   ├── app/api/tasks/     # 任务 CRUD API
│   └── package.json
├── runner/                # Windows Task Runner
│   ├── index.ts           # 轮询 + 路由 + 执行
│   └── .env.example       # 环境变量模板
├── docs/adrs/             # 架构决策记录
└── README.md
```

## 快速开始

```bash
# 1. 启动看板
cd task-app && bun install && bun run dev

# 2. 启动 Runner (另一个终端)
cd runner && bun run index.ts
```

## 任务类型

| type | 路由到 | 说明 |
|------|--------|------|
| company-data | WorkIQ (M365) | 邮件/文件/Teams/日历 |
| code | GitHub | 代码实现/重构 → commit & push |
| analysis | ai.sant.ltd | 推理/分析/总结/翻译 |
| image | ai.sant.ltd | 图片生成 (gpt-image-2/FLUX) |
| speech | ai.sant.ltd | TTS/STT |
| automation | Shell/Azure CLI | 自动化脚本/云操作 |
