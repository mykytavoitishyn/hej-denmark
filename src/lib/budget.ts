import {
  BIKE,
  DKK_PER_EUR,
  EVERYDAY,
  EXTRAS,
  FOOD,
  HOMES,
  PERMIT_FEE,
  SOCIAL,
  STUDENT_WAGE,
  STUDY_MATERIALS,
  SU_MONTHLY,
  TAX,
  TRANSPORT,
} from '../data/budget.js';
import type { BudgetChoice } from '../data/budget.js';
import type {
  BudgetCitizen,
  BudgetExtra,
  BudgetHome,
  BudgetInputs,
  BudgetLevel,
  BudgetRole,
  Profile,
} from '../types.js';

export interface BudgetLine {
  id: string;
  label: string;
  amount: number;
  /** A few words on what's included or how it was worked out. */
  note?: string;
}

export interface BudgetIncome {
  /** Pay and SU before tax, a month. */
  gross: number;
  /** Everything that comes in after tax, a month, including money from savings or family. */
  net: number;
  /** AM-bidrag and income tax, a month. */
  tax: number;
  /** The researcher tax scheme was chosen, but the salary is below its minimum, so normal tax applies. */
  researcherBelowMin: boolean;
}

export interface BudgetEstimate {
  /** Monthly costs, largest first. Anything that comes to nothing is left out. */
  lines: BudgetLine[];
  total: number;
  /** One-off costs of moving in. */
  startup: BudgetLine[];
  startupTotal: number;
  /** Money to have ready: before arriving, the one-off costs plus the first month; after, the one-off costs. */
  haveReady: number;
  /** Null until some income is entered. */
  income: BudgetIncome | null;
  /** Income after tax minus monthly costs. Null without income. */
  leftOver: number | null;
}

const ROLES: readonly BudgetRole[] = ['study', 'work'];
const CITIZENS: readonly BudgetCitizen[] = ['eu', 'non-eu'];
const HOME_IDS = Object.keys(HOMES) as BudgetHome[];
const TRANSPORT_IDS = TRANSPORT.map(c => c.value);
const LEVELS: readonly BudgetLevel[] = ['low', 'mid', 'high'];
const EXTRA_IDS = EXTRAS.map(e => e.value);

/** The largest amount any field accepts, so a stray paste can't break the layout. */
export const MAX_AMOUNT = 999_999;
export const MAX_HOURS = 60;
const WEEKS_PER_MONTH = 52 / 12;

const round10 = (n: number): number => Math.round(n / 10) * 10;

/** Formats kroner the way the rest of the site writes numbers: “9,450 kr”. */
export const kr = (n: number): string => `${Math.round(n).toLocaleString('en-GB')} kr`;

/** A rough euro figure, rounded to the nearest 10: “€1,270”. */
export const eur = (n: number): string => `€${round10(n / DKK_PER_EUR).toLocaleString('en-GB')}`;

/** Reads a typed amount. Anything that isn't a digit is ignored, so “9.500 kr” and “9,500” both work. */
export function parseAmount(text: string, max = MAX_AMOUNT): number {
  const digits = text.replace(/\D/g, '').slice(0, 7);
  return digits ? Math.min(max, Number(digits)) : 0;
}

/**
 * AM-bidrag and income tax for a year in Copenhagen, for wages and SU before tax. Leaves out church tax, pension
 * and other deductions, so it's an estimate: close for most people, not a tax return.
 */
export function yearlyTax(wages: number, su = 0): number {
  const am = wages * TAX.am;
  const personal = wages - am + su;
  const employment = Math.min(wages * TAX.employment.rate, TAX.employment.max);
  const job = Math.min(Math.max(0, wages - TAX.job.over) * TAX.job.rate, TAX.job.max);
  const taxable = Math.max(0, personal - employment - job);
  // The personal allowance is used against municipal and bottom tax together, so what one can't use goes to the other.
  const base = Math.max(
    0,
    taxable * TAX.municipal + personal * TAX.bottom - TAX.personalAllowance * (TAX.municipal + TAX.bottom),
  );
  const above = (limit: { rate: number; over: number }) => Math.max(0, personal - limit.over) * limit.rate;
  return am + base + above(TAX.middle) + above(TAX.top) + above(TAX.topTop);
}

/** What's left of monthly wages and SU after tax. */
export function afterTax(wages: number, su = 0): number {
  if (wages <= 0 && su <= 0) return 0;
  return wages + su - yearlyTax(wages * 12, su * 12) / 12;
}

/** Monthly pay after tax on the researcher tax scheme: 8% AM-bidrag, then a flat 27%. */
export const researcherAfterTax = (salary: number): number => salary * (1 - TAX.am) * (1 - TAX.researcher.rate);

