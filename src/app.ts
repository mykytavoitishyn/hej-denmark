import { bindActions } from './actions.js';
import { render } from './render.js';
import { initRouter, parseHash, resolveRoute, setHash } from './router.js';
import { getSample } from './services/ask.js';
import { loadGuest } from './state/session.js';
import { S } from './state/state.js';

/** Restores any saved guest, resolves the starting route and renders into `root`. */
export function startApp(root: HTMLElement): void {
  loadGuest();
  S.route = resolveRoute(parseHash());
  setHash(S.route, true);
  initRouter();
  bindActions(root);
  render();
  void getSample();
}
