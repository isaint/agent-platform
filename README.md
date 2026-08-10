# Agent Platform

统一 Agent 平台：task.sant.ltd 看板 + Windows 执行环境 + LiteLLM 多模型

## 架构

```
Mac (浏览器) → task.sant.ltd (看板+下发) → Windows Task Runner → 执行器
                                                                  ├── Microsoft Scout (M365 公司资料)
                                                                  ├── LiteLLM (多模型: 文本/图片/语音)
                                                                  ├── OMA (技术多代理, 可选)
                                                                  └── GitHub (代码归档)
```

## 目录结构

```
├── task-app/          # task.sant.ltd Next.js 应用
│   ├── app/           # App Router 页面
│   └── package.json
├── runner/            # Windows Task Runner (Bun)
│   └── index.ts       # 主进程：轮询 + 路由 + 执行
├── docs/
│   └── adrs/          # 架构决策记录
└── README.md
```

## 快速开始

### 1. task.sant.ltd (看板)
```bash
cd task-app
bun install
bun run dev
# → http://localhost:3000
```

### 2. Task Runner (执行器)
```bash
cd runner
bun run index.ts
# 每30s轮询 task-app API，自动执行 pending 任务
```

## 能力矩阵

| 能力 | 实现 |
|------|------|
| Memory | Azure Table + Craft Sessions |
| Scheduling | task.sant.ltd 定时任务 |
| Event Trigger | Webhook → 自动创建任务 |
| Agent Team | OMA 多代理 / Craft spawn_session |
| Audit | 任务审计日志 (Azure Table) |
| Governance | 审批流 + 预算控制 + 类型路由 |
| Long Running Workflow | 多步骤任务 + 状态持久化 |

## 环境要求

- Node.js 24+ / Bun 1.3+
- Azure CLI (已登录)
- GitHub CLI (已登录)
- Python 3.14+ (LiteLLM)
- Microsoft Scout (Frontier 预览, 用于 M365)