/** The answers a profile already gives. With a profile, these always come from it, so every screen agrees. */
export function budgetProfileFields(p: Profile): Pick<BudgetInputs, 'role' | 'citizen' | 'arrived' | 'shared'> {
  return {
    role: p.move_reason === 'student' ? 'study' : 'work',
    citizen: p.residency_group === 'non-eu' ? 'non-eu' : 'eu',
    arrived: p.stage === 'arrived',
    shared: p.household === 'partner' || p.household === 'partner-kids',
  };
}

/** Without a profile, start from a student who hasn't moved yet. The first questions on the page change this. */
const NO_PROFILE = { role: 'study', citizen: 'eu', arrived: false, shared: false } as const;

/** Starting answers, filled in from the profile where it tells us something. */
export function budgetDefaults(p: Profile | null): BudgetInputs {
  const who = p ? budgetProfileFields(p) : NO_PROFILE;
  const { role } = who;
  const kids = p?.household === 'kids' || p?.household === 'partner-kids';
  const home: BudgetHome = kids ? 'flat2' : role === 'study' ? 'dorm' : 'flat1';
  return {
    ...who,
    home,
    rent: HOMES[home].rent,
    billsIncluded: HOMES[home].billsIncluded,
    transport: role === 'study' ? 'bike' : 'mix',
    food: role === 'study' ? 'low' : 'mid',
    social: 'mid',
    extras: ['phone', 'insurance'],
    other: 0,
    salary: 0,
    researcher: false,
    su: false,
    jobHours: 0,
    wage: STUDENT_WAGE,
    otherIncome: 0,
  };
}

/** Switches the kind of home, with the typical rent for it and whether bills are usually included. */
export function withHome(b: BudgetInputs, home: BudgetHome): BudgetInputs {
  if (b.home === home) return b;
  return { ...b, home, rent: HOMES[home].rent, billsIncluded: HOMES[home].billsIncluded };
}

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
const amount = (v: unknown, fallback: number, max = MAX_AMOUNT): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(0, Math.round(v))) : fallback;
const flag = (v: unknown, fallback: boolean): boolean => (typeof v === 'boolean' ? v : fallback);
const yesNo = (v: string, fallback: boolean): boolean => (v === 'yes' ? true : v === 'no' ? false : fallback);

/** Applies an answer picked from one of the calculator's choices. Unknown questions and values change nothing. */
export function withChoice(b: BudgetInputs, key: string, value: string): BudgetInputs {
  switch (key) {
    case 'role':
      return { ...b, role: oneOf(value, ROLES, b.role) };
    case 'citizen':
      return { ...b, citizen: oneOf(value, CITIZENS, b.citizen) };
    case 'arrived':
      return { ...b, arrived: yesNo(value, b.arrived) };
    case 'shared':
      return { ...b, shared: yesNo(value, b.shared) };
    case 'home':
      return withHome(b, oneOf(value, HOME_IDS, b.home));
    case 'transport':
      return { ...b, transport: oneOf(value, TRANSPORT_IDS, b.transport) };
    case 'food':
      return { ...b, food: oneOf(value, LEVELS, b.food) };
    case 'social':
      return { ...b, social: oneOf(value, LEVELS, b.social) };
    default:
      return b;
  }
}

const SWITCHES = ['billsIncluded', 'researcher', 'su'] as const;

/** Turns a yes/no setting or an extra cost on or off. */
export function withToggle(b: BudgetInputs, key: string): BudgetInputs {
  const sw = SWITCHES.find(s => s === key);
  if (sw) return { ...b, [sw]: !b[sw] };
  const extra = EXTRA_IDS.find(e => e === key);
  if (!extra) return b;
  return { ...b, extras: b.extras.includes(extra) ? b.extras.filter(e => e !== extra) : [...b.extras, extra] };
}

export const AMOUNT_FIELDS = ['rent', 'other', 'salary', 'jobHours', 'wage', 'otherIncome'] as const;
export type BudgetAmountField = (typeof AMOUNT_FIELDS)[number];

/** Applies a typed amount. */
export function withAmount(b: BudgetInputs, key: string, text: string): BudgetInputs {
  const field = AMOUNT_FIELDS.find(f => f === key);
  if (!field) return b;
  return { ...b, [field]: parseAmount(text, field === 'jobHours' ? MAX_HOURS : MAX_AMOUNT) };
}

