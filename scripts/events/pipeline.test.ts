import { describe, expect, it } from 'vitest';
import type { EventFeed, EventItem } from '../../src/types.ts';
import {
  buildFeed,
  calendarVenue,
  categoryFor,
  collapseSeries,
  dedupe,
  fromCalendar,
  fromLibrary,
  libraryCategory,
  publishProblems,
  tidyTitle,
} from './pipeline.ts';
import type { Candidate } from './pipeline.ts';
import { SOURCES } from './sources.ts';
import type { EventSource } from './sources.ts';

const now = Date.parse('2026-09-30T12:00:00Z');
const source = (id: string): EventSource => {
  const s = SOURCES.find(x => x.id === id);
  if (!s) throw new Error(id);
  return s;
};
const kk = source('kk-libraries'),
  dearWorld = source('dear-world'),
  expatMeetup = source('copenhagen-expat-meetup');

/** A library event shaped like the DPL CMS API returns it (trimmed from bibliotek.kk.dk). */
const libraryEvent = (over: Record<string, unknown> = {}) => ({
  uuid: 'b1c2',
  title: 'Talk Danish',
  url: 'https://bibliotek.kk.dk/orestad-bibliotek/arrangementer/talk-danish',
  state: 'Active',
  all_day: false,
  date_time: { start: '2026-10-12T10:00:00+02:00', end: '2026-10-12T11:30:00+02:00' },
  branches: ['Ørestad Bibliotek'],
  address: { locationType: 'physical', location: 'Mødelokalet', city: 'København S' },
  categories: ['Fællesskaber'],
  tags: ['Aktiviteter', 'International'],
  ticket_categories: [{ price: { currency: 'DKK', value: 0 } }],
  series: { uuid: 'series-talk' },
  ...over,
});

const vevent = (lines: string[]) => ['BEGIN:VEVENT', ...lines, 'END:VEVENT'];
const calendar = (...events: string[][]) =>
  ['BEGIN:VCALENDAR', 'VERSION:2.0', ...events.flat(), 'END:VCALENDAR'].join('\r\n');

const item = (over: Partial<EventItem> = {}): EventItem => ({
  id: 'x-1',
  title: 'Sprogcafé',
  startsAt: '2026-10-05T12:00:00.000Z',
  endsAt: null,
  allDay: false,
  kind: 'event',
  venue: 'Risskov Bibliotek',
  city: 'aarhus',
  category: 'learning',
  url: 'https://www.aakb.dk/arrangementer/sprogcafe',
  sourceId: 'aarhus-libraries',
  sourceName: 'Aarhus Libraries',
  isFree: true,
  ...over,
});
const candidate = (over: Partial<EventItem>, rank = 1, series = over.id ?? 'x'): Candidate => ({
  event: item(over),
  rank,
  series,
});

describe('libraryCategory', () => {
  it('keeps what helps newcomers meet people and learn Danish', () => {
    expect(libraryCategory('Talk Danish', ['Fællesskaber', 'International'])).toBe('learning');
    expect(libraryCategory('Sprogcafé', [])).toBe('learning');
    expect(libraryCategory('Fællesspisning tirsdag i FLOK', ['Fællesskaber'])).toBe('food');
    expect(libraryCategory('Meetup - Welcome to DK #210', ['International', 'Meet up'])).toBe('social');
    expect(libraryCategory('Fully Booked! English Bookclub', ['Litteratur', 'English'])).toBe('social');
  });

  it('leaves out Danish-only events and events for children or daycare groups', () => {
    expect(libraryCategory('Strikkecafé', ['Fællesskab'])).toBeNull();
    expect(libraryCategory('Lydbanko for børnehaver', ['Dagtilbud', 'Sprog og fortællinger'])).toBeNull();
    expect(libraryCategory('Sprogfitnessdagen', ['For børn', 'Sprogfitness'])).toBeNull();
  });

  it('keeps international events for parents, as family events', () => {
    expect(libraryCategory('My Multilingual Child', ['Børn og unge', 'Børn 0-2 år', 'International'])).toBe('family');
  });
});

describe('categoryFor', () => {
  it('sorts organisers’ events', () => {
    expect(categoryFor('Run Club by Dear World')).toBe('sport');
    expect(categoryFor('Quiz Night by Dear World')).toBe('social');
    expect(categoryFor('Koreansk-Dansk Snakkeklub')).toBe('learning');
  });
});

