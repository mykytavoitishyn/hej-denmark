// Turns what the sources return into the app's events feed: keeps what helps newcomers, merges duplicates, and
// refuses to publish anything the app itself wouldn't accept. Pure functions, so the tests need no network.
import { cphDay, isUpcoming, normalizeEvent, parseFeed } from '../../src/lib/event-feed.ts';
import type { EventCategory, EventFeed, EventItem, EventSourceInfo } from '../../src/types.ts';
import { parseIcs } from './ics.ts';
import type { EventSource } from './sources.ts';

/** How far ahead the feed looks. */
export const WINDOW_DAYS = 60;
/** A weekly language café or quiz shows its next two dates, not every week. */
export const PER_SERIES = 2;
/** A feed much smaller than the last one usually means a source broke, so it isn't published without a look. */
export const MIN_SHARE = 0.6;

/** An event and what's needed to merge it: how authoritative its source is, and which series it belongs to. */
export interface Candidate {
  event: EventItem;
  rank: number;
  series: string;
}

export interface SourceResult {
  source: EventSource;
  /** Parsed JSON for library sources, text for calendars. Missing when the fetch failed. */
  body?: unknown;
  error?: string;
}

export interface SourceReport {
  id: string;
  found: number;
  published: number;
  stale: boolean;
  error?: string;
}

