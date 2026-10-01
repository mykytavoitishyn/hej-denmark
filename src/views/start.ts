import { CITY_LABELS, RES_LABELS } from '../data/labels.js';
import { APP_URL } from '../data/links.js';
import { CITY_OFFICES } from '../data/plan.js';
import { esc, ext, icon } from '../lib/dom.js';
import { planFor, prio } from '../lib/plan.js';
import { draftValue, profileFromDraft, questionsFor } from '../lib/profile.js';
import { S } from '../state/state.js';
import type { Question } from '../types.js';
import { goLink, options } from './shared.js';

function questionHTML(q: Question): string {
  const value = draftValue(S.onb.draft, q.key);
  return `<h2 class="h3 q-title" id="q-title" tabindex="-1">${esc(q.prompt)}</h2>
    <p class="muted small q-hint">${esc(q.hint)}</p>
    ${options('onb', q.choices, value)}
    <p class="tiny muted q-keys">Tip: press ${q.choices.length > 1 ? `1–${q.choices.length}` : '1'} on your keyboard to answer.</p>`;
}

function reviewHTML(qs: Question[]): string {
  const d = S.onb.draft;
  const profile = profileFromDraft(d);
  const plan = profile ? planFor(profile, new Set()) : [];
  const urgent = plan.filter(s => prio(s) === 'Urgent').length;
  const arrived = d.stage === 'arrived';
  const answers = qs
    .map((q, k) => {
      const v = draftValue(d, q.key);
      const label = q.choices.find(c => c.value === v)?.label ?? 'Not answered';
      return `<li><button class="review-item" data-act="onb-jump" data-i="${k}" aria-label="${esc(`${q.label}: ${label}. Change`)}"><span class="col min0"><span class="tiny muted">${esc(q.label)}</span><span class="strong">${esc(label)}</span></span>${icon('Pencil', 15, 'var(--muted)')}</button></li>`;
    })
    .join('');
  return `<h2 class="h3 q-title" id="q-title" tabindex="-1">Your plan is ready to build</h2>
    <p class="muted small q-hint">Check your answers. Tap one to change it.</p>
    <ul class="review-list">${answers}</ul>
    <div class="review-extra">
      <div class="col gap6"><label class="strong small" for="onb-name">What should we call you? <span class="muted">Optional</span></label>
        <input id="onb-name" class="input" type="text" maxlength="40" autocomplete="given-name" placeholder="Your first name" value="${esc(S.onb.name)}"></div>
      <div class="col gap6"><label class="strong small" for="onb-arrival">${arrived ? 'When did you arrive?' : 'When do you arrive?'} <span class="muted">Optional</span></label>
        <input id="onb-arrival" class="date-input" type="date" value="${esc(S.onb.arrivalDate ?? '')}"></div>
    </div>
    ${
      plan.length
        ? `<div class="plan-preview">${icon('Route', 22, 'var(--green)')}<p><span class="strong">${plan.length} steps</span> picked for you, <span class="strong">${urgent} urgent</span>. We’ll start with what can’t wait.</p></div>`
        : ''
    }
    <button class="btn btn-primary btn-lg btn-block" data-act="onb-finish"${profile ? '' : ' disabled'}><span>Build my plan</span>${icon('ArrowRight', 18)}</button>`;
}

export function pageStart() {
  const { i, draft, dir } = S.onb;
  const qs = questionsFor(draft, 'onboarding');
  const total = qs.length + 1;
  const atReview = i >= qs.length;
  const pos = Math.min(i, qs.length);
  return `<div class="container onb">
    <div class="col onb-side">
      <p class="eyebrow">Your plan</p>
      <h1 class="h1" style="margin-top:14px">Tell us who you are</h1>
      <p class="lead" style="margin-top:16px">A few quick questions, about a minute. Your plan adapts to why you’re moving, your citizenship, your city, your home and who’s coming with you.</p>
      <ul class="checks">${['No signup needed', 'Saved on this device only', 'Change your answers any time in Profile'].map(t => `<li>${icon('Check', 18, 'var(--green)', { stroke: 2.5 })}<span>${t}</span></li>`).join('')}</ul>
      ${S.gateNote ? `<p class="note">${esc(S.gateNote)}</p>` : ''}
    </div>
    <section class="card q-card" aria-labelledby="q-title">
      <div class="q-top">
        <button class="btn btn-secondary btn-icon btn-sm" data-act="onb-back" aria-label="${pos === 0 ? 'Back to home' : 'Previous question'}">${icon('ArrowLeft', 18)}</button>
        <div class="q-progress" role="progressbar" aria-label="Step ${pos + 1} of ${total}" aria-valuemin="1" aria-valuemax="${total}" aria-valuenow="${pos + 1}" style="--n:${total}">${Array.from({ length: total }, (_, k) => `<span class="${k < pos ? 'on' : k === pos ? 'on cur' : ''}"></span>`).join('')}</div>
        <span class="tiny muted strong">${pos + 1} of ${total}</span>
      </div>
      <div class="q-body${dir ? ` q-${dir}` : ''}">${atReview ? reviewHTML(qs) : questionHTML(qs[pos])}</div>
    </section>
  </div>`;
}

/** The short “building your plan” moment between the questions and the Journey. */
export function pageSaving() {
  const p = S.profile;
  const lines = p
    ? [
        `Checking the residence rules for ${p.residency_group === 'non-eu' ? 'your citizenship' : `${RES_LABELS[p.residency_group]} citizens`}`,
        p.city === 'other' ? 'Finding official help near you' : `Finding ${CITY_OFFICES[p.city].name}`,
        `Putting ${S.plan.length} steps in the right order`,
      ]
    : ['Building your plan'];
  return `<div class="container center-page building" role="status" aria-label="Building your plan">
    <span class="build-orb" aria-hidden="true">${icon('Route', 30, 'var(--on-green)')}</span>
    <h1 class="h3">Building your plan${p?.name ? `, ${esc(p.name)}` : ''}…</h1>
    <ul class="build-list">${lines.map((l, k) => `<li style="--i:${k}">${icon('CircleCheck', 18, 'var(--green)')}<span>${esc(l)}</span></li>`).join('')}</ul>
    ${p && p.city !== 'other' ? `<p class="tiny muted">${esc(CITY_LABELS[p.city])} · official sources only</p>` : ''}
  </div>`;
}

export function pageLogin() {
  return `<div class="container"><section class="card login-card">
    <p class="eyebrow">Log in</p>
    <h1 class="h2">Welcome back</h1>
    <p class="muted">Your Hej Denmark account lives in the mobile app. Log in there to sync your plan across devices. On this website, your plan is saved on this device.</p>
    <a class="btn btn-primary" href="${APP_URL}" ${ext} style="align-self:flex-start">Open the Hej Denmark app${icon('ArrowUpRight', 18)}</a>
    ${S.profile ? goLink('today', '<span>Back to my plan</span>') : goLink('start', '<span>New here? Get my plan</span>')}
  </section></div>`;
}