/** Reads saved answers. Stored data is untrusted, so each field is checked and anything odd falls back to a default. */
export function normalizeBudget(raw: unknown): BudgetInputs | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  const d = budgetDefaults(null);
  return {
    role: oneOf(r.role, ROLES, d.role),
    citizen: oneOf(r.citizen, CITIZENS, d.citizen),
    arrived: flag(r.arrived, d.arrived),
    shared: flag(r.shared, d.shared),
    home: oneOf(r.home, HOME_IDS, d.home),
    rent: amount(r.rent, d.rent),
    billsIncluded: flag(r.billsIncluded, d.billsIncluded),
    transport: oneOf(r.transport, TRANSPORT_IDS, d.transport),
    food: oneOf(r.food, LEVELS, d.food),
    social: oneOf(r.social, LEVELS, d.social),
    extras: Array.isArray(r.extras)
      ? [...new Set(r.extras.filter((x): x is BudgetExtra => EXTRA_IDS.includes(x as BudgetExtra)))]
      : d.extras,
    other: amount(r.other, d.other),
    salary: amount(r.salary, d.salary),
    researcher: flag(r.researcher, d.researcher),
    su: flag(r.su, d.su),
    jobHours: amount(r.jobHours, d.jobHours, MAX_HOURS),
    wage: amount(r.wage, d.wage),
    otherIncome: amount(r.otherIncome, d.otherIncome),
  };
}

const pick = <T extends string>(list: BudgetChoice<T>[], value: T): BudgetChoice<T> =>
  list.find(c => c.value === value) ?? list[0];
const sum = (lines: BudgetLine[]): number => lines.reduce((n, l) => n + l.amount, 0);
const months = (n: number): string => `${n} ${n === 1 ? 'month' : 'months'} of rent`;

function incomeFor(b: BudgetInputs): BudgetIncome | null {
  if (b.role === 'study') {
    const su = b.su ? SU_MONTHLY : 0;
    const wages = b.jobHours * b.wage * WEEKS_PER_MONTH;
    if (su + wages + b.otherIncome <= 0) return null;
    const net = afterTax(wages, su);
    return {
      gross: round10(su + wages),
      net: round10(net + b.otherIncome),
      tax: round10(su + wages - net),
      researcherBelowMin: false,
    };
  }
  if (b.salary + b.otherIncome <= 0) return null;
  const researcher = b.researcher && b.salary >= TAX.researcher.minSalary;
  const net = researcher ? researcherAfterTax(b.salary) : afterTax(b.salary);
  return {
    gross: b.salary,
    net: round10(net + b.otherIncome),
    tax: round10(b.salary - net),
    researcherBelowMin: b.researcher && b.salary > 0 && !researcher,
  };
}

/** The whole estimate: monthly costs, what moving in costs, income after tax and what's left over. */
export function estimateBudget(b: BudgetInputs): BudgetEstimate {
  const home = HOMES[b.home];
  const share = b.shared ? 0.5 : 1;
  const rent = Math.round(b.rent * share);
  const extras = EXTRAS.filter(e => b.extras.includes(e.value) && (!e.roles || e.roles.includes(b.role)));
  const lines: BudgetLine[] = [
    { id: 'rent', label: 'Rent', amount: rent, note: b.shared ? 'Your half' : undefined },
    {
      id: 'bills',
      label: 'Bills',
      amount: b.billsIncluded ? 0 : Math.round(home.bills * share),
      note: 'Heating, water, power and internet',
    },
    { id: 'food', label: 'Food', amount: pick(FOOD, b.food).monthly },
    { id: 'transport', label: 'Getting around', amount: pick(TRANSPORT, b.transport).monthly },
    { id: 'social', label: 'Going out', amount: pick(SOCIAL, b.social).monthly },
    { id: 'everyday', label: 'Everyday things', amount: EVERYDAY, note: 'Clothes, toiletries and cleaning' },
    { id: 'study', label: 'Books and materials', amount: b.role === 'study' ? STUDY_MATERIALS : 0 },
    ...extras.map(e => ({ id: e.value, label: e.label, amount: e.monthly })),
    { id: 'other', label: 'Other costs', amount: b.other },
  ]
    .filter(l => l.amount > 0)
    .sort((x, y) => y.amount - x.amount);
  const total = sum(lines);
  const startup: BudgetLine[] = [
    { id: 'deposit', label: 'Deposit', amount: rent * home.depositMonths, note: months(home.depositMonths) },
    { id: 'prepaid', label: 'Prepaid rent', amount: rent * home.prepaidMonths, note: months(home.prepaidMonths) },
    {
      id: 'furniture',
      label: 'Furniture and kitchen basics',
      amount: Math.round(home.furniture * share),
      note: 'Mostly second-hand',
    },
    { id: 'bike', label: 'A bike and a lock', amount: b.transport === 'pass' ? 0 : BIKE, note: 'Second-hand' },
    {
      id: 'permit',
      label: 'Residence permit fee',
      amount: b.citizen === 'non-eu' && !b.arrived ? PERMIT_FEE[b.role] : 0,
      note: `SIRI, ${TAX.year}`,
    },
  ].filter(l => l.amount > 0);
  const startupTotal = sum(startup);
  const income = incomeFor(b);
  return {
    lines,
    total,
    startup,
    startupTotal,
    haveReady: startupTotal + (b.arrived ? 0 : total),
    income,
    leftOver: income ? income.net - total : null,
  };
}
