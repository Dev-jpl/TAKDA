import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export const integrationsService = {
  async getIntegrations() {
    const { data, error } = await supabase
      .from('user_integrations')
      .select('id, provider, created_at, updated_at, metadata');
    if (error) {
      console.warn('[integrations] fetch error:', error);
      return [];
    }
    return data || [];
  },

  async getGoogleAuthUrl(userId) {
    const res = await fetch(`${API_URL}/integrations/google/auth?user_id=${userId}`);
    const data = await res.json();
    return data.url || null;
  },

  async syncGoogleCalendar(userId) {
    const res = await fetch(`${API_URL}/integrations/google/sync?user_id=${userId}`, {
      method: 'POST',
    });
    return res.json();
  },

  async getStravaAuthUrl(userId) {
    const res = await fetch(`${API_URL}/integrations/strava/auth?user_id=${userId}`);
    const data = await res.json();
    return data.url || null;
  },

  async syncStrava(userId, perPage = 50) {
    const res = await fetch(
      `${API_URL}/integrations/strava/sync?user_id=${userId}&per_page=${perPage}`,
      { method: 'POST' }
    );
    return res.json();
  },

  async getStravaActivities(userId, limit = 20, sportType = null) {
    let url = `${API_URL}/integrations/strava/activities?user_id=${userId}&limit=${limit}`;
    if (sportType) url += `&sport_type=${sportType}`;
    const res = await fetch(url);
    return res.json();
  },

  async removeIntegration(id) {
    const { error } = await supabase
      .from('user_integrations')
      .delete()
      .eq('id', id);
    return !error;
  },
};
