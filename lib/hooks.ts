import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { messageOf } from "./api";
import { todayLocal } from "./dates";

type State<T> = { key: string | null; data?: T; error?: string };

/**
 * Load data from the API when the component appears, and again whenever `key`
 * changes. Think of `key` as the name of the data: "diary:2026-11-07".
 *
 *   key = null  -> do not load yet (for example, still waiting for the date)
 *   reload()    -> fetch again, keeping the old data on screen meanwhile
 */
export function useApiData<T>(key: string | null, fetcher: () => Promise<T>) {
  const [state, setState] = useState<State<T>>({ key: null });
  const [attempt, setAttempt] = useState(0);

  // The fetcher is a new function on every render. Keep the latest one in a ref
  // so the effect below only re-runs when the key (or a reload) changes.
  const latestFetcher = useRef(fetcher);
  useEffect(() => {
    latestFetcher.current = fetcher;
  });

  useEffect(() => {
    if (key === null) return;
    let cancelled = false; // ignore answers that arrive after the key changed
    latestFetcher.current().then(
      (data) => {
        if (!cancelled) setState({ key, data });
      },
      (err: unknown) => {
        if (!cancelled) setState({ key, error: messageOf(err) });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, attempt]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  const isCurrent = state.key === key;
  return {
    data: isCurrent ? state.data : undefined,
    error: isCurrent ? state.error : undefined,
    loading: key !== null && !isCurrent,
    reload,
  };
}

const subscribeNever = () => () => {};

/**
 * Today's date (YYYY-MM-DD) in the user's time zone, or null while the page is
 * still rendering on the server, where the user's time zone is unknown.
 */
export function useToday(): string | null {
  return useSyncExternalStore(subscribeNever, todayLocal, () => null);
}

const currentOrigin = () => window.location.origin;

/** This site's address (for invite links), or null during the server render. */
export function useOrigin(): string | null {
  return useSyncExternalStore(subscribeNever, currentOrigin, () => null);
}
