import { describe, expect, it } from 'vitest';
import { profile } from '../../tests/helpers.js';
import { HOMES, PERMIT_FEE, SU_MONTHLY } from '../data/budget.js';
import type { BudgetInputs } from '../types.js';
import {
  afterTax,
  budgetDefaults,
  budgetProfileFields,
  estimateBudget,
  eur,
  kr,
  normalizeBudget,
  parseAmount,
  researcherAfterTax,
  withAmount,
  withChoice,
  withHome,
  withToggle,
  yearlyTax,
} from './budget.js';

const inputs = (over: Partial<BudgetInputs> = {}): BudgetInputs => ({ ...budgetDefaults(null), ...over });
const amountOf = (lines: { id: string; amount: number }[], id: string) => lines.find(l => l.id === id)?.amount;

describe('tax in Copenhagen, 2026', () => {
  it('works out a typical salary by the rules', () => {
    // 40,000 kr a month: 38,400 AM-bidrag, then municipal and bottom tax on what's left after the
    // employment deduction (61,200), job deduction (3,100) and personal allowance (54,100).
    expect(yearlyTax(480_000)).toBeCloseTo(160_535.23, 1);
    expect(Math.round(afterTax(40_000))).toBe(26_622);
  });

  it('adds middle tax above its limit', () => {
    // 720,000 kr a year is 662,400 after AM-bidrag, 21,200 over the middle tax limit.
    expect(yearlyTax(720_000)).toBeCloseTo(258_997.24, 1);
  });

  it('taxes SU without AM-bidrag or the employment deduction', () => {
    expect(Math.round(afterTax(0, SU_MONTHLY))).toBe(6_393);
  });

  it('charges only AM-bidrag while income is under the personal allowance', () => {
    expect(afterTax(3_000)).toBeCloseTo(2_760, 5);
    expect(afterTax(0)).toBe(0);
  });

  it('never takes more as income rises', () => {
    let last = 0;
    for (let salary = 0; salary <= 300_000; salary += 2_500) {
      const net = afterTax(salary);
      expect(net).toBeGreaterThanOrEqual(last);
      last = net;
    }
  });

  it('uses a flat rate on the researcher tax scheme', () => {
    expect(researcherAfterTax(70_000)).toBeCloseTo(47_012, 5);
  });
});

describe('budgetDefaults', () => {
  it('starts a student in a dorm room on a bike', () => {
    const b = budgetDefaults(profile({ move_reason: 'student', study_type: 'degree', job_status: null }));
    expect(b).toMatchObject({ role: 'study', home: 'dorm', rent: HOMES.dorm.rent, transport: 'bike', food: 'low' });
  });

  it('follows the profile: work, citizenship, arrival, partner and children', () => {
    expect(budgetDefaults(profile())).toMatchObject({ role: 'work', citizen: 'eu', arrived: true, home: 'flat1' });
    const family = budgetDefaults(profile({ residency_group: 'non-eu', stage: 'soon', household: 'partner-kids' }));
    expect(family).toMatchObject({ citizen: 'non-eu', arrived: false, shared: true, home: 'flat2' });
  });

  it('assumes a student who hasn’t arrived yet when there is no profile', () => {
    expect(budgetDefaults(null)).toMatchObject({ role: 'study', citizen: 'eu', arrived: false, shared: false });
  });
});

