/**
 * Task Runner - Windows 常驻进程
 * 轮询 task.sant.ltd API → 路由到执行器 → 回写结果
 *
 * 运行: bun run runner/index.ts
 */

const TASK_API = process.env.TASK_API_URL || 'http://localhost:3000/api/tasks'
const POLL_INTERVAL = 30_000

// WorkIQ CLI 路径（Scout 内置）
const WORKIQ_BIN = 'C:\\Program Files\\Microsoft Scout\\resources\\app.asar.unpacked\\node_modules\\@microsoft\\workiq\\bin\\win-x64\\workiq.exe'
const WORKIQ_ACCOUNT = process.env.WORKIQ_ACCOUNT || 'yuhaoliu@microsoft.com'

interface Task {
  id: string
  title: string
  description: string
  type: 'company-data' | 'code' | 'analysis' | 'image' | 'speech' | 'automation'
  status: string
}

// ─── 执行器 ───

/** 公司资料：调 WorkIQ CLI (M365 Copilot) */
async function execCompanyData(task: Task): Promise<string> {
  const { execSync } = await import('child_process')
  const question = `${task.title}. ${task.description}`
  try {
    const result = execSync(
      `"${WORKIQ_BIN}" --account ${WORKIQ_ACCOUNT} ask -q "${question.replace(/"/g, '\\"')}"`,
      { encoding: 'utf-8', timeout: 60_000 }
    )
    return result.trim()
  } catch (e: any) {
    return `WorkIQ Error: ${e.message?.slice(0, 500)}`
  }
}

/** 代码任务：在仓库内执行 → commit & push */
async function execCode(task: Task): Promise<string> {
  const { execSync } = await import('child_process')
  const repoDir = process.env.CODE_REPO_DIR || process.cwd()
  try {
    // 用 ai.sant.ltd 生成代码方案
    const plan = await callModel(
      `You are a coding assistant. Task: ${task.title}\n${task.description}\n\nProvide the implementation plan and code.`
    )
    // 记录到文件
    const fs = await import('fs')
    const logFile = `${repoDir}/docs/task-logs/${task.id}.md`
    fs.mkdirSync(`${repoDir}/docs/task-logs`, { recursive: true })
    fs.writeFileSync(logFile, `# ${task.title}\n\n${plan}`)

    execSync(`cd "${repoDir}" && git add -A && git commit -m "agent: ${task.title}" --allow-empty`, { encoding: 'utf-8' })
    execSync(`cd "${repoDir}" && git push`, { encoding: 'utf-8' })
    return `Code task completed. Plan saved to docs/task-logs/${task.id}.md`
  } catch (e: any) {
    return `Code error: ${e.message?.slice(0, 500)}`
  }
}

/** 分析/推理：调 ai.sant.ltd */
async function execAnalysis(task: Task): Promise<string> {
  return callModel(`${task.title}\n\n${task.description}\n\n请用中文回答。`)
}

