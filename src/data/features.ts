/**
 * Parts of the app that are switched off for now. Badges, levels and XP are hidden everywhere while the plan itself is
 * simplified. Progress is still worked out in src/lib/rewards.ts, so turning `rewards` back on restores them as they were.
 */
export const FEATURES: { rewards: boolean } = { rewards: false };
