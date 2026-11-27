import { describe, expect, it, vi } from 'vitest';
import { createPageViewTracker } from './trackPageView';

function stubBeacon() {
  const sendBeacon = vi.fn<(url: string, body: URLSearchParams) => boolean>(() => true);
  vi.stubGlobal('navigator', { ...navigator, sendBeacon });
  return sendBeacon;
}

const sent = (beacon: ReturnType<typeof stubBeacon>, call = 0) =>
  Object.fromEntries(beacon.mock.calls[call][1] as URLSearchParams);

describe('trackPageView', () => {
  it('reports the path to the beacon endpoint', () => {
    const beacon = stubBeacon();

    createPageViewTracker('/api/track')('/example');

    expect(beacon).toHaveBeenCalledWith('/api/track', expect.any(URLSearchParams));
    expect(sent(beacon)).toEqual({ path: '/example' });
  });

  it('sends the referrer with the first view only — an SPA keeps it for its whole life', () => {
    const beacon = stubBeacon();
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('https://yandex.ru/search');
    const track = createPageViewTracker('/api/track');

    track('/');
    track('/result');

    expect(sent(beacon, 0)).toEqual({ path: '/', referrer: 'https://yandex.ru/search' });
    expect(sent(beacon, 1)).toEqual({ path: '/result' });
  });

  it('leaves the admin out of the statistics', () => {
    const beacon = stubBeacon();

    createPageViewTracker()('/admin/calculations/abc');

    expect(beacon).not.toHaveBeenCalled();
  });

  it('does nothing where the browser has no beacon', () => {
    vi.stubGlobal('navigator', { ...navigator, sendBeacon: undefined });

    expect(() => createPageViewTracker()('/')).not.toThrow();
  });

  it('swallows a blocked beacon', () => {
    vi.stubGlobal('navigator', {
      ...navigator,
      sendBeacon: () => {
        throw new TypeError('blocked');
      },
    });

    expect(() => createPageViewTracker()('/')).not.toThrow();
  });
});
