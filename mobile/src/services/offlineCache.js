/**
 * offlineCache.js
 *
 * Two-layer read-through cache (memory + AsyncStorage) for network data.
 * Freshness: 5 minutes default. Stale data is returned immediately while
 * a background refresh happens — so the UI is never blocked by the network.
 *
 * Usage:
 *   const { data, stale } = await getCached('tasks:hub-1', () => fetchTasks(hubId))
 *   if (stale) setStaleWarning(true)
 *
 *   await invalidate('tasks:hub-1')   // after a write
 */

import AsyncStorage from '@react-native-async-storage/async-storage'

const DEFAULT_TTL_MS = 5 * 60 * 1000   // 5 minutes
const STORAGE_PREFIX = 'takda:cache:'

// In-memory layer — cleared on app restart
const _mem = new Map()


function now() { return Date.now() }


// ── Core read ─────────────────────────────────────────────────────────────────

/**
 * Get cached data for `key`.
 * If fresh: return immediately.
 * If stale (within 2x TTL): return old data AND trigger background refresh.
 * If expired / not found: fetch fresh, cache, return.
 *
 * @param {string}   key       Cache key (e.g. 'tasks:hub-1')
 * @param {function} fetcher   Async function that returns fresh data
 * @param {object}   options   { ttl?: number (ms), staleWhileRevalidate?: boolean }
 * @returns {{ data: any, stale: boolean }}
 */
export async function getCached(key, fetcher, { ttl = DEFAULT_TTL_MS, staleWhileRevalidate = true } = {}) {
  const storageKey = STORAGE_PREFIX + key
  const now_ms = now()

  // 1. Memory cache
  if (_mem.has(key)) {
    const { data, ts } = _mem.get(key)
    const age = now_ms - ts
    if (age < ttl) {
      return { data, stale: false }
    }
    if (staleWhileRevalidate && age < ttl * 2) {
      // Stale but usable — revalidate in background
      _refresh(key, storageKey, fetcher, ttl).catch(() => {})
      return { data, stale: true }
    }
  }

  // 2. AsyncStorage cache
  try {
    const raw = await AsyncStorage.getItem(storageKey)
    if (raw) {
      const cached = JSON.parse(raw)
      const age = now_ms - cached.ts
      if (age < ttl) {
        _mem.set(key, cached)
        return { data: cached.data, stale: false }
      }
      if (staleWhileRevalidate && age < ttl * 2) {
        _mem.set(key, cached)
        _refresh(key, storageKey, fetcher, ttl).catch(() => {})
        return { data: cached.data, stale: true }
      }
    }
  } catch { /* ignore parse errors */ }

  // 3. Fresh fetch
  const data = await fetcher()
  await _write(key, storageKey, data)
  return { data, stale: false }
}


/**
 * Write data directly to cache (useful after creating/updating data).
 */
export async function setCache(key, data) {
  const storageKey = STORAGE_PREFIX + key
  await _write(key, storageKey, data)
}


/**
 * Remove a key from both memory and AsyncStorage.
 * Call this after writes so the next read fetches fresh data.
 */
export async function invalidate(key) {
  _mem.delete(key)
  try {
    await AsyncStorage.removeItem(STORAGE_PREFIX + key)
  } catch { /* ignore */ }
}


/**
 * Invalidate all keys matching a prefix.
 * e.g. invalidatePrefix('tasks:') to bust all hub task caches.
 */
export async function invalidatePrefix(prefix) {
  for (const key of _mem.keys()) {
    if (key.startsWith(prefix)) _mem.delete(key)
  }
  try {
    const allKeys = await AsyncStorage.getAllKeys()
    const matching = allKeys.filter(k => k.startsWith(STORAGE_PREFIX + prefix))
    if (matching.length) await AsyncStorage.multiRemove(matching)
  } catch { /* ignore */ }
}


// ── Internals ──────────────────────────────────────────────────────────────────

async function _write(key, storageKey, data) {
  const entry = { data, ts: now() }
  _mem.set(key, entry)
  try {
    await AsyncStorage.setItem(storageKey, JSON.stringify(entry))
  } catch { /* ignore storage errors — memory cache still works */ }
}

async function _refresh(key, storageKey, fetcher, ttl) {
  const data = await fetcher()
  await _write(key, storageKey, data)
}
