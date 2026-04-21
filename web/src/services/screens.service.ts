import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export type WidgetType =
  | 'tasks' | 'notes' | 'docs' | 'outcomes' | 'hub_overview'
  | 'calorie_counter' | 'expense_tracker'
  | 'upcoming_events' | 'sleep_tracker' | 'workout_log'
  | 'space_pulse' | 'quick_clock' | 'weekly_progress' | 'upcoming_global' | 'strava_stats';

export interface Screen {
  id: string;
  space_id?: string | null;
  user_id: string;
  name: string;
  created_at: string;
  position?: number;
}

export interface ScreenWidget {
  id: string;
  screen_id: string;
  hub_id?: string | null;
  type: WidgetType;
  title?: string | null;
  position: number;
  config: Record<string, unknown>;
  created_at: string;
}

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session?.access_token}`,
  };
}

export const screensService = {
  /** All screens for a user across all spaces */
  async getUserScreens(userId: string): Promise<Screen[]> {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/screens/by-user/${userId}`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  /** Screens scoped to a specific space */
  async getScreens(spaceId: string): Promise<Screen[]> {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/screens/by-space/${spaceId}`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createScreen(userId: string, name: string, spaceId?: string): Promise<Screen> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/screens/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ user_id: userId, name, space_id: spaceId ?? null }),
    });
    if (!res.ok) throw new Error('Failed to create screen');
    return res.json();
  },

  async updateScreen(screenId: string, name?: string, position?: number): Promise<Screen> {
    const headers = await authHeaders();
    const body: Record<string, any> = {};
    if (name !== undefined) body.name = name;
    if (position !== undefined) body.position = position;

    const res = await fetch(`${API_URL}/screens/${screenId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error('Failed to update screen');
    return res.json();
  },

  async updateScreenPositions(updates: { id: string; position: number }[]): Promise<void> {
    await Promise.all(updates.map(u => this.updateScreen(u.id, undefined, u.position)));
  },

  async deleteScreen(screenId: string): Promise<void> {
    const headers = await authHeaders();
    await fetch(`${API_URL}/screens/${screenId}`, { method: 'DELETE', headers });
  },

  async getWidgets(screenId: string): Promise<ScreenWidget[]> {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API_URL}/screens/${screenId}/widgets`, { headers });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  },

  async createWidget(payload: {
    screen_id: string;
    hub_id?: string | null;
    type: WidgetType;
    title?: string;
    position?: number;
    config?: Record<string, unknown>;
  }): Promise<ScreenWidget> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/screens/widgets`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to create widget');
    return res.json();
  },

  async updateWidget(widgetId: string, patch: {
    hub_id?: string | null;
    title?: string;
    position?: number;
    config?: Record<string, unknown>;
  }): Promise<ScreenWidget> {
    const headers = await authHeaders();
    const res = await fetch(`${API_URL}/screens/widgets/${widgetId}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error('Failed to update widget');
    return res.json();
  },

  async deleteWidget(widgetId: string): Promise<void> {
    const headers = await authHeaders();
    await fetch(`${API_URL}/screens/widgets/${widgetId}`, { method: 'DELETE', headers });
  },
};
