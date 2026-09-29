import type { PlanStep, Priority, Profile } from '../types.js';
import { activeSteps, journeyPhases } from './plan.js';

/**
 * Everything rewards are worked out from. Points and badges are derived from progress rather than stored,
 * so undoing a step takes its points away again and nothing can drift out of sync.
 */
export interface RewardInput {
  profile: Profile;
  plan: PlanStep[];
  checklist: Record<string, string[]>;
  savedEvents: number;
  questionsAsked: number;
  hasAvatar: boolean;
}

export const STEP_XP: Record<Priority, number> = { Urgent: 60, Soon: 40, Later: 25 };
export const CHECK_XP = 5;
export const PHASE_XP = 100;
const EVENT_XP = 10,
  MAX_EVENT_XP = 50;
const QUESTION_XP = 5,
  MAX_QUESTION_XP = 50;
const AVATAR_XP = 20,
  NAME_XP = 10;

/** Checklist items ticked on a step, counting only items the step really has. */
export function tickedItems(step: PlanStep, checklist: Record<string, string[]>): number {
  const ticked = new Set(checklist[String(step.id)] ?? []);
  return step.checklist.filter(c => ticked.has(c.id)).length;
}

export const completedPhases = (plan: PlanStep[]) =>
  journeyPhases(activeSteps(plan)).filter(ph => ph.steps.every(s => s.completed));

export function xpFor(i: RewardInput): number {
  const steps = activeSteps(i.plan);
  const fromSteps = steps.filter(s => s.completed).reduce((n, s) => n + STEP_XP[s.priority], 0);
  const fromChecks = steps.reduce((n, s) => n + tickedItems(s, i.checklist) * CHECK_XP, 0);
  return (
    fromSteps +
    fromChecks +
    completedPhases(i.plan).length * PHASE_XP +
    Math.min(i.savedEvents * EVENT_XP, MAX_EVENT_XP) +
    Math.min(i.questionsAsked * QUESTION_XP, MAX_QUESTION_XP) +
    (i.hasAvatar ? AVATAR_XP : 0) +
    (i.profile.name ? NAME_XP : 0)
  );
}

export interface Level {
  n: number;
  title: string;
  danish: string;
  min: number;
}

export const LEVELS: Level[] = [
  { n: 1, title: 'Tourist', danish: 'Turist', min: 0 },
  { n: 2, title: 'Newcomer', danish: 'Nytilflytter', min: 60 },
  { n: 3, title: 'Neighbour', danish: 'Nabo', min: 160 },
  { n: 4, title: 'Cyclist', danish: 'Cyklist', min: 300 },
  { n: 5, title: 'Hygge expert', danish: 'Hyggeekspert', min: 480 },
  { n: 6, title: 'Almost local', danish: 'Næsten lokal', min: 700 },
  { n: 7, title: 'Honorary Dane', danish: 'Æresdansker', min: 950 },
];

export interface LevelProgress {
  level: Level;
  next: Level | null;
  /** 0 to 1: how far from this level to the next. 1 at the top level. */
  progress: number;
  toNext: number;
}

export function levelFor(xp: number): LevelProgress {
  const level = [...LEVELS].reverse().find(l => xp >= l.min) ?? LEVELS[0];
  const next = LEVELS.find(l => l.min > xp) ?? null;
  if (!next) return { level, next: null, progress: 1, toNext: 0 };
  return { level, next, progress: (xp - level.min) / (next.min - level.min), toNext: next.min - xp };
}

export interface Badge {
  id: string;
  emoji: string;
  title: string;
  desc: string;
}

const done = (i: RewardInput, slug: string) => i.plan.some(s => s.slug === slug && s.completed);
const pct = (i: RewardInput) => {
  const a = activeSteps(i.plan);
  return a.length ? a.filter(s => s.completed).length / a.length : 0;
};

export const BADGES: (Badge & { earned: (i: RewardInput) => boolean })[] = [
  {
    id: 'first-step',
    emoji: '👣',
    title: 'First step',
    desc: 'Complete your first step',
    earned: i => i.plan.some(s => s.completed),
  },
  {
    id: 'home-base',
    emoji: '🏡',
    title: 'Home base',
    desc: 'Find a home you can register at',
    earned: i => i.profile.housing === 'settled' || done(i, 'housing'),
  },
  {
    id: 'officially-here',
    emoji: '🪪',
    title: 'Officially here',
    desc: 'Get your CPR number',
    earned: i => i.profile.has_cpr || done(i, 'cpr'),
  },
  {
    id: 'paper-trail',
    emoji: '📋',
    title: 'Paper trail',
    desc: 'Tick off every item on one checklist',
    earned: i =>
      activeSteps(i.plan).some(s => s.checklist.length > 1 && tickedItems(s, i.checklist) === s.checklist.length),
  },
  {
    id: 'digital-dane',
    emoji: '📱',
    title: 'Digital Dane',
    desc: 'Set up MitID and Digital Post',
    earned: i => done(i, 'mitid') && done(i, 'digital-post'),
  },
  {
    id: 'phase-cleared',
    emoji: '🎯',
    title: 'Phase cleared',
    desc: 'Finish a whole phase of your plan',
    earned: i => completedPhases(i.plan).length > 0,
  },
  { id: 'halfway', emoji: '⛵', title: 'Halfway there', desc: 'Finish half of your plan', earned: i => pct(i) >= 0.5 },
  {
    id: 'out-and-about',
    emoji: '🎟️',
    title: 'Out and about',
    desc: 'Save three events',
    earned: i => i.savedEvents >= 3,
  },
  {
    id: 'curious',
    emoji: '💬',
    title: 'Curious mind',
    desc: 'Ask Hej three questions',
    earned: i => i.questionsAsked >= 3,
  },
  { id: 'say-cheese', emoji: '📸', title: 'Say cheese', desc: 'Add a profile picture', earned: i => i.hasAvatar },
  {
    id: 'honorary-dane',
    emoji: '🇩🇰',
    title: 'Honorary Dane',
    desc: 'Complete your whole plan',
    earned: i => activeSteps(i.plan).length > 0 && pct(i) === 1,
  },
];

export const earnedBadges = (i: RewardInput): Badge[] => BADGES.filter(b => b.earned(i));

/** What changed between two moments, for celebrating: badges earned and whether a new level was reached. */
export function rewardChanges(before: RewardInput, after: RewardInput): { badges: Badge[]; levelUp: Level | null } {
  const had = new Set(earnedBadges(before).map(b => b.id));
  const badges = earnedBadges(after).filter(b => !had.has(b.id));
  const from = levelFor(xpFor(before)).level,
    to = levelFor(xpFor(after)).level;
  return { badges, levelUp: to.n > from.n ? to : null };
}
