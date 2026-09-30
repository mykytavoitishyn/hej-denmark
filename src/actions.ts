import { AVATAR_COLORS, AVATAR_EMOJI } from './data/avatars.js';
import { AMOUNT_FIELDS, budgetDefaults, withAmount, withChoice, withToggle } from './lib/budget.js';
import { icon } from './lib/dom.js';
import { dateLabel, eventsIn, timeLabel } from './lib/event-feed.js';
import { activeSteps, currentPhase, journeyPhases } from './lib/plan.js';
import { draftFromProfile, MAX_PHOTO_CHARS, profileFromDraft, questionsFor, withAnswer } from './lib/profile.js';
import { render } from './render.js';
import { go } from './router.js';
import { sendQuestion } from './services/ask.js';
import { loadEvents } from './services/events.js';
import {
  afterProfileChange,
  buildPlan,
  createGuest,
  leaveGuest,
  saveGuestData,
  toggleSkip,
  toggleStep,
} from './state/session.js';
import { requireProfile, S } from './state/state.js';
import type {
  AvatarColor,
  BudgetInputs,
  CityId,
  EventCategory,
  EventItem,
  EventsState,
  HousingKind,
  QuestionKey,
  RouteName,
  WhenFilter,
} from './types.js';
import { budgetAnnouncement, budgetParts, ensureBudget, fieldValue } from './views/budget.js';
import { withRewards } from './views/celebrate.js';
import { showToast } from './views/shared.js';

type Action = (el: HTMLElement, e: Event) => void | Promise<void>;

/** Reads a `data-*` attribute. The views always set the ones an action asks for. */
const data = (el: HTMLElement, key: string): string => el.dataset[key] ?? '';

/** Merges changes into the events screen state. Does nothing before that screen has been opened. */
const patchEvents = (patch: Partial<EventsState>): void => {
  if (S.ev) S.ev = { ...S.ev, ...patch };
};

/** Every event the person could be acting on: the listings and their saved ones. */
const knownEvents = (): EventItem[] => [...(S.events.feed?.events ?? []), ...S.saved];

/** Moves focus to the question heading after the plan builder changes question, for keyboard and screen reader users. */
function focusQuestion(): void {
  document.getElementById('q-title')?.focus({ preventScroll: true });
}

/** Renders, then puts focus back on the control that was used, since rendering replaces it. */
function renderKeepingFocus(el: HTMLElement): void {
  const sel = ['act', 'name', 'value', 'id'].map(k => (el.dataset[k] ? `[data-${k}="${el.dataset[k]}"]` : '')).join('');
  render();
  document.querySelector<HTMLElement>(sel)?.focus({ preventScroll: true });
}

/** Keeps the budget answers, on this device for guests like the rest of their plan. */
function setBudget(b: BudgetInputs): void {
  S.bud = b;
  saveGuestData('budget', b);
}

let budgetAnnounce: ReturnType<typeof setTimeout> | undefined;

/**
 * Updates the budget page's numbers while someone types. Only the results are redrawn, so the field they're typing
 * in keeps its focus and cursor. Screen readers hear the new total once typing pauses.
 */
function refreshBudget(): void {
  for (const [id, html] of Object.entries(budgetParts())) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
  }
  clearTimeout(budgetAnnounce);
  budgetAnnounce = setTimeout(() => {
    const live = document.getElementById('bud-live');
    if (live) live.textContent = budgetAnnouncement();
  }, 800);
}

function finishOnboarding(): void {
  const profile = profileFromDraft(S.onb.draft, { name: S.onb.name, arrivalDate: S.onb.arrivalDate });
  if (!profile) return;
  createGuest();
  S.profile = profile;
  saveGuestData('profile', profile);
  afterProfileChange();
  S.onb = { i: 0, draft: {}, name: '', arrivalDate: null, dir: null };
  S.gateNote = null;
  S.ev = null;
  S.hs = null;
  S.bud = null;
  S.welcome = true;
  S.route = { name: 'saving' };
  render();
  setTimeout(() => go('journey', {}, { replace: true }), 1400);
}

