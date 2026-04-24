import { supabase } from "./supabase";

import { API_URL } from './apiConfig';

export const hubsService = {
  // Get all hubs for a space
  async getHubs(spaceId) {
    const { data, error } = await supabase
      .from("hubs")
      .select("id, name, description, icon, color, space_id, order_index, hub_modules(*), hub_addons(id, type, config)")
      .eq("space_id", spaceId)
      .order("order_index");

    if (error) {
      console.warn('getHubs error:', error.message)
      return []
    }
    return data || [];
  },

  // Create a new hub under a space
  async createHub({ spaceId, userId, name, icon, color, description }) {
    const response = await fetch(`${API_URL}/hubs/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        space_id: spaceId,
        user_id: userId,
        name,
        icon,
        color,
        description,
      }),
    });
    return response.json();
  },

  // Update a hub
  async updateHub(hubId, updates) {
    const response = await fetch(`${API_URL}/hubs/${hubId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    return response.json();
  },

  // Delete a hub
  async deleteHub(hubId) {
    const response = await fetch(`${API_URL}/hubs/${hubId}`, {
      method: "DELETE",
    });
    return response.json();
  },

  // Reorder hubs in a space
  async reorderHubs(hubIds) {
    const response = await fetch(`${API_URL}/hubs/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hub_ids: hubIds }),
    });
    return response.json();
  },

  // Enable a core module on a hub
  async addModule(hubId, moduleName) {
    const res = await fetch(`${API_URL}/hubs/${hubId}/modules/${moduleName}`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to add module');
    return res.json();
  },

  // Disable a core module on a hub
  async removeModule(hubId, moduleName) {
    const res = await fetch(`${API_URL}/hubs/${hubId}/modules/${moduleName}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to remove module');
    return res.json();
  },
};