/** Lower case, without numbering like “#210”, a “Meetup -” prefix, punctuation or emoji, for comparing titles. */
export const normTitle = (t: string): string =>
  t
    .toLowerCase()
    .replace(/#\s*\d+/g, ' ')
    .replace(/^\s*meet ?up\s*[-–:]\s*/, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** “QUIZ NIGHT by Dear World” becomes “Quiz Night by Dear World”. Short capitals such as “DK” stay. */
export function tidyTitle(t: string): string {
  const caps = t.match(/\b[A-ZÆØÅ]{3,}\b/g) ?? [];
  if (caps.length < 2) return t.trim();
  return t.replace(/\b([A-ZÆØÅ])([A-ZÆØÅ]{2,})\b/g, (_, a: string, b: string) => a + b.toLowerCase()).trim();
}

/** Sorts an event into one of the app's categories from its title and labels. */
export function categoryFor(text: string): EventCategory {
  const t = text.toLowerCase();
  if (/sprog|snakkeklub|talk danish|spil dansk|language/.test(t)) return 'learning';
  if (/fællesspis|communal|dining|tallerken|madklub|\bfood\b/.test(t)) return 'food';
  if (/run club|løbeklub|\byoga\b|\bsport/.test(t)) return 'sport';
  if (/meet ?up|network|communit|fællesskab|club|klub|\bbar\b|quiz|party|social/.test(t)) return 'social';
  if (/musik|koncert|concert|music/.test(t)) return 'music';
  if (/film|litteratur|forfatter|writing|skrive|book|bog|kunst|udstilling|\bart\b/.test(t)) return 'culture';
  if (/foredrag|debat|lecture|\btalk\b|workshop/.test(t)) return 'learning';
  return 'social';
}

// Library events (DPL CMS). Library listings are mostly in Danish and mostly not for newcomers, so they are filtered:
// international and English events, language cafés and talk clubs, meet-ups and communal dining are kept.
const NEWCOMER_LABEL = /^(international|meet ?up|snakkeklubber|sprogcaf[eé]|spil dansk|english|fællesspisning)$/i;
const NEWCOMER_TITLE =
  /sprogcaf[eé]|snakkeklub|talk danish|spil dansk|meet ?up|expat|international|english|fællesspis|communal dining|language caf/i;
const ENGLISH_WORDS = /\b(the|and|with|you|your|join|welcome|english|our|how|what|about|into|from)\b/gi;
const FOR_INSTITUTIONS = /dagtilbud|daginstitution|børnehave|skoleklass|lektie/i;
const FOR_CHILDREN = /børn|barsel|for de mindste|\b\d+\s*[-–]\s*\d+\s*år|familie|unge 13|babies|toddler/i;
const SHOWN_STATES = new Set(['Active', 'TicketSaleNotOpen']);
/** Some events stay “Active” but say in the title that they're full or called off. */
const FULL_OR_OFF = /^\s*(fully booked|udsolgt|aflyst|cancelled|canceled)\b/i;

/**
 * Whether a library event is for newcomers, and its category. Events for children are left out, except
 * international ones for parents, such as a talk on raising a multilingual child.
 */
export function libraryCategory(title: string, labels: string[]): EventCategory | null {
  const all = `${title} ${labels.join(' ')}`;
  if (FOR_INSTITUTIONS.test(all)) return null;
  const relevant =
    labels.some(l => NEWCOMER_LABEL.test(l.trim())) ||
    NEWCOMER_TITLE.test(title) ||
    (title.match(ENGLISH_WORDS)?.length ?? 0) >= 2;
  if (!relevant) return null;
  if (FOR_CHILDREN.test(all)) return labels.some(l => /^international$/i.test(l.trim())) ? 'family' : null;
  return categoryFor(all);
}

interface DplEvent {
  uuid?: string;
  title?: string;
  url?: string;
  state?: string;
  all_day?: boolean;
  date_time?: { start?: string; end?: string };
  branches?: string[];
  address?: { locationType?: string | null; location?: string; city?: string };
  categories?: string[];
  tags?: string[];
  ticket_categories?: { price?: { value?: number } }[];
  series?: { uuid?: string };
}

function libraryVenue(e: DplEvent): string {
  if (e.address?.locationType === 'online') return 'Online';
  const place = (e.branches?.[0] ?? e.address?.location ?? '').replace(/\\/g, '/').trim();
  const town = (e.address?.city ?? '').trim();
  return place && town && !place.includes(town) ? `${place}, ${town}` : place || town;
}

/** Free when every ticket costs 0 or the library tags it free, paid when any ticket costs money, else unknown. */
function libraryIsFree(e: DplEvent, labels: string[]): boolean | null {
  const prices = (e.ticket_categories ?? [])
    .map(t => t?.price?.value)
    .filter((v): v is number => typeof v === 'number');
  if (prices.length) return prices.every(p => p === 0);
  return labels.some(l => /^gratis$/i.test(l.trim())) ? true : null;
}

export function fromLibrary(body: unknown, src: EventSource): Candidate[] {
  if (!Array.isArray(body)) throw new Error('the library API did not return a list of events');
  const out: Candidate[] = [];
  for (const e of body as DplEvent[]) {
    if (!e || !SHOWN_STATES.has(e.state ?? '')) continue;
    const title = (e.title ?? '').trim();
    if (FULL_OR_OFF.test(title)) continue;
    const labels = [...(e.categories ?? []), ...(e.tags ?? [])].filter((l): l is string => typeof l === 'string');
    const category = libraryCategory(title, labels);
    if (!category || !e.uuid) continue;
    const event = normalizeEvent({
      id: `${src.id}-${e.uuid}`,
      title,
      startsAt: e.date_time?.start,
      endsAt: e.date_time?.end ?? null,
      allDay: e.all_day === true,
      kind: 'event',
      venue: libraryVenue(e),
      city: src.city,
      category,
      url: e.url,
      sourceId: src.id,
      sourceName: src.name,
      isFree: libraryIsFree(e, labels),
    });
    if (event) out.push({ event, rank: src.rank, series: `${src.id}:${e.series?.uuid ?? e.uuid}` });
  }
  return out;
}

// Calendars (iCal) from organisers.
const CITY_CENTRES: Record<string, [number, number]> = {
  copenhagen: [55.676, 12.568],
  aarhus: [56.157, 10.211],
  odense: [55.403, 10.388],
  aalborg: [57.048, 9.919],
};
const RADIUS_KM = 25;

/** Distance between two points on Earth, in kilometres. */
export function distanceKm([lat1, lon1]: [number, number], [lat2, lon2]: [number, number]): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lon2 - lon1) * rad) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** “Bodega Danza, Flæsketorvet 13A, 1711 København, Denmark” becomes “Bodega Danza, Copenhagen”. */
export function calendarVenue(location: string): string {
  const parts = location
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!parts.length) return '';
  const town = parts.map(p => p.match(/^\d{4}\s+(.+)$/)?.[1]).find(Boolean) ?? '';
  const place = /^københavn\b/i.test(town) ? 'Copenhagen' : town;
  return place && parts[0] !== place ? `${parts[0]}, ${place}` : parts[0];
}

export function fromCalendar(text: string, src: EventSource): Candidate[] {
  if (!/BEGIN:VCALENDAR/.test(text)) throw new Error('the calendar is not in iCal format');
  const centre = CITY_CENTRES[src.city];
  const out: Candidate[] = [];
  for (const e of parseIcs(text)) {
    // Some organisers run events in several cities. Keep the ones in this source's city.
    if (centre && e.geo && distanceKm(e.geo, centre) > RADIUS_KM) continue;
    if (centre && !e.geo && e.location && !/københavn|copenhagen|frederiksberg/i.test(e.location)) continue;
    const title = tidyTitle(e.summary);
    const event = normalizeEvent({
      id: `${src.id}-${e.uid.replace(/@.*$/, '') || normTitle(title).replace(/ /g, '-')}`,
      title,
      startsAt: e.start,
      endsAt: e.end,
      allDay: e.allDay,
      kind: 'event',
      venue: calendarVenue(e.location),
      city: src.city,
      category: categoryFor(title),
      url: e.url || src.url,
      sourceId: src.id,
      sourceName: src.name,
      isFree: /\bfree\b|\bgratis\b/i.test(`${title} ${e.description}`) ? true : null,
    });
    if (event) out.push({ event, rank: src.rank, series: `${src.id}:${normTitle(title)}` });
  }
  return out;
}

