// A small iCalendar (RFC 5545) reader for public event calendars such as Luma and Meetup. It reads single events
// only: the calendars we use list every occurrence, so repeat rules (RRULE) aren't expanded.

export interface IcsEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  /** The event page: the URL property, or the first link in the description. */
  url: string;
  /** ISO 8601 in UTC. */
  start: string;
  end: string | null;
  allDay: boolean;
  geo: [lat: number, lon: number] | null;
  status: string;
}

interface Property {
  name: string;
  params: Record<string, string>;
  value: string;
}

/** Joins folded lines: a line that starts with a space or tab continues the one before. */
const unfold = (text: string): string[] =>
  text
    .replace(/\r\n?/g, '\n')
    .replace(/\n[ \t]/g, '')
    .split('\n');

/** Splits on a separator, ignoring separators inside double quotes (parameter values can be quoted). */
function splitOutsideQuotes(s: string, sep: string, limit = Infinity): string[] {
  const parts: string[] = [];
  let cur = '',
    quoted = false;
  for (const ch of s) {
    if (ch === '"') quoted = !quoted;
    if (ch === sep && !quoted && parts.length < limit - 1) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts;
}

function parseLine(line: string): Property | null {
  const [head, value] = splitOutsideQuotes(line, ':', 2);
  if (value === undefined) return null;
  const [name, ...rest] = splitOutsideQuotes(head, ';');
  const params: Record<string, string> = {};
  for (const p of rest) {
    const i = p.indexOf('=');
    if (i > 0) params[p.slice(0, i).toUpperCase()] = p.slice(i + 1).replace(/^"|"$/g, '');
  }
  return { name: name.toUpperCase(), params, value };
}

/** Text values escape commas, semicolons, backslashes and new lines. */
export const unescapeText = (v: string): string =>
  v.replace(/\\([\\;,nN])/g, (_, c: string) => (c === 'n' || c === 'N' ? '\n' : c));

/** The offset of a time zone from UTC at a moment, in milliseconds, worked out with Intl. */
function zoneOffset(t: number, zone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(t);
  const n = (type: string) => Number(parts.find(p => p.type === type)?.value);
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour'), n('minute'), n('second')) - t;
}

/**
 * Converts a wall-clock time in a time zone to UTC. The offset is checked twice, so times near a daylight saving
 * change land on the right side of it.
 */
export function zonedToUtc(y: number, mo: number, d: number, h: number, mi: number, s: number, zone: string): number {
  const guess = Date.UTC(y, mo - 1, d, h, mi, s);
  const first = guess - zoneOffset(guess, zone);
  return guess - zoneOffset(first, zone);
}

const ZONE = 'Europe/Copenhagen';

/** Reads a DATE or DATE-TIME value. Times without a zone are taken as Copenhagen time, where these events happen. */
export function parseIcsDate(p: Property): { t: number; allDay: boolean } | null {
  const m = p.value.match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/);
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (m[4] === undefined) return { t: zonedToUtc(y, mo, d, 0, 0, 0, ZONE), allDay: true };
  const [h, mi, s] = [Number(m[4]), Number(m[5]), Number(m[6])];
  if (m[7]) return { t: Date.UTC(y, mo - 1, d, h, mi, s), allDay: false };
  return { t: zonedToUtc(y, mo, d, h, mi, s, p.params.TZID || ZONE), allDay: false };
}

/** Reads every event in a calendar. Events without a start or a title, and cancelled ones, are left out. */
export function parseIcs(text: string): IcsEvent[] {
  const events: IcsEvent[] = [];
  let props: Property[] | null = null;
  for (const line of unfold(text)) {
    if (line === 'BEGIN:VEVENT') props = [];
    else if (line === 'END:VEVENT' && props) {
      const get = (name: string) => props?.find(p => p.name === name);
      const start = get('DTSTART') && parseIcsDate(get('DTSTART') as Property);
      const endProp = get('DTEND');
      const end = endProp ? parseIcsDate(endProp) : null;
      const summary = unescapeText(get('SUMMARY')?.value ?? '').trim();
      const status = (get('STATUS')?.value ?? '').toUpperCase();
      const description = unescapeText(get('DESCRIPTION')?.value ?? '');
      const geo = get('GEO')
        ?.value.split(/[;,]/)
        .map(Number)
        .filter(n => Number.isFinite(n));
      if (start && summary && status !== 'CANCELLED')
        events.push({
          uid: get('UID')?.value.trim() ?? '',
          summary,
          description,
          location: unescapeText(get('LOCATION')?.value ?? '').trim(),
          url: (get('URL')?.value ?? description.match(/https?:\/\/[^\s<>"]+/)?.[0] ?? '').trim(),
          start: new Date(start.t).toISOString(),
          end: end && end.t > start.t ? new Date(end.t).toISOString() : null,
          allDay: start.allDay,
          geo: geo && geo.length === 2 ? [geo[0], geo[1]] : null,
          status,
        });
      props = null;
    } else if (props) {
      const p = parseLine(line);
      if (p) props.push(p);
    }
  }
  return events;
}
