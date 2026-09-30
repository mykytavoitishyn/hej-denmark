import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { event, feed, profile, resetApp, signIn } from '../tests/helpers.js';
import { startApp } from './app.js';
import { KEY } from './lib/storage.js';
import { render } from './render.js';
import { go } from './router.js';
import { setFeed } from './services/events.js';
import { loadGuest } from './state/session.js';
import { S } from './state/state.js';
import type { Profile, RouteName } from './types.js';

let root: HTMLElement;

const inDays = (n: number) => new Date(Date.now() + n * 864e5).toISOString();
const testFeed = () =>
  feed([
    event({ id: 'cph-1', title: 'Harbour walk', startsAt: inDays(3) }),
    event({ id: 'cph-2', title: 'Jazz night', category: 'music', startsAt: inDays(5) }),
    event({ id: 'ode-1', title: 'Odense food market', city: 'odense', category: 'food', startsAt: inDays(4) }),
  ]);

beforeAll(() => {
  vi.stubGlobal('fetch', () => Promise.resolve(new Response(JSON.stringify(testFeed()))));
  root = document.createElement('div');
  root.id = 'app';
  document.body.append(root);
  startApp(root);
});

beforeEach(() => {
  resetApp();
  setFeed(testFeed());
  location.hash = '';
  root.innerHTML = '';
  S.route = { name: 'home' };
  render();
});

const click = (selector: string, from: ParentNode = root) => {
  const el = from.querySelector<HTMLElement>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  el.click();
};
const heading = () => root.querySelector('h1')?.textContent?.trim();

describe('first visit', () => {
  it('shows the home page with a way in', () => {
    expect(heading()).toBe('Hej Denmark');
    expect(root.textContent).toContain('Get my plan');
  });

  it('sends people to the plan builder when they ask for a page that needs a plan', () => {
    go('today');
    expect(heading()).toBe('Tell us who you are');
    expect(root.textContent).toContain('Build your plan first');
  });
});

describe('plan builder', () => {
  const answer = (value: string) => click(`[data-act="opt"][data-name="onb"][data-value="${value}"]`);

  it('turns the answers into a saved profile and opens the Journey', () => {
    vi.useFakeTimers();
    go('start');
    for (const value of ['work', 'offer', 'eu-eea', 'aarhus', 'soon', 'searching', 'solo']) answer(value);
    expect(root.textContent).toContain('Your plan is ready to build');
    const name = root.querySelector<HTMLInputElement>('#onb-name');
    if (!name) throw new Error('No name field');
    name.value = 'Sofia';
    name.dispatchEvent(new Event('input', { bubbles: true }));
    click('[data-act="onb-finish"]');
    expect(S.profile).toEqual({
      move_reason: 'work',
      residency_group: 'eu-eea',
      city: 'aarhus',
      has_cpr: false,
      arrival_date: null,
      stage: 'soon',
      housing: 'searching',
      household: 'solo',
      study_type: null,
      job_status: 'offer',
      name: 'Sofia',
      onboarding_completed: true,
    });
    expect(heading()).toBe('Building your plan, Sofia…');
    vi.advanceTimersByTime(1500);
    expect(heading()).toBe('Journey');
    expect(location.hash).toBe('#journey');
    expect(root.textContent).toContain('Velkommen, Sofia!');
    expect(localStorage.getItem(KEY.profile(S.guestId ?? ''))).toContain('aarhus');
  });

  it('asks follow-up questions only when they apply, and returns to the review after a change', () => {
    go('start');
    answer('student');
    expect(root.textContent).toContain('What kind of studies?');
    answer('degree');
    for (const value of ['non-eu', 'odense', 'arrived', 'settled', 'partner']) answer(value);
    // Only people who have arrived are asked about a CPR number.
    expect(root.textContent).toContain('Do you already have a CPR number?');
    answer('yes');
    expect(root.textContent).toContain('Your plan is ready to build');
    click('[data-act="onb-jump"][data-i="0"]');
    answer('family');
    expect(root.textContent).toContain('Your plan is ready to build');
    expect(S.onb.draft.moveReason).toBe('family');
  });

  it('answers with the number keys', () => {
    go('start');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: '2' }));
    expect(S.onb.draft.moveReason).toBe('work');
    expect(root.textContent).toContain('Do you have a job in Denmark yet?');
  });
});

