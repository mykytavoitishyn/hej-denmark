import { afterEach, vi } from 'vitest';
import { store } from '../src/lib/storage.js';

// jsdom has no matchMedia or scrolling; the app uses both.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
  }),
});
window.scrollTo = vi.fn();

afterEach(() => {
  store.clear();
  vi.useRealTimers();
});
