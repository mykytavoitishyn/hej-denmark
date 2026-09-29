import { store } from '../src/lib/storage.js';
import { createGuest, saveGuestData, afterProfileChange } from '../src/state/session.js';
import { S, createInitialState } from '../src/state/state.js';
import type { EventItem, Profile } from '../src/types.js';

export const profile = (over: Partial<Profile> = {}): Profile => ({
  move_reason: 'work',
  residency_group: 'eu-eea',
  city: 'copenhagen',
  has_cpr: false,
  arrival_date: null,
  onboarding_completed: true,
  ...over,
});

export const event = (over: Partial<EventItem> = {}): EventItem => ({
  id: 'kultunaut-1',
  title: 'Harbour walk',
  startsAt: '2026-10-25T12:00:00Z',
  endsAt: null,
  dateLabel: 'Sun, 25 Oct',
  timeLabel: '13.00',
  location: 'Copenhagen',
  category: 'outdoors',
  sourceUrl: 'https://www.kultunaut.dk/perl/arrmore/type-nynaut/UK?ArrNr=1',
  sourceName: 'KultuNaut',
  isFallback: false,
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
