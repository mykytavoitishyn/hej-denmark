import { levelFor, xpFor } from '../lib/rewards.js';
import type { LevelProgress, RewardInput } from '../lib/rewards.js';
import { S } from './state.js';

/** The current progress, as the rewards module needs it. Null without a profile. */
export function rewardInput(): RewardInput | null {
  if (!S.profile) return null;
  return {
    profile: S.profile,
    plan: S.plan,
    checklist: S.checklist,
    savedEvents: S.saved.length,
    questionsAsked: S.askHistory.filter(m => m.role === 'user').length,
    hasAvatar: Boolean(S.avatar),
  };
}

export function currentLevel(): { xp: number; lp: LevelProgress } | null {
  const input = rewardInput();
  if (!input) return null;
  const xp = xpFor(input);
  return { xp, lp: levelFor(xp) };
}
