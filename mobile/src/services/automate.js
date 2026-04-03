import { API_URL } from './apiConfig'

export const automateService = {

  async getBriefings(hubId) {
    const res = await fetch(`${API_URL}/automate/briefings/${hubId}`)
    if (!res.ok) throw new Error('Failed to fetch briefings')
    return res.json()
  },

  async generateBriefing({ hubId, userId, type = 'daily' }) {
    const res = await fetch(`${API_URL}/automate/briefings/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hub_id: hubId,
        user_id: userId,
        type,
      }),
    })
    
    if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Failed to synthesize briefing')
    }
    return res.json()
  },

  async deleteBriefing(briefingId) {
    const res = await fetch(`${API_URL}/automate/briefings/${briefingId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Failed to remove briefing historical record')
    return res.json()
  },
}
