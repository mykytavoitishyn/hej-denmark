import { CITY_LABELS, MOVE_LABELS, RES_LABELS } from '../data/labels.js';
import { esc, icon } from '../lib/dom.js';
import { planSummary } from '../lib/plan.js';
import { S, requireProfile } from '../state/state.js';
import { goLink, options } from './shared.js';

export function pageProfile() {
  const p = requireProfile(),
    edit = S.pe,
    sum = planSummary(S.plan);
  const head = `<div class="page-head"><div class="col gap10"><p class="eyebrow">Your Denmark setup</p><h1 class="h1">Profile</h1></div>${edit ? '' : `<button class="btn btn-outline" data-act="pe-start">${icon('Pencil', 16, 'var(--green)')}<span>Edit profile</span></button>`}</div>`;
  if (edit) {
    const complete = edit.moveReason && edit.residencyGroup && edit.city && typeof edit.hasCpr === 'boolean';
    return `<div class="container">${head}<div class="profile-layout"><section class="card" aria-label="Edit profile">
      <div class="form-section"><p class="strong">Why are you moving?</p>${options(
        'pe-moveReason',
        [
          { value: 'student', label: 'Student' },
          { value: 'work', label: 'Work' },
          { value: 'other', label: 'Other' },
        ],
        edit.moveReason,
        'compact three',
      )}</div>
      <div class="form-section"><p class="strong">Where are you from?</p>${options(
        'pe-residencyGroup',
        [
          { value: 'eu-eea', label: 'EU/EEA' },
          { value: 'non-eu', label: 'Non-EU' },
        ],
        edit.residencyGroup,
        'compact',
      )}</div>
      <div class="form-section"><p class="strong">Where do you live?</p>${options(
        'pe-city',
        Object.entries(CITY_LABELS).map(([value, label]) => ({ value, label })),
        edit.city,
        'compact three',
      )}</div>
      <div class="form-section"><p class="strong">Do you have a CPR number?</p>${options(
        'pe-hasCpr',
        [
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'Not yet' },
        ],
        edit.hasCpr === undefined ? undefined : edit.hasCpr ? 'yes' : 'no',
        'compact',
      )}</div>
      <div class="form-section"><label class="strong" for="arrival-date">When did you arrive?</label>
        <div class="row wrap gap10"><input id="arrival-date" class="date-input" type="date" value="${esc(edit.arrivalDate || '')}" style="flex:1 1 220px;width:auto"><button class="btn ${edit.arrivalDate ? 'btn-secondary' : 'btn-primary'}" data-act="pe-noarrival" aria-pressed="${!edit.arrivalDate}">I haven’t arrived yet</button></div>
        <p class="tiny muted">You can change this later.</p></div>
      ${S.peError ? `<p class="danger" role="alert">${esc(S.peError)}</p>` : ''}
      <div class="row wrap gap10" style="padding-top:20px"><button class="btn btn-primary" data-act="pe-save"${complete ? '' : ' disabled'}>Save changes</button><button class="btn btn-secondary" data-act="pe-cancel">Cancel</button></div>
    </section><aside class="col gap16"><div class="card card-sm"><p class="eyebrow">Good to know</p><p class="muted" style="margin-top:8px">Your plan updates as soon as you save. Steps you’ve already done stay done.</p></div></aside></div></div>`;
  }
  const arrival = p.arrival_date
    ? new Date(`${p.arrival_date}T12:00:00`).toLocaleDateString('en-DK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'Not arrived yet';
  const tile = (label: string, value: string, wide = false) =>
    `<div class="tile${wide ? ' wide' : ''}"><span class="tiny muted">${esc(label)}</span><span class="strong">${esc(value)}</span></div>`;
  return `<div class="container">${head}<div class="profile-layout">
    <section class="card col gap20" aria-label="Your Denmark profile">
      <div class="row gap16"><span class="avatar lg">${icon('User', 26)}</span><div class="col gap4 min0"><h2 class="h3">Your Denmark profile</h2><p class="row gap6 muted">${icon('MapPin', 15, 'var(--muted)')}${esc(CITY_LABELS[p.city])}</p></div></div>
      <div class="tiles">${tile('Journey', MOVE_LABELS[p.move_reason])}${tile('Residency', RES_LABELS[p.residency_group])}${tile('City', CITY_LABELS[p.city])}${tile('CPR', p.has_cpr ? 'Ready' : 'Not yet')}${tile('Arrival', arrival, true)}</div>
    </section>
    <aside class="col gap16">
      <div class="card card-sm col gap12"><p class="eyebrow">Your progress</p><p><span class="h3">${sum.completed} of ${sum.total}</span> <span class="muted">steps done</span></p><div class="bar"><span style="width:${sum.percentage}%"></span></div>${goLink('journey', '<span>Open your journey</span>')}</div>
      <div class="card card-sm row between gap12"><div class="col"><p class="strong">Guest profile</p><p class="muted small">Saved on this device</p></div><button class="btn btn-ghost btn-sm" data-act="leave">${icon('LogOut', 16, 'var(--muted)')}<span>Leave</span></button></div>
    </aside>
  </div></div>`;
}
