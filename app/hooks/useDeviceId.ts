import { useState, useEffect } from 'react';
import { getDeviceId, getCachedDeviceId } from '../utils/deviceId';

/**
 * Returns the stable anonymous device identifier.
 *
 * - Initialises synchronously from the in-memory cache if already loaded
 *   (e.g. after the first screen has mounted), avoiding a render cycle.
 * - Falls back to `null` while the first async load is in progress.
 *   Consumers should treat `null` as "not ready yet" and defer API calls.
 */
export function useDeviceId(): string | null {
  const [deviceId, setDeviceId] = useState<string | null>(getCachedDeviceId);

  useEffect(() => {
    if (deviceId) return; // already loaded from cache
    getDeviceId().then(setDeviceId);
  }, [deviceId]);

  return deviceId;
}
