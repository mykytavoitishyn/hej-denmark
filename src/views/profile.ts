import { AVATAR_COLORS, AVATAR_EMOJI } from '../data/avatars.js';
import {
  CITY_LABELS,
  CPR_LABELS,
  HOUSEHOLD_LABELS,
  HOUSING_LABELS,
  JOB_LABELS,
  MOVE_LABELS,
  RES_LABELS,
  STAGE_LABELS,
  STUDY_LABELS,
} from '../data/labels.js';
import { esc, icon } from '../lib/dom.js';
import { planSummary } from '../lib/plan.js';
import { draftValue, questionsFor } from '../lib/profile.js';
import { BADGES, earnedBadges } from '../lib/rewards.js';
import { currentLevel, rewardInput } from '../state/progress.js';
import { S, requireProfile } from '../state/state.js';
import { avatarHTML, goLink, options, xpBar } from './shared.js';

function avatarPicker(): string {
  const a = S.avatar;
  const color = a?.kind === 'emoji' ? a.color : 'green';
  return `<div class="avatar-picker" id="avatar-picker">
    <p class="strong">Pick a picture</p>
    <div class="emoji-grid" role="radiogroup" aria-label="Profile emoji">${AVATAR_EMOJI.map(
      e =>
        `<button class="emoji-opt av-${color}" role="radio" aria-checked="${a?.kind === 'emoji' && a.value === e.emoji}" aria-label="${esc(e.label)}" data-act="avatar-emoji" data-value="${esc(e.emoji)}">${e.emoji}</button>`,
    ).join('')}</div>
    <p class="strong">Background</p>
    <div class="row wrap gap8" role="radiogroup" aria-label="Background colour">${AVATAR_COLORS.map(
      c =>
        `<button class="swatch av-${c}" role="radio" aria-checked="${color === c}" aria-label="${c}" data-act="avatar-color" data-value="${c}"></button>`,
    ).join('')}</div>
    <div class="row wrap gap10">
      <label class="btn btn-outline btn-sm" for="avatar-file">${icon('Upload', 16, 'var(--green)')}<span>Upload a photo</span></label>
      <input id="avatar-file" class="sr-only" type="file" accept="image/png,image/jpeg,image/webp">
      ${a ? `<button class="btn btn-ghost btn-sm" data-act="avatar-remove">${icon('Trash2', 16, 'var(--muted)')}<span>Remove picture</span></button>` : ''}
      <button class="btn btn-secondary btn-sm" data-act="avatar-close">Done</button>
    </div>
    ${S.avatarError ? `<p class="danger small" role="alert">${esc(S.avatarError)}</p>` : ''}
    <p class="tiny muted">Photos are shrunk and saved on this device only. They’re never uploaded.</p>
  </div>`;
}

function badgesHTML(): string {
  const input = rewardInput();
  const earned = new Set(input ? earnedBadges(input).map(b => b.id) : []);
  return `<section class="card col gap16" aria-labelledby="badges-title">
    <div class="row between gap12"><h2 class="h3" id="badges-title">Badges</h2><span class="small muted strong">${earned.size} of ${BADGES.length}</span></div>
    <ul class="badge-grid">${BADGES.map(b => {
      const on = earned.has(b.id);
      return `<li class="badge-tile${on ? ' earned' : ''}"><span class="badge-emoji" aria-hidden="true">${on ? b.emoji : '🔒'}</span><span class="strong small">${esc(b.title)}</span><span class="tiny muted">${esc(b.desc)}</span><span class="sr-only">${on ? 'Earned' : 'Not earned yet'}</span></li>`;
    }).join('')}</ul>
  </section>`;
}