describe('with a plan', () => {
  beforeEach(() => signIn(profile()));

  it('marks a step done from the step page', () => {
    go('journey');
    click('.step-row');
    click('[data-act="step-toggle"]');
    expect(S.plan.filter(s => s.completed)).toHaveLength(1);
    expect(root.textContent).toContain('Mark not done');
  });

  it('remembers progress after a reload', () => {
    const [first] = S.plan;
    go('step', { id: first.id });
    click('[data-act="step-toggle"]');
    const guestId = S.guestId;
    const saved = [...S.done];

    Object.assign(S, { done: new Set(), plan: [], profile: null, guestId: null });
    localStorage.setItem(KEY.active, guestId ?? '');
    loadGuest();
    expect([...S.done]).toEqual(saved);
    expect(S.plan.find(s => s.id === first.id)?.completed).toBe(true);
  });

  it('answers questions from the built-in guide and shows them as plain text', async () => {
    go('ask');
    const input = root.querySelector<HTMLInputElement>('#ask-input');
    if (!input) throw new Error('No input');
    input.value = '<img src=x onerror=alert(1)> how do I get MitID?';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    root.querySelector('form')?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await vi.waitFor(() => expect(root.textContent).toContain('Answered from the Hej guide'));
    expect(root.querySelector('.bubble img')).toBeNull();
    expect(root.querySelector('.bubble')?.textContent).toContain('<img src=x');
    expect(S.askHistory).toHaveLength(2);
  });

  it('marks a step as not relevant and brings it back', () => {
    const [first] = S.plan;
    go('step', { id: first.id });
    click('[data-act="step-skip"]');
    expect(S.plan.find(s => s.id === first.id)?.skipped).toBe(true);
    expect(root.textContent).toContain('Add back to my plan');
    click('[data-act="step-skip"]');
    expect(S.plan.find(s => s.id === first.id)?.skipped).toBe(false);
  });

  it('shows events for the chosen city', () => {
    go('events');
    expect(root.textContent).toContain('Harbour walk');
    expect(root.textContent).not.toContain('Odense food market');
    click('[data-act="ev-city"][data-id="odense"]');
    expect(root.textContent).toContain('Odense food market');
    expect(root.textContent).not.toContain('Harbour walk');
  });

  it('saves and unsaves events', () => {
    go('events');
    click('.ev-save');
    expect(S.saved).toHaveLength(1);
    expect(S.saved[0].id).toBe('cph-1');
    expect(root.querySelector('[data-act="ev-saved"]')?.textContent).toContain('1');
    click('.ev-save');
    expect(S.saved).toHaveLength(0);
  });

  it('updates the plan when the profile changes', () => {
    go('profile');
    click('[data-act="pe-start"]');
    click('[data-act="opt"][data-name="pe-city"][data-value="odense"]');
    click('[data-act="pe-save"]');
    expect(S.profile?.city).toBe('odense');
    expect(root.textContent).toContain('Odense');
  });

  it('picks an emoji profile picture', () => {
    go('profile');
    click('[data-act="avatar-open"]');
    click('[data-act="avatar-emoji"][aria-label="Fox"]');
    click('[data-act="avatar-color"][data-value="sky"]');
    expect(S.avatar).toEqual({ kind: 'emoji', value: '🦊', color: 'sky' });
    expect(root.querySelector('.profile-link .av-emoji')?.textContent).toBe('🦊');
    click('[data-act="avatar-remove"]');
    expect(S.avatar).toBeNull();
  });

  it('filters the housing guide by city and type', () => {
    go('housing');
    expect(heading()).toBe('Find a home in Copenhagen');
    click('[data-act="hs-city"][data-id="aarhus"]');
    expect(heading()).toBe('Find a home in Aarhus');
    const kind = root.querySelector<HTMLElement>('[data-act="hs-kind"]:not([data-id="all"])');
    if (!kind) throw new Error('No type filter');
    kind.click();
    expect(root.querySelectorAll('.res-section')).toHaveLength(1);
  });

  it('forgets the guest when they leave', () => {
    go('profile');
    click('[data-act="leave"]');
    expect(S.profile).toBeNull();
    expect(heading()).toBe('Hej Denmark');
  });
});

