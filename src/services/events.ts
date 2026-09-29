import { parseFeed } from '../lib/event-feed.js';
import { S } from '../state/state.js';
import type { EventFeed } from '../types.js';

/** Relative to the page, so the site works from any host or sub-path. Written by `npm run events:fetch`. */
export const FEED_URL = 'data/events.json';
const TIMEOUT_MS = 10_000;

let inflight: Promise<void> | null = null;
let onChange: () => void = () => {};

/** Called whenever loading starts or finishes, so the screen can update. */
export function onEventsChange(fn: () => void): void {
  onChange = fn;
}

async function fetchFeed(fresh: boolean): Promise<EventFeed> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(fresh ? `${FEED_URL}?t=${Date.now()}` : FEED_URL, {
      signal: ctrl.signal,
      cache: fresh ? 'no-store' : 'default',
      headers: { Accept: 'application/json' },
    });
    if (!res.ok) throw new Error(`Events file returned HTTP ${res.status}`);
    const feed = parseFeed(await res.json());
    if (!feed) throw new Error('The events file has an unexpected format');
    return feed;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Loads the events feed once. With `fresh` it fetches again, bypassing caches. A failed load keeps whatever
 * feed was already loaded, so a flaky connection never empties the screen.
 */
export function loadEvents(fresh = false): Promise<void> {
  if (inflight) return inflight;
  if (!fresh && S.events.status !== 'idle') return Promise.resolve();
  S.events = { ...S.events, status: 'loading' };
  onChange();
  inflight = fetchFeed(fresh)
    .then(feed => {
      S.events = { feed, status: 'ready' };
    })
    .catch(() => {
      S.events = { ...S.events, status: 'error' };
    })
    .finally(() => {
      inflight = null;
      onChange();
    });
  return inflight;
}

/** Puts a feed in place directly. Tests use it instead of the network. */
export function setFeed(feed: EventFeed | null): void {
  S.events = { feed, status: feed ? 'ready' : 'idle' };
}
