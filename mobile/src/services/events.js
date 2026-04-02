import { supabase } from './supabase';

export const eventService = {
  async getEvents(userId, hubId = null) {
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId);

    if (hubId) {
      query = query.eq('hub_id', hubId);
    }

    const { data, error } = await query.order('start_time', { ascending: true });
    if (error) throw error;
    return data;
  },

  async createEvent(eventData) {
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateEvent(eventId, updates) {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteEvent(eventId) {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw error;
    return true;
  }
};