/** Keeps the next few dates of each series, so a weekly event doesn't fill the list. */
export function collapseSeries(list: Candidate[], perSeries = PER_SERIES): Candidate[] {
  const count = new Map<string, number>();
  return [...list]
    .sort((a, b) => Date.parse(a.event.startsAt) - Date.parse(b.event.startsAt))
    .filter(c => {
      const n = count.get(c.series) ?? 0;
      count.set(c.series, n + 1);
      return n < perSeries;
    });
}

const tokens = (t: string): Set<string> => new Set(normTitle(t).split(' ').filter(Boolean));
function similar(a: string, b: string): boolean {
  const x = tokens(a),
    y = tokens(b);
  if (!x.size || !y.size) return false;
  const shared = [...x].filter(w => y.has(w)).length;
  return shared / (x.size + y.size - shared) >= 0.6;
}

/**
 * Merges the same event listed in two places: same city and day, starting within 20 minutes, with nearly the same
 * title. The organiser's own listing is kept over a venue's.
 */
export function dedupe(list: Candidate[]): Candidate[] {
  const kept: Candidate[] = [];
  for (const c of [...list].sort((a, b) => a.rank - b.rank)) {
    const e = c.event,
      start = Date.parse(e.startsAt);
    const dup = kept.some(({ event: k }) => {
      if (k.id === e.id) return true;
      if (k.city !== e.city || cphDay(Date.parse(k.startsAt)) !== cphDay(start)) return false;
      return Math.abs(Date.parse(k.startsAt) - start) <= 20 * 60_000 && similar(k.title, e.title);
    });
    if (!dup) kept.push(c);
  }
  return kept;
}

/**
 * Builds the feed from what each source returned. A source that failed keeps its still-upcoming events from the
 * last feed and is marked as possibly out of date, so one flaky site never empties a city.
 */
export function buildFeed(
  results: SourceResult[],
  previous: EventFeed | null,
  now = Date.now(),
): { feed: EventFeed; report: SourceReport[] } {
  const all: Candidate[] = [];
  const stale = new Set<string>();
  const found = new Map<string, number>();
  const errors = new Map<string, string>();
  for (const r of results) {
    let list: Candidate[] | null = null;
    if (!r.error)
      try {
        list = r.source.kind === 'dpl' ? fromLibrary(r.body, r.source) : fromCalendar(String(r.body ?? ''), r.source);
      } catch (e) {
        errors.set(r.source.id, e instanceof Error ? e.message : String(e));
      }
    else errors.set(r.source.id, r.error);
    if (!list) {
      stale.add(r.source.id);
      list = (previous?.events ?? [])
        .filter(e => e.sourceId === r.source.id && isUpcoming(e, now))
        .map(event => ({ event, rank: r.source.rank, series: `${r.source.id}:${normTitle(event.title)}` }));
    }
    found.set(r.source.id, list.length);
    all.push(...list);
  }
  const horizon = now + WINDOW_DAYS * 864e5;
  const upcoming = all.filter(c => isUpcoming(c.event, now) && Date.parse(c.event.startsAt) < horizon);
  const events = dedupe(collapseSeries(upcoming))
    .map(c => c.event)
    .sort((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || a.id.localeCompare(b.id));
  const published = new Map<string, number>();
  for (const e of events) published.set(e.sourceId, (published.get(e.sourceId) ?? 0) + 1);
  const sources: EventSourceInfo[] = results
    .filter(r => published.has(r.source.id))
    .map(({ source: s }) => ({ id: s.id, name: s.name, url: s.url, ...(stale.has(s.id) ? { stale: true } : {}) }));
  const report = results.map(({ source: s }) => ({
    id: s.id,
    found: found.get(s.id) ?? 0,
    published: published.get(s.id) ?? 0,
    stale: stale.has(s.id),
    ...(errors.has(s.id) ? { error: errors.get(s.id) } : {}),
  }));
  return { feed: { version: 1, generatedAt: new Date(now).toISOString(), sources, events }, report };
}

/** Reasons not to publish a feed. Empty means it's safe to write. */
export function publishProblems(feed: EventFeed, previous: EventFeed | null, now = Date.now()): string[] {
  const problems: string[] = [];
  const checked = parseFeed(JSON.parse(JSON.stringify(feed)));
  if (!checked) problems.push('The feed doesn’t pass the app’s own checks.');
  else if (checked.events.length !== feed.events.length)
    problems.push(`${feed.events.length - checked.events.length} events fail the app’s checks or share an id.`);
  if (!feed.events.length) problems.push('The feed has no events.');
  const before = (previous?.events ?? []).filter(e => isUpcoming(e, now)).length;
  if (before >= 10 && feed.events.length < before * MIN_SHARE)
    problems.push(`Only ${feed.events.length} events, down from ${before} upcoming. A source may have broken.`);
  return problems;
}
