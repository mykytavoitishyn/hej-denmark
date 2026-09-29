import { ICONS } from '../data/icons.js';
import { OFFICIAL_HOSTS } from '../data/links.js';
import type { IconName } from '../data/icons.js';

const ESCAPES: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
/** Escapes text for use in HTML text and quoted attribute values. */
export const esc = (s: unknown): string => String(s ?? '').replace(/[&<>"']/g, c => ESCAPES[c]);
export const uid = (p: string): string => `${p}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
export function icon(
  name: IconName,
  size = 20,
  color = 'currentColor',
  opts: { stroke?: number; fill?: string } = {},
): string {
  const sw = opts.stroke ?? 2,
    fill = opts.fill ?? 'none';
  return `<svg class="ic" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" style="color:${color}" aria-hidden="true" focusable="false">${ICONS[name] || ''}</svg>`;
}
export const hostOf = (u: string): string => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
export const isOfficial = (u: string): boolean => {
  try {
    const x = new URL(u);
    return (x.protocol === 'https:' || x.protocol === 'http:') && OFFICIAL_HOSTS.has(x.hostname);
  } catch {
    return false;
  }
};
export const isWide = (): boolean => window.matchMedia('(min-width: 1001px)').matches;
export const ext = 'target="_blank" rel="noopener noreferrer"';
