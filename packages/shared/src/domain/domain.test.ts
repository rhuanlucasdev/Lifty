import { describe, expect, it } from 'vitest';
import { addDays, ageOn, toLocalDate, weekStart } from './dates.js';
import { estimateOneRepMax, isValidSet, setVolume } from './training.js';

describe('dates', () => {
  it('converts instants to the São Paulo calendar day', () => {
    // 02:30 UTC = 23:30 do dia anterior em São Paulo (UTC-3)
    expect(toLocalDate(new Date('2026-03-10T02:30:00Z'))).toBe('2026-03-09');
    expect(toLocalDate(new Date('2026-03-10T03:30:00Z'))).toBe('2026-03-10');
  });

  it('finds the monday of the week', () => {
    expect(weekStart('2026-11-24')).toBe('2026-11-23'); // terça
    expect(weekStart('2026-11-23')).toBe('2026-11-23'); // segunda
    expect(weekStart('2026-11-29')).toBe('2026-11-23'); // domingo
  });

  it('adds days across months', () => {
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01');
  });

  it('computes age from birth date', () => {
    expect(ageOn('1995-06-15', '2026-06-14')).toBe(30);
    expect(ageOn('1995-06-15', '2026-06-15')).toBe(31);
  });
});

describe('training', () => {
  it('computes volume, zero without load', () => {
    expect(setVolume({ loadKg: 60, reps: 10 })).toBe(600);
    expect(setVolume({ loadKg: null, reps: 15 })).toBe(0);
  });

  it('estimates 1RM with Epley', () => {
    expect(estimateOneRepMax({ loadKg: 60, reps: 10 })).toBe(80);
    expect(estimateOneRepMax({ loadKg: 100, reps: 1 })).toBe(100);
    expect(estimateOneRepMax({ loadKg: null, reps: 10 })).toBeNull();
  });

  it('accepts only completed working sets with reps', () => {
    const done = { completedAt: '2026-01-01T10:00:00Z', isWarmup: false, reps: 8 };
    expect(isValidSet(done)).toBe(true);
    expect(isValidSet({ ...done, isWarmup: true })).toBe(false);
    expect(isValidSet({ ...done, completedAt: null })).toBe(false);
    expect(isValidSet({ ...done, reps: 0 })).toBe(false);
  });
});
