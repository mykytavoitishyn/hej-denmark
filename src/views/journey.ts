import { CITY_LABELS } from '../data/labels.js';
import { esc, ext, icon, isWide } from '../lib/dom.js';
import { journeyPhases, nextStep, prio, stepOffice } from '../lib/plan.js';
import { S, requireProfile } from '../state/state.js';
import type { PlanStep } from '../types.js';
import { badge, toastHTML } from './shared.js';

function stepRow(s: PlanStep, selectedId: number | undefined, nextId: number | undefined): string {
  const reqs = s.unmet
    .map(r => S.plan.find(x => x.id === r)?.title)
    .filter(Boolean)
    .join(', ');
  const p = prio(s);
  const ic = s.locked
    ? icon('LockKeyhole', 18, 'var(--muted)')
    : s.completed
      ? icon('CircleCheck', 20, 'var(--green)')
      : icon('Circle', 20, 'var(--faint)');
  const sub = s.locked
    ? `<span class="tiny muted">Available after: ${esc(reqs)}</span>`
    : s.completed
      ? `<span class="tiny muted">Done</span>`
      : badge(p);
  const label = `${s.title}, ${s.locked ? `locked until ${reqs}` : s.completed ? 'done' : p}`;
  return `<a class="step-row" href="#step-${s.id}" data-act="step" data-id="${s.id}"${selectedId === s.id ? ' aria-current="true"' : ''} aria-label="${esc(label)}"><span class="step-ico">${ic}</span><span class="col gap6 min0 flex1"><span class="step-title${s.completed ? ' done' : ''}">${esc(s.title)}${s.id === nextId ? '<span class="tag">Up next</span>' : ''}</span>${sub}</span>${icon('ChevronRight', 18, 'var(--muted)')}</a>`;
}
function stepDetail(st: PlanStep): string {
  const phase = journeyPhases(S.plan).find(ph => ph.steps.some(s => s.id === st.id));
  const reqs = st.unmet
    .map(r => S.plan.find(x => x.id === r)?.title)
    .filter(Boolean)
    .join(', ');
  const city = requireProfile().city,
    cityName = city === 'other' ? 'your city' : CITY_LABELS[city];
  const office = stepOffice(st, city);
  const links = (st.official_links || []).filter(l => l && l.label && /^https?:\/\//.test(l.url));
  const checked = S.checklist[String(st.id)] || [];
  const checklist = (st.checklist || []).filter(c => c && c.id && c.label);
  const status = st.completed
    ? `<span class="badge badge-done">${icon('Check', 13, 'var(--green)', { stroke: 2.5 })}Done</span>`
    : st.locked
      ? `<span class="badge badge-later">${icon('LockKeyhole', 13, 'var(--muted)')}Locked</span>`
      : badge(prio(st));
  const primary =
    st.locked && !st.completed
      ? `<button class="btn btn-primary" disabled>${icon('LockKeyhole', 18)}<span>Complete prerequisite first</span></button>`
      : `<button class="btn ${st.completed ? 'btn-secondary' : 'btn-primary'}" data-act="step-toggle" data-id="${st.id}">${st.completed ? icon('RotateCcw', 18) : icon('Check', 18, 'currentColor', { stroke: 2.5 })}<span>${st.completed ? 'Mark not done' : 'Mark done'}</span></button>`;
  return `<article class="card detail" aria-labelledby="step-title-${st.id}">
    <div class="row between wrap gap12"><p class="eyebrow">${esc(phase ? phase.title : 'Plan step')}</p>${status}</div>
    <h2 class="h2 detail-title" id="step-title-${st.id}">${esc(st.title)}</h2>
    <p class="lead">${esc(st.why_matters ?? st.description)}</p>
    ${st.locked ? `<div class="locked-box">${icon('LockKeyhole', 20, 'var(--muted)')}<p class="muted">Available after: ${esc(reqs)}</p></div>` : ''}
    ${toastHTML('step')}
    <div class="row wrap gap10">${primary}
      <button class="btn btn-outline" data-act="remind" data-id="${st.id}">${icon('Bell', 18, 'var(--green)')}<span>Remind me tomorrow</span></button>
      <button class="btn btn-ghost" data-act="ask-step" data-id="${st.id}">${icon('MessageCircle', 18, 'var(--green)')}<span>Ask Hej about this</span></button>
    </div>
    ${S.stepError ? `<p class="danger" role="alert">${esc(S.stepError)}</p>` : ''}
    <section class="detail-section"><h3 class="h4">What you’ll need</h3>
      ${
        checklist.length
          ? checklist
              .map(c => {
                const on = checked.includes(c.id);
                return `<button class="check-item" role="checkbox" aria-checked="${on}" data-act="check" data-id="${st.id}" data-item="${esc(c.id)}">${on ? icon('SquareCheckBig', 20, 'var(--green)') : icon('Square', 20, 'var(--muted)')}<span class="flex1">${esc(c.label)}</span></button>`;
              })
              .join('')
          : `<p class="muted">Check the official guidance for current requirements.</p>`
      }
    </section>
    <section class="detail-section"><h3 class="h4">Where to go in ${esc(cityName)}</h3>
      ${
        office
          ? `<div class="office"><p class="strong">${esc(office.name)}</p><div class="row wrap gap8">
        <a class="btn btn-outline btn-sm" href="${esc(office.url)}" ${ext}>${icon('ExternalLink', 16, 'var(--green)')}<span>Official page</span></a>
        <a class="btn btn-outline btn-sm" href="https://www.google.com/maps/search/?api=1&amp;query=${encodeURIComponent(office.name)}" ${ext}>${icon('MapPinned', 16, 'var(--green)')}<span>Open in Maps</span></a>
      </div></div>`
          : `<p class="muted">Use the official page below to find the right service for your location.</p>`
      }
    </section>
    <div class="detail-cols">
      <section><h3 class="h4">Time needed</h3><p class="muted">${esc(st.time_needed ?? 'Varies — check the official page for current processing information.')}</p></section>
      <section><h3 class="h4">Official links</h3>${links.length ? links.map(l => `<a class="link" href="${esc(l.url)}" ${ext}>${esc(l.label)}${icon('ArrowUpRight', 16)}</a>`).join('') : `<p class="muted">No official link is available for this step yet.</p>`}</section>
    </div>
    ${st.tip ? `<div class="tip">${icon('Info', 20, 'var(--green)')}<div class="col gap4"><p class="strong">Practical tip</p><p>${esc(st.tip)}</p></div></div>` : ''}
  </article>`;
}
export function pageJourney(selId: number | null): string {
  const plan = S.plan,
    next = nextStep(plan);
  const E = plan.filter(s => s.completed).length,
    pct = plan.length ? Math.round((E / plan.length) * 100) : 0;
  const { urgent, hideDone } = S.jf;
  const filtered = plan.filter(s => !((urgent && prio(s) !== 'Urgent') || (hideDone && s.completed)));
  const H = journeyPhases(filtered),
    U = journeyPhases(plan);
  const key = `${E}-${urgent}-${hideDone}`;
  if (S.phaseKey !== key || !S.openPhases) {
    S.phaseKey = key;
    S.openPhases = new Set(
      H.filter(ph => {
        const full = U.find(u => u.id === ph.id);
        return !(full && full.steps.every(s => s.completed));
      }).map(ph => ph.id),
    );
  }
  const openPhases = S.openPhases;
  const wide = isWide();
  const selected = wide ? plan.find(s => s.id === (selId ?? S.selStep)) || next || plan[0] || null : null;
  if (selected) S.selStep = selected.id;
  const chip = (label: string, sel: boolean, act: string, aria: string): string =>
    `<button class="chip" data-act="${act}" aria-pressed="${sel}" aria-label="${aria}">${label}</button>`;
  let list: string;
  if (!plan.length)
    list = `<div class="card empty">${icon('ListChecks', 26, 'var(--green)')}<h2 class="h4">No journey steps yet</h2><p class="muted">Refresh to build your setup plan.</p><button class="btn btn-secondary btn-sm" data-act="refresh-plan">Refresh plan</button></div>`;
  else if (!H.length)
    list = `<div class="card empty">${icon('ListChecks', 26, 'var(--green)')}<h2 class="h4">No steps match these filters</h2><p class="muted">Clear the filters to see your full journey.</p><button class="btn btn-secondary btn-sm" data-act="jf-all">Clear filters</button></div>`;
  else
    list = H.map(ph => {
      const full = U.find(u => u.id === ph.id) ?? ph,
        doneCount = full.steps.filter(s => s.completed).length,
        open = openPhases.has(ph.id);
      return `<section class="phase"><h2 class="phase-h"><button class="phase-head" data-act="phase" data-id="${ph.id}" aria-expanded="${open}" aria-controls="ph-${ph.id}">
      <span class="col gap4 min0 flex1"><span class="row between gap12"><span class="h3">${esc(ph.title)}</span><span class="small strong muted">${doneCount}/${full.steps.length}</span></span><span class="small muted">${esc(ph.intro)}</span></span>
      <span class="chev">${icon('ChevronDown', 20, 'var(--muted)')}</span></button></h2>
      <div class="phase-body" id="ph-${ph.id}"${open ? '' : ' hidden'}>${ph.steps.map(s => stepRow(s, selected?.id, next?.id)).join('')}</div></section>`;
    }).join('');
  const upNextCard =
    !wide && next
      ? `<a class="card card-sm upnext-link" href="#step-${next.id}" data-act="step" data-id="${next.id}"><span class="col gap6 min0 flex1"><span class="eyebrow">Up next</span><span class="strong">${esc(next.title)}</span>${badge(prio(next))}</span>${icon('ChevronRight', 20, 'var(--muted)')}</a>`
      : '';
  return `<div class="container">
    <div class="page-head">
      <div class="col gap10"><p class="eyebrow">Your setup plan</p><h1 class="h1">Journey</h1><p class="lead">Everything to set up in Denmark, in the order that fits you.</p></div>
      <div class="card card-sm progress-mini"><div class="row between"><span class="small">${E} of ${plan.length} done</span><span class="small strong">${pct}%</span></div><div class="bar" role="progressbar" aria-label="Journey progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div></div>
    </div>
    <div class="chip-row filter-bar" role="group" aria-label="Filter steps">${chip('All', !urgent && !hideDone, 'jf-all', 'Show all journey steps')}${chip('Urgent', urgent, 'jf-urgent', 'Show only urgent steps')}${chip('Hide done', hideDone, 'jf-hide', 'Hide completed steps')}</div>
    <div class="journey">
      <div class="col gap16">${upNextCard}${list}</div>
      ${wide ? `<aside class="detail-pane" aria-label="Step details">${selected ? stepDetail(selected) : ''}</aside>` : ''}
    </div>
  </div>`;
}
export function pageStep(id: number): string {
  const st = S.plan.find(s => s.id === id);
  const back = `<a class="back-link" href="#journey" data-act="go" data-to="journey">${icon('ArrowLeft', 18)}<span>Back to Journey</span></a>`;
  if (!st)
    return `<div class="container narrow page-pad">${back}<div class="card empty">${icon('MapPinned', 28, 'var(--green)')}<h1 class="h4">This step isn’t available</h1><p class="muted">It may have been removed or your plan may have changed.</p></div></div>`;
  return `<div class="container narrow page-pad">${back}${stepDetail(st)}</div>`;
}
