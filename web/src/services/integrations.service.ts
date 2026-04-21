import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export interface UserIntegration {
  id: string;
  provider: string;
  created_at: string;
  updated_at: string;
  metadata?: Record<string, unknown>;
}

export interface StravaActivity {
  id: string;
  strava_id: string;
  user_id: string;
  name: string;
  sport_type: string;
  distance_meters: number;
  moving_time_seconds: number;
  start_date: string;
  average_speed: number;
  total_elevation_gain: number;
  synced_at: string;
}

export interface StravaProfile {
  id: string;
  user_id: string;
  athlete_id: string;
  username: string;
  firstname: string;
  lastname: string;
  profile_pic_url: string;
  synced_at: string;
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
  },

  async getStravaActivities(userId: string, limit: number = 20): Promise<StravaActivity[]> {
    try {
      const response = await fetch(`${API_URL}/integrations/strava/activities?user_id=${userId}&limit=${limit}`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.activities || [];
    } catch {
      return [];
    }
  },

  async getStravaProfile(userId: string): Promise<StravaProfile | null> {
    try {
      const response = await fetch(`${API_URL}/integrations/strava/profile?user_id=${userId}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.profile || null;
    } catch {
      return null;
    }
  }
};
