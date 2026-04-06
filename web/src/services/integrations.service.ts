import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export interface UserIntegration {
  id: string;
  provider: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export const integrationsService = {
  async getIntegrations(): Promise<UserIntegration[]> {
    await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('user_integrations')
      .select('id, provider, created_at, updated_at, metadata');
    
    if (error) {
      console.error('Error fetching integrations:', error);
      return [];
    }
    return data || [];
  },

  async initiateGoogleAuth(userId: string) {
    const response = await fetch(`${API_URL}/integrations/google/auth?user_id=${userId}`);
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  },

  async syncGoogleCalendar(userId: string) {
    const response = await fetch(`${API_URL}/integrations/google/sync?user_id=${userId}`, {
      method: 'POST'
    });
    return response.json();
  },

  async initiateStravaAuth(userId: string) {
    const response = await fetch(`${API_URL}/integrations/strava/auth?user_id=${userId}`);
    const data = await response.json();
    if (data.url) {
      window.location.href = data.url;
    }
  },

  async syncStrava(userId: string) {
    const response = await fetch(`${API_URL}/integrations/strava/sync?user_id=${userId}`, {
      method: 'POST'
    });
    return response.json();
  },

  async removeIntegration(id: string) {
    const { error } = await supabase
      .from('user_integrations')
      .delete()
      .eq('id', id);
    return !error;
  }
};
