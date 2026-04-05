import { API_URL } from './apiConfig'

export const vaultService = {
  async getItems(userId, status = null) {
    const url = new URL(`${API_URL}/vault/${userId}`)
    if (status) url.searchParams.set('status', status)
    const res = await fetch(url.toString())
    if (!res.ok) throw new Error('Failed to fetch vault items')
    return res.json()
  },

  async createItem(userId, content, type = 'text') {
    const res = await fetch(`${API_URL}/vault/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, content, content_type: type }),
    })
    if (!res.ok) throw new Error('Failed to create vault item')
    return res.json()
  },

  async acceptSuggestion(itemId, hubId, module) {
    const res = await fetch(`${API_URL}/vault/${itemId}/accept`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hub_id: hubId, module }),
    })
    if (!res.ok) throw new Error('Failed to accept suggestion')
    return res.json()
  },

  async dismissSuggestion(itemId) {
    const res = await fetch(`${API_URL}/vault/${itemId}/dismiss`, {
      method: 'PATCH',
    })
    if (!res.ok) throw new Error('Failed to dismiss suggestion')
    return res.json()
  },
}
