const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

export const kalayService = {

  async chat({ userId, sessionId, message, spaceIds, hubIds, onChunk }) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_URL}/kalay/chat`)
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
    const res = await fetch(`${API_URL}/kalay/sessions/${userId}`)
    if (!res.ok) throw new Error('Failed to fetch Kalay sessions')
    return res.json()
  },

  async getMessages(sessionId) {
    const res = await fetch(`${API_URL}/kalay/sessions/${sessionId}/messages`)
    if (!res.ok) throw new Error('Failed to fetch Kalay messages')
    return res.json()
  },

  async deleteSession(sessionId) {
    const res = await fetch(`${API_URL}/kalay/sessions/${sessionId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Delete session failed')
    return res.json()
  },

  async updateSession(sessionId, title) {
    const res = await fetch(`${API_URL}/kalay/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title }),
    })
    if (!res.ok) throw new Error('Update session failed')
    return res.json()
  },

  async getOutputs(userId) {
    const res = await fetch(`${API_URL}/kalay/outputs/${userId}`)
    if (!res.ok) throw new Error('Failed to fetch Kalay outputs')
    return res.json()
  },

  async deleteOutput(outputId) {
    const res = await fetch(`${API_URL}/kalay/outputs/${outputId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Delete output failed')
    return res.json()
  },

  async getQuiz(quizId) {
    const res = await fetch(`${API_URL}/kalay/quizzes/${quizId}`)
    if (!res.ok) throw new Error('Failed to fetch quiz')
    return res.json()
  },

  async submitQuiz(quizId, userId, answers) {
    const res = await fetch(`${API_URL}/kalay/quizzes/${quizId}/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId, answers })
    })
    if (!res.ok) throw new Error('Failed to submit quiz')
    return res.json()
  },
}
