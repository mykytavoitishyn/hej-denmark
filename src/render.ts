import { isWide } from './lib/dom.js';
import { planSummary } from './lib/plan.js';
import { S } from './state/state.js';
import { pageAsk, scrollChat } from './views/ask.js';
import { pageEvents } from './views/events.js';
import { pageHome } from './views/home.js';
import { pageJourney, pageStep } from './views/journey.js';
import { footer, header } from './views/layout.js';
import { pageProfile } from './views/profile.js';
import { pageLogin, pageSaving, pageStart } from './views/start.js';
import { pageToday } from './views/today.js';

export function render(): void {
  const root = document.getElementById('app');
  if (!root) return;
  const r = S.route;
  let page: string;
  switch (r.name) {
    case 'home':
      page = pageHome();
      break;
    case 'start':
      page = pageStart();
      break;
    case 'saving':
      page = pageSaving();
      break;
    case 'login':
      page = pageLogin();
      break;
    case 'today':
      page = pageToday();
      break;
    case 'journey':
      page = pageJourney(null);
      break;
    case 'step':
      page = isWide() ? pageJourney(r.id) : pageStep(r.id);
      break;
    case 'ask':
      page = pageAsk();
      break;
    case 'events':
      page = pageEvents();
      break;
    case 'profile':
      page = pageProfile();
      break;
    default:
      page = pageHome();
  }
  root.innerHTML = header() + `<main id="main" class="site-main" tabindex="-1">${page}</main>` + footer();
  const prog = root.querySelector<SVGCircleElement>('.ring-prog');
  if (prog) {
    const to = prog.dataset.to ?? '';
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        prog.style.strokeDashoffset = to;
      }),
    );
    S.lastPct = planSummary(S.plan).percentage;
  }
  if (r.name === 'ask') scrollChat();
}