describe('arriving in Denmark', () => {
  /** A local calendar date n days from today, as the profile stores it. */
  const day = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  it('asks whether you’ve arrived once the date comes, then about your CPR number', () => {
    signIn(profile({ stage: 'soon', arrival_date: day(-1) }));
    go('today');
    expect(root.textContent).toContain('Velkommen til Danmark!');
    click('[data-act="arrive-yes"]');
    expect(S.profile?.stage).toBe('arrived');
    expect(root.textContent).toContain('Do you have a CPR number yet?');
    click('[data-act="arrive-cpr"][data-value="no"]');
    expect(S.profile?.has_cpr).toBe(false);
    expect(root.querySelector('.checkin')).toBeNull();
    expect(S.plan.some(s => s.slug === 'cpr')).toBe(true);
    expect(localStorage.getItem(KEY.profile(S.guestId ?? ''))).toContain('"stage":"arrived"');
  });

  it('opens the profile to change the date instead', () => {
    signIn(profile({ stage: 'soon', arrival_date: day(0) }));
    go('today');
    click('[data-act="arrive-change"]');
    expect(heading()).toBe('Profile');
    expect(S.pe?.arrivalDate).toBe(day(0));
  });

  it('doesn’t ask before the arrival date', () => {
    signIn(profile({ stage: 'soon', arrival_date: day(10) }));
    go('today');
    expect(root.querySelector('.checkin')).toBeNull();
  });

  it('treats a planned move as arriving soon once it’s within a month', () => {
    signIn(profile({ stage: 'planning', arrival_date: day(60) }));
    expect(S.plan.find(s => s.slug === 'documents')?.priority).toBe('Soon');
    signIn(profile({ stage: 'planning', arrival_date: day(20) }));
    expect(S.plan.find(s => s.slug === 'documents')?.priority).toBe('Urgent');
  });

  it('starts Events from the arrival date, and can show every date', () => {
    const at = (n: number) => new Date(Date.now() + n * 864e5).toISOString();
    setFeed(
      feed([
        event({ id: 'cph-early', title: 'Harbour walk', startsAt: at(2) }),
        event({ id: 'cph-late', title: 'Language café', category: 'learning', startsAt: at(9) }),
      ]),
    );
    signIn(profile({ stage: 'soon', arrival_date: day(5) }));
    go('events');
    expect(root.textContent).toContain('Language café');
    expect(root.textContent).not.toContain('Harbour walk');
    click('[data-act="ev-when"][data-id="all"]');
    expect(root.textContent).toContain('Harbour walk');
  });

  it('suggests questions about getting ready before the move', () => {
    signIn(profile({ stage: 'soon', arrival_date: day(10) }));
    go('today');
    expect(root.textContent).toContain('Which documents should I bring?');
  });
});