export function pageProfile() {
  const p = requireProfile(),
    edit = S.pe,
    sum = planSummary(S.plan),
    lvl = currentLevel();
  const head = `<div class="page-head"><div class="col gap10"><p class="eyebrow">Your Denmark setup</p><h1 class="h1">Profile</h1></div>${edit ? '' : `<button class="btn btn-outline" data-act="pe-start">${icon('Pencil', 16, 'var(--green)')}<span>Edit answers</span></button>`}</div>`;
  if (edit) {
    const qs = questionsFor(edit, 'edit');
    const complete = qs.every(q => draftValue(edit, q.key) !== undefined);
    return `<div class="container">${head}<div class="profile-layout"><section class="card" aria-label="Edit profile">
      <div class="form-section"><label class="strong" for="pe-name">Your name <span class="muted">Optional</span></label><input id="pe-name" class="input" type="text" maxlength="40" autocomplete="given-name" value="${esc(edit.name)}"></div>
      ${qs
        .map(
          q =>
            `<div class="form-section"><p class="strong">${esc(q.prompt)}</p>${options(
              `pe-${q.key}`,
              q.choices.map(c => ({ value: c.value, label: c.label })),
              draftValue(edit, q.key),
              q.choices.length > 3 ? 'compact three' : 'compact',
            )}</div>`,
        )
        .join('')}
      <div class="form-section"><label class="strong" for="arrival-date">${edit.stage === 'arrived' ? 'When did you arrive?' : 'When do you arrive?'}</label>
        <div class="row wrap gap10"><input id="arrival-date" class="date-input" type="date" value="${esc(edit.arrivalDate || '')}" style="flex:1 1 220px;width:auto"><button class="btn ${edit.arrivalDate ? 'btn-secondary' : 'btn-primary'}" data-act="pe-noarrival" aria-pressed="${!edit.arrivalDate}">No date yet</button></div>
        <p class="tiny muted">Used for your countdown on Today.</p></div>
      ${S.peError ? `<p class="danger" role="alert">${esc(S.peError)}</p>` : ''}
      <div class="row wrap gap10" style="padding-top:20px"><button class="btn btn-primary" data-act="pe-save"${complete ? '' : ' disabled'}>Save changes</button><button class="btn btn-secondary" data-act="pe-cancel">Cancel</button></div>
    </section><aside class="col gap16"><div class="card card-sm"><p class="eyebrow">Good to know</p><p class="muted" style="margin-top:8px">Your plan updates as soon as you save. Steps you’ve already done stay done.</p></div></aside></div></div>`;
  }
  const arrival = p.arrival_date
    ? new Date(`${p.arrival_date}T12:00:00`).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : 'No date yet';
  const tile = (label: string, value: string, wide = false) =>
    `<div class="tile${wide ? ' wide' : ''}"><span class="tiny muted">${esc(label)}</span><span class="strong">${esc(value)}</span></div>`;
  const studies = p.study_type ? ` · ${STUDY_LABELS[p.study_type]}` : '';
  const job = p.job_status ? ` · ${JOB_LABELS[p.job_status]}` : '';
  return `<div class="container">${head}<div class="profile-layout">
    <div class="col gap24 min0">
      <section class="card col gap20" aria-label="Your Denmark profile">
        <div class="row gap16 wrap">
          <button class="avatar-btn" data-act="avatar-open" aria-expanded="${S.avatarOpen}" aria-controls="avatar-picker" aria-label="Change profile picture">${avatarHTML('xl')}<span class="avatar-edit">${icon('Camera', 15)}</span></button>
          <div class="col gap4 min0 flex1"><h2 class="h3">${p.name ? esc(p.name) : 'Your Denmark profile'}</h2><p class="row gap6 muted">${icon('MapPin', 15, 'var(--muted)')}${esc(p.city === 'other' ? 'Denmark' : CITY_LABELS[p.city])} · ${esc(STAGE_LABELS[p.stage])}</p></div>
        </div>
        ${S.avatarOpen ? avatarPicker() : ''}
        <div class="tiles">${tile('Moving for', MOVE_LABELS[p.move_reason] + studies + job)}${tile('Citizenship', RES_LABELS[p.residency_group])}${tile('City', CITY_LABELS[p.city])}${tile('CPR number', CPR_LABELS[p.cpr_stage])}${tile('Home', HOUSING_LABELS[p.housing])}${tile('Moving with', HOUSEHOLD_LABELS[p.household])}${tile('Arrival', arrival, true)}</div>
      </section>
      ${badgesHTML()}
    </div>
    <aside class="col gap16">
      ${lvl ? `<div class="card card-sm col gap12 level-card"><p class="eyebrow">Your level</p>${xpBar(lvl.xp, lvl.lp)}</div>` : ''}
      <div class="card card-sm col gap12"><p class="eyebrow">Your progress</p><p><span class="h3">${sum.completed} of ${sum.total}</span> <span class="muted">steps done</span></p><div class="bar"><span style="width:${sum.percentage}%"></span></div>${goLink('journey', '<span>Open your journey</span>')}</div>
      <div class="card card-sm row between gap12"><div class="col"><p class="strong">Guest profile</p><p class="muted small">Saved on this device</p></div><button class="btn btn-ghost btn-sm" data-act="leave">${icon('LogOut', 16, 'var(--muted)')}<span>Leave</span></button></div>
    </aside>
  </div></div>`;
}