function evNotice(text: string): void {
  patchEvents({ notice: text });
  const el = document.getElementById('ev-notice');
  if (el) {
    el.textContent = text;
    el.hidden = false;
  }
}

const PHOTO_SIZE = 256;

/** Shrinks a picked photo to a small square JPEG, so it fits in local storage. */
function photoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const side = Math.min(img.naturalWidth, img.naturalHeight);
      if (!side) return reject(new Error('Empty image'));
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = PHOTO_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('No canvas'));
      ctx.drawImage(
        img,
        (img.naturalWidth - side) / 2,
        (img.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        PHOTO_SIZE,
        PHOTO_SIZE,
      );
      resolve(canvas.toDataURL('image/jpeg', 0.85));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Unreadable image'));
    };
    img.src = url;
  });
}

async function setPhoto(file: File): Promise<void> {
  S.avatarError = null;
  try {
    const value = await photoDataUrl(file);
    if (value.length > MAX_PHOTO_CHARS) throw new Error('Photo too large');
    withRewards(() => {
      S.avatar = { kind: 'photo', value };
      saveGuestData('avatar', S.avatar);
    });
  } catch {
    S.avatarError = 'That photo couldn’t be used. Try a PNG, JPEG or WebP image.';
  }
  render();
}

const actions: Record<string, Action> = {
  // The views only render `data-to` values that are valid route names.
  go: el => go(data(el, 'to') as RouteName),
  menu: el => {
    const h = document.getElementById('site-header');
    if (!h) return;
    const open = !h.classList.contains('open');
    h.classList.toggle('open', open);
    el.setAttribute('aria-expanded', String(open));
    el.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    el.innerHTML = icon(open ? 'X' : 'Menu', 20);
  },
  'onb-back': () => {
    if (S.onb.i > 0) {
      S.onb = { ...S.onb, i: S.onb.i - 1, dir: 'back' };
      render();
      focusQuestion();
    } else go('home');
  },
  'onb-jump': el => {
    S.onb = { ...S.onb, i: Number(data(el, 'i')), dir: 'back' };
    render();
    focusQuestion();
  },
  'onb-finish': () => finishOnboarding(),
  opt: el => {
    const name = data(el, 'name'),
      value = data(el, 'value');
    if (name === 'onb') {
      const q = questionsFor(S.onb.draft, 'onboarding')[S.onb.i];
      if (!q) return;
      const draft = withAnswer(S.onb.draft, q.key, value);
      // Answers can add or remove follow-up questions, so the position is worked out on the new list.
      // Skip ahead past questions that are already answered, which brings people back to the review after a change.
      const qs = questionsFor(draft, 'onboarding');
      const at = qs.findIndex(x => x.key === q.key);
      const next = qs.findIndex((x, k) => k > at && (x.key === 'hasCpr' ? draft.hasCpr : draft[x.key]) === undefined);
      S.onb = { ...S.onb, draft, i: next === -1 ? qs.length : next, dir: 'fwd' };
      render();
      focusQuestion();
      return;
    }
    if (name.startsWith('pe-') && S.pe) {
      S.pe = { ...S.pe, ...withAnswer(S.pe, name.slice(3) as QuestionKey, value) };
      render();
      return;
    }
    if (name.startsWith('bud-')) {
      setBudget(withChoice(ensureBudget(), name.slice(4), value));
      renderKeepingFocus(el);
    }
  },
  step: el => go('step', { id: Number(data(el, 'id')) }),
  'today-done': el => {
    const id = Number(data(el, 'id')),
      cur = currentPhase(S.plan);
    const phaseDone = cur && cur.steps.filter(s => !s.completed).length === 1 && cur.steps.some(s => s.id === id);
    S.todayError = null;
    if (!withRewards(() => toggleStep(id))) {
      S.todayError = 'Couldn’t mark this step done. Try again.';
      render();
      return;
    }
    showToast('today', phaseDone ? `${cur.title} complete` : 'Step complete', phaseDone ? 'sparkles' : 'check', 2400);
    render();
  },
  'step-toggle': el => {
    const id = Number(data(el, 'id')),
      st = S.plan.find(s => s.id === id);
    if (!st || (st.locked && !st.completed)) return;
    let msg: string | null = null;
    if (!st.completed) {
      const phase = journeyPhases(activeSteps(S.plan)).find(ph => ph.steps.some(s => s.id === id));
      const lastInPhase = phase && phase.steps.filter(s => !s.completed).length === 1;
      const unlocked = S.plan.filter(s => s.locked && s.unmet.length === 1 && s.unmet[0] === id);
      msg = unlocked.length
        ? `Unlocked: ${unlocked.map(s => s.title).join(', ')}`
        : lastInPhase
          ? `${phase.title} complete`
          : 'Step complete';
    }
    S.stepError = null;
    withRewards(() => toggleStep(id));
    if (msg) showToast('step', msg, msg.startsWith('Unlocked') ? 'sparkles' : 'check', 2800);
    render();
  },
  'step-skip': el => {
    const id = Number(data(el, 'id')),
      st = S.plan.find(s => s.id === id);
    if (!st || !withRewards(() => toggleSkip(id))) return;
    showToast('step', st.skipped ? 'Added back to your plan' : 'Marked as not relevant', 'check', 2400);
    render();
  },
  check: el => {
    const id = data(el, 'id'),
      item = data(el, 'item');
    withRewards(() => {
      const cur = new Set(S.checklist[id] || []);
      if (cur.has(item)) cur.delete(item);
      else cur.add(item);
      S.checklist = { ...S.checklist, [id]: [...cur] };
      saveGuestData('checklist', S.checklist);
    });
    render();
  },
  remind: el => {
    const id = Number(data(el, 'id')),
      d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    S.reminders = [
      ...S.reminders.filter(r => r.stepId !== id),
      { stepId: id, remindAt: d.toISOString(), notificationId: null },
    ].sort((a, b) => Date.parse(a.remindAt) - Date.parse(b.remindAt));
    saveGuestData('reminders', S.reminders);
    showToast('step', 'Added to your reminders on Today', 'check', 2600);
    render();
  },
  'ask-step': el => {
    const st = S.plan.find(s => s.id === Number(data(el, 'id')));
    if (!st) return;
    go('ask');
    withRewards(() => void sendQuestion(`Help me with this Journey step: ${st.title}. ${st.description}`));
  },
  phase: el => {
    const id = data(el, 'id'),
      openPhases = S.openPhases;
    if (!openPhases) return;
    if (openPhases.has(id)) openPhases.delete(id);
    else openPhases.add(id);
    const open = openPhases.has(id);
    el.setAttribute('aria-expanded', String(open));
    const panel = document.getElementById('ph-' + id);
    if (panel) panel.hidden = !open;
  },
  'phase-jump': el => {
    const id = data(el, 'id');
    // A filter can hide the phase, so clear filters before jumping to it.
    if (S.jf.urgent || S.jf.hideDone) S.jf = { urgent: false, hideDone: false };
    render();
    S.openPhases?.add(id);
    render();
    const target = document.getElementById('phase-' + id);
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    target?.querySelector<HTMLElement>('.phase-head')?.focus({ preventScroll: true });
  },
  'welcome-close': () => {
    S.welcome = false;
    render();
  },
  'jf-all': () => {
    S.jf = { urgent: false, hideDone: false };
    render();
  },
  'jf-urgent': () => {
    S.jf = { ...S.jf, urgent: !S.jf.urgent };
    render();
  },
  'jf-hide': () => {
    S.jf = { ...S.jf, hideDone: !S.jf.hideDone };
    render();
  },
  'refresh-plan': () => {
    buildPlan();
    render();
  },
  'ask-chip': el => {
    if (S.route.name !== 'ask') go('ask');
    withRewards(() => void sendQuestion(data(el, 'q')));
  },
  'ask-retry': () => {
    if (S.ask.error) void sendQuestion(S.ask.error, false);
  },
  'ev-city': el => {
    patchEvents({ city: data(el, 'id') as CityId, cat: 'all', savedOnly: false, notice: null });
    render();
  },
  'ev-when': el => {
    patchEvents({ when: data(el, 'id') as WhenFilter });
    render();
  },
  'ev-all': () => {
    patchEvents({ savedOnly: false });
    render();
  },
  'ev-saved': () => {
    patchEvents({ savedOnly: true, cat: 'all' });
    render();
  },
  'ev-cat': el => {
    const id = data(el, 'id') as EventCategory;
    patchEvents({ cat: S.ev?.cat === id ? 'all' : id });
    render();
  },
  'ev-clear': () => {
    patchEvents({ when: 'all', cat: 'all', savedOnly: false });
    render();
  },
  'ev-refresh': () => {
    patchEvents({ notice: null });
    void loadEvents(true);
  },
  'ev-save': el => {
    if (!S.guestId || !S.profile) {
      evNotice('Build your plan first to save events. It takes about a minute.');
      return;
    }
    const id = data(el, 'id');
    withRewards(() => {
      if (S.saved.some(e => e.id === id)) S.saved = S.saved.filter(e => e.id !== id);
      else {
        const e =
          (S.ev ? eventsIn(S.events.feed, S.ev.city) : []).find(x => x.id === id) ??
          knownEvents().find(x => x.id === id);
        if (e) S.saved = [e, ...S.saved];
      }
      saveGuestData('saved', S.saved);
    });
    render();
  },
  'ev-cal': () => evNotice('Opened in Google Calendar.'),
  'ev-share': async el => {
    const id = data(el, 'id');
    const e = knownEvents().find(x => x.id === id);
    if (!e) return;
    const text = `${e.title}\n${dateLabel(e)} · ${timeLabel(e)}${e.venue ? `\n${e.venue}` : ''}\n${e.url}`;
    try {
      await navigator.clipboard.writeText(text);
      evNotice('Event details copied. Paste them anywhere to share.');
    } catch {
      evNotice('Copying isn’t available here. Open Details to share the event page.');
    }
  },
  'hs-city': el => {
    S.hs = { city: data(el, 'id') as CityId, kind: 'all' };
    render();
  },
  'hs-kind': el => {
    const kind = data(el, 'id') as HousingKind | 'all';
    S.hs = { city: S.hs?.city ?? S.profile?.city ?? 'copenhagen', kind };
    render();
  },
  'bud-toggle': el => {
    setBudget(withToggle(ensureBudget(), data(el, 'id')));
    renderKeepingFocus(el);
  },
  'bud-reset': () => {
    setBudget(budgetDefaults(S.profile));
    showToast('budget', 'Back to typical costs', 'check', 2400);
    render();
  },
  'bud-jump': el => {
    const target = document.getElementById(data(el, 'to'));
    if (!target) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    target.scrollIntoView?.({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    target.focus({ preventScroll: true });
  },
  'pe-start': () => {
    const p = requireProfile();
    S.pe = { ...draftFromProfile(p), arrivalDate: p.arrival_date, name: p.name };
    S.peError = null;
    S.avatarOpen = false;
    render();
  },
  'pe-cancel': () => {
    S.pe = null;
    S.peError = null;
    render();
  },
  'pe-noarrival': () => {
    if (S.pe) {
      S.pe = { ...S.pe, arrivalDate: null };
      render();
    }
  },
  'pe-save': () => {
    const e = S.pe;
    if (!e) return;
    const profile = profileFromDraft(e, { name: e.name, arrivalDate: e.arrivalDate });
    if (!profile) {
      S.peError = 'Answer every question to save your changes.';
      render();
      return;
    }
    withRewards(() => {
      S.profile = profile;
      saveGuestData('profile', profile);
      afterProfileChange();
    });
    S.pe = null;
    S.peError = null;
    S.ev = null;
    S.hs = null;
    render();
  },
  'avatar-open': () => {
    S.avatarOpen = !S.avatarOpen;
    S.avatarError = null;
    render();
  },
  'avatar-close': () => {
    S.avatarOpen = false;
    S.avatarError = null;
    render();
  },
  'avatar-emoji': el => {
    const value = data(el, 'value');
    if (!AVATAR_EMOJI.some(x => x.emoji === value)) return;
    withRewards(() => {
      S.avatar = { kind: 'emoji', value, color: S.avatar?.kind === 'emoji' ? S.avatar.color : 'green' };
      saveGuestData('avatar', S.avatar);
    });
    render();
  },
  'avatar-color': el => {
    const color = data(el, 'value') as AvatarColor;
    if (!AVATAR_COLORS.includes(color)) return;
    withRewards(() => {
      S.avatar = { kind: 'emoji', value: S.avatar?.kind === 'emoji' ? S.avatar.value : AVATAR_EMOJI[0].emoji, color };
      saveGuestData('avatar', S.avatar);
    });
    render();
  },
  'avatar-remove': () => {
    S.avatar = null;
    S.avatarError = null;
    saveGuestData('avatar', null);
    render();
  },
  leave: () => {
    leaveGuest();
    go('home', {}, { replace: true });
  },
};

/** Lets people answer plan builder questions with the number keys, as the hint under each question says. */
function onKey(e: KeyboardEvent): void {
  if (S.route.name !== 'start' || e.altKey || e.ctrlKey || e.metaKey || !/^[1-9]$/.test(e.key)) return;
  const t = e.target as HTMLElement | null;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
  const opts = document.querySelectorAll<HTMLElement>('[data-act="opt"][data-name="onb"]');
  const btn = opts[Number(e.key) - 1];
  if (!btn) return;
  e.preventDefault();
  btn.click();
}

/** Wires click, input, change, submit and keyboard handling for the whole app. */
export function bindActions(root: HTMLElement): void {
  root.addEventListener('click', e => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-act]');
    if (!el || !root.contains(el) || ('disabled' in el && el.disabled)) return;
    const fn: Action | undefined = actions[data(el, 'act')];
    if (!fn) return;
    const href = el.getAttribute('href');
    if (el.tagName !== 'A' || (href && href.startsWith('#'))) e.preventDefault();
    if (data(el, 'act') !== 'menu') document.getElementById('site-header')?.classList.remove('open');
    void fn(el, e);
  });
  root.addEventListener('input', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'ask-input') {
      S.ask.input = t.value;
      const btn = document.getElementById('ask-send') as HTMLButtonElement | null;
      if (btn) btn.disabled = !(t.value.trim() && !S.ask.pending);
    } else if (t.id === 'today-ask') {
      S.todayAsk = t.value;
      const btn = document.getElementById('today-ask-send') as HTMLButtonElement | null;
      if (btn) btn.disabled = !t.value.trim();
    } else if (t.id === 'onb-name') S.onb = { ...S.onb, name: t.value };
    else if (t.id === 'pe-name' && S.pe) S.pe = { ...S.pe, name: t.value };
    else if (t.dataset.bud) {
      setBudget(withAmount(ensureBudget(), t.dataset.bud, t.value));
      refreshBudget();
    }
  });
  root.addEventListener('change', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'arrival-date' && S.pe) {
      S.pe = { ...S.pe, arrivalDate: t.value || null };
      render();
    } else if (t.id === 'onb-arrival') S.onb = { ...S.onb, arrivalDate: t.value || null };
    else if (t.id === 'avatar-file') {
      const file = t.files?.[0];
      if (file) void setPhoto(file);
    } else if (t.dataset.bud) {
      // Tidy the number once the person has finished typing, e.g. “4500” becomes “4,500”.
      const key = AMOUNT_FIELDS.find(f => f === t.dataset.bud);
      if (key) t.value = fieldValue(ensureBudget(), key);
    }
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    const f = (e.target as HTMLElement).dataset.form;
    if (f === 'ask') {
      const v = S.ask.input;
      if (v.trim()) withRewards(() => void sendQuestion(v));
    }
    if (f === 'today-ask') {
      const v = S.todayAsk.trim();
      if (!v) return;
      S.todayAsk = '';
      go('ask');
      withRewards(() => void sendQuestion(v));
    }
  });
  document.addEventListener('keydown', onKey);
}
