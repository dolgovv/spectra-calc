/** Base URL of the SpectraCalc backend. Override with VITE_API_URL at build/dev time. */
export const API_BASE = (
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3000'
).replace(/\/$/, '');
