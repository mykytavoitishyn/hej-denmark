import type { Profile, State } from '../types.js';

/** A fresh state object. Tests use it to reset the app between cases. */
export const createInitialState = (): State => ({
  guestId: null,
  profile: null,
  done: new Set(),
  checklist: {},
  reminders: [],
  saved: [],
  askHistory: [],
  plan: [],
  route: { name: 'home' },
  scroll: {},
  onb: { i: 0, draft: {} },
  gateNote: null,
  pe: null,
  peError: null,
  jf: { urgent: false, hideDone: false },
  openPhases: null,
  phaseKey: null,
  selStep: null,
  ev: null,
  ask: { pending: false, streaming: '', error: null, input: '' },
  todayAsk: '',
  toast: null,
  lastPct: 0,
  stepError: null,
  todayError: null,
  sampleOff: false,
});

/** The app's single mutable state. Views read it, and actions change it and then call `render()`. */
export const S: State = createInitialState();

/**
 * The active profile. Screens that need one are only reachable after the plan builder,
 * so a missing profile here is a bug and throws.
 */
export function requireProfile(): Profile {
  if (!S.profile) throw new Error('This screen needs a profile');
  return S.profile;
}
