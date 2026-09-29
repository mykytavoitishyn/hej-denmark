import { QUESTIONS } from './data/questions.js';
import { icon } from './lib/dom.js';
import { cityEvents } from './lib/events.js';
import { currentPhase, journeyPhases } from './lib/plan.js';
import { render } from './render.js';
import { go } from './router.js';
import { sendQuestion } from './services/ask.js';
import { afterProfileChange, buildPlan, createGuest, leaveGuest, saveGuestData, toggleStep } from './state/session.js';
import { requireProfile, S } from './state/state.js';
import type { CityId, EventCategory, EventsState, ProfileDraft, ProfileEdit, RouteName, WhenFilter } from './types.js';
import { showToast } from './views/shared.js';

type Action = (el: HTMLElement, e: Event) => void | Promise<void>;

/** Reads a `data-*` attribute. The views always set the ones an action asks for. */
const data = (el: HTMLElement, key: string): string => el.dataset[key] ?? '';

/** Merges changes into the events screen state. Does nothing before that screen has been opened. */
const patchEvents = (patch: Partial<EventsState>): void => {
  if (S.ev) S.ev = { ...S.ev, ...patch };
};

const eventsCity = (): CityId => S.ev?.city ?? 'copenhagen';

function finishOnboarding(): void {
  const d = S.onb.draft;
  if (!(d.moveReason && d.residencyGroup && d.city && typeof d.hasCpr === 'boolean')) return;
  S.route = { name: 'saving' };
  render();
  createGuest();
  S.profile = {
    move_reason: d.moveReason,
    residency_group: d.residencyGroup,
    city: d.city,
    has_cpr: d.hasCpr,
    arrival_date: null,
    onboarding_completed: true,
  };
  saveGuestData('profile', S.profile);
  afterProfileChange();
  S.onb = { i: 0, draft: {} };
  S.gateNote = null;
  S.ev = null;
  setTimeout(() => go('journey', {}, { replace: true }), 450);
}

function evNotice(text: string): void {
  patchEvents({ notice: text });
  const el = document.getElementById('ev-notice');
  if (el) {
    el.textContent = text;
    el.hidden = false;
  }
}

