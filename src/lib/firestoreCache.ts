/**
 * Firestore Cache Utility
 * Caches Firestore data in localStorage to reduce read operations.
 * Each cache entry has a TTL (time-to-live) after which it's considered stale.
 */

const CACHE_PREFIX = "lms_cache_";
const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export function getCached<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const entry: CacheEntry<T> = JSON.parse(raw);
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL) {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // localStorage full or unavailable
  }
}

export function clearCache(key?: string) {
  if (key) {
    localStorage.removeItem(CACHE_PREFIX + key);
  } else {
    // Clear all cache entries
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
  }
}

export function clearCacheByPrefix(prefix: string) {
  const fullPrefix = CACHE_PREFIX + prefix;
  const keys = Object.keys(localStorage).filter(k => k.startsWith(fullPrefix));
  keys.forEach(k => localStorage.removeItem(k));
}

// Cache TTL constants
export const CACHE_TTL = {
  COURSES: 10 * 60 * 1000,      // 10 minutes
  VIDEOS: 5 * 60 * 1000,        // 5 minutes
  SETTINGS: 15 * 60 * 1000,     // 15 minutes
  USERS: 3 * 60 * 1000,         // 3 minutes
  EXAMS: 5 * 60 * 1000,         // 5 minutes
  DASHBOARD: 2 * 60 * 1000,     // 2 minutes
};
