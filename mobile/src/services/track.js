import { API_URL } from './apiConfig'
import { getCached, invalidatePrefix } from './offlineCache'

export const trackService = {

  async getTasks(hubId) {
    const { data, stale } = await getCached(
      `tasks:${hubId}`,
      async () => {
        const res = await fetch(`${API_URL}/track/${hubId}`)
        if (!res.ok) throw new Error('Failed to fetch tasks')
        return res.json()
      },
    )
    return data
  },

  async createTask({ hubId, userId, title, priority, status, dueDate, timeEstimate, notes }) {
    const res = await fetch(`${API_URL}/track/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hub_id: hubId, user_id: userId, title,
        priority: priority || 'low', status: status || 'todo',
        due_date: dueDate || null, time_estimate: timeEstimate || null, notes: notes || null,
      }),
    })
    if (!res.ok) throw new Error('Failed to create task')
    const task = await res.json()
    await invalidatePrefix(`tasks:${hubId}`)
    return task
  },

  async updateTask(taskId, updates) {
    const res = await fetch(`${API_URL}/track/${taskId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update task')
    const task = await res.json()
    // Bust all task caches — we don't know which hub this task belongs to
    await invalidatePrefix('tasks:')
    return task
  },

  async deleteTask(taskId) {
    const res = await fetch(`${API_URL}/track/${taskId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete task')
    await invalidatePrefix('tasks:')
    return res.json()
  },
}