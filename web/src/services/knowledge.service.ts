import { API_URL } from './apiConfig';

export interface KnowledgeDocument {
  id: string;
  user_id: string;
  hub_id: string | null;
  name: string;
  type: 'pdf' | 'url';
  content_url: string;
  created_at: string;
}

export const knowledgeService = {
  async getDocuments(userId: string, hubId?: string): Promise<KnowledgeDocument[]> {
    const url = hubId
      ? `${API_URL}/knowledge/documents/${userId}?hub_id=${hubId}`
      : `${API_URL}/knowledge/documents/${userId}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Registry Error: Failed to fetch documents.');
    return res.json();
  },

  async uploadPDF(userId: string, hubId: string | null, file: File): Promise<KnowledgeDocument> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('user_id', userId);
    formData.append('hub_id', hubId || '');

    const res = await fetch(`${API_URL}/knowledge/upload/pdf`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Registry Error: Upload protocol failure.');
    return res.json();
  },

  async uploadURL(userId: string, hubId: string | null, url: string): Promise<KnowledgeDocument> {
    const res = await fetch(`${API_URL}/knowledge/upload/url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, user_id: userId, hub_id: hubId }),
    });
    if (!res.ok) throw new Error('Registry Error: URL ingestion failure.');
    return res.json();
  },

  async deleteDocument(documentId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/knowledge/documents/${documentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Registry Error: Abort mission failure.');
    return res.json();
  },
};
