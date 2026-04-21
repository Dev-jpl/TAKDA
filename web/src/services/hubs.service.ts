import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export interface HubModule {
  id: string;
  hub_id: string;
  module: string;
  is_enabled: boolean;
  order_index: number;
}

export interface Hub {
  id: string;
  name: string;
  description?: string;
  space_id: string;
  icon?: string;
  color?: string;
  created_at?: string;
  hub_modules?: HubModule[];
}

export const hubsService = {
  async getHubsBySpace(spaceId: string): Promise<Hub[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/hubs/${spaceId}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
    if (!response.ok) {
      console.error(`Registry Error: Hub extraction failed [${response.status}]`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async addModule(hubId: string, moduleName: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${API_URL}/hubs/${hubId}/modules/${moduleName}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
  },

  async removeModule(hubId: string, moduleName: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    await fetch(`${API_URL}/hubs/${hubId}/modules/${moduleName}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
  },

  async createHub(
    spaceId: string,
    userId: string,
    name: string,
    description?: string,
    icon?: string,
    color?: string,
    modules?: string[],
    addons?: string[],
  ): Promise<Hub> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/hubs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ space_id: spaceId, user_id: userId, name, description, icon, color, modules, addons }),
    });
    return response.json();
  }
};
