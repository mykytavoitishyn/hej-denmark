import { HOUSING_GLOSSARY, HOUSING_KINDS, HOUSING_RESOURCES, HOUSING_TIPS, SCAM_SIGNS } from '../data/housing.js';
import type { HousingResource } from '../data/housing.js';
import { CITY_LABELS } from '../data/labels.js';
import { esc, ext, hostOf, icon, isOfficial } from '../lib/dom.js';
import { S } from '../state/state.js';
import type { CityId, HousingKind, HousingState, Profile } from '../types.js';

const CITY_CHOICES: CityId[] = ['copenhagen', 'aarhus', 'odense', 'aalborg', 'other'];
const KIND_ORDER: HousingKind[] = ['student', 'nonprofit', 'portal', 'community', 'temporary', 'official'];

function ensureHousingState(): HousingState {
  if (!S.hs) S.hs = { city: S.profile?.city ?? 'copenhagen', kind: 'all' };
  return S.hs;
}

/** Resources for a city: its own first, then the ones that cover all of Denmark. */
export function resourcesFor(city: CityId, kind: HousingKind | 'all'): HousingResource[] {
  const list = HOUSING_RESOURCES.filter(
    r => (kind === 'all' || r.kind === kind) && (!r.cities || r.cities.includes(city)),
  );
  return [...list.filter(r => r.cities), ...list.filter(r => !r.cities)];
}

/** A short, personal pointer to where this person should start. */
function advice(p: Profile | null, city: string): string {
  if (!p)
    return `Start with student housing if you’re studying, then rental sites and groups. Always read the scam signs first.`;
  if (p.housing === 'settled')
    return `Your home is sorted. Below are your rights as a tenant, and what to do if you move again.`;
  if (p.move_reason === 'student')
    return p.study_type === 'exchange'
      ? `As an exchange student, ask your university’s housing office first. Many reserve rooms for exchange students.`
      : `As a degree student, apply for student housing in ${city} now. Waiting lists move faster the earlier you join.`;
  if (p.housing === 'temporary')
    return `You have a temporary place. Use the time to apply to waiting lists and set up alerts on rental sites. Remember that you need an address you actually live at for your CPR number.`;
  return `Search on several fronts: rental sites, non-profit waiting lists and groups. A temporary place buys you time, but you’ll need a real address for your CPR number.`;
}

function resourceCard(r: HousingResource, i: number): string {
  const official = isOfficial(r.url);
  const tags = [...(official ? ['Official'] : []), ...(r.tags ?? []).filter(t => t !== 'Official')];
  return `<a class="card card-sm res-card" href="${esc(r.url)}" ${ext} style="--i:${i}">
    <span class="col gap6 min0 flex1">
      <span class="row between gap10"><span class="strong">${esc(r.name)}</span>${icon('ArrowUpRight', 16, 'var(--green)')}</span>
      <span class="small muted">${esc(r.note)}</span>
      <span class="row wrap gap6">${tags.map(t => `<span class="res-tag${t === 'Official' ? ' official' : ''}">${t === 'Official' ? icon('ShieldCheck', 12, 'currentColor') : ''}${esc(t)}</span>`).join('')}<span class="tiny accent">${esc(hostOf(r.url))}</span></span>
    </span>
  </a>`;
}

