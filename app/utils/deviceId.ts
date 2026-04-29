import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@moody/device_id';

/** In-process cache — avoids repeated AsyncStorage reads in the same session. */
let _cached: string | null = null;

/** Minimal UUID v4 generator — no external deps needed. */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/**
 * Returns a stable, anonymous device identifier.
 *
 * Lifecycle:
 *   - First call   → generates UUID, persists in AsyncStorage, caches in memory
 *   - Same session → returns in-memory cache (synchronous-like performance)
 *   - App restart  → reads from AsyncStorage (persisted across restarts)
 *   - Reinstall    → new UUID generated (profile resets, acceptable for MVP)
 */
export async function getDeviceId(): Promise<string> {
  if (_cached) return _cached;

  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      _cached = stored;
      return stored;
    }
  } catch {
    // AsyncStorage unavailable — fall through to generate ephemeral ID
  }

  const newId = generateUUID();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, newId);
  } catch {
    // Persist failed — still return a valid ID for this session
  }
  _cached = newId;
  return newId;
}

/** Synchronous read of the in-memory cache. Returns null before first async call. */
export function getCachedDeviceId(): string | null {
  return _cached;
}
