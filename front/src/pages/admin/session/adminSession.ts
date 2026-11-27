import { createContext, useContext } from "react";

export interface AdminSessionValue {
  /** Called by data loaders on a 401: the session expired, show the login form again. */
  onUnauthorized: () => void;
  logout: () => Promise<void>;
}

export const AdminSessionContext = createContext<AdminSessionValue | null>(null);

export function useAdminSession(): AdminSessionValue {
  const value = useContext(AdminSessionContext);
  if (!value) throw new Error("useAdminSession outside <AdminGate>");
  return value;
}
