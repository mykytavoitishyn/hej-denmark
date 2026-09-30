import { isWide } from './lib/dom.js';
import { render } from './render.js';
import { S } from './state/state.js';
import type { Route, RouteName } from './types.js';

type HashRouteName =
  'home' | 'start' | 'login' | 'events' | 'housing' | 'budget' | 'today' | 'journey' | 'ask' | 'profile';
const HASH_ROUTES: readonly HashRouteName[] = [
  'home',
  'start',
  'login',
  'events',
  'housing',
  'budget',
  'today',
  'journey',
  'ask',
  'profile',
];
/** Screens that need a profile. Without one, visitors are sent to the plan builder. */
const NEEDS_PROFILE: readonly RouteName[] = ['today', 'journey', 'ask', 'profile', 'step'];

export const routeKey = (r: Route): string => (r.name === 'step' ? `step-${r.id}` : r.name);

export function parseHash(): Route | null {
  const h = (location.hash || '').replace(/^#/, '');
  if (/^step-\d+$/.test(h)) return { name: 'step', id: Number(h.slice(5)) };
  const name = HASH_ROUTES.find(n => n === h);
  return name ? { name } : null;
}

export function resolveRoute(r: Route | null): Route {
  if (!r) return S.profile ? { name: 'today' } : { name: 'home' };
  if (NEEDS_PROFILE.includes(r.name) && !S.profile) {
    S.gateNote = 'Build your plan first. It takes about a minute.';
    return { name: 'start' };
  }
  if (r.name === 'start' && S.profile) return { name: 'today' };
  return r;
}

export function setHash(r: Route, replace?: boolean): void {
  const token = '#' + routeKey(r);
  if (location.hash === token) return;
  try {
    history[replace ? 'replaceState' : 'pushState'](null, '', token);
  } catch {
    try {
      location.hash = token;
    } catch {}
  }
}

export function go(name: RouteName, extra: { id?: number } = {}, opts: { replace?: boolean } = {}): void {
  const prev = S.route;
  S.scroll[routeKey(prev)] = window.scrollY;
  const r = resolveRoute(name === 'step' ? { name, id: extra.id ?? 0 } : { name });
  if (r.name !== 'start') S.gateNote = S.route.name === 'start' ? null : S.gateNote;
  S.route = r;
  if (r.name !== 'step') S.stepError = null;
  setHash(r, opts.replace);
  render();
  const keep = r.name === 'step' && isWide() && (prev.name === 'journey' || prev.name === 'step');
  if (!keep) {
    window.scrollTo(0, 0);
    document.getElementById('main')?.focus({ preventScroll: true });
  }
}

/** Registers the browser-level listeners the router needs. Call once at startup. */
export function initRouter(): void {
  window.addEventListener('popstate', () => {
    const r = resolveRoute(parseHash());
    if (routeKey(r) === routeKey(S.route)) return;
    S.route = r;
    render();
    window.scrollTo(0, S.scroll[routeKey(r)] || 0);
  });
  // Journey, step and Ask lay out differently on wide screens, so re-render when the breakpoint flips.
  window.matchMedia('(min-width: 1001px)').addEventListener('change', () => {
    if (['journey', 'step', 'ask'].includes(S.route.name)) render();
  });
}
