import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { profile, resetApp, signIn } from '../tests/helpers.js';
import { startApp } from './app.js';
import { KEY } from './lib/storage.js';
import { render } from './render.js';
import { go } from './router.js';
import { loadGuest } from './state/session.js';
import { S } from './state/state.js';
import type { Profile, RouteName } from './types.js';

let root: HTMLElement;

beforeAll(() => {
  root = document.createElement('div');
  root.id = 'app';
  document.body.append(root);
  startApp(root);
});

beforeEach(() => {
  resetApp();
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
  it('turns four answers into a saved profile and opens the Journey', () => {
    vi.useFakeTimers();
    go('start');
    for (const answer of ['work', 'eu-eea', 'aarhus', 'no']) click(`[data-act="opt"][data-value="${answer}"]`);
    expect(S.profile).toEqual({
      move_reason: 'work',
      residency_group: 'eu-eea',
      city: 'aarhus',
      has_cpr: false,
      arrival_date: null,
      onboarding_completed: true,
    });
    vi.advanceTimersByTime(500);
    expect(heading()).toBe('Journey');
    expect(location.hash).toBe('#journey');
    expect(localStorage.getItem(KEY.profile(S.guestId ?? ''))).toContain('aarhus');
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

  it('saves and unsaves events', () => {
    go('events');
    click('.ev-save');
    expect(S.saved).toHaveLength(1);
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

  it('forgets the guest when they leave', () => {
    go('profile');
    click('[data-act="leave"]');
    expect(S.profile).toBeNull();
    expect(heading()).toBe('Hej Denmark');
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
  const screens: RouteName[] = ['today', 'journey', 'ask', 'events', 'profile'];

  for (const move_reason of moves)
    for (const residency_group of groups)
      for (const city of cities)
        for (const has_cpr of [true, false])
          it(`${move_reason} / ${residency_group} / ${city} / cpr ${has_cpr}`, () => {
            signIn(profile({ move_reason, residency_group, city, has_cpr, arrival_date: '2026-09-01' }));
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