/** 图片生成：调 ai.sant.ltd */
async function execImage(task: Task): Promise<string> {
  const apiKey = process.env.LITELLM_API_KEY
  const baseUrl = process.env.LITELLM_URL || 'https://ai.sant.ltd'
  if (!apiKey) return 'Error: LITELLM_API_KEY not set'

  const res = await fetch(`${baseUrl}/v1/images/generations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-image-2',
      prompt: `${task.title}. ${task.description}`,
      n: 1, size: '1024x1024'
    })
  })
  if (!res.ok) return `Image API Error: ${res.status}`
  const data = await res.json()
  // 保存图片
  const b64 = data.data?.[0]?.b64_json
  if (b64) {
    const fs = await import('fs')
    const path = `downloads/${task.id}.png`
    fs.mkdirSync('downloads', { recursive: true })
    fs.writeFileSync(path, Buffer.from(b64, 'base64'))
    return `Image generated: ${path}`
  }
  return data.data?.[0]?.url || 'Image generated (no URL returned)'
}

/** 语音：调 ai.sant.ltd (TTS/STT) */
async function execSpeech(task: Task): Promise<string> {
  const apiKey = process.env.LITELLM_API_KEY
  const baseUrl = process.env.LITELLM_URL || 'https://ai.sant.ltd'
  if (!apiKey) return 'Error: LITELLM_API_KEY not set'

  const res = await fetch(`${baseUrl}/v1/audio/speech`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini-tts',
      input: task.description || task.title,
      voice: 'alloy'
    })
  })
  if (!res.ok) return `TTS Error: ${res.status}`
  const fs = await import('fs')
  const path = `downloads/${task.id}.mp3`
  fs.mkdirSync('downloads', { recursive: true })
  fs.writeFileSync(path, Buffer.from(await res.arrayBuffer()))
  return `Audio generated: ${path}`
}

/** 自动化：执行 shell 命令或 Azure CLI */
async function execAutomation(task: Task): Promise<string> {
  const { execSync } = await import('child_process')
  try {
    const result = execSync(task.description, { encoding: 'utf-8', timeout: 120_000 })
    return result.trim()
  } catch (e: any) {
    return `Automation error: ${e.message?.slice(0, 500)}`
  }
}

// ─── 模型调用 ───

async function callModel(prompt: string, model?: string): Promise<string> {
  const apiKey = process.env.LITELLM_API_KEY
  const baseUrl = process.env.LITELLM_URL || 'https://ai.sant.ltd'

  if (apiKey) {
    const res = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: model || process.env.DEFAULT_MODEL || 'claude-sonnet-4.6',
        max_tokens: 4096,
        messages: [{ role: 'user', content: prompt }]
      })
    })
    if (!res.ok) return `Model Error: ${res.status} ${await res.text()}`
    const data = await res.json()
    return data.choices?.[0]?.message?.content || 'No response'
  }

  // Fallback: git.sant.ltd
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  const anthropicBase = process.env.ANTHROPIC_BASE_URL || 'https://git.sant.ltd'
  if (!anthropicKey) return 'Error: No API key configured'

  const res = await fetch(`${anthropicBase}/v1/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': anthropicKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: model || 'claude-sonnet-4-5',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }]
    })
  })
  if (!res.ok) return `API Error: ${res.status}`
  const data = await res.json()
  return data.content?.[0]?.text || 'No response'
}

// ─── 路由 ───

async function executeTask(task: Task): Promise<string> {
  const ts = new Date().toISOString()
  console.log(`[${ts}] Executing: ${task.id} (${task.type}) - ${task.title}`)

  switch (task.type) {
    case 'company-data': return execCompanyData(task)
    case 'code':         return execCode(task)
    case 'analysis':     return execAnalysis(task)
    case 'image':        return execImage(task)
    case 'speech':       return execSpeech(task)
    case 'automation':   return execAutomation(task)
    default:             return `Unknown type: ${task.type}`
  }
}

// ─── 主循环 ───

async function pollAndExecute() {
  try {
    const res = await fetch(TASK_API)
    if (!res.ok) { console.error(`Poll failed: ${res.status}`); return }

    const tasks: Task[] = await res.json()
    const pending = tasks.filter(t => t.status === 'pending')

    for (const task of pending) {
      await fetch(TASK_API, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: task.id, status: 'running' })
      })

      try {
        const result = await executeTask(task)
        await fetch(TASK_API, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: task.id, status: 'done', result })
        })
        console.log(`[${new Date().toISOString()}] Done: ${task.id}`)
      } catch (e: any) {
        await fetch(TASK_API, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: task.id, status: 'failed', result: e.message })
        })
        console.error(`[${new Date().toISOString()}] Failed: ${task.id}`)
      }
    }
  } catch (e: any) {
    console.error(`[${new Date().toISOString()}] Poll error: ${e.message}`)
  }
}

// ─── 启动 ───

console.log(`
╔═══════════════════════════════════════════╗
║  Agent Platform Task Runner v0.2          ║
║  API:      ${TASK_API.padEnd(30)}║
║  Interval: ${(POLL_INTERVAL / 1000 + 's').padEnd(30)}║
║  WorkIQ:   ${WORKIQ_ACCOUNT.padEnd(30)}║
║  Models:   ai.sant.ltd                    ║
╚═══════════════════════════════════════════╝
`)

pollAndExecute()
setInterval(pollAndExecute, POLL_INTERVAL)