describe('budget calculator', () => {
  const total = () => root.querySelector('.bud-num')?.textContent;
  const type = (selector: string, value: string) => {
    const input = root.querySelector<HTMLInputElement>(selector);
    if (!input) throw new Error(`No field ${selector}`);
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    return input;
  };

  it('is open to everyone and starts from typical student costs', () => {
    go('budget');
    expect(heading()).toBe('Your Copenhagen budget');
    expect(total()).toBe('9,380');
    expect(root.textContent).toContain('Money to have ready when you arrive');
  });

  it('updates the estimate when a home is picked, and keeps focus on the choice', () => {
    go('budget');
    click('[data-act="opt"][data-name="bud-home"][data-value="room"]');
    expect(root.querySelector<HTMLInputElement>('#bud-rent')?.value).toBe('6,000');
    expect(total()).toBe('10,880');
    expect(document.activeElement?.getAttribute('data-value')).toBe('room');
  });

  it('recalculates while typing without replacing the field', () => {
    go('budget');
    const field = type('#bud-rent', '5000');
    expect(root.querySelector('#bud-rent')).toBe(field);
    expect(total()).toBe('9,880');
    field.dispatchEvent(new Event('change', { bubbles: true }));
    expect(field.value).toBe('5,000');
  });

  it('estimates take-home pay and what’s left over', () => {
    go('budget');
    click('[data-act="opt"][data-name="bud-role"][data-value="work"]');
    type('#bud-salary', '40000');
    expect(root.querySelector('.bud-verdict')?.textContent).toContain('17,540 kr left each month');
    expect(root.textContent).toContain('13,380 kr in tax');
  });

  it('switches from moving-in money to monthly spending once you’ve arrived', () => {
    const startup = () => root.querySelector('#bud-startup')?.textContent ?? '';
    go('budget');
    click('[data-act="opt"][data-name="bud-citizen"][data-value="non-eu"]');
    expect(root.textContent).toContain('up to 90 hours a month');
    expect(startup()).toContain('Residence permit fee');
    expect(startup()).toContain('Your first month');
    click('[data-act="opt"][data-name="bud-arrived"][data-value="yes"]');
    expect(startup()).toContain('If you move to a new home');
    expect(startup()).not.toContain('Residence permit fee');
    expect(startup()).not.toContain('Your first month');
  });

  it('suggests a cheaper home only when money runs short, and one that suits the person', () => {
    const tips = () => root.querySelector('#bud-tips')?.textContent ?? '';
    go('budget');
    click('[data-act="opt"][data-name="bud-role"][data-value="work"]');
    click('[data-act="opt"][data-name="bud-home"][data-value="flat1"]');
    type('#bud-salary', '40000');
    expect(tips()).not.toContain('Rent is the big one');
    type('#bud-salary', '15000');
    expect(tips()).toContain('A studio costs about 9,000 kr');
    expect(tips()).not.toContain('dorm');
  });

  it('starts over from the typical costs', () => {
    go('budget');
    click('[data-act="opt"][data-name="bud-food"][data-value="high"]');
    click('[data-act="bud-reset"]');
    expect(S.bud?.food).toBe('low');
    expect(root.textContent).toContain('Back to typical costs');
  });

  it('takes who you are from the profile and remembers the budget after a reload', () => {
    signIn(profile({ move_reason: 'student', study_type: 'degree', job_status: null, stage: 'soon' }));
    go('budget');
    expect(root.querySelector('[data-name="bud-role"]')).toBeNull();
    expect(root.querySelector('.tiles')?.textContent).toContain('Not yet');
    click('[data-act="opt"][data-name="bud-food"][data-value="high"]');
    click('[data-act="bud-toggle"][data-id="gym"]');
    Object.assign(S, { bud: null, profile: null, guestId: null });
    loadGuest();
    expect(S.bud).toMatchObject({ food: 'high', extras: ['phone', 'insurance', 'gym'] });
  });
});

describe('events without a plan', () => {
  it('asks people to build a plan before saving', () => {
    go('events');
    click('.ev-save');
    expect(root.textContent).toContain('Build your plan first to save events');
    expect(S.saved).toHaveLength(0);
  });
});

describe('every screen renders cleanly for every kind of newcomer', () => {
  const moves: Profile['move_reason'][] = ['student', 'work', 'other'];
  const groups: Profile['residency_group'][] = ['eu-eea', 'non-eu'];
  const cities: Profile['city'][] = ['copenhagen', 'aarhus', 'odense', 'aalborg', 'other'];
  const screens: RouteName[] = ['today', 'journey', 'ask', 'events', 'housing', 'budget', 'profile'];

  for (const move_reason of moves)
    for (const residency_group of groups)
      for (const city of cities)
        for (const has_cpr of [true, false])
          it(`${move_reason} / ${residency_group} / ${city} / cpr ${has_cpr}`, () => {
            signIn(
              profile({
                move_reason,
                residency_group,
                city,
                has_cpr,
                arrival_date: '2026-09-01',
                study_type: move_reason === 'student' ? 'degree' : null,
                job_status: move_reason === 'work' ? 'looking' : null,
                housing: has_cpr ? 'settled' : 'temporary',
                household: has_cpr ? 'partner-kids' : 'solo',
              }),
            );
            for (const screen of screens) {
              go(screen);
              expect(heading(), screen).toBeTruthy();
              expect(root.textContent, screen).not.toMatch(/undefined|NaN|\[object Object\]/);
            }
            for (const step of S.plan) {
              go('step', { id: step.id });
              expect(root.textContent, step.slug).not.toMatch(/undefined|NaN|\[object Object\]/);
            }
          });
});
