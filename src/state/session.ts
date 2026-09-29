import { planFor } from '../lib/plan.js';
import { KEY, readJSON, store, writeJSON } from '../lib/storage.js';
import type { AskMessage, EventItem, Profile, Reminder } from '../types.js';
import { S } from './state.js';

type GuestKey = 'profile' | 'done' | 'checklist' | 'reminders' | 'saved' | 'ask';

/** Saves one piece of guest data to this device. Does nothing when there is no active guest. */
export function saveGuestData(key: GuestKey, value: unknown): void {
  if (S.guestId) writeJSON(KEY[key](S.guestId), value);
}

/** Restores the active guest from this device. Stored data is untrusted, so each part is validated. */
export function loadGuest(): void {
  const id = store.get(KEY.active);
  S.guestId = id || null;
  if (!id) {
    S.profile = null;
    S.plan = [];
    return;
  }
  const p = readJSON<Partial<Profile> | null>(KEY.profile(id), null);
  S.profile =
    p && typeof p === 'object' && p.move_reason ? ({ ...p, arrival_date: p.arrival_date ?? null } as Profile) : null;
  const d = readJSON<unknown>(KEY.done(id), []);
  S.done = new Set(Array.isArray(d) ? d.filter((n): n is number => typeof n === 'number') : []);
  const c = readJSON<unknown>(KEY.checklist(id), {});
  S.checklist = c && typeof c === 'object' && !Array.isArray(c) ? (c as Record<string, string[]>) : {};
  const r = readJSON<unknown>(KEY.reminders(id), []);
  S.reminders = Array.isArray(r)
    ? (r as Reminder[]).filter(x => x && typeof x.stepId === 'number' && typeof x.remindAt === 'string')
    : [];
  const sv = readJSON<unknown>(KEY.saved(id), []);
  S.saved = Array.isArray(sv) ? (sv as EventItem[]).filter(e => e && e.id && e.title && e.startsAt) : [];
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
    done: new Set(),
    checklist: {},
    reminders: [],
    saved: [],
    askHistory: [],
    plan: [],
    pe: null,
    ev: null,
    openPhases: null,
    phaseKey: null,
    selStep: null,
    onb: { i: 0, draft: {} },
  });
}

export function buildPlan(): void {
  S.plan = S.profile ? planFor(S.profile, S.done) : [];
}

/** Marks a step done or not done. Returns false when the step is missing or still locked. */
export function toggleStep(id: number): boolean {
  const st = S.plan.find(s => s.id === id);
  if (!st || (st.locked && !st.completed)) return false;
  if (st.completed) S.done.delete(id);
  else S.done.add(id);
  saveGuestData('done', [...S.done]);
  buildPlan();
  return true;
}

export function afterProfileChange(): void {
  buildPlan();
  S.openPhases = null;
  S.phaseKey = null;
  S.selStep = null;
}
