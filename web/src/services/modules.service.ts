const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Schema field types ────────────────────────────────────────────────────────

export type FieldType = 'text' | 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'select' | 'counter';

export interface FieldConfig {
  // number + counter
  min?: number;
  max?: number;
  unit?: string;
  goal?: number;
  step?: number;
  // select
  options?: string[];
  // text
  placeholder?: string;
}

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  config?: FieldConfig;
}

// ── Aly integration config ────────────────────────────────────────────────────

export interface AlyConfig {
  /** Words/phrases that trigger loading this module in context */
  intent_keywords: string[];
  /** One-sentence description Aly uses when referencing this module */
  context_hint: string;
  /** Example of how to log an entry via chat */
  log_prompt: string;
}

// ── Module definition ─────────────────────────────────────────────────────────

export interface ModuleDefinition {
  id: string;
  user_id: string | null;
  slug: string;
  name: string;
  description: string;
  schema: SchemaField[];
  layout: Record<string, unknown>;
  is_global: boolean;
  is_private: boolean;
  aly_config: AlyConfig;
  price?: number | string | null;
  brand_color?: string | null;
  icon_name?: string | null;
  created_at: string;
}

// ── Module entry ──────────────────────────────────────────────────────────────

export interface ModuleEntry {
  id: string;
  module_def_id: string;
  user_id: string;
  hub_id: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: Record<string, any>;   // Generic JSONB — schema varies by module definition
  created_at: string;
}

// ── API helpers ───────────────────────────────────────────────────────────────

export async function getModuleDefinitions(userId?: string): Promise<ModuleDefinition[]> {
  const url = new URL(`${API}/modules/definitions`);
  if (userId) url.searchParams.set('user_id', userId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch module definitions');
  return res.json();
}

export async function createModuleDefinition(data: Partial<ModuleDefinition> & { schema_fields?: SchemaField[] }): Promise<ModuleDefinition> {
  const res = await fetch(`${API}/modules/definitions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create module definition');
  return res.json();
}

export async function updateModuleDefinition(defId: string, data: Partial<ModuleDefinition> & { schema_fields?: SchemaField[] }): Promise<ModuleDefinition> {
  const res = await fetch(`${API}/modules/definitions/${defId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update module definition');
  return res.json();
}

export async function deleteModuleDefinition(defId: string): Promise<void> {
  await fetch(`${API}/modules/definitions/${defId}`, { method: 'DELETE' });
}

export async function getModuleEntries(defId: string, hubId?: string, userId?: string): Promise<ModuleEntry[]> {
  const url = new URL(`${API}/modules/${defId}/entries`);
  if (hubId)  url.searchParams.set('hub_id',  hubId);
  if (userId) url.searchParams.set('user_id', userId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch module entries');
  return res.json();
}

export async function createModuleEntry(defId: string, data: Record<string, unknown>, userId: string, hubId?: string): Promise<ModuleEntry> {
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
