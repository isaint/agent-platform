'use client'
import { useState, useEffect } from 'react'

type Task = {
  id: string
  title: string
  description: string
  type: 'company-data' | 'code' | 'analysis' | 'automation'
  status: 'pending' | 'running' | 'done' | 'failed'
  createdAt: string
  result?: string
}

const STATUS_COLUMNS = ['pending', 'running', 'done'] as const

export default function Board() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<Task['type']>('analysis')

  useEffect(() => {
    fetchTasks()
    const interval = setInterval(fetchTasks, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchTasks() {
    const res = await fetch('/api/tasks')
    if (res.ok) setTasks(await res.json())
  }

  async function createTask() {
    if (!title.trim()) return
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, type })
    })
    setTitle('')
    setDescription('')
    setShowCreate(false)
    fetchTasks()
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700 }}>📋 task.sant.ltd</h1>
        <button
          onClick={() => setShowCreate(true)}
          style={{ padding: '0.5rem 1rem', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}
        >
          + 新任务
        </button>
      </header>

      {showCreate && (
        <div style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '8px', padding: '1.5rem', marginBottom: '2rem' }}>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="任务标题"
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', background: '#0a0a0a', border: '1px solid #444', borderRadius: '4px', color: '#e5e5e5' }}
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="描述（一句话说清楚要做什么）"
            rows={3}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', background: '#0a0a0a', border: '1px solid #444', borderRadius: '4px', color: '#e5e5e5', resize: 'vertical' }}
          />
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select value={type} onChange={e => setType(e.target.value as Task['type'])} style={{ padding: '0.5rem', background: '#0a0a0a', border: '1px solid #444', borderRadius: '4px', color: '#e5e5e5' }}>
              <option value="company-data">公司资料 (Scout/M365)</option>
              <option value="code">代码 (OMA→GitHub)</option>
              <option value="analysis">分析 (LLM API)</option>
              <option value="automation">自动化</option>
            </select>
            <button onClick={createTask} style={{ padding: '0.5rem 1rem', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>下发</button>
            <button onClick={() => setShowCreate(false)} style={{ padding: '0.5rem 1rem', background: '#333', color: '#aaa', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>取消</button>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
        {STATUS_COLUMNS.map(status => (
          <div key={status} style={{ background: '#111', borderRadius: '8px', padding: '1rem' }}>
            <h2 style={{ fontSize: '0.875rem', textTransform: 'uppercase', color: '#888', marginBottom: '1rem', letterSpacing: '0.05em' }}>
              {status === 'pending' ? '⏳ 待执行' : status === 'running' ? '🔄 执行中' : '✅ 已完成'}
              <span style={{ marginLeft: '0.5rem', color: '#555' }}>({tasks.filter(t => t.status === status).length})</span>
            </h2>
            {tasks.filter(t => t.status === status).map(task => (
              <div key={task.id} style={{ background: '#1a1a1a', border: '1px solid #333', borderRadius: '6px', padding: '0.75rem', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>{task.title}</span>
                  <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '3px', background: task.type === 'code' ? '#1e3a5f' : task.type === 'company-data' ? '#3b2f1f' : '#1f2f1f', color: task.type === 'code' ? '#60a5fa' : task.type === 'company-data' ? '#fbbf24' : '#4ade80' }}>
                    {task.type}
                  </span>
                </div>
                {task.description && <p style={{ fontSize: '0.75rem', color: '#888', margin: '0.25rem 0 0' }}>{task.description}</p>}
                {task.result && <p style={{ fontSize: '0.75rem', color: '#4ade80', margin: '0.5rem 0 0', borderTop: '1px solid #333', paddingTop: '0.5rem' }}>{task.result}</p>}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
