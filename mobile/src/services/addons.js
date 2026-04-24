import { API_URL } from './apiConfig';

export const addonsService = {
  async listAddons(hubId) {
    try {
      const res = await fetch(`${API_URL}/addons/${hubId}`);
      if (!res.ok) return [];
      return res.json();
    } catch { return []; }
  },

  // ── Calorie Counter ───────────────────────────────────────────────────────

  async getFoodLogs(hubId, date, userId) {
    try {
      const url = `${API_URL}/addons/${hubId}/calorie_counter/logs?` + 
        (date ? `date=${date}&` : '') + 
        (userId ? `user_id=${userId}` : '');
      console.log(`[AddonsService] GET ${url}`);
      const res = await fetch(url);
      console.log(`[AddonsService] Response status: ${res.status}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data;
    } catch (err) {
      console.error('[AddonsService] Fetch error:', err);
      return [];
    }
  },

  async logFood(hubId, data) {
    const res = await fetch(`${API_URL}/addons/${hubId}/calorie_counter/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to log food');
    return res.json();
  },

  async deleteFoodLog(logId) {
    await fetch(`${API_URL}/addons/calorie_counter/logs/${logId}`, { method: 'DELETE' });
  },

  // ── Expense Tracker ───────────────────────────────────────────────────────

  async getExpenses(hubId, month, userId) {
    try {
      const url = `${API_URL}/addons/${hubId}/expense_tracker/logs?` + 
        (month ? `month=${month}&` : '') + 
        (userId ? `user_id=${userId}` : '');
      const res = await fetch(url);
      if (!res.ok) return [];
      return res.json();
    } catch { return []; }
  },

  async logExpense(hubId, data) {
    const res = await fetch(`${API_URL}/addons/${hubId}/expense_tracker/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to log expense');
    return res.json();
  },

  async deleteExpense(expenseId) {
    await fetch(`${API_URL}/addons/expense_tracker/logs/${expenseId}`, { method: 'DELETE' });
  },

  // ── Addon install / uninstall ─────────────────────────────────────────────

  async installAddon(hubId, userId, type) {
    const res = await fetch(`${API_URL}/addons`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hub_id: hubId, user_id: userId, type }),
    });
    if (!res.ok) throw new Error('Failed to install addon');
    return res.json();
  },

  async uninstallAddon(addonId) {
    const res = await fetch(`${API_URL}/addons/${addonId}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to uninstall addon');
  },
};
