import { API_BASE } from "../../../config";
import type {
  AdminOverview,
  CalculationDetail,
  CalculationRecord,
  Page,
  RequestLogRow,
  RouteSummary,
  StatusClass,
} from "../types";

const ADMIN_API = `${API_BASE}/api/admin`;

/** `status` 0 means the server could not be reached at all. */
export class AdminApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function messageOf(response: Response): Promise<string> {
  try {
    const { message } = (await response.json()) as { message?: string | string[] };
    if (message) return [message].flat().join("; ");
  } catch {
    // not JSON — fall through
  }
  return `Ошибка сервера (${response.status})`;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    // The session is an HttpOnly cookie scoped to /api/admin; in dev the API is another origin.
    response = await fetch(`${ADMIN_API}${path}`, { credentials: "include", ...init });
  } catch {
    throw new AdminApiError("Сервер недоступен", 0);
  }
  if (!response.ok) throw new AdminApiError(await messageOf(response), response.status);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") search.set(key, String(value));
  }
  const s = search.toString();
  return s ? `?${s}` : "";
}

/** Minutes east of UTC, so the server cuts days at the admin's midnight. */
const tz = () => -new Date().getTimezoneOffset();

export const adminApi = {
  session: () => request<{ authenticated: true }>("/session"),

  login: (password: string) =>
    request<void>("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    }),

  logout: () => request<void>("/logout", { method: "POST" }),

  overview: (days: number) => request<AdminOverview>(`/overview${query({ days, tz: tz() })}`),

  requests: ({
    includeAdmin,
    ...params
  }: {
    limit: number;
    offset: number;
    status?: StatusClass;
    search?: string;
    includeAdmin?: boolean;
  }) => request<Page<RequestLogRow>>(`/requests${query({ ...params, admin: includeAdmin ? 1 : undefined })}`),

  requestSummary: (days: number, includeAdmin = false) =>
    request<RouteSummary[]>(
      `/requests/summary${query({ days, tz: tz(), admin: includeAdmin ? 1 : undefined })}`,
    ),

  calculations: (params: { limit: number; offset: number; status?: "ok" | "error" }) =>
    request<Page<CalculationRecord>>(`/calculations${query(params)}`),

  calculation: (id: string) => request<CalculationDetail>(`/calculations/${encodeURIComponent(id)}`),
};

/** Plain links: the browser sends the session cookie with them, so downloads need no script. */
export const adminArchiveUrl = (id: string) => `${ADMIN_API}/calculations/${id}/archive`;

export const adminFileUrl = (id: string, name: string) =>
  `${ADMIN_API}/calculations/${id}/files/${name}`;
