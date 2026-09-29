import { EVENT_SNAPSHOT, KN } from '../data/events.js';
import { CITY_LABELS } from '../data/labels.js';
import type { CityId, EventCategory, EventItem, WhenFilter } from '../types.js';

/** Maps a profile city to one we have events for. Anything unknown falls back to Copenhagen. */
export const eventCity = (c?: string | null): CityId => {
  const v = (c || '').toLowerCase();
  return v === 'aarhus' || v === 'odense' || v === 'aalborg' || v === 'other' ? v : 'copenhagen';
};
const fmtDay = (d: string | number | Date): string =>
  new Date(d).toLocaleDateString('en-DK', { weekday: 'short', day: 'numeric', month: 'short' });
function fmtTime(d: string | number | Date): string {
  const x = new Date(d);
  if (x.getHours() === 0 && x.getMinutes() === 0) return 'Time on event page';
  return x.toLocaleTimeString('en-DK', { hour: '2-digit', minute: '2-digit' });
}
export function fallbackEvents(city: string): EventItem[] {
  const label = city === 'other' ? 'Denmark' : CITY_LABELS[city as CityId] || 'Denmark';
  const url =
    city === 'other' ? 'https://www.visitdenmark.com/denmark/things-do/events' : 'https://www.kultunaut.dk/UK/';
  const ideas: [string, EventCategory, number, number][] = [
    ['Friday community dinner', 'food', 2, 18],
    ['City highlights walking tour', 'culture', 3, 11],
    ['International meetup', 'social', 4, 19],
    ['Weekend flea market', 'food', 6, 10],
    ['Live music night', 'music', 7, 20],
    ['Harbour walk', 'outdoors', 8, 13],
    ['Danish conversation café', 'learning', 10, 17],
    ['Museum evening', 'culture', 12, 18],
    ['Sunday social run', 'sport', 14, 10],
    ['Family creative workshop', 'family', 16, 12],
  ];
  return ideas.map(([title, category, days, hour], i) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    d.setHours(hour, 0, 0, 0);
    const startsAt = d.toISOString();
    return {
      id: `fallback-${city}-${i}`,
      title,
      startsAt,
      endsAt: null,
      dateLabel: fmtDay(startsAt),
      timeLabel: fmtTime(startsAt),
      location: label,
      category,
      sourceUrl: url,
      sourceName: city === 'other' ? 'VisitDenmark' : 'KultuNaut',
      isFallback: true,
    };
  });
}
/** Upcoming events for a city, or recurring ideas when there is nothing listed. */
export function cityEvents(city: string): { events: EventItem[]; usingFallback: boolean } {
  if (city === 'other' || !EVENT_SNAPSHOT[city]) return { events: fallbackEvents(city), usingFallback: true };
  const now = Date.now();
  const list = EVENT_SNAPSHOT[city]
    .map(([id, title, startsAt, dateLabel, timeLabel, location, category]) => ({
      id: 'kultunaut-' + id,
      title,
      startsAt,
      endsAt: null,
      dateLabel,
      timeLabel,
      location,
      category,
      sourceUrl: KN + id,
      sourceName: 'KultuNaut',
      isFallback: false,
    }))
    .filter(e => Date.parse(e.startsAt) >= now)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
  return list.length ? { events: list, usingFallback: false } : { events: fallbackEvents(city), usingFallback: true };
}
export function whenMatch(e: EventItem, when: WhenFilter): boolean {
  if (when === 'all') return true;
  const s = new Date(e.startsAt),
    now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (when === 'today') return s >= today && s < tomorrow;
  if (when === 'week') return s >= today && s < new Date(today.getTime() + 6048e5);
  const sat = new Date(today);
  sat.setDate(sat.getDate() + ((6 - now.getDay() + 7) % 7));
  const mon = new Date(sat);
  mon.setDate(mon.getDate() + 2);
  return s >= sat && s < mon;
}
export function calendarLink(e: EventItem): string {
  const f = (d: string): string =>
    new Date(d)
      .toISOString()
      .replace(/[-:]/g, '')
      .replace(/\.\d{3}/, '');
  const end = e.endsAt || new Date(Date.parse(e.startsAt) + 36e5).toISOString();
  return (
    'https://calendar.google.com/calendar/render?' +
    new URLSearchParams({
      action: 'TEMPLATE',
      text: e.title,
      dates: `${f(e.startsAt)}/${f(end)}`,
      location: e.location,
      details: e.sourceUrl,
    }).toString()
  );
}
