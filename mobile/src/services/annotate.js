import { API_URL } from './apiConfig'
import { getCached, invalidatePrefix } from './offlineCache'

export const annotateService = {

  async getAnnotations(hubId) {
    const { data } = await getCached(
      `annotations:${hubId}`,
      async () => {
        const res = await fetch(`${API_URL}/annotate/${hubId}`)
        if (!res.ok) throw new Error('Failed to fetch annotations')
        return res.json()
      },
    )
    return data
  },

  async getDocumentAnnotations(documentId) {
    const res = await fetch(`${API_URL}/annotate/document/${documentId}`)
    if (!res.ok) throw new Error('Failed to fetch document insights')
    return res.json()
  },

  async createAnnotation({ hubId, userId, documentId, content, category }) {
    const res = await fetch(`${API_URL}/annotate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hub_id: hubId, user_id: userId, document_id: documentId, content, category }),
    })
    if (!res.ok) throw new Error('Failed to create insight')
    const note = await res.json()
    await invalidatePrefix(`annotations:${hubId}`)
    return note
  },

  async updateAnnotation(annotationId, updates) {
    const res = await fetch(`${API_URL}/annotate/${annotationId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    if (!res.ok) throw new Error('Update failed')
    await invalidatePrefix('annotations:')
    return res.json()
  },

  async deleteAnnotation(annotationId) {
    const res = await fetch(`${API_URL}/annotate/${annotationId}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Delete failed')
    await invalidatePrefix('annotations:')
    return res.json()
  },
}