export function pageHousing() {
  const hs = ensureHousingState();
  const p = S.profile;
  const city = hs.city;
  const cityLabel = city === 'other' ? 'Denmark' : CITY_LABELS[city];
  const chip = (label: string, sel: boolean, act: string, extra = ''): string =>
    `<button class="chip" data-act="${act}" aria-pressed="${sel}" ${extra}>${label}</button>`;
  const kinds = KIND_ORDER.filter(k => resourcesFor(city, k).length);
  const shownKinds = hs.kind === 'all' ? kinds : kinds.filter(k => k === hs.kind);
  let n = 0;
  const sections = shownKinds
    .map(k => {
      const meta = HOUSING_KINDS[k];
      return `<section class="res-section" aria-labelledby="res-${k}">
        <div class="row gap12"><span class="icon-circle sm">${icon(meta.icon, 18)}</span><div class="col"><h2 class="h3" id="res-${k}">${esc(meta.label)}</h2><p class="small muted">${esc(meta.intro)}</p></div></div>
        ${k === 'community' ? `<p class="warn-line">${icon('ShieldAlert', 16, 'var(--urgent)')}<span>Never pay anyone from a group before you’ve seen the home and signed a lease.</span></p>` : ''}
        <div class="res-grid">${resourcesFor(city, k)
          .map(r => resourceCard(r, n++))
          .join('')}</div>
      </section>`;
    })
    .join('');
  const startHere = [
    ['Set your budget', 'Rent, deposit, prepaid rent and a conto payments for heat and water.'],
    ['Apply early', 'Join student housing and non-profit waiting lists as soon as you can.'],
    ['Search widely', 'Rental sites, groups and your network, with alerts switched on.'],
    ['Check before you pay', 'See the home, check the landlord and sign a written lease first.'],
    ['Register your address', 'Once you’ve moved in, register for your CPR number.'],
  ];
  return `<div class="container">
    <div class="page-head">
      <div class="col gap10"><p class="eyebrow">Housing guide</p><h1 class="h1">Find a home in ${esc(cityLabel)}</h1><p class="lead">Where to look, what’s normal, your rights and how to stay safe.</p></div>
    </div>
    <div class="chip-row" role="group" aria-label="Choose a city" style="margin-bottom:20px">${CITY_CHOICES.map(c => chip(`${c === 'other' ? 'Elsewhere' : esc(CITY_LABELS[c])}${p && p.city === c ? ' <span class="you">You</span>' : ''}`, city === c, 'hs-city', `data-id="${c}"`)).join('')}</div>
    <div class="card advice">${icon('Lightbulb', 22, 'var(--green)')}<p>${esc(advice(p, cityLabel))}</p></div>
    <ol class="start-here" aria-label="How to find a home, step by step">${startHere.map(([t, d], i) => `<li class="card card-sm" style="--i:${i}"><span class="step-num" aria-hidden="true">${i + 1}</span><span class="strong">${esc(t)}</span><span class="tiny muted">${esc(d)}</span></li>`).join('')}</ol>
    <div class="housing-layout">
      <div class="col gap32 min0">
        <div class="chip-row" role="group" aria-label="Filter by type">${chip('All', hs.kind === 'all', 'hs-kind', 'data-id="all"')}${kinds.map(k => chip(esc(HOUSING_KINDS[k].label), hs.kind === k, 'hs-kind', `data-id="${k}"`)).join('')}</div>
        ${sections || `<div class="card empty"><p class="muted">Nothing listed for this filter yet.</p></div>`}
        ${
          HOUSING_TIPS.length
            ? `<section class="col gap16" aria-labelledby="tips-title"><h2 class="h3" id="tips-title">Tips and tricks</h2><div class="tips-grid">${HOUSING_TIPS.map(
                (t, i) =>
                  `<div class="card card-sm tip-card" style="--i:${i}"><span class="icon-circle sm">${icon(t.icon, 18)}</span><div class="col gap4 min0"><p class="strong">${esc(t.title)}</p><p class="small muted">${esc(t.text)}</p>${t.source ? `<a class="tiny link" href="${esc(t.source.url)}" ${ext}>${esc(t.source.label)}${icon('ArrowUpRight', 12)}</a>` : ''}</div></div>`,
              ).join('')}</div></section>`
            : ''
        }
      </div>
      <aside class="col gap16 housing-side">
        <section class="card scam-card" aria-labelledby="scam-title">
          <div class="row gap10">${icon('ShieldAlert', 22, 'var(--urgent)')}<h2 class="h4" id="scam-title">Scam red flags</h2></div>
          <ul class="scam-list">${SCAM_SIGNS.map(s => `<li>${icon('CircleAlert', 16, 'var(--urgent)')}<span>${esc(s)}</span></li>`).join('')}</ul>
          <p class="tiny muted">If something feels off, stop and ask Hej or the people at your International House before you pay.</p>
        </section>
        <section class="card card-sm" aria-labelledby="gloss-title">
          <h2 class="h4" id="gloss-title">Housing words</h2>
          <dl class="glossary">${HOUSING_GLOSSARY.map(([t, d]) => `<div><dt lang="da">${esc(t)}</dt><dd>${esc(d)}</dd></div>`).join('')}</dl>
        </section>
        ${
          p
            ? `<a class="card card-sm cta-card" href="#journey" data-act="go" data-to="journey">${icon('Route', 22, 'var(--green)')}<span class="col min0 flex1"><span class="strong">Housing in your plan</span><span class="tiny muted">${p.housing === 'settled' ? 'Your home is sorted' : 'Mark “Find a home” done when you’ve signed'}</span></span>${icon('ArrowRight', 18, 'var(--green)')}</a>`
            : `<a class="card card-sm cta-card" href="#start" data-act="go" data-to="start">${icon('Route', 22, 'var(--green)')}<span class="col min0 flex1"><span class="strong">Get your personal plan</span><span class="tiny muted">Housing, CPR, MitID and more, in the right order</span></span>${icon('ArrowRight', 18, 'var(--green)')}</a>`
        }
      </aside>
    </div>
  </div>`;
}
