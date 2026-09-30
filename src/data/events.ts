import type { CityId, EventCategory, WhenFilter } from '../types.js';
import type { IconName } from './icons.js';

export const EVENT_CITIES: { id: CityId; label: string }[] = [
  { id: 'copenhagen', label: 'Copenhagen' },
  { id: 'aarhus', label: 'Aarhus' },
  { id: 'odense', label: 'Odense' },
  { id: 'aalborg', label: 'Aalborg' },
];
export const WHEN_OPTS: { id: WhenFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'today', label: 'Today' },
  { id: 'weekend', label: 'This weekend' },
  { id: 'week', label: 'Next 7 days' },
];
export const CAT_LABELS: Record<EventCategory, string> = {
  music: 'Music',
  culture: 'Culture',
  food: 'Food',
  social: 'Social',
  outdoors: 'Outdoors',
  sport: 'Sport',
  learning: 'Learning',
  family: 'Family',
  other: 'More',
};
export const CAT_ORDER: EventCategory[] = [
  'social',
  'music',
  'culture',
  'food',
  'outdoors',
  'sport',
  'learning',
  'family',
  'other',
];
export const CAT_ICONS: Record<EventCategory, IconName> = {
  music: 'Music2',
  culture: 'Palette',
  food: 'Utensils',
  social: 'UsersRound',
  outdoors: 'Trees',
  sport: 'Trophy',
  learning: 'BookOpen',
  family: 'Baby',
  other: 'CalendarDays',
};

/** Real, lasting places to find events and meet people, shown next to the listings and when a city has none. */
export interface MeetIdea {
  title: string;
  text: string;
  url: string;
  icon: IconName;
  /** The cities it's for. Missing means everywhere. */
  cities?: CityId[];
}

export const MEET_IDEAS: MeetIdea[] = [
  {
    title: 'International House Copenhagen',
    text: 'Free events, talks and networking for internationals.',
    url: 'https://ihcph.kk.dk/',
    icon: 'Building2',
    cities: ['copenhagen'],
  },
  {
    title: 'Your local library',
    text: 'Danish libraries host free talks, language cafés and workshops. Look for “arrangementer”.',
    url: 'https://lifeindenmark.borger.dk/',
    icon: 'Library',
  },
  {
    title: 'KultuNaut',
    text: 'Denmark’s big what’s-on guide, with listings for every town.',
    url: 'https://www.kultunaut.dk/UK/',
    icon: 'CalendarDays',
  },
  {
    title: 'VisitDenmark events',
    text: 'Festivals and big events across the country.',
    url: 'https://www.visitdenmark.com/denmark/things-to-do/events/event-calendar',
    icon: 'Ticket',
  },
];