describe('fromLibrary', () => {
  it('turns a library event into the app’s shape', () => {
    const [c] = fromLibrary([libraryEvent()], kk);
    expect(c.event).toEqual({
      id: 'kk-libraries-b1c2',
      title: 'Talk Danish',
      startsAt: '2026-10-12T08:00:00.000Z',
      endsAt: '2026-10-12T09:30:00.000Z',
      allDay: false,
      kind: 'event',
      venue: 'Ørestad Bibliotek, København S',
      city: 'copenhagen',
      category: 'learning',
      url: 'https://bibliotek.kk.dk/orestad-bibliotek/arrangementer/talk-danish',
      sourceId: 'kk-libraries',
      sourceName: 'Copenhagen Libraries',
      isFree: true,
    });
    expect(c.series).toBe('kk-libraries:series-talk');
  });

  it('reads prices, and the free tag when there are no tickets', () => {
    const paid = libraryEvent({ ticket_categories: [{ price: { value: 40 } }] });
    const tagged = libraryEvent({ ticket_categories: [], tags: ['International', 'Gratis'] });
    const unknown = libraryEvent({ ticket_categories: [] });
    expect(fromLibrary([paid, tagged, unknown], kk).map(c => c.event.isFree)).toEqual([false, true, null]);
  });

  it('skips cancelled, past and full events, and writes branch names with a slash', () => {
    const list = [
      libraryEvent({ uuid: 'a', state: 'Cancelled' }),
      libraryEvent({ uuid: 'b', state: 'Occurred' }),
      libraryEvent({ uuid: 'c', title: 'Fully booked! English Book Club' }),
      libraryEvent({ uuid: 'd', branches: ['Tingbjerg Bibliotek\\Kulturhus'], address: { city: 'Brønshøj' } }),
    ];
    const out = fromLibrary(list, kk);
    expect(out.map(c => c.event.venue)).toEqual(['Tingbjerg Bibliotek/Kulturhus, Brønshøj']);
  });

  it('fails on a response that isn’t a list, so the source counts as unreachable', () => {
    expect(() => fromLibrary({ error: 'maintenance' }, kk)).toThrow();
  });
});

describe('fromCalendar', () => {
  const luma = calendar(
    vevent([
      'DTSTART:20261021T170000Z',
      'UID:evt-cph@events.lu.ma',
      'SUMMARY:BAR NIGHT & POOL by Dear World',
      'DESCRIPTION:Get up-to-date information at: https://luma.com/ftf3po63',
      'LOCATION:Pool, Gothersgade 8C, 1123 København, Denmark',
      'GEO:55.682024999999996;12.584816',
    ]),
    vevent([
      'DTSTART:20261022T170000Z',
      'UID:evt-hh@events.lu.ma',
      'SUMMARY:Bar night by Dear World',
      'DESCRIPTION:https://luma.com/hamburg',
      'LOCATION:PALLAS, Neuer Pferdemarkt 13, 20359 Hamburg, Germany',
      'GEO:53.559108;9.9645172',
    ]),
  );

  it('keeps an organiser’s events in its city and tidies shouted titles', () => {
    const out = fromCalendar(luma, dearWorld);
    expect(out.map(c => c.event)).toEqual([
      expect.objectContaining({
        id: 'dear-world-evt-cph',
        title: 'Bar Night & Pool by Dear World',
        venue: 'Pool, Copenhagen',
        city: 'copenhagen',
        category: 'social',
        url: 'https://luma.com/ftf3po63',
        isFree: null,
      }),
    ]);
  });

  it('rejects something that isn’t a calendar', () => {
    expect(() => fromCalendar('<html>Sign in</html>', dearWorld)).toThrow();
  });
});

describe('titles and venues', () => {
  it('only tidies titles written in capitals', () => {
    expect(tidyTitle('QUIZ NIGHT by Dear World')).toBe('Quiz Night by Dear World');
    expect(tidyTitle('Welcome to DK: Networking')).toBe('Welcome to DK: Networking');
  });

  it('shortens a full address to the place and the city', () => {
    expect(calendarVenue('Alexandra, Nørregade 1, 1165 København, Denmark')).toBe('Alexandra, Copenhagen');
    expect(calendarVenue('')).toBe('');
  });
});

