import { APP_URL, HELP_LINKS } from '../data/links.js';
import { esc, ext, icon } from '../lib/dom.js';
import { currentLevel } from '../state/progress.js';
import { S } from '../state/state.js';
import { avatarHTML } from './shared.js';

const NAV: [id: string, label: string][] = [
  ['today', 'Today'],
  ['journey', 'Journey'],
  ['housing', 'Housing'],
  ['events', 'Events'],
  ['ask', 'Ask Hej'],
];

function navActive() {
  const n = S.route.name;
  return n === 'step' ? 'journey' : [...NAV.map(([id]) => id), 'profile'].includes(n) ? n : null;
}
export function header() {
  const active = navActive();
  const cur = (id: string) => (active === id ? ' aria-current="page"' : '');
  const lvl = currentLevel();
  const right = S.profile
    ? `<a class="profile-link" href="#profile" data-act="go" data-to="profile"${cur('profile')} aria-label="Profile${lvl ? `, level ${lvl.lp.level.n}` : ''}">${avatarHTML('sm')}<span class="hide-sm">${S.profile.name ? esc(S.profile.name) : 'Profile'}</span>${lvl ? `<span class="lvl-pill hide-sm" aria-hidden="true">Lv ${lvl.lp.level.n}</span>` : ''}</a>`
    : `<a class="btn btn-ghost btn-sm hide-sm" href="#login" data-act="go" data-to="login">Log in</a><a class="btn btn-primary btn-sm" href="#start" data-act="go" data-to="start">Get my plan</a>`;
  const menuLinks =
    [...NAV, ['profile', 'Profile']]
      .map(
        ([id, l]) =>
          `<a href="#${id}" data-act="go" data-to="${id}"${cur(id)}>${l}${icon('ChevronRight', 18, 'var(--muted)')}</a>`,
      )
      .join('') +
    (S.profile
      ? ''
      : `<a href="#login" data-act="go" data-to="login">Log in${icon('ChevronRight', 18, 'var(--muted)')}</a>`);
  return `<header class="site-header" id="site-header">
    <div class="container header-inner">
      <a class="brand" href="#home" data-act="go" data-to="home" aria-label="Hej Denmark, home"><span class="hej">Hej</span> Denmark</a>
      <nav class="main-nav" aria-label="Main">${NAV.map(([id, l]) => `<a class="nav-link" href="#${id}" data-act="go" data-to="${id}"${cur(id)}>${l}</a>`).join('')}</nav>
      <div class="header-actions">${right}</div>
      <button class="btn btn-secondary btn-icon btn-sm menu-btn" data-act="menu" aria-expanded="false" aria-controls="mobile-menu" aria-label="Open menu">${icon('Menu', 20)}</button>
    </div>
    <nav class="mobile-menu" id="mobile-menu" aria-label="Main"><div class="container">${menuLinks}</div></nav>
  </header>`;
}
export function footer() {
  const plan = [...NAV, ['profile', 'Profile']];
  return `<footer class="site-footer"><div class="container">
    <div class="footer-grid">
      <div class="col gap12"><a class="brand" href="#home" data-act="go" data-to="home"><span class="hej">Hej</span> Denmark</a><p style="color:var(--on-green-muted);max-width:34ch">A calm, personal plan for your first months in Denmark.</p></div>
      <div><p class="footer-title">Your plan</p><div class="footer-links">${plan.map(([id, l]) => `<a href="#${id}" data-act="go" data-to="${id}">${l}</a>`).join('')}</div></div>
      <div><p class="footer-title">Official help</p><div class="footer-links">${HELP_LINKS.map(([u, l]) => `<a href="${u}" ${ext}>${esc(l)}${icon('ArrowUpRight', 14)}</a>`).join('')}</div></div>
      <div><p class="footer-title">Hej Denmark</p><div class="footer-links"><a href="${APP_URL}" ${ext}>Mobile app${icon('ArrowUpRight', 14)}</a><a href="#login" data-act="go" data-to="login">Log in</a></div></div>
    </div>
    <div class="footer-bottom"><p style="max-width:70ch">Hej Denmark is an independent guide, not a government service. Rules change, so always check the official pages linked in your plan.</p><p>Built on Bilt · 2026</p></div>
  </div></footer>`;
}
