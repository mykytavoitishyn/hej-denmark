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
    stage: p.stage,
    housing: p.housing,
    household: p.household,
    study_type: p.study_type,
    job_status: p.job_status,
  };
  return Object.entries(a).every(([k, arr]) => !Array.isArray(arr) || (arr as unknown[]).includes(vals[k] ?? ''));
}

/** A step's usual priority, before anything about the person is taken into account. */
export const basePriority = (s: Pick<Step, 'slug'>): Priority =>
  URGENT.has(s.slug) ? 'Urgent' : SOON.has(s.slug) ? 'Soon' : 'Later';

/** How pressing a step is for this person. A few steps depend on their situation. */
export function priorityFor(s: Pick<Step, 'slug'>, p: Profile): Priority {
  switch (s.slug) {
    case 'housing':
      return p.housing === 'searching' ? 'Urgent' : 'Soon';
    case 'tax':
      return p.move_reason === 'work' && p.job_status !== 'looking' ? 'Urgent' : 'Later';
    case 'documents':
      return p.stage === 'soon' ? 'Urgent' : 'Soon';
    case 'ehic':
      return p.stage === 'soon' ? 'Soon' : 'Later';
    default:
      return basePriority(s);
  }
}

/**
 * Builds one person's plan: the steps that apply to them, with progress, skip and lock state.
 * A prerequisite that isn't in the plan (CPR when you already have one) or that was skipped counts as met.
 */
export function planFor(
  profile: Profile,
  done: ReadonlySet<number>,
  skipped: ReadonlySet<number> = new Set(),
): PlanStep[] {
  const inPlan = STEPS.filter(s => appliesTo(s, profile));
  const ids = new Set(inPlan.map(s => s.id));
  return inPlan.map(s => {
    const unmet = s.requires.filter(r => ids.has(r) && !done.has(r) && !skipped.has(r));
    const isSkipped = skipped.has(s.id) && !done.has(s.id);
    return {
      ...s,
      completed: done.has(s.id),
      skipped: isSkipped,
      locked: unmet.length > 0,
      unmet,
      priority: priorityFor(s, profile),
    };
  });
}

/** A step's priority: the personal one for plan steps, the usual one otherwise. */
export const prio = (s: Pick<Step, 'slug'> & { priority?: Priority }): Priority => s.priority ?? basePriority(s);
const PRIO_RANK: Record<Priority, number> = { Urgent: 0, Soon: 1, Later: 2 };

/** The steps that count: everything except skipped steps. */
export const activeSteps = (plan: PlanStep[]): PlanStep[] => plan.filter(s => !s.skipped);

export function journeyPhases(steps: PlanStep[]): Phase[] {
  const known = new Set(PHASES.flatMap(p => p.slugs));
  const out = PHASES.map(p => ({
    ...p,
    steps: p.slugs.map(sl => steps.find(s => s.slug === sl)).filter((s): s is PlanStep => Boolean(s)),
  })).filter(p => p.steps.length);
  const more = steps.filter(s => !known.has(s.slug));
  return more.length
    ? [
        ...out,
        { id: 'more', title: 'More to explore', intro: 'Other useful steps', icon: 'Compass', slugs: [], steps: more },
      ]
    : out;
}

/** The first phase with work left, or the last phase once everything is done. */
export function currentPhase(plan: PlanStep[]): Phase | null {
  const ph = journeyPhases(activeSteps(plan));
  return ph.find(p => p.steps.some(s => !s.completed)) ?? ph[ph.length - 1] ?? null;
}

/** Steps that can be done now, most urgent first. Ties go to the earlier step in the plan. */
export function actionableSteps(plan: PlanStep[]): PlanStep[] {
  return plan
    .map((step, index) => ({ step, index }))
    .filter(({ step }) => !step.completed && !step.locked && !step.skipped)
    .sort((a, b) => PRIO_RANK[prio(a.step)] - PRIO_RANK[prio(b.step)] || a.index - b.index)
    .map(({ step }) => step);
}

/** The most urgent step that is neither done, skipped nor locked. */
export function nextStep(plan: PlanStep[]): PlanStep | null {
  return actionableSteps(plan)[0] ?? null;
}

export function planSummary(plan: PlanStep[]): PlanSummary {
  const active = activeSteps(plan);
  const completed = active.filter(s => s.completed).length;
  return {
    completed,
    total: active.length,
    percentage: active.length ? Math.round((completed / active.length) * 100) : 0,
    currentPhase: currentPhase(plan),
    nextStep: nextStep(plan),
  };
}

/** The steps in the plan that wait for this one. */
export function unlocksOf(step: Pick<Step, 'id'>, plan: PlanStep[]): PlanStep[] {
  return plan.filter(s => s.requires.includes(step.id) && !s.skipped);
}

/** The citizen-service office for a step in a city, or null when none is listed or its URL is unusable. */
export function stepOffice(step: Step, city: string): Office | null {
  const o = (step.office_by_city as Record<string, Office | undefined>)[city];
  return o && typeof o.name === 'string' && /^https?:\/\//.test(o.url || '') ? o : null;
}
