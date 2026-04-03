import { API_URL } from './apiConfig'

export const deliverService = {

  async getDeliveries(hubId) {
    const res = await fetch(`${API_URL}/deliver/${hubId}`)
    if (!res.ok) throw new Error('Failed to fetch project dispatches')
    return res.json()
  },

  async createDelivery({ hubId, userId, content, type, metadata }) {
    const res = await fetch(`${API_URL}/deliver/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hub_id: hubId,
        user_id: userId,
        content,
        type,
        metadata,
      }),
    })
    if (!res.ok) throw new Error('Failed to secure dispatch')
    return res.json()
  },

  async deleteDelivery(deliveryId) {
    const res = await fetch(`${API_URL}/deliver/${deliveryId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to remove dispatch')
    return res.json()
  },
}
