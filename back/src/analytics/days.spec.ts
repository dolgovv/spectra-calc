import { dayKey, dayWindow, DAY_MS } from './days';

const MSK = 180;

describe('dayWindow', () => {
  it('starts the day at local midnight, not at UTC midnight', () => {
    // 22:30 UTC on the 26th is 01:30 on the 27th in Moscow.
    const now = Date.UTC(2026, 10, 26, 22, 30);

    const window = dayWindow(1, MSK, now);

    expect(window.days).toEqual(['2026-11-27']);
    expect(window.todayTs).toBe(Date.UTC(2026, 10, 26, 21, 0));
  });

  it('lists every day of the window, oldest first', () => {
    const window = dayWindow(3, 0, Date.UTC(2026, 0, 2, 12));

    expect(window.days).toEqual(['2025-12-31', '2026-01-01', '2026-01-02']);
    expect(window.sinceTs).toBe(Date.UTC(2025, 11, 31));
    expect(window.weekTs).toBe(window.todayTs - 6 * DAY_MS);
  });

  it('handles zones west of UTC', () => {
    // 02:00 UTC is still the previous evening in New York.
    const window = dayWindow(1, -300, Date.UTC(2026, 5, 10, 2));

    expect(window.days).toEqual(['2026-06-09']);
  });
});

describe('dayKey', () => {
  it('agrees with the window on where a day starts', () => {
    const { todayTs, offsetMs, days } = dayWindow(1, MSK, Date.UTC(2026, 10, 27, 12));

    expect(dayKey(todayTs, offsetMs)).toBe(days[0]);
    expect(dayKey(todayTs - 1, offsetMs)).toBe('2026-11-26');
  });
});
