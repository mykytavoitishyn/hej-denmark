import type { AvatarColor } from '../types.js';

/** Profile pictures to pick from, each with a name for screen readers. */
export const AVATAR_EMOJI: { emoji: string; label: string }[] = [
  { emoji: '🚲', label: 'Bicycle' },
  { emoji: '🦢', label: 'Swan' },
  { emoji: '🥐', label: 'Pastry' },
  { emoji: '☕', label: 'Coffee' },
  { emoji: '🌊', label: 'Wave' },
  { emoji: '🏰', label: 'Castle' },
  { emoji: '🌷', label: 'Tulip' },
  { emoji: '🧜‍♀️', label: 'Mermaid' },
  { emoji: '🍓', label: 'Strawberry' },
  { emoji: '🦊', label: 'Fox' },
  { emoji: '🕯️', label: 'Candle' },
  { emoji: '⛵', label: 'Sailboat' },
];

export const AVATAR_COLORS: readonly AvatarColor[] = ['green', 'sage', 'sand', 'rose', 'sky', 'clay'];
