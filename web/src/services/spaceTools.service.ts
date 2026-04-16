import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export type SpaceToolType = 'webhook' | 'api_key' | 'oauth' | 'custom';

export interface SpaceTool {
  id: string;
  space_id: string;
  name: string;
  type: SpaceToolType;
  config: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SpaceToolCreate = Omit<SpaceTool, 'id' | 'is_active' | 'created_at' | 'updated_at'>;

export const spaceToolsService = {
  async getToolsBySpace(spaceId: string): Promise<SpaceTool[]> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/space-tools/${spaceId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) {
        console.error('Failed to load space tools.');
        return [];
      }
      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('[Takda Web] Space Tools Error:', error);
      return [];
    }
  },

  async createTool(tool: SpaceToolCreate): Promise<SpaceTool> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/space-tools`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(tool),
      });
      
      if (!response.ok) throw new Error('Failed to register space tool.');
      return await response.json();
    } catch (error) {
      console.error('[Takda Web] Register Tool Error:', error);
      throw error;
    }
  },

  async deleteTool(id: string): Promise<void> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/space-tools/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
        },
      });
      
      if (!response.ok) throw new Error('Failed to unregister tool.');
    } catch (error) {
      console.error('[Takda Web] Delete Tool Error:', error);
      throw error;
    }
  },

  async updateTool(id: string, updates: Partial<SpaceTool>): Promise<SpaceTool> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/space-tools/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) throw new Error('Failed to update tool.');
      return await response.json();
    } catch (error) {
      console.error('[Takda Web] Update Tool Error:', error);
      throw error;
    }
  }
};
