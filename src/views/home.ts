import type { IconName } from '../data/icons.js';
import { esc, icon } from '../lib/dom.js';
import { journeyPhases, planFor, prio } from '../lib/plan.js';
import { dailyWord } from '../lib/today.js';
import { S } from '../state/state.js';
import type { RouteName } from '../types.js';
import { badge, goLink } from './shared.js';

const TERMS = [
  ['Registrerings­bevis', 'EU residence document. Comes before CPR.', ''],
  ['CPR-nummer', 'The ID number almost everything needs.', 'key'],
  ['Borgerservice', 'Citizen Service, where you register.', ''],
  ['MitID', 'Your digital ID. Needs a CPR number.', ''],
  ['NemKonto', 'Where public payments land. Needs CPR.', ''],
  ['Digital Post', 'Official letters, digital by default.', ''],
  ['Sundhedskort', 'Health card. Comes 2–3 weeks after CPR.', ''],
  ['Forskuds­opgørelse', 'Your tax budget. Sets your tax card.', ''],
  ['Skattekort', 'Tax card. No card? You pay 55% tax.', 'warn'],
];
function previewCard() {
  const plan = planFor(
    {
      move_reason: 'work',
      residency_group: 'eu-eea',
      city: 'copenhagen',
      has_cpr: false,
      arrival_date: null,
      stage: 'arrived',
      housing: 'searching',
      household: 'solo',
      study_type: null,
      job_status: 'offer',
      name: 'Sofia',
    },
    new Set([4]),
  );
  const phases = journeyPhases(plan).slice(0, 2);
  const done = plan.filter(s => s.completed).length;
  return `<div class="preview-wrap"><figure class="preview" aria-label="Example plan">
    <p class="eyebrow">Copenhagen · Week 1</p>
    <p class="h3" style="margin-top:8px">Your journey</p>
    <div class="bar" style="margin-top:16px"><span style="width:${Math.round((done / plan.length) * 100)}%"></span></div>
    <p class="tiny muted" style="margin-top:8px">${done} of ${plan.length} steps done</p>
    ${phases
      .map(
        (ph, i) =>
          `<p class="eyebrow" style="margin-top:20px;color:var(--muted)">Phase ${i + 1} · ${esc(ph.title)}</p><ul class="preview-list">${ph.steps
            .slice(0, 3)
            .map(
              s =>
                `<li class="preview-step${s.completed ? ' done' : ''}">${s.completed ? icon('CircleCheck', 19, 'var(--green)') : icon('Circle', 19, 'var(--faint)')}<span class="title flex1">${esc(s.title)}</span>${s.completed ? '<span class="badge badge-done">Done</span>' : badge(prio(s))}</li>`,
            )
            .join('')}</ul>`,
      )
      .join('')}
    <figcaption class="tiny muted" style="margin-top:18px">Example plan for Sofia, a software engineer from Spain who just landed in Copenhagen.</figcaption>
  </figure></div>`;
}
export function pageHome() {
  const has = Boolean(S.profile),
    word = dailyWord();
  const cta = has
    ? goLink('today', '<span>Continue my plan</span>', 'btn btn-primary btn-lg')
    : goLink('start', '<span>Get my plan</span>', 'btn btn-primary btn-lg');
  const features: [icon: IconName, eyebrow: string, title: string, text: string, to: RouteName, cta: string][] = [
    [
      'ClipboardCheck',
      'Journey',
      'Know what to do next',
      'Your steps in phases, marked Urgent, Soon or Later. Each one has a checklist, where to go and official links.',
      'journey',
      'See your journey',
    ],
    [
      'MessageCircle',
      'Ask Hej',
      'Ask, and get sourced answers',
      'Hej knows your profile and progress, and points you to the official pages.',
      'ask',
      'Ask a question',
    ],
    [
      'House',
      'Housing',
      'Find a home, safely',
      'Student housing, rental sites, Facebook groups, your rights as a tenant and how to spot a scam, city by city.',
      'housing',
      'Open the housing guide',
    ],
    [
      'Wallet',
      'Budget',
      'Know what it will cost',
      'Rent, food, transport and tax in Copenhagen, and how much to have ready before you move.',
      'budget',
      'Work out your budget',
    ],
    [
      'UsersRound',
      'Events',
      'Meet people in your city',
      'Things to do in Copenhagen, Aarhus, Odense and Aalborg. Save the ones you like and add them to your calendar.',
      'events',
      'Browse events',
    ],
  ];
  const how = [
    [
      'Tell us who you are',
      'About a minute: why you’re moving, your citizenship, your city, your home and who’s coming with you.',
    ],
    ['Get a personal plan', 'Only the steps that apply to you, in the right order, with what each one unlocks.'],
    ['Ask Hej anything', 'Housing, CPR, MitID, work or tax. Answers point you to the official pages.'],
    ['Find people to meet', 'Events in your city, from museum evenings to harbour walks.'],
  ];
  return `
  <section class="container hero">
    <div class="hero-copy">
      <p class="eyebrow">A newcomer guide for Denmark</p>
      <h1 class="display">Hej Denmark</h1>
      <p class="hero-lead">A calm, personal plan for your first months in Denmark.</p>
      <div class="hero-cta">${cta}<a class="btn btn-outline btn-lg" href="#ask" data-act="go" data-to="ask">${icon('MessageCircle', 18, 'var(--green)')}<span>Ask Hej a question</span></a></div>
      <ul class="hero-meta"><li>${icon('Zap', 18, 'var(--sage)')}Start as a guest, no signup</li><li>${icon('MapPin', 18, 'var(--sage)')}Copenhagen, Aarhus, Odense and Aalborg</li></ul>
    </div>
    ${previewCard()}
  </section>

  <section class="band section" aria-labelledby="homework-title"><div class="container homework">
    <div class="col gap16">
      <p class="eyebrow">The problem</p>
      <h2 class="h2" id="homework-title">Welcome to Denmark. Here’s your homework.</h2>
      <p class="lead">Each item waits for another, and the right order depends on who you are.</p>
      <p class="muted">The answers are spread across more than five official websites. Hej Denmark puts them in one plan, in the order that fits you.</p>
      <p class="tiny muted">Sources: lifeindenmark.borger.dk · ihcph.kk.dk · skat.dk · international.aarhus.dk</p>
    </div>
    <ul class="terms">${TERMS.map(([t, d, k]) => `<li class="term${k ? ' ' + k : ''}"><h3 lang="da">${t}</h3><p>${esc(d)}</p></li>`).join('')}</ul>
  </div></section>

  <section class="section" aria-labelledby="features-title"><div class="container">
    <div class="section-intro"><p class="eyebrow">What you get</p><h2 class="h2" id="features-title">What newcomers need, in one place</h2></div>
    <div class="features">${features.map(([ic, eb, t, d, to, l]) => `<article class="card feature"><span class="icon-circle">${icon(ic, 22, 'var(--green)')}</span><p class="eyebrow">${eb}</p><h3 class="h3">${t}</h3><p class="muted">${d}</p>${goLink(to, `<span>${l}</span>`)}</article>`).join('')}</div>
    <div class="card word-strip"><span class="flag" aria-hidden="true">🇩🇰</span><div class="col gap4 flex1" style="min-width:220px"><p class="eyebrow">Today’s Danish</p><p><span class="h4" lang="da">${esc(word.word)}</span> <span class="muted">· say it “${esc(word.pronunciation)}” · ${esc(word.meaning)}</span></p></div><p class="muted" lang="da">“${esc(word.example)}”</p></div>
  </div></section>

  <section class="band section" aria-labelledby="how-title"><div class="container">
    <div class="section-intro"><p class="eyebrow">How it works</p><h2 class="h2" id="how-title">From landing to feeling at home</h2></div>
    <ol class="steps-row">${how.map(([t, d], i) => `<li class="card step-card"><span class="step-num" aria-hidden="true">${i + 1}</span><h3 class="h4">${t}</h3><p class="muted small">${d}</p></li>`).join('')}</ol>
  </div></section>

  <section class="section" aria-labelledby="why-title"><div class="container">
    <div class="section-intro"><p class="eyebrow">Why it matters</p><h2 class="h2" id="why-title">Tens of thousands start this every year</h2></div>
    <div class="stats">
      <div class="card stat"><p class="stat-num">78,901</p><p class="stat-cap">people moved to Denmark in 2025, not counting Nordic citizens</p><p class="tiny muted">Statistics Denmark via The Local (Apr 2026)</p></div>
      <div class="card stat"><p class="stat-num">40th</p><p class="stat-cap">of 46 countries for ease of settling in: feeling welcome and making friends</p><p class="tiny muted">InterNations Expat Insider 2025 · it was 51st of 53 in 2023</p></div>
    </div>
    <p class="lead" style="margin-top:32px;color:var(--ink)">Paperwork is half of it. Feeling at home is the other half.</p>
  </div></section>

  <section class="cta-band"><div class="container cta-inner">
    <div class="col gap12"><p class="eyebrow">Velkommen</p><h2 class="h2">${has ? 'Your plan is waiting for you.' : 'Your plan is a minute away.'}</h2><p class="muted">${has ? 'Pick up where you left off.' : 'No signup. Your plan stays on this device.'}</p></div>
    ${has ? goLink('today', '<span>Continue my plan</span>', 'btn btn-light btn-lg') : goLink('start', '<span>Get my plan</span>', 'btn btn-light btn-lg')}
  </div></section>`;
}
