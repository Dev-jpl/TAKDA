import { supabase } from './supabase';
import { API_URL } from './apiConfig';

export interface Delivery {
  id: string;
  hub_id: string;
  user_id: string;
  content: string;
  type: 'update' | 'decision' | 'delivered' | 'question';
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface DeliveryCreate {
  hub_id: string;
  user_id: string;
  content: string;
  type: string;
  metadata?: Record<string, unknown>;
}

export const deliverService = {
  async getDeliveries(hubId: string): Promise<Delivery[]> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/deliver/${hubId}`, {
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
    if (!response.ok) {
      console.error(`Registry Error: Deliver extraction failed [${response.status}]`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  },

  async createDelivery(payload: DeliveryCreate): Promise<Delivery> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/deliver`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Dispatch deployment failure [${response.status}]`);
    }
    return response.json();
  },

  async deleteDelivery(id: string): Promise<void> {
    const { data: { session } } = await supabase.auth.getSession();
    const response = await fetch(`${API_URL}/deliver/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${session?.access_token}` },
    });
    if (!response.ok) {
      throw new Error(`Dispatch extraction failure [${response.status}]`);
    }
  }
};
