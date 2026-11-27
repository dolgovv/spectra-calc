import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminApiError, adminApi } from "../api/adminApi";
import AdminLayout from "../components/AdminLayout";
import LoginForm from "../components/LoginForm";
import Panel from "../../../common/components/Panel";
import { AdminSessionContext } from "./adminSession";

type SessionState =
  | { kind: "checking" }
  | { kind: "anonymous" }
  | { kind: "authenticated" }
  /** The server has no ADMIN_PASSWORD, or could not be reached. */
  | { kind: "unavailable"; message: string };

/**
 * Renders the admin only for a logged-in session. The session itself is an HttpOnly cookie the
 * page cannot see, so the gate asks the server, and any later 401 sends it back here.
 */
export function AdminGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ kind: "checking" });

  useEffect(() => {
    let cancelled = false;
    adminApi.session().then(
      () => !cancelled && setState({ kind: "authenticated" }),
      (err: unknown) => {
        if (cancelled) return;
        if (err instanceof AdminApiError && err.status === 401) setState({ kind: "anonymous" });
        else setState({ kind: "unavailable", message: (err as Error).message });
      },
    );
    return () => {
      cancelled = true;
    };
  }, []);

  const onUnauthorized = useCallback(() => setState({ kind: "anonymous" }), []);
  const logout = useCallback(async () => {
    try {
      await adminApi.logout();
    } finally {
      setState({ kind: "anonymous" });
    }
  }, []);
  const value = useMemo(() => ({ onUnauthorized, logout }), [onUnauthorized, logout]);

  if (state.kind === "checking") return <AdminLayout />;
  if (state.kind === "anonymous") {
    return (
      <AdminLayout>
        <LoginForm onSuccess={() => setState({ kind: "authenticated" })} />
      </AdminLayout>
    );
  }
  if (state.kind === "unavailable") {
    return (
      <AdminLayout>
        <Panel className="mx-auto max-w-[460px] p-[26px]">
          <p className="font-mono text-[12.5px] leading-relaxed text-muted">{state.message}</p>
        </Panel>
      </AdminLayout>
    );
  }
  return <AdminSessionContext.Provider value={value}>{children}</AdminSessionContext.Provider>;
}
