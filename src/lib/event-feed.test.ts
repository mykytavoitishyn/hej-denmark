import { describe, expect, it } from 'vitest';
import { event, feed } from '../../tests/helpers.js';
import { calendarLink, dateLabel, eventsIn, normalizeEvent, parseFeed, timeLabel, whenMatch } from './event-feed.js';

// Wednesday 30 September 2026, 12:00 in Copenhagen (UTC+2).
const NOW = Date.parse('2026-09-30T10:00:00Z');

describe('parseFeed', () => {
  it('rejects files without the basic shape', () => {
    expect(parseFeed(null)).toBeNull();
    expect(parseFeed({ version: 2, generatedAt: '2026-09-29T06:00:00Z', events: [] })).toBeNull();
    expect(parseFeed({ version: 1, generatedAt: 'soon', events: [] })).toBeNull();
    expect(parseFeed({ version: 1, generatedAt: '2026-09-29T06:00:00Z', events: {} })).toBeNull();
  });

  it('drops invalid and duplicate events one by one', () => {
    const f = parseFeed({
      ...feed(),
      events: [
        event(),
        event(),
        { id: 'x', title: 'No date', url: 'https://example.com' },
        event({ id: 'b', url: 'javascript:alert(1)' }),
      ],
    });
    expect(f?.events.map(e => e.id)).toEqual(['kultunaut-1']);
    expect(f?.sources).toHaveLength(1);
  });
});

describe('normalizeEvent', () => {
  it('converts events saved by earlier versions of the site', () => {
    const e = normalizeEvent({
      id: 'kultunaut-19561419',
      title: 'Museum evening',
      startsAt: '2026-10-25T12:00:00Z',
      endsAt: null,
      dateLabel: 'Sun, 25 Oct',
      timeLabel: '13.00',
      location: 'Magasin du Nord Museum',
      category: 'culture',
      sourceUrl: 'https://www.kultunaut.dk/perl/arrmore/type-nynaut/UK?ArrNr=19561419',
      sourceName: 'KultuNaut',
      isFallback: false,
    });
    expect(e).toMatchObject({
      venue: 'Magasin du Nord Museum',
      sourceId: 'kultunaut',
      kind: 'event',
      category: 'culture',
    });
    expect(e?.url).toContain('ArrNr=19561419');
  });

  it('drops the made-up fallback events older versions saved', () => {
    expect(normalizeEvent({ ...event(), isFallback: true })).toBeNull();
  });
});

describe('eventsIn', () => {
  it('lists upcoming events in one city, dated ones first by start time', () => {
    const f = feed([
      event({ id: 'late', startsAt: '2026-10-10T16:00:00Z' }),
      event({ id: 'past', startsAt: '2026-09-20T16:00:00Z' }),
      event({ id: 'expo', kind: 'ongoing', startsAt: '2026-09-01T08:00:00Z', endsAt: '2026-12-31T16:00:00Z' }),
      event({ id: 'soon', startsAt: '2026-10-01T16:00:00Z' }),
      event({ id: 'aarhus', city: 'aarhus', startsAt: '2026-10-01T16:00:00Z' }),
    ]);
    expect(eventsIn(f, 'copenhagen', NOW).map(e => e.id)).toEqual(['soon', 'late', 'expo']);
    expect(eventsIn(null, 'copenhagen', NOW)).toEqual([]);
  });
});

describe('whenMatch', () => {
  it('matches everything for “all”', () => {
    expect(whenMatch(event({ startsAt: '2030-01-01T12:00:00Z' }), 'all', NOW)).toBe(true);
  });

  it('matches only today in Copenhagen for “today”', () => {
    expect(whenMatch(event({ startsAt: '2026-09-30T21:30:00Z' }), 'today', NOW)).toBe(true);
    expect(whenMatch(event({ startsAt: '2026-09-30T22:30:00Z' }), 'today', NOW)).toBe(false);
  });

  it('matches the next seven days for “week”', () => {
    expect(whenMatch(event({ startsAt: '2026-10-06T10:00:00Z' }), 'week', NOW)).toBe(true);
    expect(whenMatch(event({ startsAt: '2026-10-07T10:00:00Z' }), 'week', NOW)).toBe(false);
  });

  it('matches the coming Saturday and Sunday for “weekend”', () => {
    expect(whenMatch(event({ startsAt: '2026-10-03T08:00:00Z' }), 'weekend', NOW)).toBe(true);
    expect(whenMatch(event({ startsAt: '2026-10-04T20:00:00Z' }), 'weekend', NOW)).toBe(true);
    expect(whenMatch(event({ startsAt: '2026-10-02T18:00:00Z' }), 'weekend', NOW)).toBe(false);
    expect(whenMatch(event({ startsAt: '2026-10-04T22:30:00Z' }), 'weekend', NOW)).toBe(false);
  });

  it('matches exhibitions on every day they are open', () => {
    const expo = event({ kind: 'ongoing', startsAt: '2026-09-01T08:00:00Z', endsAt: '2026-12-31T16:00:00Z' });
    expect(whenMatch(expo, 'today', NOW)).toBe(true);
  });
});

describe('labels', () => {
  it('shows dates and times in Danish time', () => {
    const e = event({ startsAt: '2026-10-25T12:00:00Z', endsAt: '2026-10-25T14:00:00Z' });
    expect(dateLabel(e, NOW)).toBe('Sun 25 Oct');
    expect(timeLabel(e)).toBe('13:00–15:00');
    expect(timeLabel(event({ allDay: true }))).toBe('All day');
  });

  it('says how long an exhibition runs', () => {
    const expo = event({ kind: 'ongoing', startsAt: '2026-09-01T08:00:00Z', endsAt: '2027-01-10T16:00:00Z' });
    expect(dateLabel(expo, NOW)).toBe('Until 10 Jan 2027');
  });
});

describe('calendarLink', () => {
  it('builds a Google Calendar link with a two-hour default length', () => {
    const url = new URL(calendarLink(event({ title: 'Harbour walk & swim' })));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Harbour walk & swim');
    expect(url.searchParams.get('dates')).toBe('20261025T120000Z/20261025T140000Z');
    expect(url.searchParams.get('details')).toContain('kultunaut.dk');
  });

  it('uses the event’s own end time, and whole days for all-day events', () => {
    const timed = new URL(calendarLink(event({ endsAt: '2026-10-25T15:30:00Z' })));
    expect(timed.searchParams.get('dates')).toBe('20261025T120000Z/20261025T153000Z');
    const allDay = new URL(calendarLink(event({ allDay: true, startsAt: '2026-10-24T22:00:00Z' })));
    expect(allDay.searchParams.get('dates')).toBe('20261025/20261026');
  });
});
