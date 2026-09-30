import { esc, icon } from '../lib/dom.js';
import { initials } from '../lib/profile.js';
import type { LevelProgress } from '../lib/rewards.js';
import { S } from '../state/state.js';
import type { Choice, Phase, Priority, RouteName, Toast } from '../types.js';

export function badge(p: Priority): string {
  const ic = p === 'Urgent' ? 'CircleAlert' : p === 'Soon' ? 'Clock3' : 'Leaf';
  const col = p === 'Urgent' ? 'var(--urgent)' : p === 'Soon' ? 'var(--soon)' : 'var(--muted)';
  const cls = p === 'Urgent' ? 'badge-urgent' : p === 'Soon' ? 'badge-soon' : 'badge-later';
  return `<span class="badge ${cls}">${icon(ic, 13, col)}<span>${p}<span class="sr-only"> priority</span></span></span>`;
}
export function toastHTML(screen: string): string {
  const t = S.toast;
  if (!t || t.screen !== screen) return '';
  const ic =
    t.kind === 'sparkles'
      ? icon('Sparkles', 18, 'var(--green)')
      : `<span class="pop">${icon('Check', 18, 'var(--green)', { stroke: 2.5 })}</span>`;
  return `<div class="notice" id="toast" role="status" aria-live="polite">${ic}<span>${esc(t.text)}</span></div>`;
}
/** Shows a short confirmation on a screen and removes it after `ms` milliseconds. */
export function showToast(screen: string, text: string, kind: Toast['kind'], ms: number): void {
  const tok = {};
  S.toast = { screen, text, kind, tok };
  setTimeout(() => {
    if (!S.toast || S.toast.tok !== tok) return;
    S.toast = null;
    const el = document.getElementById('toast');
    if (el) {
      el.classList.add('out');
      setTimeout(() => el.remove(), 160);
    }
  }, ms);
}
export function ring(pct: number): string {
  const r = 52,
    C = 2 * Math.PI * r,
    from = C * (1 - S.lastPct / 100),
    to = C * (1 - pct / 100);
  return `<div class="ring" role="img" aria-label="${pct}% of your plan done"><svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="${r}" fill="none" stroke-width="10" style="stroke:var(--border)"/><circle class="ring-prog" data-to="${to}" cx="60" cy="60" r="${r}" fill="none" stroke-width="10" stroke-linecap="round" style="stroke:var(--green);stroke-dasharray:${C} ${C};stroke-dashoffset:${from}"/></svg><span class="ring-label">${pct}%</span></div>`;
}
export const goLink = (to: RouteName, label: string, cls = 'link', arrow = true): string =>
  `<a class="${cls}" href="#${to}" data-act="go" data-to="${to}">${label}${arrow ? icon('ArrowRight', 16) : ''}</a>`;

/**
 * A group of single-choice buttons. Choices with a description are stacked one per row so the text has room;
 * shorter ones sit in a grid. Numbers let keyboard users answer with 1, 2, 3…
 * Pass `labelledBy`, the id of the question above, so screen readers announce what the choices are for.
 */
export function options(
  name: string,
  choices: Choice[],
  value: string | undefined,
  cls = '',
  labelledBy?: string,
): string {
  const layout = cls || (choices.some(c => c.desc) ? 'stack' : '');
  return `<div class="options ${layout}" role="radiogroup"${labelledBy ? ` aria-labelledby="${labelledBy}"` : ''}>${choices
    .map((c, i) => {
      const sel = value === c.value;
      return `<button type="button" class="option" role="radio" aria-checked="${sel}" data-act="opt" data-name="${name}" data-value="${esc(c.value)}" style="--i:${i}">${c.icon ? `<span class="icon-circle sm">${icon(c.icon, 20)}</span>` : ''}<span class="col min0 flex1"><span>${esc(c.label)}</span>${c.desc ? `<span class="opt-desc">${esc(c.desc)}</span>` : ''}</span>${c.aside ? `<span class="opt-aside">${esc(c.aside)}</span>` : ''}${sel ? `<span class="check">${icon('Check', 18, 'currentColor', { stroke: 2.5 })}</span>` : name === 'onb' ? `<kbd class="opt-key" aria-hidden="true">${i + 1}</kbd>` : ''}</button>`;
    })
    .join('')}</div>`;
}

/** The profile picture: a photo, an emoji, initials, or a person icon. Decorative, as a name is always nearby. */
export function avatarHTML(size: 'sm' | 'md' | 'lg' | 'xl' = 'sm'): string {
  const a = S.avatar,
    name = S.profile?.name ?? '';
  const px = { sm: 17, md: 22, lg: 28, xl: 40 }[size];
  if (a?.kind === 'photo')
    return `<span class="avatar av-${size} av-photo" aria-hidden="true"><img src="${esc(a.value)}" alt=""></span>`;
  if (a?.kind === 'emoji')
    return `<span class="avatar av-${size} av-emoji av-${a.color}" aria-hidden="true">${esc(a.value)}</span>`;
  if (name) return `<span class="avatar av-${size} av-initials" aria-hidden="true">${esc(initials(name))}</span>`;
  return `<span class="avatar av-${size}" aria-hidden="true">${icon('User', px)}</span>`;
}

/** Level name and a bar showing the way to the next level. */
export function xpBar(xp: number, lp: LevelProgress): string {
  const pct = Math.round(lp.progress * 100);
  const hint = lp.next ? `${lp.toNext} XP to ${lp.next.title}` : 'Top level reached';
  return `<div class="xp">
    <div class="row between gap12"><span class="strong">Level ${lp.level.n} · ${esc(lp.level.title)} <span class="muted" lang="da">(${esc(lp.level.danish)})</span></span><span class="tiny strong accent">${xp} XP</span></div>
    <div class="bar xp-bar" role="progressbar" aria-label="Progress to the next level" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${pct}"><span style="width:${pct}%"></span></div>
    <p class="tiny muted">${esc(hint)}</p>
  </div>`;
}

/** The plan's phases as a row of stops, so people see the whole journey and where they are on it. */
export function roadmap(phases: Phase[], opts: { compact?: boolean } = {}): string {
  const cur = phases.findIndex(p => p.steps.some(s => !s.completed));
  return `<ol class="roadmap${opts.compact ? ' compact' : ''}" aria-label="Your journey in phases">${phases
    .map((ph, i) => {
      const done = ph.steps.filter(s => s.completed).length;
      const state = done === ph.steps.length ? 'done' : i === cur ? 'current' : 'todo';
      const label = state === 'done' ? 'done' : state === 'current' ? 'you are here' : 'coming up';
      const inner = `<span class="rm-dot">${state === 'done' ? icon('Check', 16, 'currentColor', { stroke: 3 }) : icon(ph.icon, 16)}</span><span class="rm-text"><span class="rm-title">${esc(ph.title)}</span><span class="rm-count">${done}/${ph.steps.length}${state === 'current' ? ' · You are here' : ''}</span></span>`;
      return `<li class="rm-stop ${state}" style="--i:${i}">${
        opts.compact
          ? `<span class="rm-link" aria-label="${esc(`${ph.title}: ${done} of ${ph.steps.length} done, ${label}`)}">${inner}</span>`
          : `<button class="rm-link" data-act="phase-jump" data-id="${esc(ph.id)}" aria-label="${esc(`${ph.title}: ${done} of ${ph.steps.length} done, ${label}. Show steps`)}">${inner}</button>`
      }</li>`;
    })
    .join('')}</ol>`;
}
