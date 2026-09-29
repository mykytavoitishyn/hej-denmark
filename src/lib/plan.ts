import { PHASES, SOON, STEPS, URGENT } from '../data/plan.js';
import type { Office, Phase, PlanStep, PlanSummary, Priority, Profile, Step } from '../types.js';

/** Whether a step applies to this profile. A step with no conditions applies to everyone. */
export function appliesTo(step: Step, p: Profile): boolean {
  const a = step.applies_to;
  if (!a || Array.isArray(a) || typeof a !== 'object') return true;
  const vals: Record<string, unknown> = {
    move_reason: p.move_reason,
    residency_group: p.residency_group,
    city: p.city,
    has_cpr: p.has_cpr,
  };
  return Object.entries(a).every(([k, arr]) => !Array.isArray(arr) || (arr as unknown[]).includes(vals[k] ?? ''));
}

/** Builds one person's plan: the steps that apply to them, with progress and lock state. */
export function planFor(profile: Profile, done: ReadonlySet<number>): PlanStep[] {
  const inPlan = STEPS.filter(s => appliesTo(s, profile));
  const ids = new Set(inPlan.map(s => s.id));
  // A prerequisite that isn't in your plan (for example CPR when you already have one) counts as done.
  return inPlan.map(s => {
    const unmet = s.requires.filter(r => ids.has(r) && !done.has(r));
    return { ...s, completed: done.has(s.id), locked: unmet.length > 0, unmet };
  });
}

export const prio = (s: Pick<Step, 'slug'>): Priority =>
  URGENT.has(s.slug) ? 'Urgent' : SOON.has(s.slug) ? 'Soon' : 'Later';
const PRIO_RANK: Record<Priority, number> = { Urgent: 0, Soon: 1, Later: 2 };

export function journeyPhases(steps: PlanStep[]): Phase[] {
  const known = new Set(PHASES.flatMap(p => p.slugs));
  const out = PHASES.map(p => ({
    ...p,
    steps: p.slugs.map(sl => steps.find(s => s.slug === sl)).filter((s): s is PlanStep => Boolean(s)),
  })).filter(p => p.steps.length);
  const more = steps.filter(s => !known.has(s.slug));
  return more.length
    ? [...out, { id: 'more', title: 'More to explore', intro: 'Other useful steps', slugs: [], steps: more }]
    : out;
}

export function currentPhase(plan: PlanStep[]): Phase | null {
  const ph = journeyPhases(plan);
  return ph.find(p => p.steps.some(s => !s.completed)) ?? ph[ph.length - 1] ?? null;
}

/** The most urgent step that is neither done nor locked. Ties go to the earlier step in the plan. */
export function nextStep(plan: PlanStep[]): PlanStep | null {
  return (
    plan
      .map((step, index) => ({ step, index }))
      .filter(({ step }) => !step.completed && !step.locked)
      .sort((a, b) => PRIO_RANK[prio(a.step)] - PRIO_RANK[prio(b.step)] || a.index - b.index)[0]?.step ?? null
  );
}

export function planSummary(plan: PlanStep[]): PlanSummary {
  const completed = plan.filter(s => s.completed).length;
  return {
    completed,
    total: plan.length,
    percentage: plan.length ? Math.round((completed / plan.length) * 100) : 0,
    currentPhase: currentPhase(plan),
    nextStep: nextStep(plan),
  };
}

/** The citizen-service office for a step in a city, or null when none is listed or its URL is unusable. */
export function stepOffice(step: Step, city: string): Office | null {
  const o = (step.office_by_city as Record<string, Office | undefined>)[city];
  return o && typeof o.name === 'string' && /^https?:\/\//.test(o.url || '') ? o : null;
}
