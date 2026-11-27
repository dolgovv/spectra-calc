import { HttpStatus, NotFoundException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { IncomingMessage } from 'node:http';
import { AdminAuthService, readSessionCookie, SESSION_TTL_MS } from './admin-auth.service';
import { AdminGuard } from './admin.guard';
import { fakeConfig } from '../../test/helpers/spectra-zip';

const auth = (adminPassword?: string) => new AdminAuthService(fakeConfig({ adminPassword }));

function contextWithCookie(cookie?: string): ExecutionContext {
  const req = { headers: { cookie } };
  return { switchToHttp: () => ({ getRequest: () => req }) } as unknown as ExecutionContext;
}

describe('AdminAuthService', () => {
  it('is disabled without a password', () => {
    expect(auth().enabled).toBe(false);
    expect(auth().checkPassword('', null)).toBe(false);
  });

  it('accepts the password and only the password', () => {
    const service = auth('secret');

    expect(service.checkPassword('secret', '1.1.1.1')).toBe(true);
    expect(service.checkPassword('Secret', '1.1.1.1')).toBe(false);
    expect(service.checkPassword('secret ', '1.1.1.1')).toBe(false);
  });

  describe('lockout', () => {
    it('locks an address out for 15 minutes after ten failures', () => {
      const service = auth('secret');
      const now = 1_000_000;
      for (let i = 0; i < 10; i++) service.checkPassword('wrong', '1.1.1.1', now);

      expect(() => service.checkPassword('secret', '1.1.1.1', now)).toThrow(
        expect.objectContaining({ status: HttpStatus.TOO_MANY_REQUESTS }),
      );
      expect(service.checkPassword('secret', '2.2.2.2', now)).toBe(true);
      expect(service.checkPassword('secret', '1.1.1.1', now + 15 * 60_000)).toBe(true);
    });

    it('forgets the failures after a successful login', () => {
      const service = auth('secret');
      for (let i = 0; i < 9; i++) service.checkPassword('wrong', '1.1.1.1');
      service.checkPassword('secret', '1.1.1.1');
      for (let i = 0; i < 9; i++) service.checkPassword('wrong', '1.1.1.1');

      expect(service.checkPassword('secret', '1.1.1.1')).toBe(true);
    });
  });

  describe('sessions', () => {
    it('verifies its own session until it expires', () => {
      const service = auth('secret');
      const token = service.issueSession(0);

      expect(service.verifySession(token, SESSION_TTL_MS - 1)).toBe(true);
      expect(service.verifySession(token, SESSION_TTL_MS)).toBe(false);
    });

    it('rejects a session with an extended expiry', () => {
      const service = auth('secret');
      const [expiry, signature] = service.issueSession(0).split('.');

      expect(service.verifySession(`${Number(expiry) * 2}.${signature}`, 0)).toBe(false);
    });

    it('logs everyone out when the password changes', () => {
      const token = auth('old').issueSession();

      expect(auth('new').verifySession(token)).toBe(false);
    });

    it.each([undefined, '', 'garbage', '.', '123.', 'abc.def'])('rejects %j', (token) => {
      expect(auth('secret').verifySession(token)).toBe(false);
    });
  });
});

describe('AdminGuard', () => {
  it('answers 404 while the admin is not configured', () => {
    expect(() => new AdminGuard(auth()).canActivate(contextWithCookie())).toThrow(NotFoundException);
  });

  it('answers 401 without a valid session', () => {
    const guard = new AdminGuard(auth('secret'));

    expect(() => guard.canActivate(contextWithCookie())).toThrow(UnauthorizedException);
    expect(() => guard.canActivate(contextWithCookie('spectra_admin=1.x'))).toThrow(
      UnauthorizedException,
    );
  });

  it('lets a valid session through', () => {
    const service = auth('secret');
    const cookie = `theme=dark; spectra_admin=${service.issueSession()}; other=1`;

    expect(new AdminGuard(service).canActivate(contextWithCookie(cookie))).toBe(true);
  });
});

describe('readSessionCookie', () => {
  const read = (cookie?: string) => readSessionCookie({ headers: { cookie } } as IncomingMessage);

  it('finds the session among other cookies', () => {
    expect(read('a=1; spectra_admin=123.abc; b=2')).toBe('123.abc');
  });

  it('does not match a cookie whose name merely starts the same', () => {
    expect(read('spectra_admin_old=1')).toBeUndefined();
  });

  it('copes with no cookies at all', () => {
    expect(read()).toBeUndefined();
  });
});
