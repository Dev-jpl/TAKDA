import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export interface Space {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color: string;
  category?: string;
  hubs_count?: number;
  created_at?: string;
}

export const spacesService = {
  async getSpaces(userId: string): Promise<Space[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/spaces/${userId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        console.error('Oversight failure: Registry disconnected.');
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[Takda Web] Spaces Registry Error:', error);
      return [];
    }
  },

  async createSpace(name: string, description?: string, icon?: string, color?: string): Promise<Space> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/spaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ name, description, icon, color }),
      });
      
      if (!response.ok) throw new Error('Deployment failure: Mission denied.');
      return await response.json();
    } catch (error) {
      console.error('[Takda Web] Deployment Error:', error);
      throw error;
    }
  },

  async deleteSpace(id: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/spaces/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) throw new Error('Extraction failure: Space persistent.');
    } catch (error) {
      console.error('[Takda Web] Extraction Error:', error);
      throw error;
    }
  },

  async updateSpace(id: string, updates: Partial<Space>): Promise<Space> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/spaces/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Refinement failure: Logic denied.');
      return await response.json();
    } catch (error) {
      console.error('[Takda Web] Refinement Error:', error);
      throw error;
    }
  }
};