describe('estimateBudget', () => {
  it('adds up a student’s month, largest cost first', () => {
    const est = estimateBudget(inputs());
    expect(est.lines.map(l => l.id)).toEqual([
      'rent',
      'food',
      'social',
      'everyday',
      'study',
      'transport',
      'phone',
      'insurance',
    ]);
    expect(est.total).toBe(9_380);
    expect(est.total).toBe(est.lines.reduce((n, l) => n + l.amount, 0));
  });

  it('counts what it takes to move in, plus the first month before arriving', () => {
    const est = estimateBudget(inputs());
    expect(est.startup.map(l => [l.id, l.amount])).toEqual([
      ['deposit', 9_000],
      ['furniture', 3_000],
      ['bike', 1_200],
    ]);
    expect(est.haveReady).toBe(13_200 + 9_380);
    expect(estimateBudget(inputs({ arrived: true })).haveReady).toBe(13_200);
  });

  it('assumes the most a private landlord can ask for a flat: 3 months’ deposit and 3 prepaid', () => {
    const est = estimateBudget(withHome(inputs(), 'flat1'));
    expect(amountOf(est.startup, 'deposit')).toBe(3 * HOMES.flat1.rent);
    expect(amountOf(est.startup, 'prepaid')).toBe(3 * HOMES.flat1.rent);
    expect(amountOf(est.lines, 'bills')).toBe(HOMES.flat1.bills);
  });

  it('splits rent, bills and furniture with a partner', () => {
    const alone = estimateBudget(withHome(inputs(), 'flat1'));
    const together = estimateBudget(withHome(inputs({ shared: true }), 'flat1'));
    for (const id of ['rent', 'bills']) expect(amountOf(together.lines, id)).toBe((amountOf(alone.lines, id) ?? 0) / 2);
    expect(amountOf(together.startup, 'furniture')).toBe((amountOf(alone.startup, 'furniture') ?? 0) / 2);
    expect(together.lines.find(l => l.id === 'rent')?.note).toBe('Your half');
  });

  it('leaves out bills that are part of the rent', () => {
    const b = withHome(inputs(), 'studio');
    expect(amountOf(estimateBudget(b).lines, 'bills')).toBe(HOMES.studio.bills);
    expect(amountOf(estimateBudget({ ...b, billsIncluded: true }).lines, 'bills')).toBeUndefined();
  });

  it('skips the bike with a monthly pass', () => {
    expect(amountOf(estimateBudget(inputs({ transport: 'pass' })).startup, 'bike')).toBeUndefined();
  });

  it('adds the residence permit fee for people from outside the EU who haven’t arrived', () => {
    expect(amountOf(estimateBudget(inputs({ citizen: 'non-eu' })).startup, 'permit')).toBe(PERMIT_FEE.study);
    expect(amountOf(estimateBudget(inputs({ citizen: 'non-eu', role: 'work' })).startup, 'permit')).toBe(
      PERMIT_FEE.work,
    );
    expect(amountOf(estimateBudget(inputs({ citizen: 'non-eu', arrived: true })).startup, 'permit')).toBeUndefined();
    expect(amountOf(estimateBudget(inputs()).startup, 'permit')).toBeUndefined();
  });

  it('counts a-kasse only for people who work', () => {
    expect(amountOf(estimateBudget(inputs({ extras: ['akasse'] })).lines, 'akasse')).toBeUndefined();
    expect(amountOf(estimateBudget(inputs({ role: 'work', extras: ['akasse'] })).lines, 'akasse')).toBe(530);
  });

  it('shows no income until some is entered', () => {
    const est = estimateBudget(inputs());
    expect(est.income).toBeNull();
    expect(est.leftOver).toBeNull();
  });

  it('works out a salary after tax and what’s left over', () => {
    const est = estimateBudget(inputs({ role: 'work', salary: 40_000, otherIncome: 1_000 }));
    expect(est.income).toEqual({ gross: 40_000, net: 27_620, tax: 13_380, researcherBelowMin: false });
    expect(est.leftOver).toBe(27_620 - est.total);
  });

  it('applies the researcher tax scheme only above its minimum salary', () => {
    const on = estimateBudget(inputs({ role: 'work', salary: 70_000, researcher: true }));
    expect(on.income?.net).toBe(47_010);
    const low = estimateBudget(inputs({ role: 'work', salary: 50_000, researcher: true }));
    expect(low.income?.researcherBelowMin).toBe(true);
    expect(low.income?.net).toBe(Math.round(afterTax(50_000) / 10) * 10);
  });

  it('adds SU and a student job, taxed together', () => {
    const est = estimateBudget(inputs({ su: true, jobHours: 10, wage: 150 }));
    const wages = (10 * 150 * 52) / 12;
    expect(est.income?.gross).toBe(Math.round((SU_MONTHLY + wages) / 10) * 10);
    expect(est.income?.net).toBe(Math.round(afterTax(wages, SU_MONTHLY) / 10) * 10);
  });

  it('shows a shortfall as a negative amount left over', () => {
    const est = estimateBudget(inputs({ otherIncome: 5_000 }));
    expect(est.leftOver).toBe(5_000 - est.total);
    expect(est.leftOver).toBeLessThan(0);
  });
});

