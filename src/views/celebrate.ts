import { esc } from '../lib/dom.js';
import { rewardChanges } from '../lib/rewards.js';
import { rewardInput } from '../state/progress.js';

const COLORS = ['#365a37', '#c8102e', '#d1aa6e', '#87998d', '#b9893f', '#e9c3c0'];
const reducedMotion = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * The live region for celebrations. It sits outside the app root, so re-renders don't remove it, and it exists
 * before anything is announced, so screen readers pick up the messages.
 */
function layer(): HTMLElement {
  let el = document.getElementById('celebrations');
  if (!el) {
    el = document.createElement('div');
    el.id = 'celebrations';
    el.className = 'celebrations';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    document.body.append(el);
  }
  return el;
}

/** Call once at start-up so the live region is ready before the first announcement. */
export const initCelebrations = (): void => void layer();

/** A burst of confetti from a point on the screen, by default the middle. Skipped when motion is reduced. */
export function confetti(x = window.innerWidth / 2, y = window.innerHeight / 3, pieces = 42): void {
  if (reducedMotion()) return;
  const burst = document.createElement('div');
  burst.className = 'confetti';
  burst.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < pieces; i++) {
    const p = document.createElement('i');
    const angle = Math.random() * Math.PI * 2,
      dist = 80 + Math.random() * 180;
    p.style.cssText = [
      `left:${x}px`,
      `top:${y}px`,
      `--dx:${Math.cos(angle) * dist}px`,
      `--up:${-60 - Math.random() * 120}px`,
      `--dy:${160 + Math.random() * 260}px`,
      `--r:${Math.round(Math.random() * 720 - 360)}deg`,
      `--c:${COLORS[i % COLORS.length]}`,
      `animation-delay:${Math.random() * 90}ms`,
    ].join(';');
    burst.append(p);
  }
  document.body.append(burst);
  setTimeout(() => burst.remove(), 1700);
}

/** Shows a short celebration card at the bottom of the screen, optionally with confetti. */
export function celebrate(title: string, detail: string, emoji: string, withConfetti = true): void {
  const root = layer();
  const card = document.createElement('div');
  card.className = 'celebration';
  card.innerHTML = `<span class="celebration-emoji" aria-hidden="true">${esc(emoji)}</span><span class="col min0"><span class="strong">${esc(title)}</span><span class="tiny">${esc(detail)}</span></span>`;
  root.append(card);
  if (withConfetti) confetti();
  setTimeout(() => {
    card.classList.add('out');
    setTimeout(() => card.remove(), 260);
  }, 3600);
}

/**
 * Runs a change and celebrates what it earned: new badges and a new level. Rewards are derived from the state,
 * so comparing a snapshot from before and after is all it takes.
 */
export function withRewards<T>(change: () => T): T {
  const before = rewardInput();
  const result = change();
  const after = rewardInput();
  if (before && after) {
    const { badges, levelUp } = rewardChanges(before, after);
    if (levelUp) celebrate(`Level ${levelUp.n}: ${levelUp.title}`, `You’re now “${levelUp.danish}”. Keep going!`, '🎉');
    for (const b of badges) celebrate(`Badge unlocked: ${b.title}`, b.desc, b.emoji, !levelUp);
  }
  return result;
}
