// Parsing, filtering and formatting for the events feed. This module has no runtime imports, so the
// ingestion script in scripts/events can share it with the site.
import type { CityId, EventCategory, EventFeed, EventItem, EventKind, EventSourceInfo, WhenFilter } from '../types.js';

/** Events are shown in Danish local time, wherever the reader is. */
export const TZ = 'Europe/Copenhagen';
export const EVENT_CITY_IDS: readonly CityId[] = ['copenhagen', 'aarhus', 'odense', 'aalborg', 'other'];
export const EVENT_CATEGORIES: readonly EventCategory[] = [
  'music',
  'culture',
  'food',
  'social',
  'outdoors',
  'sport',
  'learning',
  'family',
  'other',
];
const KINDS: readonly EventKind[] = ['event', 'ongoing'];

const str = (v: unknown, max: number): string =>
  typeof v === 'string' ? v.replace(/\s+/g, ' ').trim().slice(0, max) : '';
const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;
const time = (v: unknown): number => (typeof v === 'string' && v ? Date.parse(v) : NaN);
const webUrl = (v: unknown): string => {
  if (typeof v !== 'string') return '';
  try {
    const u = new URL(v);
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.href : '';
  } catch {
    return '';
  }
};

/**
 * Checks one event from the feed or from saved events, which are untrusted. Returns null when it can't be shown.
 * Saved events from earlier versions of the site used different field names and are converted.
 */
export function normalizeEvent(raw: unknown): EventItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const e = raw as Record<string, unknown>;
  if (e.isFallback === true) return null;
  const id = str(e.id, 200),
    title = str(e.title, 300),
    start = time(e.startsAt);
  const url = webUrl(e.url ?? e.sourceUrl);
  if (!id || !title || !Number.isFinite(start) || !url) return null;
  const end = time(e.endsAt);
  return {
    id,
    title,
    startsAt: new Date(start).toISOString(),
    endsAt: Number.isFinite(end) && end >= start ? new Date(end).toISOString() : null,
    allDay: e.allDay === true,
    kind: oneOf(e.kind, KINDS) ?? 'event',
    venue: str(e.venue ?? e.location, 200),
    city: oneOf(e.city, EVENT_CITY_IDS) ?? 'other',
    category: oneOf(e.category, EVENT_CATEGORIES) ?? 'other',
    url,
    sourceId: str(e.sourceId, 40) || (id.startsWith('kultunaut-') ? 'kultunaut' : 'unknown'),
    sourceName: str(e.sourceName, 80) || 'Event page',
    isFree: typeof e.isFree === 'boolean' ? e.isFree : null,
  };
}

function normalizeSource(raw: unknown): EventSourceInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const id = str(s.id, 40),
    name = str(s.name, 80),
    url = webUrl(s.url);
  return id && name && url ? { id, name, url } : null;
}

/** Reads the events file. Invalid events are dropped one by one; a file without the basic shape is rejected. */
export function parseFeed(raw: unknown): EventFeed | null {
  if (!raw || typeof raw !== 'object') return null;
  const f = raw as Record<string, unknown>;
  if (f.version !== 1 || !Array.isArray(f.events) || !Number.isFinite(time(f.generatedAt))) return null;
  const seen = new Set<string>();
  const events: EventItem[] = [];
  for (const r of f.events) {
    const e = normalizeEvent(r);
    if (e && !seen.has(e.id)) {
      seen.add(e.id);
      events.push(e);
    }
  }
  const sources = Array.isArray(f.sources)
    ? f.sources.map(normalizeSource).filter((s): s is EventSourceInfo => Boolean(s))
    : [];
  return { version: 1, generatedAt: new Date(time(f.generatedAt)).toISOString(), sources, events };
}

// Dates are compared as Copenhagen calendar days written YYYY-MM-DD, which sort correctly as text.
const dayFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
const weekdayFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' });
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** The Copenhagen calendar day of a moment, as YYYY-MM-DD. */
export const cphDay = (t: number | Date): string => dayFmt.format(t);
/** Adds days to a YYYY-MM-DD day. Works on calendar days, so daylight saving changes don't matter. */
export function addDays(day: string, n: number): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
const cphWeekday = (t: number | Date): number => WEEKDAYS.indexOf(weekdayFmt.format(t));

/** The first and last Copenhagen day an event covers. */
export function eventDays(e: EventItem): [string, string] {
  const first = cphDay(Date.parse(e.startsAt));
  const last = e.endsAt ? cphDay(Date.parse(e.endsAt) - (e.allDay ? 1 : 0)) : first;
  return [first, last < first ? first : last];
}

/** Whether an event hasn't finished yet. Events without an end time count until the end of their day. */
export function isUpcoming(e: EventItem, now = Date.now()): boolean {
  const end = e.endsAt ? Date.parse(e.endsAt) : NaN;
  if (Number.isFinite(end) && !e.allDay) return end > now;
  return eventDays(e)[1] >= cphDay(now);
}