describe('withHome', () => {
  it('sets the typical rent and bills for the new kind of home', () => {
    const b = withHome(inputs({ rent: 5_200 }), 'studio');
    expect(b).toMatchObject({ home: 'studio', rent: HOMES.studio.rent, billsIncluded: false });
  });

  it('keeps a typed rent when the home doesn’t change', () => {
    const b = inputs({ rent: 5_200 });
    expect(withHome(b, 'dorm')).toBe(b);
  });
});

describe('changing answers', () => {
  it('applies choices and ignores values that aren’t on offer', () => {
    const b = inputs();
    expect(withChoice(b, 'food', 'high').food).toBe('high');
    expect(withChoice(b, 'arrived', 'yes').arrived).toBe(true);
    expect(withChoice(b, 'home', 'room')).toMatchObject({ home: 'room', rent: HOMES.room.rent });
    expect(withChoice(b, 'food', 'feast')).toEqual(b);
    expect(withChoice(b, 'arrived', 'maybe')).toEqual(b);
    expect(withChoice(b, 'rent', '1')).toBe(b);
  });

  it('switches settings and extras on and off', () => {
    const b = inputs();
    expect(withToggle(b, 'su').su).toBe(true);
    expect(withToggle(withToggle(b, 'gym'), 'gym').extras).toEqual(b.extras);
    expect(withToggle(b, 'phone').extras).not.toContain('phone');
    expect(withToggle(b, 'role')).toBe(b);
  });

  it('reads typed amounts into the right field', () => {
    const b = inputs();
    expect(withAmount(b, 'rent', '5 200').rent).toBe(5_200);
    expect(withAmount(b, 'jobHours', '90').jobHours).toBe(60);
    expect(withAmount(b, 'salary', '').salary).toBe(0);
    expect(withAmount(b, 'role', '1')).toBe(b);
  });

  it('takes who you are from the profile', () => {
    expect(budgetProfileFields(profile({ move_reason: 'family', household: 'partner', stage: 'planning' }))).toEqual({
      role: 'work',
      citizen: 'eu',
      arrived: false,
      shared: true,
    });
  });
});

describe('normalizeBudget', () => {
  it('keeps valid saved answers', () => {
    const b = inputs({ role: 'work', home: 'flat2', salary: 52_000, extras: ['gym', 'phone'] });
    expect(normalizeBudget(JSON.parse(JSON.stringify(b)))).toEqual(b);
  });

  it('replaces anything invalid with defaults and caps amounts', () => {
    const b = normalizeBudget({
      role: 'boss',
      home: 'castle',
      rent: -50,
      salary: 1e12,
      jobHours: 400,
      extras: ['gym', 'yacht', 'gym', 7],
      su: 'yes',
    });
    const d = budgetDefaults(null);
    expect(b).toMatchObject({ role: d.role, home: d.home, rent: 0, salary: 999_999, jobHours: 60, su: false });
    expect(b?.extras).toEqual(['gym']);
  });

  it('rejects anything that isn’t an object', () => {
    for (const raw of [null, 'budget', 42, []]) expect(normalizeBudget(raw)).toBeNull();
  });
});

describe('formatting', () => {
  it('reads amounts however they’re typed', () => {
    expect(parseAmount('9,500')).toBe(9_500);
    expect(parseAmount('9.500 kr')).toBe(9_500);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('abc')).toBe(0);
    expect(parseAmount('123456789')).toBe(999_999);
    expect(parseAmount('45', 40)).toBe(40);
  });

  it('writes kroner and rough euros', () => {
    expect(kr(9_380)).toBe('9,380 kr');
    expect(kr(12.6)).toBe('13 kr');
    expect(eur(9_380)).toBe('€1,260');
  });
});
