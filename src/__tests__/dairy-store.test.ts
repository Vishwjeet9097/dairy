/// <reference types="jest" />

/**
 * Regression tests for the store's date handling.
 *
 * These exist because of a real bug: `todayISO()` returned the **UTC** date via
 * `toISOString().slice(0, 10)` while `addDaysISO()` and the month helpers parsed
 * `"<iso>T00:00:00"` as **local** midnight and converted back through UTC. In any
 * timezone ahead of UTC the two disagreed by a day.
 *
 * Because seed and history data are keyed with `addDaysISO`, nothing was ever
 * filed under the date the Delivery screen asked for. Marking a delivery found no
 * existing record and created a duplicate instead of updating; the dashboard's
 * "today" figures read an always-empty bucket.
 *
 * The `TZ` env var is set per-test so this fails on CI in UTC too, rather than
 * only reproducing on a machine in IST.
 */

import { addDaysISO, monthEnd, monthStart, nextMonthISO, prevMonthISO, todayISO } from '@/lib/dairy-store';

/** Timezones either side of UTC, plus UTC itself. */
const TIMEZONES = ['UTC', 'Asia/Kolkata', 'Pacific/Kiritimati', 'America/Los_Angeles'];

describe('local-date helpers', () => {
  const original = process.env.TZ;

  afterAll(() => {
    process.env.TZ = original;
  });

  it.each(TIMEZONES)('addDaysISO(today, 0) === todayISO() in %s', (timezone) => {
    process.env.TZ = timezone;

    const today = todayISO();

    // The identity that was broken. Everything else depended on it.
    expect(addDaysISO(today, 0)).toBe(today);
  });

  it.each(TIMEZONES)('day arithmetic round-trips in %s', (timezone) => {
    process.env.TZ = timezone;

    const today = todayISO();

    expect(addDaysISO(addDaysISO(today, -7), 7)).toBe(today);
    expect(addDaysISO(addDaysISO(today, 1), -1)).toBe(today);
  });

  it.each(TIMEZONES)('stepping back 6 days yields 7 distinct dates in %s', (timezone) => {
    process.env.TZ = timezone;

    const today = todayISO();
    const dates = new Set<string>();
    for (let offset = 6; offset >= 0; offset -= 1) {
      dates.add(addDaysISO(today, -offset));
    }

    // The reports/sparkline window. A UTC/local mismatch collapsed two of these
    // onto the same day.
    expect(dates.size).toBe(7);
    expect(dates.has(today)).toBe(true);
  });

  it('produces well-formed month boundaries', () => {
    process.env.TZ = 'Asia/Kolkata';

    expect(monthStart('2026-09-15')).toBe('2026-09-01');
    expect(monthEnd('2026-09-15')).toBe('2026-09-30');
    // February in a non-leap year.
    expect(monthEnd('2026-02-10')).toBe('2026-02-28');
    // Month ends must never bleed into the neighbouring month.
    expect(monthEnd('2026-01-31')).toBe('2026-01-31');
    expect(monthEnd('2026-12-01')).toBe('2026-12-31');
  });

  it('steps months without drifting across year boundaries', () => {
    process.env.TZ = 'Asia/Kolkata';

    expect(prevMonthISO('2026-01-15')).toBe('2025-12-01');
    expect(nextMonthISO('2026-12-15')).toBe('2027-01-01');
  });

  it('always returns a yyyy-mm-dd shaped string', () => {
    for (const timezone of TIMEZONES) {
      process.env.TZ = timezone;
      expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(addDaysISO(todayISO(), 3)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
