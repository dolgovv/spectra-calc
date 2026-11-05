import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import App from './App';
import { readResultFromSession, saveResultToSession } from './lib/resultStorage';
import { EXAMPLE_RESULT } from './pages/example/exampleResult';

const ZIP = new File(['zip'], 'map.zip', { type: 'application/zip' });
const startButton = () => screen.getByRole<HTMLButtonElement>('button', { name: /Начать расчёт/ });

function renderAt(path: string): HTMLElement {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  ).container;
}

function selectFile(container: HTMLElement, file: File): void {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input, { target: { files: [file] } });
}

/** The console of the result page, which every result renders. */
const showsResult = () => screen.findByText('Текстовый вывод');

describe('upload flow', () => {
  it('keeps the start button disabled until an archive is chosen', () => {
    const container = renderAt('/');

    expect(startButton().disabled).toBe(true);

    selectFile(container, ZIP);

    screen.getByText(/map\.zip/);
    expect(startButton().disabled).toBe(false);
  });

  it('rejects a file that is not an archive', () => {
    const container = renderAt('/');

    selectFile(container, new File(['x'], 'notes.txt', { type: 'text/plain' }));

    screen.getByText('Поддерживаются только .zip архивы');
    expect(startButton().disabled).toBe(true);
  });

  it('shows the result and keeps it for a refresh', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(EXAMPLE_RESULT), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const container = renderAt('/');
    selectFile(container, ZIP);

    await userEvent.click(startButton());

    await showsResult();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(readResultFromSession()?.id).toBe(EXAMPLE_RESULT.id);
  });

  it('sends the chosen grid step and colours', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(EXAMPLE_RESULT), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const container = renderAt('/');
    selectFile(container, ZIP);

    fireEvent.change(screen.getByRole('slider', { name: 'Шаг сетки' }), { target: { value: '50' } });
    const colors = container.querySelectorAll<HTMLInputElement>('input[type="color"]');
    fireEvent.change(colors[0], { target: { value: '#111111' } });
    fireEvent.change(colors[3], { target: { value: '#444444' } });
    await userEvent.click(startButton());

    await showsResult();
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const form = init.body as FormData;
    expect(form.get('step')).toBe('50');
    expect(form.get('colorLow')).toBe('#111111');
    expect(form.get('colorMidLow')).toBe(EXAMPLE_RESULT.colorMidLow);
    expect(form.get('colorHigh')).toBe('#444444');
  });

  it('shows the server error and stays on the form, ready to retry', async () => {
    vi.stubGlobal(
      'fetch',
      async () => new Response(JSON.stringify({ message: 'Недостаточно спектров' }), { status: 400 }),
    );
    const container = renderAt('/');
    selectFile(container, ZIP);

    await userEvent.click(startButton());

    await screen.findByText('Недостаточно спектров');
    expect(readResultFromSession()).toBeNull();
    await waitFor(() => expect(startButton().disabled).toBe(false));
  });
});

describe('result page', () => {
  it('sends a direct visit without a result back to the form', async () => {
    renderAt('/result');

    await waitFor(startButton);
  });

  it('restores the result from the session after a refresh', async () => {
    saveResultToSession(EXAMPLE_RESULT);

    renderAt('/result');

    await showsResult();
    expect(screen.queryByText(/лишних спектров/)).toBeNull();
  });

  it('warns when spectra were dropped to fit the square grid', async () => {
    saveResultToSession({ ...EXAMPLE_RESULT, spectraFound: 101, spectraDropped: 1 });

    renderAt('/result');

    await screen.findByText(/из 101 найденных файлов — 1\s+лишних спектров отброшено/);
  });
});

describe('example page', () => {
  it('renders the bundled result without calling the backend', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    renderAt('/example');

    await showsResult();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
