import { describe, expect, it } from 'vitest';
import { profile } from '../../tests/helpers.js';
import { STEPS } from '../data/plan.js';
import type { PlanStep } from '../types.js';
import { appliesTo, currentPhase, journeyPhases, nextStep, planFor, planSummary, prio, stepOffice } from './plan.js';

const slugs = (plan: PlanStep[]) => plan.map(s => s.slug);
const bySlug = (slug: string) => {
  const step = STEPS.find(s => s.slug === slug);
  if (!step) throw new Error(`No step ${slug}`);
  return step;
};
const idOf = (slug: string) => bySlug(slug).id;

describe('planFor', () => {
  it('keeps only the steps that apply to a non-EU student without a CPR number', () => {
    const plan = planFor(profile({ move_reason: 'student', residency_group: 'non-eu' }), new Set());
    expect(slugs(plan)).toEqual([
      'residence-documents',
      'student-arrival',
      'housing',
      'cpr',
      'banking',
      'city-services',
    ]);
  });

  it('swaps CPR-only steps in once someone has a CPR number', () => {
    const plan = planFor(profile({ has_cpr: true }), new Set());
    expect(slugs(plan)).toEqual([
      'eu-residence',
      'work-documents',
      'housing',
      'health-card',
      'mitid',
      'digital-post',
      'tax',
      'banking',
      'city-services',
    ]);
  });

  it('locks steps behind an unfinished prerequisite that is in the plan', () => {
    const banking = planFor(profile(), new Set()).find(s => s.slug === 'banking');
    expect(banking).toMatchObject({ locked: true, unmet: [idOf('cpr')] });
  });

  it('unlocks a step once its prerequisite is done', () => {
    const plan = planFor(profile(), new Set([idOf('cpr')]));
    expect(plan.find(s => s.slug === 'banking')).toMatchObject({ locked: false, unmet: [] });
    expect(plan.find(s => s.slug === 'cpr')?.completed).toBe(true);
  });

  it('treats a prerequisite that is not in the plan as done', () => {
    // MitID needs a CPR number, but people who already have one never see the CPR step.
    const mitid = planFor(profile({ has_cpr: true }), new Set()).find(s => s.slug === 'mitid');
    expect(mitid).toMatchObject({ locked: false, unmet: [] });
  });
});

describe('appliesTo', () => {
  it('applies steps with no conditions to everyone', () => {
    expect(appliesTo(bySlug('housing'), profile({ move_reason: 'other', residency_group: 'non-eu' }))).toBe(true);
  });

  it('checks every condition on the step', () => {
    expect(appliesTo(bySlug('cpr'), profile({ has_cpr: false }))).toBe(true);
    expect(appliesTo(bySlug('cpr'), profile({ has_cpr: true }))).toBe(false);
    expect(appliesTo(bySlug('tax'), profile({ move_reason: 'student' }))).toBe(false);
  });
});

describe('prio', () => {
  it('ranks steps as Urgent, Soon or Later', () => {
    expect(prio(bySlug('cpr'))).toBe('Urgent');
    expect(prio(bySlug('tax'))).toBe('Soon');
    expect(prio(bySlug('city-services'))).toBe('Later');
  });
});

describe('nextStep', () => {
  const ids = (...s: string[]) => new Set(s.map(idOf));

  it('picks the earliest urgent step first', () => {
    expect(nextStep(planFor(profile(), new Set()))?.slug).toBe('eu-residence');
  });

  it('moves on as steps are completed and prefers Soon over Later', () => {
    const done = ids('eu-residence', 'housing', 'cpr');
    expect(nextStep(planFor(profile(), done))?.slug).toBe('work-documents');
  });

  it('skips locked steps', () => {
    const done = ids('eu-residence', 'work-documents', 'housing', 'tax', 'city-services');
    // Banking (Soon) is still locked behind CPR, so CPR comes first.
    expect(nextStep(planFor(profile(), done))?.slug).toBe('cpr');
  });

  it('returns null when everything is done or the plan is empty', () => {
    const plan = planFor(profile(), new Set());
    expect(nextStep(planFor(profile(), new Set(plan.map(s => s.id))))).toBeNull();
    expect(nextStep([])).toBeNull();
  });
});

describe('journeyPhases', () => {
  it('groups steps into phases in journey order and drops empty phases', () => {
    const phases = journeyPhases(planFor(profile(), new Set()));
    expect(phases.map(p => p.id)).toEqual(['prepare', 'first-weeks', 'digital-life']);
    expect(phases[0].steps.map(s => s.slug)).toEqual(['eu-residence', 'work-documents', 'housing']);
    expect(journeyPhases(planFor(profile(), new Set()).filter(s => s.slug === 'city-services')).map(p => p.id)).toEqual(
      ['first-weeks'],
    );
  });

  it('collects steps that belong to no phase under “More to explore”', () => {
    const plan = planFor(profile(), new Set());
    const extra: PlanStep = { ...plan[0], id: 999, slug: 'something-new' };
    const phases = journeyPhases([...plan, extra]);
    expect(phases.at(-1)).toMatchObject({ id: 'more', title: 'More to explore' });
    expect(phases.at(-1)?.steps).toEqual([extra]);
  });
});

describe('currentPhase and planSummary', () => {
  it('finds the first phase with work left', () => {
    const plan = planFor(profile(), new Set([idOf('eu-residence'), idOf('work-documents'), idOf('housing')]));
    expect(currentPhase(plan)?.id).toBe('first-weeks');
  });

  it('falls back to the last phase when everything is done, and to null for an empty plan', () => {
    const all = planFor(profile(), new Set());
    const done = planFor(profile(), new Set(all.map(s => s.id)));
    expect(currentPhase(done)?.id).toBe('digital-life');
    expect(currentPhase([])).toBeNull();
  });

  it('summarises progress', () => {
    const summary = planSummary(planFor(profile(), new Set([idOf('eu-residence')])));
    expect(summary).toMatchObject({ completed: 1, total: 7, percentage: 14 });
    expect(summary.nextStep?.slug).toBe('housing');
  });

  it('reports 0% for an empty plan instead of dividing by zero', () => {
    expect(planSummary([])).toMatchObject({ completed: 0, total: 0, percentage: 0, nextStep: null });
  });
});

describe('stepOffice', () => {
  it('returns the office listed for a city', () => {
    expect(stepOffice(bySlug('cpr'), 'copenhagen')?.name).toBe('International House Copenhagen');
  });

  it('returns null for a city without one', () => {
    expect(stepOffice(bySlug('cpr'), 'other')).toBeNull();
  });

  it('ignores offices whose link is not a web address', () => {
    const step = { ...bySlug('cpr'), office_by_city: { copenhagen: { name: 'X', url: 'javascript:alert(1)' } } };
    expect(stepOffice(step, 'copenhagen')).toBeNull();
  });
});
