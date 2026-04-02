const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

export const trackService = {

  async getTasks(hubId) {
    const res = await fetch(`${API_URL}/track/${hubId}`)
    if (!res.ok) throw new Error('Failed to fetch tasks')
    return res.json()
  },

  async createTask({ hubId, userId, title, priority, status, dueDate, timeEstimate, notes }) {
    const res = await fetch(`${API_URL}/track/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hub_id: hubId,
        user_id: userId,
        title,
        priority: priority || 'low',
        status: status || 'todo',
        due_date: dueDate || null,
        time_estimate: timeEstimate || null,
        notes: notes || null,
      }),
    })
    if (!res.ok) throw new Error('Failed to create task')
    return res.json()
  },

  async updateTask(taskId, updates) {
    const res = await fetch(`${API_URL}/track/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Failed to update task')
    return res.json()
  },

  async deleteTask(taskId) {
    const res = await fetch(`${API_URL}/track/${taskId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to delete task')
    return res.json()
  },
}