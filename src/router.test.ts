import { beforeEach, describe, expect, it } from 'vitest';
import { profile, resetApp, signIn } from '../tests/helpers.js';
import { parseHash, resolveRoute, routeKey, setHash } from './router.js';
import { S } from './state/state.js';

beforeEach(() => {
  resetApp();
  location.hash = '';
});

describe('parseHash', () => {
  it.each([
    ['#today', { name: 'today' }],
    ['#events', { name: 'events' }],
    ['#step-12', { name: 'step', id: 12 }],
  ])('reads %s', (hash, route) => {
    location.hash = hash;
    expect(parseHash()).toEqual(route);
  });

  it.each(['', '#nope', '#saving', '#step-', '#step-x'])('ignores %j', hash => {
    location.hash = hash;
    expect(parseHash()).toBeNull();
  });
});

describe('resolveRoute', () => {
  it('opens Home for a first visit and Today for a returning guest', () => {
    expect(resolveRoute(null)).toEqual({ name: 'home' });
    signIn(profile());
    expect(resolveRoute(null)).toEqual({ name: 'today' });
  });

  it('sends people without a plan to the plan builder, with a note', () => {
    for (const route of [{ name: 'today' }, { name: 'journey' }, { name: 'ask' }, { name: 'profile' }] as const) {
      S.gateNote = null;
      expect(resolveRoute(route)).toEqual({ name: 'start' });
      expect(S.gateNote).toContain('Build your plan first');
    }
    expect(resolveRoute({ name: 'step', id: 3 })).toEqual({ name: 'start' });
  });

  it('leaves public pages open to everyone', () => {
    for (const route of [{ name: 'home' }, { name: 'login' }, { name: 'events' }, { name: 'start' }] as const) {
      expect(resolveRoute(route)).toEqual(route);
    }
  });

  it('skips the plan builder for someone who already has a plan', () => {
    signIn(profile());
    expect(resolveRoute({ name: 'start' })).toEqual({ name: 'today' });
    expect(resolveRoute({ name: 'journey' })).toEqual({ name: 'journey' });
  });
});

describe('routeKey and setHash', () => {
  it('gives each step its own key', () => {
    expect(routeKey({ name: 'step', id: 4 })).toBe('step-4');
    expect(routeKey({ name: 'ask' })).toBe('ask');
  });

  it('writes the route to the address bar', () => {
    setHash({ name: 'events' }, true);
    expect(location.hash).toBe('#events');
    setHash({ name: 'step', id: 7 });
    expect(location.hash).toBe('#step-7');
  });
});
