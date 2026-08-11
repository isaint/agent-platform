'use client'
import { useState, useEffect } from 'react'

type TaskType = 'company-data' | 'code' | 'analysis' | 'image' | 'speech' | 'automation'
type TaskStatus = 'pending' | 'running' | 'done' | 'failed'

type Task = {
  id: string
  title: string
  description: string
  type: TaskType
  status: TaskStatus
  createdAt: string
  result?: string
  auditLog?: { time: string; action: string; by: string }[]
}

const STATUS_COLUMNS: TaskStatus[] = ['pending', 'running', 'done']
const STATUS_LABELS: Record<TaskStatus, string> = { pending: '⏳ 待执行', running: '🔄 执行中', done: '✅ 已完成' }

const TYPE_OPTIONS: { value: TaskType; label: string; color: string }[] = [
  { value: 'company-data', label: '🏢 公司资料 (M365)', color: '#92400e' },
  { value: 'code', label: '💻 代码 (→GitHub)', color: '#1e3a5f' },
  { value: 'analysis', label: '🧠 分析 (LLM)', color: '#1f2f1f' },
  { value: 'image', label: '🎨 图片生成', color: '#3b1f4a' },
  { value: 'speech', label: '🔊 语音 (TTS/STT)', color: '#1f3b3b' },
  { value: 'automation', label: '⚙️ 自动化 (Shell)', color: '#2f2f2f' },
]

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<TaskType>('analysis')

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 10000)
    return () => clearInterval(interval)
  }, [])

  async function fetchTasks() {
    try {
      const res = await fetch('/api/tasks')
      if (res.ok) setTasks(await res.json())
    } catch {}
  }

  async function createTask() {
    if (!title.trim()) return
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, type })
    })
    setTitle(''); setDescription(''); setShowCreate(false)
    fetchTasks()
  }

  const typeColor = (t: TaskType) => TYPE_OPTIONS.find(o => o.value === t)?.color || '#333'

  return (
    <div style={{ padding: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #222', paddingBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0 }}>📋 task.sant.ltd</h1>
          <span style={{ fontSize: '0.75rem', color: '#666' }}>Agent Platform Control Center</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.7rem', color: '#4ade80', background: '#052e16', padding: '2px 8px', borderRadius: '10px' }}>● Runner Connected</span>
          <button onClick={() => setShowCreate(true)} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
            + 下发任务
          </button>
        </div>
      </header>

      {/* Create Task */}
      {showCreate && (
        <div style={{ background: '#111', border: '1px solid #333', borderRadius: '8px', padding: '1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem' }}>新任务</div>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="任务标题（如：查找本周重要邮件）" style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#e5e5e5', fontSize: '0.875rem' }} />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="详细描述" rows={2} style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', background: '#0a0a0a', border: '1px solid #333', borderRadius: '4px', color: '#e5e5e5', resize: 'vertical', fontSize: '0.8rem' }} />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {TYPE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setType(opt.value)} style={{ padding: '4px 10px', background: type === opt.value ? opt.color : '#1a1a1a', border: `1px solid ${type === opt.value ? '#555' : '#333'}`, borderRadius: '4px', color: '#ddd', cursor: 'pointer', fontSize: '0.75rem' }}>
                {opt.label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button onClick={createTask} style={{ padding: '6px 16px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 600, fontSize: '0.8rem' }}>下发</button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '6px 16px', background: '#333', color: '#888', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem' }}>取消</button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {STATUS_COLUMNS.map(status => (
          <div key={status} style={{ background: '#0d0d0d', borderRadius: '8px', padding: '0.75rem', border: '1px solid #1a1a1a' }}>
            <h2 style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#666', marginBottom: '0.75rem', letterSpacing: '0.05em' }}>
              {STATUS_LABELS[status]}
              <span style={{ marginLeft: '0.5rem', color: '#444' }}>({tasks.filter(t => t.status === status || (status === 'done' && t.status === 'failed')).length})</span>
            </h2>
            {tasks.filter(t => t.status === status || (status === 'done' && t.status === 'failed')).map(task => (
              <div key={task.id} onClick={() => setSelectedTask(task)} style={{ background: '#111', border: `1px solid ${task.status === 'failed' ? '#7f1d1d' : '#222'}`, borderRadius: '6px', padding: '0.6rem', marginBottom: '0.5rem', cursor: 'pointer', transition: 'border-color 0.15s' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.8rem', flex: 1 }}>
                    {task.status === 'failed' && '❌ '}{task.title}
                  </span>
                  <span style={{ fontSize: '0.6rem', padding: '1px 6px', borderRadius: '3px', background: typeColor(task.type), color: '#ccc', whiteSpace: 'nowrap' }}>
                    {task.type}
                  </span>
                </div>
                {task.description && <p style={{ fontSize: '0.7rem', color: '#666', margin: '0.2rem 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</p>}
                {task.result && <p style={{ fontSize: '0.7rem', color: task.status === 'failed' ? '#ef4444' : '#4ade80', margin: '0.3rem 0 0', borderTop: '1px solid #222', paddingTop: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' } as any}>{task.result}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div onClick={() => setSelectedTask(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#111', border: '1px solid #333', borderRadius: '10px', padding: '1.5rem', maxWidth: '600px', width: '90%', maxHeight: '80vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1rem' }}>{selectedTask.title}</h3>
              <button onClick={() => setSelectedTask(null)} style={{ background: 'none', border: 'none', color: '#666', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>
            <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.75rem' }}>
              <span style={{ padding: '2px 6px', borderRadius: '3px', background: typeColor(selectedTask.type), marginRight: '0.5rem' }}>{selectedTask.type}</span>
              <span style={{ padding: '2px 6px', borderRadius: '3px', background: selectedTask.status === 'done' ? '#052e16' : selectedTask.status === 'failed' ? '#450a0a' : '#1a1a1a' }}>{selectedTask.status}</span>
              <span style={{ marginLeft: '0.5rem' }}>{new Date(selectedTask.createdAt).toLocaleString('zh-CN')}</span>
            </div>
            {selectedTask.description && <div style={{ fontSize: '0.8rem', color: '#aaa', marginBottom: '1rem', padding: '0.5rem', background: '#0a0a0a', borderRadius: '4px' }}>{selectedTask.description}</div>}
            {selectedTask.result && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem' }}>执行结果</div>
                <pre style={{ fontSize: '0.75rem', color: selectedTask.status === 'failed' ? '#ef4444' : '#4ade80', background: '#0a0a0a', padding: '0.75rem', borderRadius: '4px', overflow: 'auto', whiteSpace: 'pre-wrap', maxHeight: '300px' }}>{selectedTask.result}</pre>
              </div>
            )}
            {selectedTask.auditLog && selectedTask.auditLog.length > 0 && (
              <div>
                <div style={{ fontSize: '0.7rem', color: '#666', marginBottom: '0.25rem' }}>审计日志</div>
                {selectedTask.auditLog.map((log, i) => (
                  <div key={i} style={{ fontSize: '0.7rem', color: '#555', padding: '2px 0' }}>
                    {new Date(log.time).toLocaleTimeString('zh-CN')} · {log.action} · {log.by}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