/** The Copenhagen days a “when” filter covers, first and last included, or null for “all”. */
export function whenRange(when: WhenFilter, now = Date.now()): [string, string] | null {
  const today = cphDay(now);
  if (when === 'all') return null;
  if (when === 'today') return [today, today];
  if (when === 'week') return [today, addDays(today, 6)];
  // This weekend: today and tomorrow on a Saturday, just today on a Sunday, otherwise the coming Saturday and Sunday.
  const wd = cphWeekday(now);
  if (wd === 0) return [today, today];
  const sat = addDays(today, 6 - wd);
  return [sat, addDays(sat, 1)];
}

/** Whether an event happens on any day the filter covers. Exhibitions match every day they're open. */
export function whenMatch(e: EventItem, when: WhenFilter, now = Date.now()): boolean {
  const range = whenRange(when, now);
  if (!range) return true;
  const [first, last] = eventDays(e);
  return first <= range[1] && last >= range[0];
}

/** Upcoming events in a city, dated events first by start time, then ongoing ones by closing date. */
export function eventsIn(feed: EventFeed | null, city: CityId, now = Date.now()): EventItem[] {
  if (!feed) return [];
  const list = feed.events.filter(e => e.city === city && isUpcoming(e, now));
  const byStart = (a: EventItem, b: EventItem) => Date.parse(a.startsAt) - Date.parse(b.startsAt);
  const byEnd = (a: EventItem, b: EventItem) => eventDays(a)[1].localeCompare(eventDays(b)[1]);
  return [...list.filter(e => e.kind === 'event').sort(byStart), ...list.filter(e => e.kind === 'ongoing').sort(byEnd)];
}

const labelDay = (withYear: boolean) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
const shortDay = (withYear: boolean) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    day: 'numeric',
    month: 'short',
    ...(withYear ? { year: 'numeric' } : {}),
  });
const clock = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
const yearOf = (day: string) => day.slice(0, 4);

/** The date line for an event card: “Sun 25 Oct”, “25 Oct – 2 Nov”, or “Until 31 Dec 2027” for exhibitions. */
export function dateLabel(e: EventItem, now = Date.now()): string {
  const [first, last] = eventDays(e);
  const thisYear = yearOf(cphDay(now));
  const start = Date.parse(e.startsAt),
    end = Date.parse(e.endsAt ?? e.startsAt) - (e.allDay && e.endsAt ? 1 : 0);
  if (e.kind === 'ongoing') {
    const today = cphDay(now);
    if (first > today) return `From ${shortDay(yearOf(first) !== thisYear).format(start)}`;
    return first === last ? 'Today only' : `Until ${shortDay(yearOf(last) !== thisYear).format(end)}`;
  }
  const withYear = yearOf(first) !== thisYear || yearOf(last) !== thisYear;
  if (first === last) return labelDay(withYear).format(start);
  return `${shortDay(false).format(start)} – ${shortDay(withYear).format(end)}`;
}

/** The time line for an event card, in Danish time. */
export function timeLabel(e: EventItem): string {
  if (e.kind === 'ongoing') return 'Opening hours on the event page';
  if (e.allDay) return 'All day';
  const start = clock.format(Date.parse(e.startsAt));
  if (!e.endsAt || eventDays(e)[0] !== eventDays(e)[1]) return start;
  return `${start}–${clock.format(Date.parse(e.endsAt))}`;
}

const gcalStamp = (t: number) =>
  new Date(t)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

/** A Google Calendar link. Timed events without an end get two hours; all-day events use whole days. */
export function calendarLink(e: EventItem): string {
  let dates: string;
  if (e.allDay || e.kind === 'ongoing') {
    const [first] = eventDays(e);
    dates = `${first.replace(/-/g, '')}/${addDays(first, 1).replace(/-/g, '')}`;
  } else {
    const start = Date.parse(e.startsAt);
    const end = e.endsAt ? Date.parse(e.endsAt) : start + 2 * 36e5;
    dates = `${gcalStamp(start)}/${gcalStamp(end)}`;
  }
  return (
    'https://calendar.google.com/calendar/render?' +
    new URLSearchParams({
      action: 'TEMPLATE',
      text: e.title,
      dates,
      ctz: TZ,
      location: e.venue,
      details: e.url,
    }).toString()
  );
}

/** How long ago the feed was fetched, in words. */
export function updatedAgo(iso: string, now = Date.now()): string {
  const mins = Math.max(0, Math.round((now - Date.parse(iso)) / 6e4));
  if (mins < 2) return 'just now';
  if (mins < 60) return `${mins} minutes ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return hours === 1 ? 'an hour ago' : `${hours} hours ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'yesterday' : `${days} days ago`;
}