describe('merging', () => {
  it('keeps the organiser’s listing when a library lists the same meet-up under another number', () => {
    const meetup = candidate(
      {
        id: 'copenhagen-expat-meetup-1',
        title: 'Welcome to DK: Networking & Community Building #210',
        startsAt: '2026-10-15T15:30:00.000Z',
        city: 'copenhagen',
        sourceId: expatMeetup.id,
      },
      0,
    );
    const library = candidate({
      id: 'kk-libraries-9',
      title: 'Meetup - Welcome to DK: Networking & Community Building #212',
      startsAt: '2026-10-15T15:30:00.000Z',
      city: 'copenhagen',
      sourceId: kk.id,
    });
    expect(dedupe([library, meetup]).map(c => c.event.id)).toEqual(['copenhagen-expat-meetup-1']);
  });

  it('keeps events on different days or at different times', () => {
    const a = candidate({ id: 'a', startsAt: '2026-10-05T12:00:00.000Z' });
    const b = candidate({ id: 'b', startsAt: '2026-10-05T14:00:00.000Z' });
    const c = candidate({ id: 'c', startsAt: '2026-10-12T12:00:00.000Z' });
    expect(dedupe([a, b, c])).toHaveLength(3);
  });

  it('shows the next two dates of a series', () => {
    const weekly = [5, 12, 19, 26].map(d =>
      candidate({ id: `s-${d}`, startsAt: `2026-10-${String(d).padStart(2, '0')}T12:00:00.000Z` }, 1, 'series'),
    );
    expect(collapseSeries(weekly).map(c => c.event.id)).toEqual(['s-5', 's-12']);
  });
});

describe('buildFeed', () => {
  const libraryBody = [
    libraryEvent({ uuid: 'soon' }),
    libraryEvent({
      uuid: 'later',
      series: { uuid: 'x' },
      date_time: { start: '2027-01-20T10:00:00+01:00', end: null },
    }),
    libraryEvent({ uuid: 'past', series: { uuid: 'y' }, date_time: { start: '2026-09-01T10:00:00+02:00' } }),
  ];

  it('publishes upcoming events for the next 60 days and credits their sources', () => {
    const { feed, report } = buildFeed([{ source: kk, body: libraryBody }], null, now);
    expect(feed.events.map(e => e.id)).toEqual(['kk-libraries-soon']);
    expect(feed.sources).toEqual([{ id: kk.id, name: kk.name, url: kk.url }]);
    expect(report).toEqual([{ id: kk.id, found: 3, published: 1, stale: false }]);
  });

  it('keeps a failed source’s upcoming events from the last feed and marks them as possibly out of date', () => {
    const previous: EventFeed = {
      version: 1,
      generatedAt: '2026-09-29T05:00:00.000Z',
      sources: [],
      events: [
        item({ id: 'dear-world-1', sourceId: dearWorld.id, city: 'copenhagen', startsAt: '2026-10-07T17:00:00.000Z' }),
        item({ id: 'dear-world-0', sourceId: dearWorld.id, city: 'copenhagen', startsAt: '2026-09-20T17:00:00.000Z' }),
      ],
    };
    const { feed, report } = buildFeed([{ source: dearWorld, error: 'ETIMEDOUT' }], previous, now);
    expect(feed.events.map(e => e.id)).toEqual(['dear-world-1']);
    expect(feed.sources[0]).toMatchObject({ id: dearWorld.id, stale: true });
    expect(report[0]).toMatchObject({ stale: true, error: 'ETIMEDOUT' });
  });

  it('treats an unreadable response as a failed source', () => {
    const { report } = buildFeed([{ source: kk, body: 'not json' }], null, now);
    expect(report[0].stale).toBe(true);
  });
});

describe('publishProblems', () => {
  const feed = (events: EventItem[]): EventFeed => ({
    version: 1,
    generatedAt: new Date(now).toISOString(),
    sources: [],
    events,
  });
  const many = (n: number) => Array.from({ length: n }, (_, i) => item({ id: `e-${i}` }));

  it('accepts a healthy feed', () => {
    expect(publishProblems(feed(many(20)), feed(many(20)), now)).toEqual([]);
  });

  it('refuses an empty feed, repeated ids and a sudden drop', () => {
    expect(publishProblems(feed([]), null, now)).toContain('The feed has no events.');
    expect(publishProblems(feed([item(), item()]), null, now)[0]).toMatch(/share an id/);
    expect(publishProblems(feed(many(5)), feed(many(20)), now)[0]).toMatch(/down from 20/);
  });
});
