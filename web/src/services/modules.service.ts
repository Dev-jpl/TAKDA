import type { UIDefinition } from '@/types/ui-builder';
import type { ModuleDefinitionV2 } from '@/types/module-creator';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// ── Legacy field types (kept for backward compat with existing UIBuilder) ─────

export type FieldType = 'text' | 'string' | 'number' | 'boolean' | 'date' | 'datetime' | 'select' | 'counter';

export interface FieldConfig {
  min?: number;
  max?: number;
  unit?: string;
  goal?: number;
  step?: number;
  options?: string[];
  placeholder?: string;
}

export interface SchemaField {
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  config?: FieldConfig;
}

export interface AlyConfig {
  intent_keywords: string[];
  context_hint: string;
  log_prompt: string;
}

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
  ui_definition?: UIDefinition | null;
  status?: 'draft' | 'published' | 'archived';
  price?: number | string | null;
  brand_color?: string | null;
  icon_name?: string | null;
  version?: number;
  updated_at?: string;
  created_at: string;
}

export interface ModuleEntry {
  id: string;
  module_def_id: string;
  user_id: string;
  hub_id: string | null;
  data: Record<string, any>;
  schema_key?: string;
  created_at: string;
}

// ── V2 API functions ──────────────────────────────────────────────────────────

export async function getModuleDefinitionById(defId: string): Promise<ModuleDefinitionV2> {
  const res = await fetch(`${API}/modules/definitions/${defId}`);
  if (!res.ok) throw new Error('Failed to fetch module definition');
  return res.json();
}

export async function autosaveModuleDefinition(defId: string, patch: Partial<ModuleDefinitionV2>): Promise<void> {
  await fetch(`${API}/modules/definitions/${defId}/autosave`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
}

export async function publishModuleDefinition(
  defId: string,
  visibility: 'private' | 'unlisted' | 'public',
  notes: string,
): Promise<ModuleDefinitionV2> {
  const res = await fetch(`${API}/modules/definitions/${defId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ visibility, notes }),
  });
  if (!res.ok) throw new Error('Failed to publish module definition');
  return res.json();
}

export async function getModuleEntriesBySchemaKey(
  defId: string,
  schemaKey: string,
  hubId?: string,
  userId?: string,
): Promise<ModuleEntry[]> {
  const url = new URL(`${API}/modules/${defId}/entries`);
  url.searchParams.set('schema_key', schemaKey);
  if (hubId)  url.searchParams.set('hub_id',  hubId);
  if (userId) url.searchParams.set('user_id', userId);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('Failed to fetch module entries');
  return res.json();
}

// ── Legacy API functions (unchanged) ─────────────────────────────────────────

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

export async function createModuleEntry(
  defId: string,
  data: Record<string, unknown>,
  userId: string,
  hubId?: string,
  schemaKey?: string,
): Promise<ModuleEntry> {
  const res = await fetch(`${API}/modules/${defId}/entries`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, hub_id: hubId, data, schema_key: schemaKey ?? 'default' }),
  });
  if (!res.ok) throw new Error('Failed to create module entry');
  return res.json();
}

export async function updateModuleEntry(
  defId: string,
  entryId: string,
  data: Record<string, any>,
  userId: string,
  hubId?: string,
): Promise<ModuleEntry> {
  const res = await fetch(`${API}/modules/${defId}/entries/${entryId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, hub_id: hubId, data }),
  });
  if (!res.ok) throw new Error('Failed to update module entry');
  return res.json();
}

export async function deleteModuleEntry(entryId: string): Promise<void> {
  const res = await fetch(`${API}/modules/entries/${entryId}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete module entry');
}
