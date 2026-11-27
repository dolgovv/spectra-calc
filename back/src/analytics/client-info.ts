import { createHash } from 'node:crypto';
import type { IncomingMessage } from 'node:http';

const MAX_PATH = 512;
const MAX_USER_AGENT = 300;

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NUMERIC_SEGMENT = /^\d+$/;
const BOT_USER_AGENT = /bot|crawl|spider|slurp|headless|lighthouse|preview|monitor/i;

/**
 * The visitor's address. X-Real-IP is trusted because in production it is set (overwritten, not
 * appended) by the host's nginx, and the containers are only reachable through it: the web
 * container listens on 127.0.0.1 and the back one is not published at all. X-Forwarded-For is
 * not used — the host appends to whatever the client sent, so its first entry is forgeable.
 */
export function clientIp(req: IncomingMessage): string | null {
  const header = req.headers['x-real-ip'];
  const raw = (typeof header === 'string' && header.trim()) || req.socket.remoteAddress || null;
  return raw ? raw.replace(/^::ffff:/, '') : null;
}

export function userAgent(req: IncomingMessage): string | null {
  const ua = req.headers['user-agent'];
  return ua ? ua.slice(0, MAX_USER_AGENT) : null;
}

export function isBot(ua: string | null): boolean {
  return !ua || BOT_USER_AGENT.test(ua);
}

export function truncatePath(path: string): string {
  return path.slice(0, MAX_PATH);
}

/**
 * Groups URLs by endpoint for the per-route summary: the query is dropped and ids are folded,
 * so /files/<uuid>/heatmap.png becomes /files/:id/heatmap.png.
 */
export function normalizeRoute(url: string): string {
  const path = url.split('?')[0] || '/';
  return truncatePath(
    path
      .split('/')
      .map((segment) =>
        UUID_SEGMENT.test(segment) ? ':id' : NUMERIC_SEGMENT.test(segment) ? ':n' : segment,
      )
      .join('/'),
  );
}

/**
 * A stable pseudonymous id for counting unique visitors without cookies or client storage.
 * Not a security boundary: it only has to be stable per browser and not store the raw address.
 */
export function visitorId(ip: string | null, ua: string | null): string {
  return createHash('sha256')
    .update(`${ip ?? ''}\n${ua ?? ''}`)
    .digest('hex')
    .slice(0, 16);
}

/** Host of an external referrer, or null for none, a malformed one, or our own site. */
export function referrerHost(referrer: string | undefined, ownHost: string | undefined): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).host.toLowerCase().replace(/^www\./, '');
    if (!host) return null;
    if (ownHost && host === ownHost.toLowerCase().replace(/^www\./, '')) return null;
    return host.slice(0, 200);
  } catch {
    return null;
  }
}
