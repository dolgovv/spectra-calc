import { describe, expect, it, vi } from 'vitest';
import { computeSpectrumResult } from './computeSpectrumResult';
import { EXAMPLE_RESULT } from '../../example/exampleResult';

const FILE = new File(['zip'], 'map.zip', { type: 'application/zip' });
const PARAMS = { file: FILE, interval: { from: 590, to: 625 } };

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('computeSpectrumResult', () => {
  it('posts the archive and the interval as multipart form data', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(EXAMPLE_RESULT, 201));
    vi.stubGlobal('fetch', fetchMock);

    await computeSpectrumResult(PARAMS);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const form = init.body as FormData;
    expect(url).toMatch(/\/api\/calculate$/);
    expect(init.method).toBe('POST');
    expect((form.get('archive') as File).name).toBe('map.zip');
    expect(form.get('from')).toBe('590');
    expect(form.get('to')).toBe('625');
  });

  it('sends the grid step and the colours when they are set', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(EXAMPLE_RESULT, 201));
    vi.stubGlobal('fetch', fetchMock);

    await computeSpectrumResult({
      ...PARAMS,
      step: 50,
      colorLow: '#111111',
      colorMidLow: '#222222',
      colorMidHigh: '#333333',
      colorHigh: '#444444',
    });

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const form = init.body as FormData;
    expect(form.get('step')).toBe('50');
    expect(form.get('colorLow')).toBe('#111111');
    expect(form.get('colorMidLow')).toBe('#222222');
    expect(form.get('colorMidHigh')).toBe('#333333');
    expect(form.get('colorHigh')).toBe('#444444');
  });

  it('leaves the defaults to the backend when they are not set', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(EXAMPLE_RESULT, 201));
    vi.stubGlobal('fetch', fetchMock);

    await computeSpectrumResult(PARAMS);

    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const form = init.body as FormData;
    expect([...form.keys()].sort()).toEqual(['archive', 'from', 'to']);
  });

  it('returns the parsed result', async () => {
    vi.stubGlobal('fetch', async () => jsonResponse(EXAMPLE_RESULT, 201));

    await expect(computeSpectrumResult(PARAMS)).resolves.toEqual(EXAMPLE_RESULT);
  });

  it('reports a network failure', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });

    await expect(computeSpectrumResult(PARAMS)).rejects.toThrow('Ошибка сервера.');
  });

  it('shows the message from the server', async () => {
    vi.stubGlobal('fetch', async () => jsonResponse({ message: 'Ожидается .zip архив' }, 400));

    await expect(computeSpectrumResult(PARAMS)).rejects.toThrow('Ожидается .zip архив');
  });

  it('joins validation messages', async () => {
    vi.stubGlobal('fetch', async () => jsonResponse({ message: ['from плох', 'to плох'] }, 400));

    await expect(computeSpectrumResult(PARAMS)).rejects.toThrow('from плох; to плох');
  });

  it('explains an overload that came without a message', async () => {
    vi.stubGlobal('fetch', async () => new Response('Too Many Requests', { status: 429 }));

    await expect(computeSpectrumResult(PARAMS)).rejects.toThrow(
      'Сервис перегружен, попробуйте позже.',
    );
  });

  it('falls back to the status code', async () => {
    vi.stubGlobal('fetch', async () => new Response('<html>Bad Gateway</html>', { status: 502 }));

    await expect(computeSpectrumResult(PARAMS)).rejects.toThrow('Ошибка сервера (502)');
  });
});
