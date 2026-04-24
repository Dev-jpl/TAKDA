const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export type AddonType = 'calorie_counter' | 'expense_tracker' | 'habit_tracker' | 'workout_log' | 'sleep_tracker' | (string & {});

export interface HubAddon {
  id: string;
  hub_id: string;
  user_id: string;
  type: AddonType;
  config: Record<string, unknown>;
  created_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  hub_id: string;
  food_name: string;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  meal_type: string;
  logged_at: string;
  created_at: string;
}

export interface Expense {
  id: string;
  user_id: string;
  hub_id: string;
  amount: number;
  item: string | null;
  merchant: string | null;
  category: string;
  currency: string;
  date: string;
  created_at: string;
}

// ── Addon CRUD ────────────────────────────────────────────────────────────────

export async function listAddons(hubId: string): Promise<HubAddon[]> {
  const res = await fetch(`${API}/addons/${hubId}`);
  if (!res.ok) throw new Error('Failed to fetch addons');
  return res.json();
}

export async function installAddon(hubId: string, userId: string, type: AddonType, config: Record<string, unknown> = {}): Promise<HubAddon> {
  const res = await fetch(`${API}/addons`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ hub_id: hubId, user_id: userId, type, config }),
  });
  if (!res.ok) throw new Error('Failed to install addon');
  return res.json();
}

export async function updateAddonConfig(addonId: string, config: Record<string, unknown>): Promise<void> {
  const res = await fetch(`${API}/addons/${addonId}/config`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ config }),
  });
  if (!res.ok) throw new Error('Failed to update addon config');
}

export async function uninstallAddon(addonId: string): Promise<void> {
  const res = await fetch(`${API}/addons/${addonId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to uninstall addon');
}

// ── Calorie Counter ───────────────────────────────────────────────────────────

export async function getFoodLogs(hubId: string, date?: string, userId?: string): Promise<FoodLog[]> {
  const url = new URL(`${API}/addons/${hubId}/calorie_counter/logs`);
  if (date) url.searchParams.set('date', date);
  if (userId) url.searchParams.set('user_id', userId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch food logs');
  return res.json();
}

export async function logFood(hubId: string, data: {
  user_id: string;
  food_name: string;
  calories?: number;
  protein_g?: number;
  carbs_g?: number;
  fat_g?: number;
  meal_type?: string;
  logged_at?: string;
}): Promise<FoodLog> {
  const res = await fetch(`${API}/addons/${hubId}/calorie_counter/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to log food');
  return res.json();
}

export async function deleteFoodLog(logId: string): Promise<void> {
  const res = await fetch(`${API}/addons/calorie_counter/logs/${logId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete food log');
}

// ── Expense Tracker ───────────────────────────────────────────────────────────

export async function getExpenses(hubId: string, month?: string, userId?: string): Promise<Expense[]> {
  const url = new URL(`${API}/addons/${hubId}/expense_tracker/logs`);
  if (month) url.searchParams.set('month', month);
  if (userId) url.searchParams.set('user_id', userId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch expenses');
  return res.json();
}

export async function logExpense(hubId: string, data: {
  user_id: string;
  amount: number;
  item?: string;
  merchant?: string;
  category?: string;
  currency?: string;
  date?: string;
}): Promise<Expense> {
  const res = await fetch(`${API}/addons/${hubId}/expense_tracker/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to log expense');
  return res.json();
}

export async function deleteExpense(expenseId: string): Promise<void> {
  const res = await fetch(`${API}/addons/expense_tracker/logs/${expenseId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete expense');
}
