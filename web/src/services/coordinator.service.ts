import { API_URL } from './apiConfig';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  proposal?: AIProposal | null;
}

export interface AIProposal {
  type: string;
  data: Record<string, unknown>;
  status: 'pending' | 'executed' | 'rejected';
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}

export const coordinatorService = {
  async chat({ 
    userId, 
    sessionId, 
    message, 
    spaceIds = [], 
    hubIds = [], 
    onChunk 
  }: { 
    userId: string; 
    sessionId: string; 
    message: string; 
    spaceIds?: string[]; 
    hubIds?: string[]; 
    onChunk: (chunk: string) => void 
  }): Promise<void> {
    const response = await fetch(`${API_URL}/coordinator/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        session_id: sessionId,
        message,
        space_ids: spaceIds,
        hub_ids: hubIds,
      }),
    });

    if (!response.ok) throw new Error('Registry Error: Chat protocol failure.');
    if (!response.body) throw new Error('Registry Error: Empty intelligence stream.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) onChunk(chunk);
    }
  },

  async getSessions(userId: string): Promise<ChatSession[]> {
    const res = await fetch(`${API_URL}/coordinator/sessions/${userId}`);
    if (!res.ok) throw new Error('Registry Error: Failed to fetch sessions.');
    return res.json();
  },

  async getMessages(sessionId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${API_URL}/coordinator/sessions/${sessionId}/messages`);
    if (!res.ok) throw new Error('Registry Error: Failed to fetch mission logs.');
    return res.json();
  },

  async deleteSession(sessionId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/coordinator/sessions/${sessionId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Registry Error: Session extraction failure.');
    return res.json();
  },

  async finalizeAction(userId: string, actionType: string, data: Record<string, unknown>): Promise<Record<string, unknown>> {
    const res = await fetch(`${API_URL}/coordinator/execute_proposal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: userId,
        action_type: actionType,
        data: data
      })
    });
    if (!res.ok) throw new Error('Registry Error: Proposal execution failure.');
    return res.json();
  },

  async getRecommendations(userId: string): Promise<Record<string, unknown>[]> {
    const res = await fetch(`${API_URL}/coordinator/recommendations/${userId}`);
    if (!res.ok) throw new Error('Registry Error: Failed to fetch recommendations.');
    return res.json();
  },
};
