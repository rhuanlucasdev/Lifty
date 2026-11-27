import { TIME_ZONE } from '../constants.js';

const localDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** Dia de calendário (YYYY-MM-DD) do instante no fuso America/Sao_Paulo. */
export function toLocalDate(instant: Date): string {
  return localDateFormat.format(instant);
}

/** Soma dias a uma data YYYY-MM-DD. */
export function addDays(localDate: string, days: number): string {
  const d = new Date(`${localDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Segunda-feira da semana (YYYY-MM-DD) que contém a data. */
export function weekStart(localDate: string): string {
  const day = new Date(`${localDate}T00:00:00Z`).getUTCDay(); // 0 = domingo
  return addDays(localDate, -((day + 6) % 7));
}

/** Idade em anos completos na data `today`. */
export function ageOn(birthDate: string, today: string): number {
  const [by, bm, bd] = birthDate.split('-').map(Number) as [number, number, number];
  const [ty, tm, td] = today.split('-').map(Number) as [number, number, number];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}
