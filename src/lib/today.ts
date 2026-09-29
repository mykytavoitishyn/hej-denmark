import { WORDS } from '../data/words.js';

export function greeting(d = new Date()) {
  const h = d.getHours();
  return h < 10
    ? { danish: 'Godmorgen', english: 'Good morning' }
    : h < 18
      ? { danish: 'Goddag', english: 'Good day' }
      : { danish: 'Godaften', english: 'Good evening' };
}
export function dailyWord(d = new Date()) {
  const n = WORDS.length;
  return WORDS[(((Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 864e5) + 11) % n) + n) % n];
}
export function arrivalMessage(date: string | null | undefined, now = new Date()): string | null {
  if (!date) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const t = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(t)) return null;
  const days = Math.round((today - t) / 864e5);
  if (days >= 0) return `Day ${days + 1} in Denmark`;
  const a = Math.abs(days);
  return `Arriving in ${a} ${a === 1 ? 'day' : 'days'}`;
}
