import { API_URL } from './apiConfig'

export const coordinatorService = {

  async chat({ userId, sessionId, message, spaceIds, hubIds, onChunk }) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_URL}/coordinator/chat`)
      xhr.setRequestHeader('Content-Type', 'application/json')
      
      let lastIndex = 0
      
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 3 || xhr.readyState === 4) {
          const newText = xhr.responseText.substring(lastIndex)
          if (newText) {
            onChunk(newText)
            lastIndex = xhr.responseText.length
          }
        }
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Chat failed with status ${xhr.status}`))
          }
        }
      }

      xhr.onerror = () => reject(new Error('Network error'))
      
      xhr.send(JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        message,
        space_ids: spaceIds || [],
        hub_ids: hubIds || [],
      }))
    })
  },

  async getSessions(userId) {
    const res = await fetch(`${API_URL}/coordinator/sessions/${userId}`)
    if (!res.ok) {
      const errorBody = await res.text().catch(() => "No body");
      console.warn(`[Takda] Session Fetch Error [${res.status}]:`, errorBody);
      throw new Error(`Failed to fetch sessions: ${res.status}`);
    }
    return res.json()
  },

  async getMessages(sessionId) {
    const res = await fetch(`${API_URL}/coordinator/sessions/${sessionId}/messages`)
    if (!res.ok) throw new Error('Failed to fetch coordinator messages')
    return res.json()
  },

  async deleteSession(sessionId) {
    const res = await fetch(`${API_URL}/coordinator/sessions/${sessionId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Delete session failed')
    return res.json()
  },

  async updateSession(sessionId, title) {
    const res = await fetch(`${API_URL}/coordinator/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) throw new Error('Update session failed')
    return res.json()
  },

  async getOutputs(userId) {
    const res = await fetch(`${API_URL}/coordinator/outputs/${userId}`)
    if (!res.ok) throw new Error('Failed to fetch coordinator outputs')
    return res.json()
  },

  async deleteOutput(outputId) {
    const res = await fetch(`${API_URL}/coordinator/outputs/${outputId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Delete output failed')
    return res.json()
  },

  async getQuiz(quiz_id) {
    const res = await fetch(`${API_URL}/coordinator/quizzes/${quiz_id}`)
    if (!res.ok) throw new Error('Failed to fetch quiz')
    return res.json()
  },

  async submitQuiz(quiz_id, userId, answers) {
    const res = await fetch(`${API_URL}/coordinator/quizzes/${quiz_id}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, answers })
    })
    if (!res.ok) throw new Error('Failed to submit quiz')
    return res.json()
  },

  async finalizeAction(userId, actionType, data) {
    try {
      const res = await fetch(`${API_URL}/coordinator/execute_proposal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          action_type: actionType,
          data: data
        })
      })
      if (!res.ok) throw new Error('Action execution failed')
      return res.json()
    } catch (e) {
      console.error('finalizeAction error:', e)
      throw e
    }
  },

  async getRecommendations(userId) {
    const res = await fetch(`${API_URL}/coordinator/recommendations/${userId}`)
    if (!res.ok) throw new Error('Failed to fetch recommendations')
    return res.json()
  },
}
