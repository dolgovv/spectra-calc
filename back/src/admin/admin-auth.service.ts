import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import type { AppConfig } from '../config/configuration';

export const SESSION_COOKIE = 'spectra_admin';
/** Scoped to the admin API: the cookie never rides along with the public endpoints. */
export const SESSION_COOKIE_PATH = '/api/admin';
export const SESSION_TTL_MS = 7 * 86_400_000;

const MAX_FAILURES = 10;
const FAILURE_WINDOW_MS = 15 * 60_000;

function sha256(value: string): Buffer {
  return createHash('sha256').update(value).digest();
}

/**
 * One shared password (ADMIN_PASSWORD) traded for a signed, expiring session cookie.
 *
 * The signing key is derived from the password, so sessions survive a restart (every deploy is
 * one) and changing the password logs everyone out. Stateless on purpose: there is a single admin
 * and nothing to revoke individually.
 */
@Injectable()
export class AdminAuthService {
  private readonly passwordDigest?: Buffer;
  private readonly signingKey?: Buffer;
  /** Failed logins per IP. In memory: a restart resetting the counters is acceptable. */
  private readonly failures = new Map<string, { count: number; resetAt: number }>();

  constructor(config: ConfigService<AppConfig, true>) {
    const password = config.get('adminPassword', { infer: true });
    if (password) {
      this.passwordDigest = sha256(password);
      this.signingKey = sha256(`spectra-calc admin session\0${password}`);
    }
  }

  get enabled(): boolean {
    return this.passwordDigest !== undefined;
  }

  /**
   * Compares in constant time (digests, so lengths always match). Throws 429 once an address has
   * used up its attempts, before even looking at the password.
   */
  checkPassword(password: string, ip: string | null, now = Date.now()): boolean {
    const key = ip ?? 'unknown';
    const record = this.failures.get(key);
    if (record && record.resetAt > now && record.count >= MAX_FAILURES) {
      throw new HttpException(
        'Слишком много неудачных попыток входа. Попробуйте через 15 минут.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    const ok = !!this.passwordDigest && timingSafeEqual(sha256(password), this.passwordDigest);
    if (ok) {
      this.failures.delete(key);
    } else {
      this.recordFailure(key, now);
    }
    return ok;
  }

  issueSession(now = Date.now()): string {
    const expiresAt = String(now + SESSION_TTL_MS);
    return `${expiresAt}.${this.sign(expiresAt)}`;
  }

  verifySession(token: string | undefined, now = Date.now()): boolean {
    if (!token || !this.signingKey) return false;
    const [expiresAt, signature] = token.split('.');
    if (!expiresAt || !signature || !(Number(expiresAt) > now)) return false;
    const expected = Buffer.from(this.sign(expiresAt));
    const actual = Buffer.from(signature);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  }

  private sign(value: string): string {
    return createHmac('sha256', this.signingKey!).update(value).digest('base64url');
  }

  private recordFailure(key: string, now: number): void {
    // Bounded: entries past their window are useless, drop them before the map can balloon.
    if (this.failures.size > 1000) {
      for (const [k, v] of this.failures) if (v.resetAt <= now) this.failures.delete(k);
    }
    const record = this.failures.get(key);
    if (!record || record.resetAt <= now) {
      this.failures.set(key, { count: 1, resetAt: now + FAILURE_WINDOW_MS });
    } else {
      record.count++;
    }
  }
}

/** Express reads cookies only with cookie-parser; one cookie does not justify the dependency. */
export function readSessionCookie(req: IncomingMessage): string | undefined {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [name, ...rest] = part.trim().split('=');
    if (name === SESSION_COOKIE) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}
