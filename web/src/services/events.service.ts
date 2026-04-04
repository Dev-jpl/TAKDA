

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const eventsService = {
  async getEvents(userId: string, hubId: string | null = null): Promise<CalendarEvent[]> {
    const url = new URL(`${API_URL}/events/`);
    url.searchParams.append('user_id', userId);
    if (hubId) url.searchParams.append('hub_id', hubId);

    const response = await fetch(url.toString());
    if (!response.ok) throw new Error('Registry Error: Calendar sync failed.');
    return response.json();
  },

  async createEvent(eventData: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await fetch(`${API_URL}/events/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventData),
    });
    
    if (!response.ok) throw new Error('Deployment failure: Event denied.');
    return response.json();
  },

  async updateEvent(eventId: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent> {
    const response = await fetch(`${API_URL}/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });

    if (!response.ok) throw new Error('Refinement failure: Event immutable.');
    return response.json();
  },

  async deleteEvent(eventId: string): Promise<boolean> {
    const response = await fetch(`${API_URL}/events/${eventId}`, {
      method: 'DELETE',
    });

    if (!response.ok) throw new Error('Extraction failure: Event persistent.');
    return true;
  }
};
