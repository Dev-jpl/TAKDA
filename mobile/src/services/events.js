import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export const eventService = {
  // Read events directly from Supabase (fast, RLS-secured)
  async getEvents(userId, hubId = null) {
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId);

    if (hubId) {
      query = query.eq('hub_id', hubId);
    }

    const { data, error } = await query.order('start_at', { ascending: true });
    if (error) throw error;
    return data || [];
  },

  // Write operations go through backend so Google Calendar sync triggers
  async createEvent(eventData) {
    const res = await fetch(`${API_URL}/events/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    if (!res.ok) throw new Error(`Create event failed: ${res.status}`);
    return res.json();
  },

  async updateEvent(eventId, updates) {
    const res = await fetch(`${API_URL}/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) throw new Error(`Update event failed: ${res.status}`);
    return res.json();
  },

  async deleteEvent(eventId) {
    const res = await fetch(`${API_URL}/events/${eventId}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error(`Delete event failed: ${res.status}`);
    return true;
  },
};
