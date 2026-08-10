/**
 * Task Runner - Windows 常驻进程
 * 轮询 task.sant.ltd API，路由到对应执行器
 * 
 * 运行方式: bun run runner/index.ts
 */

const TASK_API = process.env.TASK_API_URL || 'http://localhost:3000/api/tasks'
const POLL_INTERVAL = 30_000 // 30s

interface Task {
  id: string
  title: string
  description: string
  type: 'company-data' | 'code' | 'analysis' | 'automation'
  status: string
}

// --- 执行器 ---

async function executeCompanyData(task: Task): Promise<string> {
  // 调用 Microsoft Graph API（通过 Azure CLI token）
  const { execSync } = await import('child_process')
  
  // 获取 Graph API token
  const token = execSync('az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv', { encoding: 'utf-8' }).trim()
  
  // 根据任务描述判断查什么
  const desc = task.description.toLowerCase()
  let endpoint = ''
  
  if (desc.includes('邮件') || desc.includes('mail') || desc.includes('email')) {
    endpoint = 'https://graph.microsoft.com/v1.0/me/messages?$top=10&$orderby=receivedDateTime desc'
  } else if (desc.includes('文件') || desc.includes('file') || desc.includes('document')) {
    endpoint = 'https://graph.microsoft.com/v1.0/me/drive/root/children'
  } else if (desc.includes('teams') || desc.includes('消息')) {
    endpoint = 'https://graph.microsoft.com/v1.0/me/chats?$top=10'
  } else if (desc.includes('日历') || desc.includes('calendar') || desc.includes('会议')) {
    endpoint = 'https://graph.microsoft.com/v1.0/me/events?$top=10&$orderby=start/dateTime desc'
  } else {
    // 默认搜索
    endpoint = `https://graph.microsoft.com/v1.0/search/query`
  }

  const res = await fetch(endpoint, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  
  if (!res.ok) return `Error: ${res.status} ${await res.text()}`
  const data = await res.json()
  return JSON.stringify(data.value?.slice(0, 5) || data, null, 2)
}

async function executeCode(task: Task): Promise<string> {
  const { execSync } = await import('child_process')
  
  // 通过 Craft Agent spawn_session 或直接 git 操作
  // 先简单实现：创建分支 → 执行 → commit → push
  try {
    const repoDir = process.env.CODE_REPO_DIR || 'C:/Users/yuhaoliu/repos'
    const result = execSync(
      `cd "${repoDir}" && echo "Task: ${task.title}" > .task-log && git add -A && git commit -m "agent: ${task.title}" --allow-empty 2>&1`,
      { encoding: 'utf-8', timeout: 120_000 }
    )
    return `Code task executed. ${result}`
  } catch (e: any) {
    return `Code execution note: ${e.message}`
  }
}

async function executeAnalysis(task: Task): Promise<string> {
  // 通过 git.sant.ltd 统一代理调用所有模型
  const apiKey = process.env.ANTHROPIC_API_KEY
  const baseUrl = process.env.ANTHROPIC_BASE_URL || 'https://git.sant.ltd'
  const model = process.env.DEFAULT_MODEL || 'claude-sonnet-4-5'
  
  if (!apiKey) return 'Error: No API key configured. Set ANTHROPIC_API_KEY'
  
  const res = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      messages: [
        { role: 'user', content: `${task.title}\n\n${task.description}\n\n请用中文回答。` }
      ]
    })
  })
  
  if (!res.ok) return `API Error: ${res.status} ${await res.text()}`
  const data = await res.json()
  return data.content?.[0]?.text || 'No response'
}

async function executeAutomation(task: Task): Promise<string> {
  const { execSync } = await import('child_process')
  // 通用自动化：执行 shell 命令或调 Craft
  try {
    const result = execSync(task.description, { encoding: 'utf-8', timeout: 60_000 })
    return result
  } catch (e: any) {
    return `Automation note: ${e.message}`
  }
}

// --- 路由 ---

async function executeTask(task: Task): Promise<string> {
  console.log(`[${new Date().toISOString()}] Executing: ${task.id} (${task.type}) - ${task.title}`)
  
  switch (task.type) {
    case 'company-data': return executeCompanyData(task)
    case 'code':         return executeCode(task)
    case 'analysis':     return executeAnalysis(task)
    case 'automation':   return executeAutomation(task)
    default:             return `Unknown task type: ${task.type}`
  }
}

// --- 主循环 ---

async function pollAndExecute() {
  try {
    const res = await fetch(TASK_API)
    if (!res.ok) { console.error(`Poll failed: ${res.status}`); return }
    
    const tasks: Task[] = await res.json()
    const pending = tasks.filter(t => t.status === 'pending')
    
    for (const task of pending) {
      // Mark as running
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
        console.error(`[${new Date().toISOString()}] Failed: ${task.id} - ${e.message}`)
      }
    }
  } catch (e: any) {
    console.error(`[${new Date().toISOString()}] Poll error: ${e.message}`)
  }
}

// --- 启动 ---

console.log(`
╔══════════════════════════════════════╗
║  Task Runner v0.1                    ║
║  Polling: ${TASK_API}                ║
║  Interval: ${POLL_INTERVAL / 1000}s  ║
╚══════════════════════════════════════╝
`)

// 立即执行一次
pollAndExecute()

// 定时轮询
setInterval(pollAndExecute, POLL_INTERVAL)
