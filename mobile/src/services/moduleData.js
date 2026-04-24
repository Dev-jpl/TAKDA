/**
 * moduleData.js
 *
 * Single source of truth for module_definitions + module_entries.
 * Mirrors the web's modules.service.ts but reads Supabase directly (no local API hop).
 *
 * Caching layers:
 *   1. In-memory  – fastest, cleared on app restart
 *   2. AsyncStorage – survives restarts, has TTL
 *   3. Supabase   – always authoritative
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// ── TTLs ─────────────────────────────────────────────────────────────────────
const DEFS_TTL   = 60 * 60 * 1000  // module definitions: 1 hour (rarely change)
const ENTRIES_TTL = 30 * 1000       // entries: 30 s (frequent writes)

// ── Storage keys ──────────────────────────────────────────────────────────────
const DEFS_STORAGE_KEY = 'takda:module_defs_v2'

// ── In-memory state ───────────────────────────────────────────────────────────
let _defsCache = null               // { data: ModuleDefinition[], ts: number }
const _entryCache = {}              // `${defId}:${hubId}` → { data, ts }
let _defsInflight = null            // promise deduplication

// ── Helpers ───────────────────────────────────────────────────────────────────
function now() { return Date.now() }

// ── Module Definitions ────────────────────────────────────────────────────────

async function _fetchDefs() {
  const { data, error } = await supabase.from('module_definitions').select('*')
  if (error) throw error
  return data ?? []
}

/**
 * Get all module definitions.
 * Warm path (in-memory) returns synchronously via getDefsSync().
 */
export async function getDefinitions(force = false) {
  // 1. In-memory
  if (!force && _defsCache && now() - _defsCache.ts < DEFS_TTL) {
    return _defsCache.data
  }

  // 2. AsyncStorage (skip on force refresh)
  if (!force) {
    try {
      const raw = await AsyncStorage.getItem(DEFS_STORAGE_KEY)
      if (raw) {
        const cached = JSON.parse(raw)
        if (now() - cached.ts < DEFS_TTL) {
          _defsCache = cached
          // Kick off a background refresh so next session is warm
          getDefinitions(true).catch(() => {})
          return cached.data
        }
      }
    } catch { /* ignore parse errors */ }
  }

  // 3. Supabase (deduplicate concurrent calls)
  if (_defsInflight) return _defsInflight
  _defsInflight = _fetchDefs()
    .then(data => {
      _defsCache = { data, ts: now() }
      AsyncStorage.setItem(DEFS_STORAGE_KEY, JSON.stringify(_defsCache)).catch(() => {})
      return data
    })
    .finally(() => { _defsInflight = null })

  return _defsInflight
}

/** Synchronous read from in-memory cache (may be null if not yet loaded). */
export function getDefsSync() {
  return _defsCache?.data ?? null
}

/** Get a single definition by slug. */
export async function getDefBySlug(slug) {
  const defs = await getDefinitions()
  return defs.find(d => d.slug === slug) ?? null
}

/** Get a single definition by id. */
export async function getDefById(id) {
  const defs = await getDefinitions()
  return defs.find(d => d.id === id) ?? null
}

/** Invalidate definition cache (call after module creator saves). */
export function invalidateDefs() {
  _defsCache = null
  AsyncStorage.removeItem(DEFS_STORAGE_KEY).catch(() => {})
}

// ── Module Entries ─────────────────────────────────────────────────────────────

function _entryCacheKey(defId, hubId) {
  return `${defId}:${hubId ?? 'global'}`
}

/**
 * Fetch entries for a module + hub.
 * Returns cached data immediately, then re-fetches if stale.
 *
 * @returns {{ data: ModuleEntry[], fromCache: boolean }}
 */
export async function getEntries(defId, hubId, userId, { limit = 200, dateFilter } = {}) {
  const key = _entryCacheKey(defId, hubId)
  const cached = _entryCache[key]

  // Build fetcher
  async function fetch() {
    let q = supabase
      .from('module_entries')
      .select('*')
      .eq('module_def_id', defId)

    if (hubId && hubId !== 'null') q = q.eq('hub_id', hubId)
    if (userId)                     q = q.eq('user_id', userId)
    if (dateFilter)                 q = q.filter('data->>' + dateFilter.field, 'like', `${dateFilter.value}%`)

    const { data, error } = await q.order('created_at', { ascending: false }).limit(limit)
    if (error) throw error

    const entries = data ?? []
    _entryCache[key] = { data: entries, ts: now() }
    return entries
  }

  // Return cache immediately + background refresh if stale
  if (cached) {
    const stale = now() - cached.ts > ENTRIES_TTL
    if (stale) fetch().catch(() => {}) // background
    return { data: cached.data, fromCache: true }
  }

  const data = await fetch()
  return { data, fromCache: false }
}

/** Add a new entry. Invalidates cache and returns the new row. */
export async function addEntry(defId, hubId, userId, entryData) {
  const { data, error } = await supabase
    .from('module_entries')
    .insert({ module_def_id: defId, hub_id: hubId, user_id: userId, data: entryData })
    .select('*')
  if (error) throw error
  // Invalidate so next load is fresh
  delete _entryCache[_entryCacheKey(defId, hubId)]
  return data[0]
}

/** Delete an entry. Removes from cache optimistically. */
export async function deleteEntry(entryId, defId, hubId) {
  // Optimistic: remove from in-memory cache
  const key = _entryCacheKey(defId, hubId)
  if (_entryCache[key]) {
    _entryCache[key].data = _entryCache[key].data.filter(e => e.id !== entryId)
  }
  await supabase.from('module_entries').delete().eq('id', entryId)
}

/** Force invalidate entries cache for a specific module + hub. */
export function invalidateEntries(defId, hubId) {
  delete _entryCache[_entryCacheKey(defId, hubId)]
}
