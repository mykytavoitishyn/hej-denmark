import type { CityId } from '../../src/types.ts';

/**
 * Where events come from. Every source is a public interface its owner offers for reuse:
 * - Danish public libraries run DPL CMS, whose event API lists all public events (github.com/danskernesdigitalebibliotek/dpl-cms,
 *   docs/event-integration.md).
 * - Luma and Meetup publish calendars as iCal subscriptions. Luma's terms allow its public interfaces but not reuse of
 *   images, so no images are taken from any source.
 * Scraped sites, and services whose terms forbid reuse (KultuNaut without an agreement, Eventbrite, Facebook), aren't used.
 */
export interface EventSource {
  id: string;
  name: string;
  /** The page credited in the app. */
  url: string;
  kind: 'dpl' | 'ics';
  city: CityId;
  /** Organisers' own listings win over the same event listed by a venue: 0 is the organiser, 1 a host or venue. */
  rank: number;
  /** The address to fetch. `today` is YYYY-MM-DD in Copenhagen. */
  feed: (today: string) => string;
}

const library = (id: string, name: string, host: string, city: CityId): EventSource => ({
  id,
  name,
  url: `https://${host}/arrangementer`,
  kind: 'dpl',
  city,
  rank: 1,
  feed: today => `https://${host}/api/v1/events?_format=json&from_date=${today}`,
});

export const SOURCES: EventSource[] = [
  {
    id: 'dear-world',
    name: 'Dear World',
    url: 'https://luma.com/user/dearworldcph',
    kind: 'ics',
    city: 'copenhagen',
    rank: 0,
    feed: () => 'https://api.lu.ma/ics/get?entity=calendar&id=cal-pem3s3a3N2qdjDJ',
  },
  {
    id: 'copenhagen-expat-meetup',
    name: 'Copenhagen Expat Meetup',
    url: 'https://www.meetup.com/copenhagen-library-expat-meetup/',
    kind: 'ics',
    city: 'copenhagen',
    rank: 0,
    feed: () => 'https://www.meetup.com/copenhagen-library-expat-meetup/events/ical/',
  },
  library('kk-libraries', 'Copenhagen Libraries', 'bibliotek.kk.dk', 'copenhagen'),
  library('aarhus-libraries', 'Aarhus Libraries', 'www.aakb.dk', 'aarhus'),
  library('odense-libraries', 'Odense Libraries', 'www.odensebib.dk', 'odense'),
  library('aalborg-libraries', 'Aalborg Libraries', 'www.aalborgbibliotekerne.dk', 'aalborg'),
];
