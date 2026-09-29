import { normalizeEvent } from '../lib/event-feed.js';
import { planFor } from '../lib/plan.js';
import { normalizeAvatar, normalizeProfile } from '../lib/profile.js';
import { KEY, readJSON, store, writeJSON } from '../lib/storage.js';
import type { AskMessage, EventItem, Reminder } from '../types.js';
import { S } from './state.js';

type GuestKey = 'profile' | 'done' | 'skipped' | 'checklist' | 'reminders' | 'saved' | 'ask' | 'avatar';

/** Saves one piece of guest data to this device. Does nothing when there is no active guest. */
export function saveGuestData(key: GuestKey, value: unknown): void {
  if (S.guestId) writeJSON(KEY[key](S.guestId), value);
}

const numberSet = (v: unknown): Set<number> =>
  new Set(Array.isArray(v) ? v.filter((n): n is number => typeof n === 'number' && Number.isInteger(n)) : []);

/** Restores the active guest from this device. Stored data is untrusted, so each part is validated. */
export function loadGuest(): void {
  const id = store.get(KEY.active);
  S.guestId = id || null;
  if (!id) {
    S.profile = null;
    S.avatar = null;
    S.plan = [];
    return;
  }
  S.profile = normalizeProfile(readJSON<unknown>(KEY.profile(id), null));
  S.avatar = normalizeAvatar(readJSON<unknown>(KEY.avatar(id), null));
  S.done = numberSet(readJSON<unknown>(KEY.done(id), []));
  S.skipped = numberSet(readJSON<unknown>(KEY.skipped(id), []));
  const c = readJSON<unknown>(KEY.checklist(id), {});
  S.checklist =
    c && typeof c === 'object' && !Array.isArray(c)
      ? Object.fromEntries(
          Object.entries(c as Record<string, unknown>)
            .filter(([, v]) => Array.isArray(v))
            .map(([k, v]) => [k, (v as unknown[]).filter((x): x is string => typeof x === 'string')]),
        )
      : {};
  const r = readJSON<unknown>(KEY.reminders(id), []);
  S.reminders = Array.isArray(r)
    ? (r as Reminder[]).filter(x => x && typeof x.stepId === 'number' && typeof x.remindAt === 'string')
    : [];
  const sv = readJSON<unknown>(KEY.saved(id), []);
  S.saved = Array.isArray(sv) ? sv.map(normalizeEvent).filter((e): e is EventItem => Boolean(e)) : [];
  const h = readJSON<unknown>(KEY.ask(id), []);
  S.askHistory = Array.isArray(h)
    ? (h as AskMessage[]).filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.text === 'string')
    : [];
  buildPlan();
}

export function createGuest(): void {
  let id = store.get(KEY.active);
  if (!id) {
    id = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    store.set(KEY.active, id);
  }
  loadGuest();
}

export function leaveGuest(): void {
  store.del(KEY.active);
  Object.assign(S, {
    guestId: null,
    profile: null,
    avatar: null,
    done: new Set(),
    skipped: new Set(),
    checklist: {},
    reminders: [],
    saved: [],
    askHistory: [],
    plan: [],
    pe: null,
    avatarOpen: false,
    avatarError: null,
    ev: null,
    hs: null,
    openPhases: null,
    phaseKey: null,
    selStep: null,
    welcome: false,
    onb: { i: 0, draft: {}, name: '', arrivalDate: null, dir: null },
  });
}

export function buildPlan(): void {
  S.plan = S.profile ? planFor(S.profile, S.done, S.skipped) : [];
}

/** Marks a step done or not done. Returns false when the step is missing or still locked. */
export function toggleStep(id: number): boolean {
  const st = S.plan.find(s => s.id === id);
  if (!st || (st.locked && !st.completed)) return false;
  if (st.completed) S.done.delete(id);
  else {
    S.done.add(id);
    S.skipped.delete(id);
    saveGuestData('skipped', [...S.skipped]);
  }
  saveGuestData('done', [...S.done]);
  buildPlan();
  return true;
}

/** Marks a step as not relevant, or brings a skipped step back. Returns false for a step that isn't in the plan. */
export function toggleSkip(id: number): boolean {
  const st = S.plan.find(s => s.id === id);
  if (!st || st.completed) return false;
  if (st.skipped) S.skipped.delete(id);
  else S.skipped.add(id);
  saveGuestData('skipped', [...S.skipped]);
  buildPlan();
  return true;
}

export function afterProfileChange(): void {
  buildPlan();
  S.openPhases = null;
  S.phaseKey = null;
  S.selStep = null;
}
