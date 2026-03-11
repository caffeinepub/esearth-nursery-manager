/**
 * Strict online-only sync hook.
 * - All reads/writes go directly to the backend canister.
 * - No localStorage or IndexedDB is used.
 * - When offline: last fetched data is shown read-only; writes are blocked.
 * - After every write: immediately re-fetches from backend.
 * - Polls every 5 seconds for live cross-device updates.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useActor } from "./useActor";
import { useOnlineStatus } from "./useOnlineStatus";

const POLL_INTERVAL = 5000;

export function useSharedBackendData<T>(
  key: string,
  defaultValue: T,
): {
  data: T;
  saveData: (newData: T) => Promise<void>;
  isLoading: boolean;
  isOnline: boolean;
} {
  const { actor } = useActor();
  const isOnline = useOnlineStatus();
  const [data, setData] = useState<T>(defaultValue);
  const [isLoading, setIsLoading] = useState(true);
  // Track last known serialized value to avoid redundant state updates
  const lastFetchedRef = useRef<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!actor || !navigator.onLine) return;
    try {
      const result = await actor.getSharedData(key);
      if (result !== null && result !== undefined) {
        const serialized =
          typeof result === "string" ? result : JSON.stringify(result);
        if (serialized !== lastFetchedRef.current) {
          lastFetchedRef.current = serialized;
          try {
            setData(JSON.parse(serialized) as T);
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e) {
      console.error(`[sync] Failed to fetch ${key}:`, e);
    } finally {
      setIsLoading(false);
    }
  }, [actor, key]);

  // Initial load
  useEffect(() => {
    if (actor) {
      fetchData();
    }
  }, [actor, fetchData]);

  // Poll every 5 seconds
  useEffect(() => {
    if (!actor) return;
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [actor, fetchData]);

  const saveData = useCallback(
    async (newData: T): Promise<void> => {
      if (!navigator.onLine) {
        console.warn(`[sync] Offline — write blocked for ${key}`);
        return;
      }
      if (!actor) return;

      const serialized = JSON.stringify(newData);

      // Optimistic local update so UI feels instant
      lastFetchedRef.current = serialized;
      setData(newData);

      try {
        await actor.setSharedData(key, serialized);
        // Confirm by re-fetching from backend
        await fetchData();
      } catch (e) {
        console.error(`[sync] Failed to save ${key}:`, e);
      }
    },
    [actor, key, fetchData],
  );

  return { data, saveData, isLoading, isOnline };
}
