import { API_URL } from './apiConfig';

export interface Briefing {
  id: string;
  user_id: string;
  hub_id: string;
  type: 'daily' | 'weekly';
  content: string;
  created_at: string;
}

export const automateService = {
  async getBriefings(hubId: string): Promise<Briefing[]> {
    const res = await fetch(`${API_URL}/automate/briefings/${hubId}`);
    if (!res.ok) throw new Error('Registry Error: Failed to fetch briefings.');
    return res.json();
  },

  async generateBriefing(data: { hubId: string; userId: string; type?: 'daily' | 'weekly' }): Promise<Briefing> {
    const res = await fetch(`${API_URL}/automate/briefings/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        hub_id: data.hubId,
        user_id: data.userId,
        type: data.type || 'daily',
      }),
    });
    
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Registry Error: Synthesis protocol failure.');
    }
    return res.json();
  },

  async deleteBriefing(briefingId: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_URL}/automate/briefings/${briefingId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Registry Error: Historical record extraction failure.');
    return res.json();
  },
};
