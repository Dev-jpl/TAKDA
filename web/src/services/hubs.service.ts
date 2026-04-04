import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export interface Hub {
  id: string;
  name: string;
  description?: string;
  space_id: string;
  icon?: string;
  color?: string;
  created_at?: string;
}

export const hubsService = {
  async getHubsBySpace(spaceId: string): Promise<Hub[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/hubs/space/${spaceId}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
    if (!response.ok) {
      console.error(`Registry Error: Hub extraction failed [${response.status}]`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async createHub(spaceId: string, name: string, description?: string): Promise<Hub> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/hubs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ space_id: spaceId, name, description }),
    });
    return response.json();
  }
};
