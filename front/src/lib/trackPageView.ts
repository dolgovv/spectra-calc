import { API_BASE } from "../config";

/**
 * Reports page views to the backend for the admin's visit statistics.
 *
 * sendBeacon with a urlencoded body: it survives the page unloading, needs no CORS preflight in
 * dev, and the response is never needed. Where the browser lacks it (and in jsdom) this is a
 * no-op — statistics must never break the page.
 */
export function createPageViewTracker(endpoint = `${API_BASE}/api/track`) {
  // An SPA keeps document.referrer for its whole life: only the first view came from it.
  let referrerSent = false;

  return function trackPageView(path: string): void {
    if (path.startsWith("/admin")) return;
    if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;

    const body = new URLSearchParams({ path });
    if (!referrerSent) {
      referrerSent = true;
      if (document.referrer) body.set("referrer", document.referrer);
    }
    try {
      navigator.sendBeacon(endpoint, body);
    } catch {
      // A blocked beacon (extensions, CSP) is not the visitor's problem.
    }
  };
}

export const trackPageView = createPageViewTracker();