/** There is no live feed, so a refresh only replays the loading state briefly. */
function refreshEvents(): void {
  patchEvents({ loading: true });
  render();
  setTimeout(() => {
    if (!S.ev) return;
    patchEvents({ loading: false });
    if (S.route.name === 'events') render();
  }, 450);
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
      S.onb.i -= 1;
      render();
    } else go('home');
  },
  opt: el => {
    const name = data(el, 'name'),
      value = data(el, 'value');
    if (name === 'onb') {
      const q = QUESTIONS[S.onb.i];
      // The question key names the draft field, and `hasCpr` is the only boolean one.
      S.onb.draft = { ...S.onb.draft, [q.key]: q.key === 'hasCpr' ? value === 'yes' : value } as ProfileDraft;
      if (S.onb.i < QUESTIONS.length - 1) {
        S.onb.i += 1;
        render();
        return;
      }
      finishOnboarding();
      return;
    }
    if (name.startsWith('pe-') && S.pe) {
      const k = name.slice(3);
      S.pe = { ...S.pe, [k]: k === 'hasCpr' ? value === 'yes' : value } as ProfileEdit;
      render();
    }
  },
  step: el => go('step', { id: Number(data(el, 'id')) }),
  'today-done': el => {
    const id = Number(data(el, 'id')),
      cur = currentPhase(S.plan);
    const phaseDone = cur && cur.steps.filter(s => !s.completed).length === 1 && cur.steps.some(s => s.id === id);
    S.todayError = null;
    if (!toggleStep(id)) {
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
      const phase = journeyPhases(S.plan).find(ph => ph.steps.some(s => s.id === id));
      const lastInPhase = phase && phase.steps.filter(s => !s.completed).length === 1;
      const unlocked = S.plan.filter(s => s.locked && s.requires.includes(id) && s.unmet.length === 1);
      msg = unlocked.length
        ? `Unlocked: ${unlocked.map(s => s.title).join(', ')}`
        : lastInPhase
          ? `${phase.title} complete`
          : 'Step complete';
    }
    S.stepError = null;
    toggleStep(id);
    if (msg) showToast('step', msg, msg.startsWith('Unlocked') ? 'sparkles' : 'check', 2800);
    render();
  },
  check: el => {
    const id = data(el, 'id'),
      item = data(el, 'item');
    const cur = new Set(S.checklist[id] || []);
    if (cur.has(item)) cur.delete(item);
    else cur.add(item);
    S.checklist = { ...S.checklist, [id]: [...cur] };
    saveGuestData('checklist', S.checklist);
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
    void sendQuestion(`Help me with this Journey step: ${st.title}. ${st.description}`);
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
    void sendQuestion(data(el, 'q'));
  },
  'ask-retry': () => {
    if (S.ask.error) void sendQuestion(S.ask.error, false);
  },
  'ev-city': el => {
    patchEvents({ city: data(el, 'id') as CityId, cat: 'all', notice: null });
    refreshEvents();
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
    refreshEvents();
  },
  'ev-save': el => {
    if (!S.guestId || !S.profile) {
      evNotice('Build your plan first to save events. It takes four quick questions.');
      return;
    }
    const id = data(el, 'id'),
      isSaved = S.saved.some(e => e.id === id);
    if (isSaved) S.saved = S.saved.filter(e => e.id !== id);
    else {
      const e = cityEvents(eventsCity()).events.find(x => x.id === id);
      if (e) S.saved = [e, ...S.saved];
    }
    saveGuestData('saved', S.saved);
    render();
  },
  'ev-cal': () => evNotice('Opened in Google Calendar.'),
  'ev-share': async el => {
    const id = data(el, 'id');
    const e = [...cityEvents(eventsCity()).events, ...S.saved].find(x => x.id === id);
    if (!e) return;
    const text = `${e.title}\n${e.dateLabel} · ${e.timeLabel}\n${e.location}\n${e.sourceUrl}`;
    try {
      await navigator.clipboard.writeText(text);
      evNotice('Event details copied. Paste them anywhere to share.');
    } catch {
      evNotice('Copying isn’t available here. Open Details to share the event page.');
    }
  },
  'pe-start': () => {
    const p = requireProfile();
    S.pe = {
      moveReason: p.move_reason,
      residencyGroup: p.residency_group,
      city: p.city,
      hasCpr: p.has_cpr,
      arrivalDate: p.arrival_date,
    };
    S.peError = null;
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
    if (!e || !(e.moveReason && e.residencyGroup && e.city && typeof e.hasCpr === 'boolean')) return;
    S.profile = {
      move_reason: e.moveReason,
      residency_group: e.residencyGroup,
      city: e.city,
      has_cpr: e.hasCpr,
      arrival_date: e.arrivalDate || null,
      onboarding_completed: true,
    };
    saveGuestData('profile', S.profile);
    S.pe = null;
    S.peError = null;
    S.ev = null;
    afterProfileChange();
    render();
  },
  leave: () => {
    leaveGuest();
    go('home', {}, { replace: true });
  },
};

/** Wires click, input, change and submit handling for the whole app onto the root element. */
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
    }
  });
  root.addEventListener('change', e => {
    const t = e.target as HTMLInputElement;
    if (t.id === 'arrival-date' && S.pe) {
      S.pe = { ...S.pe, arrivalDate: t.value || null };
      render();
    }
  });
  root.addEventListener('submit', e => {
    e.preventDefault();
    const f = (e.target as HTMLElement).dataset.form;
    if (f === 'ask') {
      const v = S.ask.input;
      if (v.trim()) void sendQuestion(v);
    }
    if (f === 'today-ask') {
      const v = S.todayAsk.trim();
      if (!v) return;
      S.todayAsk = '';
      go('ask');
      void sendQuestion(v);
    }
  });
}
