import { supabase } from "./supabase";

import { API_URL } from './apiConfig';

export const spacesService = {
  // Get all spaces (categories) for a user
  async getSpaces(userId) {
    const { data, error } = await supabase
      .from("spaces")
      .select("*, hubs(*)")
      .eq("user_id", userId)
      .order("order_index");

    if (error) {
      console.warn('getSpaces error:', error.message)
      return []
    }
    return data || [];
  },

  // Create a new space (category)
  async createSpace({ userId, name, icon, color, category, description }) {
    const response = await fetch(`${API_URL}/spaces/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId,
        name,
        icon,
        color,
        category: category || "personal",
        description,
      }),
    });
    return response.json();
  },

  // Update a space
  async updateSpace(spaceId, updates) {
    const { data, error } = await supabase
      .from("spaces")
      .update(updates)
      .eq("id", spaceId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Delete a space
  async deleteSpace(spaceId) {
    const { error } = await supabase.from("spaces").delete().eq("id", spaceId);

    if (error) throw error;
    return true;
  },

  // Reorder spaces
  async reorderSpaces(spaceIds) {
    const response = await fetch(`${API_URL}/spaces/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ space_ids: spaceIds }),
    });
    return response.json();
  },
};
