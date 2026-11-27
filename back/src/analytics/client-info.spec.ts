import type { IncomingMessage } from 'node:http';
import { clientIp, isBot, normalizeRoute, referrerHost, visitorId } from './client-info';

const req = (headers: Record<string, string>, remoteAddress = '::ffff:172.18.0.3') =>
  ({ headers, socket: { remoteAddress } }) as unknown as IncomingMessage;

describe('clientIp', () => {
  it('takes the address the host nginx put in X-Real-IP', () => {
    expect(clientIp(req({ 'x-real-ip': '203.0.113.7' }))).toBe('203.0.113.7');
  });

  it('falls back to the socket, without the IPv4-mapped prefix', () => {
    expect(clientIp(req({}))).toBe('172.18.0.3');
  });

  it('ignores X-Forwarded-For, whose first entry the client controls', () => {
    expect(clientIp(req({ 'x-forwarded-for': '6.6.6.6, 203.0.113.7' }))).toBe('172.18.0.3');
  });
});

describe('normalizeRoute', () => {
  it.each([
    ['/files/2b1f0a3e-8c4d-4e5f-9a6b-7c8d9e0f1a2b/heatmap.png', '/files/:id/heatmap.png'],
    ['/api/admin/calculations?limit=50&offset=100', '/api/admin/calculations'],
    ['/api/items/42', '/api/items/:n'],
    ['/', '/'],
    ['?x=1', '/'],
  ])('%s → %s', (url, route) => {
    expect(normalizeRoute(url)).toBe(route);
  });
});

describe('referrerHost', () => {
  it('keeps only the host, without www', () => {
    expect(referrerHost('https://www.google.com/search?q=raman', 'spectra-calc.ru')).toBe('google.com');
  });

  it('drops our own site', () => {
    expect(referrerHost('https://www.spectra-calc.ru/example', 'spectra-calc.ru')).toBeNull();
  });

  it.each([undefined, '', 'not a url', 'about:blank'])('drops %j', (referrer) => {
    expect(referrerHost(referrer, 'spectra-calc.ru')).toBeNull();
  });
});

describe('visitorId', () => {
  it('is stable per address and browser, and does not contain the address', () => {
    const id = visitorId('203.0.113.7', 'Firefox');

    expect(id).toBe(visitorId('203.0.113.7', 'Firefox'));
    expect(id).not.toBe(visitorId('203.0.113.7', 'Chrome'));
    expect(id).not.toContain('203');
  });
});

describe('isBot', () => {
  it.each(['Googlebot/2.1', 'YandexBot/3.0', 'HeadlessChrome/120', null])('flags %j', (ua) => {
    expect(isBot(ua)).toBe(true);
  });

  it('lets a browser through', () => {
    expect(isBot('Mozilla/5.0 (Windows NT 10.0) Chrome/130.0 Safari/537.36')).toBe(false);
  });
});
