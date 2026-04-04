import { API_URL } from './apiConfig';
import { supabase } from './supabase';

export interface Task {
  id: string;
  hub_id: string;
  user_id: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'crucial';
  status: 'todo' | 'in_progress' | 'done' | 'blocked';
  due_date?: string;
  time_estimate?: number; 
  notes?: string;
  created_at?: string;
}

export const trackService = {
  async getTasks(hubId: string): Promise<Task[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/track/${hubId}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
    if (!response.ok) throw new Error('Registry disconnected: Missions unreachable.');
    return response.json();
  },

  async createTask(task: Partial<Task>): Promise<Task> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/track/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(task),
    });
    if (!response.ok) throw new Error('Deployment failure: Mission denied.');
    return response.json();
  },

  async updateTask(taskId: string, updates: Partial<Task>): Promise<Task> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/track/${taskId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error('Refinement failure: Logic denied.');
    return response.json();
  },

  async deleteTask(taskId: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/track/${taskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
    if (!response.ok) throw new Error('Extraction failure: Mission persistent.');
  }
};
