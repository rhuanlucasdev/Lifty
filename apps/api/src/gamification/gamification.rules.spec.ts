import { computeStreak, levelFromXp } from './gamification.rules.js';

describe('levelFromXp', () => {
  it('starts at level 1 and grows by 200, 300, 400...', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, totalXp: 0, xpIntoLevel: 0, xpForNextLevel: 200 });
    expect(levelFromXp(199).level).toBe(1);
    expect(levelFromXp(200)).toMatchObject({ level: 2, xpIntoLevel: 0, xpForNextLevel: 300 });
    expect(levelFromXp(550)).toMatchObject({ level: 3, xpIntoLevel: 50 });
  });
});

describe('computeStreak (weekly, goal 2)', () => {
  // Semanas começando na segunda: 02/11, 09/11, 16/11, 23/11 de 2026.
  const dates = [
    '2026-11-02', '2026-11-04', // semana 1: meta atingida
    '2026-11-09', '2026-11-11', // semana 2: meta atingida
    '2026-11-17', // semana 3: só 1 treino, quebra
    '2026-11-23', '2026-11-24', // semana 4 (atual): meta atingida
  ];

  it('counts current and best runs', () => {
    const s = computeStreak(dates, 2, '2026-11-25');
    expect(s.currentWeeks).toBe(1);
    expect(s.bestWeeks).toBe(2);
    expect(s.workoutsThisWeek).toBe(2);
    expect(s.trainedDays).toBe(7);
    expect(s.completions.map((c) => c.reachedOn)).toEqual(['2026-11-04', '2026-11-11', '2026-11-24']);
  });

  it('does not break the streak while the current week is in progress', () => {
    const s = computeStreak(dates.slice(0, 4), 2, '2026-11-17');
    expect(s.currentWeeks).toBe(2);
  });

  it('breaks after a full week below the goal', () => {
    const s = computeStreak(dates.slice(0, 4), 2, '2026-11-24');
    expect(s.currentWeeks).toBe(0);
  });
});
