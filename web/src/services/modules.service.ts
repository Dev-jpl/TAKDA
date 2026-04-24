const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface ModuleDefinition {
  id: string;
  user_id: string | null;
  slug: string;
  name: string;
  description: string;
  schema: any[];
  layout: Record<string, any>;
  is_global: boolean;
  price?: number | string | null;
  brand_color?: string | null;
  icon_name?: string | null;
  created_at: string;
}

export interface ModuleEntry {
  id: string;
  module_def_id: string;
  user_id: string;
  hub_id: string | null;
  data: Record<string, any>;
  created_at: string;
}

export async function getModuleDefinitions(): Promise<ModuleDefinition[]> {
  const res = await fetch(`${API}/modules/definitions`);
  if (!res.ok) throw new Error('Failed to fetch module definitions');
  return res.json();
}

export async function createModuleDefinition(data: Partial<ModuleDefinition>): Promise<ModuleDefinition> {
  const res = await fetch(`${API}/modules/definitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create module definition');
  return res.json();
}

export async function updateModuleDefinition(defId: string, data: Partial<ModuleDefinition>): Promise<ModuleDefinition> {
  const res = await fetch(`${API}/modules/definitions/${defId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update module definition');
  return res.json();
}

export async function getModuleEntries(defId: string, hubId?: string, userId?: string): Promise<ModuleEntry[]> {
  const url = new URL(`${API}/modules/${defId}/entries`);
  if (hubId) url.searchParams.set('hub_id', hubId);
  if (userId) url.searchParams.set('user_id', userId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch module entries');
  return res.json();
}

export async function createModuleEntry(defId: string, data: Record<string, any>, userId: string, hubId?: string): Promise<ModuleEntry> {
  const res = await fetch(`${API}/modules/${defId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, hub_id: hubId, data }),
  });
  if (!res.ok) throw new Error('Failed to create module entry');
  return res.json();
}

export async function deleteModuleEntry(entryId: string): Promise<void> {
  const res = await fetch(`${API}/modules/entries/${entryId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete module entry');
}
