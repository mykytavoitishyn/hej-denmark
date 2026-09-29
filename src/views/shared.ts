import { esc, icon } from '../lib/dom.js';
import { S } from '../state/state.js';
import type { Choice, Priority, RouteName, Toast } from '../types.js';

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

export function options(name: string, choices: Choice[], value: string | undefined, cls = ''): string {
  return `<div class="options ${cls}" role="radiogroup">${choices
    .map(c => {
      const sel = value === c.value;
      return `<button type="button" class="option" role="radio" aria-checked="${sel}" data-act="opt" data-name="${name}" data-value="${esc(c.value)}">${c.icon ? `<span class="icon-circle sm">${icon(c.icon, 20)}</span>` : ''}<span>${esc(c.label)}</span>${sel ? `<span class="check">${icon('Check', 18, 'currentColor', { stroke: 2.5 })}</span>` : ''}</button>`;
    })
    .join('')}</div>`;
}
