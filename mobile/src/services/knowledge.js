const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000'

export const knowledgeService = {

  async getDocuments(userId, spaceId) {
    const url = spaceId
      ? `${API_URL}/knowledge/documents/${userId}?space_id=${spaceId}`
      : `${API_URL}/knowledge/documents/${userId}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch documents')
    return res.json()
  },

  async uploadPDF(userId, spaceId, fileUri, fileName) {
    const formData = new FormData()
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'application/pdf',
    })

    const headers = { 'user-id': userId }
    if (spaceId) headers['space-id'] = spaceId

    const res = await fetch(`${API_URL}/knowledge/upload/pdf`, {
      method: 'POST',
      headers,
      body: formData,
    })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },

  async uploadURL(userId, spaceId, url) {
    const res = await fetch(`${API_URL}/knowledge/upload/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, user_id: userId, space_id: spaceId }),
    })
    if (!res.ok) throw new Error('URL upload failed')
    return res.json()
  },

  async chat(userId, spaceId, messages) {
    const lastMessage = messages[messages.length - 1]
    const res = await fetch(`${API_URL}/knowledge/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: lastMessage.content, user_id: userId, space_id: spaceId }),
    })
    if (!res.ok) throw new Error('Chat failed')
    return res.json()
  },

  async deleteDocument(documentId) {
    const res = await fetch(`${API_URL}/knowledge/documents/${documentId}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Delete failed')
    return res.json()
  },
}