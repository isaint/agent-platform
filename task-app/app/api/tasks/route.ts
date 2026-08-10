import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'
import { join } from 'path'

// Simple file-based storage (replace with Azure Table Storage in production)
const DATA_DIR = join(process.cwd(), '.data')
const TASKS_FILE = join(DATA_DIR, 'tasks.json')

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
  if (!existsSync(TASKS_FILE)) writeFileSync(TASKS_FILE, '[]')
}

function readTasks() {
  ensureDataDir()
  return JSON.parse(readFileSync(TASKS_FILE, 'utf-8'))
}

function writeTasks(tasks: any[]) {
  ensureDataDir()
  writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
}

export async function GET() {
  const tasks = readTasks()
  return NextResponse.json(tasks)
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const task = {
    id: `task-${Date.now()}-${randomUUID().slice(0, 8)}`,
    title: body.title,
    description: body.description || '',
    type: body.type || 'analysis',
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: 'yuhaoliu',
    result: null,
    auditLog: [
      { time: new Date().toISOString(), action: 'created', by: 'user' }
    ]
  }
  const tasks = readTasks()
  tasks.unshift(task)
  writeTasks(tasks)
  return NextResponse.json(task, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, status, result } = body
  const tasks = readTasks()
  const task = tasks.find((t: any) => t.id === id)
  if (!task) return NextResponse.json({ error: 'not found' }, { status: 404 })
  
  if (status) task.status = status
  if (result) task.result = result
  task.auditLog.push({
    time: new Date().toISOString(),
    action: status ? `status_changed_to_${status}` : 'updated',
    by: 'task-runner'
  })
  
  writeTasks(tasks)
  return NextResponse.json(task)
}
