import { supabase } from './supabase';

export interface CalendarEvent {
  id: string;
  user_id: string;
  hub_id?: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  category?: string;
  color?: string;
  created_at?: string;
}

export const eventsService = {
  async getEvents(userId: string, hubId: string | null = null): Promise<CalendarEvent[]> {
    let query = supabase
      .from('events')
      .select('*')
      .eq('user_id', userId);

    if (hubId) {
      query = query.eq('hub_id', hubId);
    }

    const { data, error } = await query.order('start_time', { ascending: true });
    if (error) throw new Error('Registry Error: Calendar sync failed.');
    return data || [];
  },

  async createEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('events')
      .insert(eventData)
      .select()
      .single();
    
    if (error) throw new Error('Deployment failure: Event denied.');
    return data;
  },

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const { data, error } = await supabase
      .from('events')
      .update(updates)
      .eq('id', eventId)
      .select()
      .single();

    if (error) throw new Error('Refinement failure: Event immutable.');
    return data;
  },

  async deleteEvent(eventId: string): Promise<boolean> {
    const { error } = await supabase
      .from('events')
      .delete()
      .eq('id', eventId);

    if (error) throw new Error('Extraction failure: Event persistent.');
    return true;
  }
};
