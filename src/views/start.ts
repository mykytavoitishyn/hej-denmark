import { APP_URL } from '../data/links.js';
import { QUESTIONS } from '../data/questions.js';
import { esc, ext, icon } from '../lib/dom.js';
import { S } from '../state/state.js';
import { goLink, options } from './shared.js';

export function pageStart() {
  const i = S.onb.i,
    q = QUESTIONS[i],
    d = S.onb.draft;
  const val = q.key === 'hasCpr' ? (d.hasCpr === undefined ? undefined : d.hasCpr ? 'yes' : 'no') : d[q.key];
  return `<div class="container onb">
    <div class="col">
      <p class="eyebrow">Your plan</p>
      <h1 class="h1" style="margin-top:14px">Tell us who you are</h1>
      <p class="lead" style="margin-top:16px">Four quick questions. Your plan adapts to why you’re moving, where you’re from, your city and whether you have a CPR number.</p>
      <ul class="checks">${['No signup needed', 'Saved on this device', 'Change your answers any time in Profile'].map(t => `<li>${icon('Check', 18, 'var(--green)', { stroke: 2.5 })}<span>${t}</span></li>`).join('')}</ul>
      ${S.gateNote ? `<p class="note">${esc(S.gateNote)}</p>` : ''}
    </div>
    <section class="card q-card" aria-labelledby="q-title">
      <div class="q-top">
        <button class="btn btn-secondary btn-icon btn-sm" data-act="onb-back" aria-label="${i === 0 ? 'Back to home' : 'Previous question'}">${icon('ArrowLeft', 18)}</button>
        <div class="q-progress" role="progressbar" aria-label="Question ${i + 1} of ${QUESTIONS.length}" aria-valuemin="1" aria-valuemax="${QUESTIONS.length}" aria-valuenow="${i + 1}">${QUESTIONS.map((_, k) => `<span class="${k <= i ? 'on' : ''}"></span>`).join('')}</div>
        <span class="tiny muted strong">${i + 1} of ${QUESTIONS.length}</span>
      </div>
      <h2 class="h3" id="q-title">${esc(q.prompt)}</h2>
      ${options('onb', q.choices, val, q.choices.length > 3 ? 'three' : '')}
    </section>
  </div>`;
}
export const pageSaving = () =>
  `<div class="container center-page" role="progressbar" aria-label="Building your plan"><span class="spinner"></span><p class="muted">Building your plan…</p></div>`;
export function pageLogin() {
  return `<div class="container"><section class="card login-card">
    <p class="eyebrow">Log in</p>
    <h1 class="h2">Welcome back</h1>
    <p class="muted">Your Hej Denmark account lives in the mobile app. Log in there to sync your plan across devices. On this website, your plan is saved on this device.</p>
    <a class="btn btn-primary" href="${APP_URL}" ${ext} style="align-self:flex-start">Open the Hej Denmark app${icon('ArrowUpRight', 18)}</a>
    ${S.profile ? goLink('today', '<span>Back to my plan</span>') : goLink('start', '<span>New here? Get my plan</span>')}
  </section></div>`;
}
