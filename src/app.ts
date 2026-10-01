import { bindActions } from './actions.js';
import { render } from './render.js';
import { initRouter, parseHash, resolveRoute, setHash } from './router.js';
import { getSample } from './services/ask.js';
import { loadEvents, onEventsChange } from './services/events.js';
import { loadGuest } from './state/session.js';
import { S } from './state/state.js';
import { initCelebrations } from './views/celebrate.js';

/** Restores any saved guest, resolves the starting route and renders into `root`. */
export function startApp(root: HTMLElement): void {
  loadGuest();
  S.route = resolveRoute(parseHash());
  setHash(S.route, true);
  initRouter();
  initCelebrations();
  bindActions(root);
  // Today and Events show the feed, so they redraw as it loads.
  onEventsChange(() => {
    if (S.route.name === 'events' || S.route.name === 'today') render();
  });
  render();
  void loadEvents();
  void getSample();
}
