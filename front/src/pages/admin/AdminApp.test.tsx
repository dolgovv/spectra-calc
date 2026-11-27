import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { EXAMPLE_RESULT } from '../example/exampleResult';
import type { AdminOverview, CalculationDetail, CalculationRecord } from './types';

type Handler = (url: URL, init?: RequestInit) => Response;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const noContent = () => new Response(null, { status: 204 });

/** Answers fetch by "METHOD /path"; anything unexpected fails loudly with a 500. */
function mockApi(routes: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    const handler = routes[`${init?.method ?? 'GET'} ${url.pathname}`];
    return handler ? handler(url, init) : json({ message: `не замокано: ${url.pathname}` }, 500);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const loggedIn = { 'GET /api/admin/session': () => json({ authenticated: true }) };

const DAYS = Array.from({ length: 30 }, (_, i) => `2026-11-${String(i + 1).padStart(2, '0')}`).slice(-30);

const OVERVIEW: AdminOverview = {
  days: 30,
  visits: {
    today: { views: 12, visitors: 5 },
    week: { views: 80, visitors: 31 },
    range: { views: 1234, visitors: 456 },
  },
  calculations: {
    today: { ok: 3, error: 1 },
    week: { ok: 20, error: 2 },
    range: { ok: 70, error: 7, avgDurationMs: 2400 },
  },
  daily: DAYS.map((date, i) => ({ date, views: i, visitors: Math.floor(i / 2), calcOk: i % 3, calcError: i % 5 === 0 ? 1 : 0 })),
  topPaths: [{ path: '/example', views: 40, visitors: 20 }],
  topReferrers: [{ referrer: 'yandex.ru', views: 9, visitors: 7 }],
  storage: { archives: 77, archiveBytes: 77 * 9 * 1024 * 1024, databaseBytes: 2 * 1024 * 1024 },
  retention: { archiveDays: 30, logDays: 90 },
};

const OK_CALC: CalculationRecord = {
  id: EXAMPLE_RESULT.id,
  ts: Date.UTC(2026, 10, 27, 16, 5),
  ip: '203.0.113.7',
  userAgent: 'Firefox',
  fileName: 'substrate3.zip',
  fileBytes: 9 * 1024 * 1024,
  params: { from: 580, to: 650, step: 50 },
  status: 'ok',
  httpStatus: 201,
  error: null,
  durationMs: 2400,
  gridSize: 10,
  sr: 0.1355,
  category: 'excellent',
  archiveAvailable: true,
};

const FAILED_CALC: CalculationRecord = {
  ...OK_CALC,
  id: '2b1f0a3e-8c4d-4e5f-9a6b-7c8d9e0f1a2b',
  fileName: 'broken.zip',
  params: { from: 650, to: 580 },
  status: 'error',
  httpStatus: 400,
  error: 'Некорректный интервал: "От" должно быть меньше "До"',
  gridSize: null,
  sr: null,
  category: null,
  archiveAvailable: false,
};

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('admin access', () => {
  it('asks for the password, then opens the overview', async () => {
    let authenticated = false;
    const fetchMock = mockApi({
      'GET /api/admin/session': () => (authenticated ? json({ authenticated: true }) : json({ message: 'Требуется вход' }, 401)),
      'POST /api/admin/login': (_url, init) => {
        authenticated = JSON.parse(String(init?.body)).password === 'secret';
        return authenticated ? noContent() : json({ message: 'Неверный пароль' }, 401);
      },
      'GET /api/admin/overview': () => json(OVERVIEW),
    });
    renderAt('/admin');

    await userEvent.type(await screen.findByLabelText('Пароль'), 'guess');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));
    expect(await screen.findByRole('alert')).toHaveProperty('textContent', 'Неверный пароль');

    await userEvent.clear(screen.getByLabelText('Пароль'));
    await userEvent.type(screen.getByLabelText('Пароль'), 'secret');
    await userEvent.click(screen.getByRole('button', { name: 'Войти' }));

    await screen.findByText('Просмотры по дням');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/login'),
      expect.objectContaining({ credentials: 'include' }),
    );
  });

  it('explains that the admin is switched off on the server', async () => {
    mockApi({
      'GET /api/admin/session': () =>
        json({ message: 'Админка отключена: на сервере не задан ADMIN_PASSWORD' }, 404),
    });
    renderAt('/admin');

    await screen.findByText(/не задан ADMIN_PASSWORD/);
    expect(screen.queryByLabelText('Пароль')).toBeNull();
  });

  it('goes back to the login form when the session expires mid-way', async () => {
    mockApi({
      ...loggedIn,
      'GET /api/admin/overview': () => json({ message: 'Требуется вход' }, 401),
    });
    renderAt('/admin');

    await screen.findByLabelText('Пароль');
  });

  it('logs out', async () => {
    const fetchMock = mockApi({
      ...loggedIn,
      'GET /api/admin/overview': () => json(OVERVIEW),
      'POST /api/admin/logout': noContent,
    });
    renderAt('/admin');

    await userEvent.click(await screen.findByRole('button', { name: 'Выйти' }));

    await screen.findByLabelText('Пароль');
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/logout'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});

describe('admin overview', () => {
  it('shows the headline numbers, both charts and the table behind them', async () => {
    const fetchMock = mockApi({ ...loggedIn, 'GET /api/admin/overview': () => json(OVERVIEW) });
    renderAt('/admin');

    await screen.findByText('1 234');
    screen.getByText('456');
    screen.getByText('77'); // calculations: 70 ok + 7 failed
    screen.getByText('2.4 с');
    screen.getByRole('group', { name: /Просмотры по дням/ });
    screen.getByRole('group', { name: /Расчёты по дням/ });
    screen.getByText('yandex.ru');
    screen.getByText('77 · 693.0 МБ');
    expect(screen.getAllByRole('row').length).toBeGreaterThan(30);

    const url = new URL(String(fetchMock.mock.lastCall![0]));
    expect(url.searchParams.get('days')).toBe('30');
    expect(url.searchParams.get('tz')).toBe(String(-new Date().getTimezoneOffset()));
  });

  it('reads a day out with the keyboard', async () => {
    mockApi({ ...loggedIn, 'GET /api/admin/overview': () => json(OVERVIEW) });
    renderAt('/admin');

    const chart = await screen.findByRole('group', { name: /Расчёты по дням/ });
    fireEvent.focus(chart);
    fireEvent.keyDown(chart, { key: 'Home' });

    screen.getByText('01.11: успешные 0, с ошибкой 1');
  });

  it('refetches for another period', async () => {
    const fetchMock = mockApi({ ...loggedIn, 'GET /api/admin/overview': () => json(OVERVIEW) });
    renderAt('/admin');
    await screen.findByText('1 234');

    await userEvent.click(screen.getByRole('radio', { name: '7 дней' }));

    const url = new URL(String(fetchMock.mock.lastCall![0]));
    expect(url.searchParams.get('days')).toBe('7');
  });
});

describe('admin calculations', () => {
  it('lists calculations with their outcome and the archive to download', async () => {
    const fetchMock = mockApi({
      ...loggedIn,
      'GET /api/admin/calculations': () => json({ total: 2, items: [OK_CALC, FAILED_CALC] }),
    });
    renderAt('/admin?tab=calculations');

    const ok = (await screen.findByRole('link', { name: 'substrate3.zip' })).closest('tr')!;
    expect(within(ok).getByText('13.6 %')).toBeTruthy();
    expect(within(ok).getByRole('link', { name: 'ZIP' }).getAttribute('href')).toBe(
      `http://localhost:3000/api/admin/calculations/${OK_CALC.id}/archive`,
    );

    const failed = screen.getByRole('link', { name: 'broken.zip' }).closest('tr')!;
    within(failed).getByText(/Некорректный интервал/);
    within(failed).getByText('удалён');

    await userEvent.click(screen.getByRole('radio', { name: 'С ошибкой' }));
    const url = new URL(String(fetchMock.mock.lastCall![0]));
    expect(url.searchParams.get('status')).toBe('error');
    expect(url.searchParams.get('offset')).toBe('0');
  });

  it('opens a past result with downloads served by the admin API', async () => {
    const detail: CalculationDetail = { ...OK_CALC, result: EXAMPLE_RESULT };
    mockApi({ ...loggedIn, [`GET /api/admin/calculations/${OK_CALC.id}`]: () => json(detail) });
    renderAt(`/admin/calculations/${OK_CALC.id}`);

    await screen.findByText('Текстовый вывод');
    screen.getByText('Запрос');
    screen.getByText('50 мкм');
    screen.getByText('203.0.113.7');
    expect(screen.getByRole('link', { name: 'К расчётам' }).getAttribute('href')).toBe(
      '/admin?tab=calculations',
    );
    expect(screen.getByRole('link', { name: /PNG/ }).getAttribute('href')).toBe(
      `http://localhost:3000/api/admin/calculations/${OK_CALC.id}/files/heatmap.png`,
    );
    expect(screen.getByRole('link', { name: /Исходный архив/ }).getAttribute('href')).toContain('/archive');
  });

  it('shows the request of a failed calculation and its error', async () => {
    const detail: CalculationDetail = { ...FAILED_CALC, result: null };
    mockApi({ ...loggedIn, [`GET /api/admin/calculations/${FAILED_CALC.id}`]: () => json(detail) });
    renderAt(`/admin/calculations/${FAILED_CALC.id}`);

    await screen.findByText(/Результата нет/);
    screen.getByText(/Некорректный интервал/);
    screen.getByText('архив удалён по сроку хранения');
    expect(screen.queryByText('Текстовый вывод')).toBeNull();
  });
});

describe('admin request log', () => {
  it('shows endpoint totals and searches the log', async () => {
    const fetchMock = mockApi({
      ...loggedIn,
      'GET /api/admin/requests/summary': () =>
        json([{ method: 'POST', route: '/api/calculate', count: 42, errors: 3, avgMs: 2100, maxMs: 9000, lastTs: OK_CALC.ts }]),
      'GET /api/admin/requests': () =>
        json({
          total: 1,
          items: [
            {
              id: 1,
              ts: OK_CALC.ts,
              method: 'GET',
              path: '/files/x/heatmap.png',
              route: '/files/:id/heatmap.png',
              status: 404,
              durationMs: 3,
              ip: '203.0.113.9',
              userAgent: 'curl/8',
              bytesIn: null,
              bytesOut: 120,
            },
          ],
        }),
    });
    renderAt('/admin?tab=requests');

    await screen.findByText('/api/calculate');
    screen.getByText('42');
    await screen.findByText('/files/x/heatmap.png');
    screen.getByText('404');

    await userEvent.type(screen.getByLabelText('Поиск по пути'), '/files/{Enter}');

    let url = new URL(String(fetchMock.mock.lastCall![0]));
    expect(url.pathname).toBe('/api/admin/requests');
    expect(url.searchParams.get('search')).toBe('/files/');
    expect(url.searchParams.get('admin')).toBeNull();

    await userEvent.click(screen.getByLabelText('запросы админки'));
    const calls = fetchMock.mock.calls.map(([input]) => new URL(String(input)));
    url = calls.filter((u) => u.pathname === '/api/admin/requests').pop()!;
    expect(url.searchParams.get('admin')).toBe('1');
    expect(url.searchParams.get('search')).toBe('/files/');
    expect(calls.filter((u) => u.pathname.endsWith('/summary')).pop()!.searchParams.get('admin')).toBe('1');
  });
});
