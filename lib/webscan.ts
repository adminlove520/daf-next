/**
 * WebScan 任务管理
 * 内存存储任务状态（在 Vercel 上可以使用 Vercel KV 或数据库持久化）
 */

import { nanoid } from 'nanoid';

export interface ScanTask {
  id: string;
  config: any;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  start_time?: string;
  end_time?: string;
  created_at: string;
  created_by: string;
  error?: string;
  result?: any;
}

// 内存存储
const tasks = new Map<string, ScanTask>();

export function createTask(config: any, createdBy: string): ScanTask {
  const task: ScanTask = {
    id: nanoid(),
    config,
    status: 'pending',
    progress: 0,
    created_at: new Date().toISOString(),
    created_by: createdBy,
  };
  tasks.set(task.id, task);
  return task;
}

export function getTask(taskId: string): ScanTask | undefined {
  return tasks.get(taskId);
}

export function listTasks(): ScanTask[] {
  return Array.from(tasks.values()).sort((a, b) =>
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export function updateTask(taskId: string, updates: Partial<ScanTask>): ScanTask | undefined {
  const task = tasks.get(taskId);
  if (task) {
    Object.assign(task, updates);
    return task;
  }
}

export function deleteTask(taskId: string): boolean {
  return tasks.delete(taskId);
}
