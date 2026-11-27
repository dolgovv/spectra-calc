import { useEffect, useRef, useState } from "react";
import { AdminApiError } from "../api/adminApi";
import { useAdminSession } from "../session/adminSession";

export interface AdminData<T> {
  /** The last successful load — kept while the next one is in flight, so nothing jumps. */
  data: T | undefined;
  loading: boolean;
  error: string | null;
}

/**
 * Loads admin data whenever `key` changes (put every input of `load` into it). A 401 means the
 * session ran out: the gate shows the login form instead of an error.
 */
export function useAdminData<T>(key: string, load: () => Promise<T>): AdminData<T> {
  const { onUnauthorized } = useAdminSession();
  const loadRef = useRef(load);
  loadRef.current = load;
  const [state, setState] = useState<AdminData<T>>({ data: undefined, loading: true, error: null });

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    loadRef.current().then(
      (data) => !cancelled && setState({ data, loading: false, error: null }),
      (err: unknown) => {
        if (cancelled) return;
        if (err instanceof AdminApiError && err.status === 401) {
          onUnauthorized();
          return;
        }
        setState((s) => ({ ...s, loading: false, error: (err as Error).message }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key, onUnauthorized]);

  return state;
}
