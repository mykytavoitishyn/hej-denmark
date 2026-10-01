import { store } from '../src/lib/storage.js';
import { createGuest, saveGuestData, afterProfileChange } from '../src/state/session.js';
import { S, createInitialState } from '../src/state/state.js';
import type { EventFeed, EventItem, Profile } from '../src/types.js';

export const profile = (over: Partial<Profile> = {}): Profile => ({
  move_reason: 'work',
  residency_group: 'eu-eea',
  city: 'copenhagen',
  has_cpr: false,
  cpr_stage: over.has_cpr ? 'have' : 'none',
  arrival_date: null,
  stage: 'arrived',
  housing: 'searching',
  household: 'solo',
  study_type: null,
  job_status: 'offer',
  name: '',
  onboarding_completed: true,
  ...over,
});

export const event = (over: Partial<EventItem> = {}): EventItem => ({
  id: 'kultunaut-1',
  title: 'Harbour walk',
  startsAt: '2026-10-25T12:00:00.000Z',
  endsAt: null,
  allDay: false,
  kind: 'event',
  venue: 'Nyhavn, Copenhagen',
  city: 'copenhagen',
  category: 'outdoors',
  url: 'https://www.kultunaut.dk/perl/arrmore/type-nynaut/UK?ArrNr=1',
  sourceId: 'kultunaut',
  sourceName: 'KultuNaut',
  isFree: null,
  ...over,
});

export const feed = (events: EventItem[] = [event()], over: Partial<EventFeed> = {}): EventFeed => ({
  version: 1,
  generatedAt: '2026-09-29T06:00:00.000Z',
  sources: [{ id: 'kultunaut', name: 'KultuNaut', url: 'https://www.kultunaut.dk/UK/' }],
  events,
  ...over,
});

/** Puts the app back in its first-visit state. */
export function resetApp(): void {
  store.clear();
  Object.assign(S, createInitialState());
}

/** Creates a guest with this profile, as if the person had finished the plan builder. */
export function signIn(p: Profile = profile()): void {
  createGuest();
  S.profile = p;
  saveGuestData('profile', p);
  afterProfileChange();
}
