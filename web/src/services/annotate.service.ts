import { API_URL } from './apiConfig';

export interface Annotation {
  id: string;
  user_id: string;
  hub_id: string;
  document_id: string | null;
  content: string;
  category: string | null;
  created_at: string;
}

export const annotateService = {
  async getAnnotations(hubId: string): Promise<Annotation[]> {
    const res = await fetch(`${API_URL}/annotate/${hubId}`);
    if (!res.ok) throw new Error('Registry Error: Failed to fetch reflections.');
    return res.json();
  },

  async getDocumentAnnotations(documentId: string): Promise<Annotation[]> {
    const res = await fetch(`${API_URL}/annotate/document/${documentId}`);
    if (!res.ok) throw new Error('Registry Error: Failed to fetch document insights.');
    return res.json();
  },

  async createAnnotation(data: { 
    hubId: string; 
    userId: string; 
    documentId?: string | null; 
    content: string; 
    category?: string 
  }): Promise<Annotation> {
    const res = await fetch(`${API_URL}/annotate/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hub_id: data.hubId,
        user_id: data.userId,
        document_id: data.documentId || null,
        content: data.content,
        category: data.category || 'general',
      }),
    });
    if (!res.ok) throw new Error('Registry Error: Reflection creation failure.');
    return res.json();
  },

  async updateAnnotation(annotationId: string, updates: Partial<Annotation>): Promise<Annotation> {
    const res = await fetch(`${API_URL}/annotate/${annotationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error('Registry Error: Update protocol failure.');
    return res.json();
  },

  async deleteAnnotation(annotationId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/annotate/${annotationId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Registry Error: Mission extract failure.');
    return res.json();
  },
};
