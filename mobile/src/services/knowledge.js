import { API_URL } from './apiConfig'

export const knowledgeService = {

  async getDocuments(userId, hubId) {
    const url = hubId
      ? `${API_URL}/knowledge/documents/${userId}?hub_id=${hubId}`
      : `${API_URL}/knowledge/documents/${userId}`
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch documents')
    return res.json()
  },

  async uploadPDF(userId, hubId, fileUri, fileName) {
    const formData = new FormData()
    formData.append('file', {
      uri: fileUri,
      name: fileName,
      type: 'application/pdf',
    })
    formData.append('user_id', userId)
    formData.append('hub_id', hubId || '')

    const res = await fetch(`${API_URL}/knowledge/upload/pdf`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },

  async uploadURL(userId, hubId, url) {
    const res = await fetch(`${API_URL}/knowledge/upload/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, user_id: userId, hub_id: hubId }),
    })
    if (!res.ok) throw new Error('URL upload failed')
    return res.json()
  },

  async chatWithDocs(userId, hubId, messages) {
    const lastMessage = messages[messages.length - 1]
    const res = await fetch(`${API_URL}/knowledge/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: lastMessage.content, user_id: userId, hub_id: hubId }),
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