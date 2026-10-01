// Real journeys, end to end: what each person's plan shows, what unlocks when, and what Ask Hej tells them.
import { beforeEach, describe, expect, it } from 'vitest';
import { profile, resetApp, signIn } from '../../tests/helpers.js';
import { STEPS } from '../data/plan.js';
import { afterProfileChange } from '../state/session.js';
import { S } from '../state/state.js';
import type { PlanStep, Profile } from '../types.js';
import { offlineAnswer } from './assistant.js';
import { planFor } from './plan.js';
import { normalizeProfile } from './profile.js';

const idOf = (slug: string) => STEPS.find(s => s.slug === slug)?.id ?? -1;
const step = (plan: PlanStep[], slug: string) => plan.find(s => s.slug === slug);

/** Two exchange students in Copenhagen who arrived this term: one has a CPR number, the other has booked one. */
const exchange = (over: Partial<Profile>): Profile =>
  profile({
    move_reason: 'student',
    study_type: 'exchange',
    job_status: null,
    residency_group: 'eu-eea',
    stage: 'arrived',
    housing: 'temporary',
    ...over,
  });
const withCpr = exchange({ has_cpr: true, cpr_stage: 'have' });
const booked = exchange({ has_cpr: false, cpr_stage: 'booked', housing: 'searching' });

describe('two exchange students and housing benefit', () => {
  it('shows housing benefit to both, and it opens once they have a home, a CPR number and MitID', () => {
    const a = planFor(withCpr, new Set());
    expect(step(a, 'cpr')).toBeUndefined();
    expect(step(a, 'housing-benefit')).toMatchObject({ locked: true, unmet: [idOf('housing'), idOf('mitid')] });
    const aLater = planFor(withCpr, new Set([idOf('housing'), idOf('mitid')]));
    expect(step(aLater, 'housing-benefit')?.locked).toBe(false);

    const b = planFor(booked, new Set());
    expect(step(b, 'cpr')?.priority).toBe('Urgent');
    expect(step(b, 'housing-benefit')?.unmet).toEqual([idOf('housing'), idOf('cpr'), idOf('mitid')]);
  });

  it('explains the rules and what to check, with official links', () => {
    const s = STEPS.find(x => x.slug === 'housing-benefit');
    expect(s?.checklist.map(c => c.id)).toEqual(['kitchen', 'registered', 'lease', 'apply', 'changes']);
    expect(s?.official_links.map(l => new URL(l.url).hostname)).toEqual(['lifeindenmark.borger.dk', 'www.borger.dk']);
  });

  it('warns a student from outside the EU off it instead, since it can cost them their permit', () => {
    const plan = planFor(exchange({ residency_group: 'non-eu' }), new Set());
    expect(step(plan, 'housing-benefit')).toBeUndefined();
    expect(step(plan, 'student-work')?.checklist.map(c => c.id)).toContain('benefits');
    const answer = offlineAnswer('Can I get housing benefit?', exchange({ residency_group: 'non-eu' }), plan);
    expect(answer.answer).toContain('not allowed to receive housing benefit');
    expect(answer.sources[0].url).toContain('nyidanmark.dk');
  });

  it('tells each EU student what they still need before applying', () => {
    const withAnswer = offlineAnswer('How do I apply for boligstøtte?', withCpr, planFor(withCpr, new Set()));
    expect(withAnswer.answer).toContain('own kitchen or kitchenette');
    expect(withAnswer.answer).not.toContain('CPR number first');
    const bookedAnswer = offlineAnswer('Can I get housing benefit?', booked, planFor(booked, new Set()));
    expect(bookedAnswer.answer).toContain('You need your CPR number first');
  });
});

describe('deposit rules', () => {
  it('puts the rules in the plan of anyone looking for a home, before they sign', () => {
    const plan = planFor(booked, new Set());
    expect(step(plan, 'deposit')).toMatchObject({ locked: false, priority: 'Soon' });
    expect(step(planFor(exchange({ housing: 'settled' }), new Set()), 'deposit')).toBeUndefined();
  });

  it('answers deposit questions with the limits, the 14 days and where to complain', () => {
    const res = offlineAnswer('How much deposit can my landlord ask for?', booked, []);
    expect(res.answer).toContain('3 months’ rent');
    expect(res.answer).toContain('within 14 days');
    expect(res.answer).toContain('huslejenævnet');
  });
});

describe('CPR stages', () => {
  beforeEach(() => resetApp());

  it('reads profiles saved before CPR stages existed', () => {
    const old = { ...withCpr } as Record<string, unknown>;
    delete old.cpr_stage;
    expect(normalizeProfile(old)).toMatchObject({ has_cpr: true, cpr_stage: 'have' });
    expect(normalizeProfile({ ...old, has_cpr: false })).toMatchObject({ has_cpr: false, cpr_stage: 'none' });
    expect(normalizeProfile({ ...old, cpr_stage: 'waiting' })).toMatchObject({ has_cpr: false, cpr_stage: 'waiting' });
  });

  it('ticks the booking once an appointment is booked, and every item once someone has been to it', () => {
    signIn(booked);
    const cprId = String(idOf('cpr'));
    expect(S.checklist[cprId]).toEqual(['book']);
    S.profile = { ...booked, cpr_stage: 'waiting' };
    afterProfileChange();
    expect(S.checklist[cprId]).toEqual(STEPS.find(s => s.slug === 'cpr')?.checklist.map(c => c.id));
    expect(S.plan.find(s => s.slug === 'cpr')?.completed).toBe(false);
  });
});
