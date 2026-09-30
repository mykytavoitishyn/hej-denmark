import type { BudgetExtra, BudgetHome, BudgetLevel, BudgetRole, BudgetTransport } from '../types.js';
import type { IconName } from './icons.js';

// Typical prices for Copenhagen, checked in September 2026. Sources:
// - Rent: BoligPortal via TV 2 Kosmopol (a two-room flat averages 13,800 kr in 2026) and the City of Copenhagen's
//   renting guide (international.kk.dk), which also gives the deposit and prepaid rent rules.
// - Bills: HOFOR's 2026 heating and water prices, and the 2026 cut in electricity tax (skm.dk, bolius.dk).
// - Transport: DOT fare sheet valid from 18 January 2026 (dinoffentligetransport.dk).
// - Tax: 2026 rates and limits (skat.dk), and Copenhagen's 2026 municipal tax rate (kk.dk).
// - SU: 2026 rate for students living away from their parents (su.dk).
// - Residence permit fees: SIRI's 2026 fees (nyidanmark.dk).
// - A-kasse: 2026 membership fees (a-kasser.dk). Food, going out and the rest are rounded typical prices.
export const PRICES_CHECKED = 'September 2026';

/** Shown on the page, so people can check the numbers that matter most for themselves. */
export const BUDGET_SOURCES: { label: string; by: string; url: string }[] = [
  {
    label: 'Average rents and deposit rules',
    by: 'City of Copenhagen',
    url: 'https://international.kk.dk/live/housing/finding-a-place-to-live/average-renting-costs',
  },
  {
    label: 'Two-room flats average 13,800 kr in 2026',
    by: 'BoligPortal, via TV 2 Kosmopol',
    url: 'https://www.tv2kosmopol.dk/metropolen/sa-meget-koster-en-lejlighed-med-to-vaerelser-i-omegnskommunerne-7671d',
  },
  {
    label: 'Public transport fares from 18 January 2026',
    by: 'DOT',
    url: 'https://dinoffentligetransport.dk/takst2026',
  },
  {
    label: 'Income tax rates and limits for 2026',
    by: 'Danish Tax Agency',
    url: 'https://skat.dk/hjaelp/bundskat-mellemskat-topskat-og-toptopskat',
  },
  {
    label: 'Copenhagen’s municipal tax: 23.39% in 2026',
    by: 'TV 2 Kosmopol',
    url: 'https://www.tv2kosmopol.dk/koebenhavn/kobenhavn-bliver-det-sted-i-landet-med-den-laveste-skat-2d241',
  },
  { label: 'SU rates and who can get SU', by: 'SU', url: 'https://www.su.dk/' },
  {
    label: 'Residence permit fees for 2026',
    by: 'SIRI',
    url: 'https://nyidanmark.dk/en-GB/News-Front-Page/2026/01/New-fee-rates-2026',
  },
];

/** The krone is pegged to the euro, so a fixed rate is close enough for a rough conversion. */
export const DKK_PER_EUR = 7.46;

export interface HomeOption {
  label: string;
  desc: string;
  icon: IconName;
  /** Typical rent for the whole home, and the range most homes of this kind fall in. */
  rent: number;
  range: [low: number, high: number];
  /** Heating, water, electricity and internet, for when they aren't part of the rent. */
  bills: number;
  billsIncluded: boolean;
  /** What we assume a landlord asks for up front, in months of rent. The legal maximum is 3 of each. */
  depositMonths: number;
  prepaidMonths: number;
  /** Furniture and kitchen basics, mostly second-hand. */
  furniture: number;
}

export const HOMES: Record<BudgetHome, HomeOption> = {
  dorm: {
    label: 'Dorm room',
    desc: 'Kollegium or youth housing',
    icon: 'BedDouble',
    rent: 4_500,
    range: [3_500, 6_000],
    bills: 250,
    billsIncluded: true,
    depositMonths: 2,
    prepaidMonths: 0,
    furniture: 3_000,
  },
  room: {
    label: 'Room in a shared flat',
    desc: 'Your own room, shared kitchen',
    icon: 'UsersRound',
    rent: 6_000,
    range: [4_500, 7_500],
    bills: 500,
    billsIncluded: true,
    depositMonths: 2,
    prepaidMonths: 1,
    furniture: 1_500,
  },
  studio: {
    label: 'Studio flat',
    desc: 'One room with a kitchen and bathroom',
    icon: 'KeyRound',
    rent: 9_000,
    range: [7_500, 11_000],
    bills: 950,
    billsIncluded: false,
    depositMonths: 3,
    prepaidMonths: 3,
    furniture: 8_000,
  },
  flat1: {
    label: 'One-bedroom flat',
    desc: 'Two rooms, about 55 m²',
    icon: 'House',
    rent: 13_500,
    range: [11_000, 16_000],
    bills: 1_200,
    billsIncluded: false,
    depositMonths: 3,
    prepaidMonths: 3,
    furniture: 12_000,
  },
  flat2: {
    label: 'Two-bedroom flat',
    desc: 'Three rooms, about 80 m²',
    icon: 'Building2',
    rent: 16_500,
    range: [14_000, 20_000],
    bills: 1_550,
    billsIncluded: false,
    depositMonths: 3,
    prepaidMonths: 3,
    furniture: 15_000,
  },
};

export interface BudgetChoice<T extends string> {
  value: T;
  label: string;
  desc: string;
  monthly: number;
  icon?: IconName;
}

export const TRANSPORT: BudgetChoice<BudgetTransport>[] = [
  { value: 'bike', label: 'Bike', desc: 'Upkeep and the odd metro ride', monthly: 150, icon: 'Bike' },
  { value: 'mix', label: 'Bike and metro', desc: 'Metro or bus a few times a week', monthly: 450, icon: 'Route' },
  { value: 'pass', label: 'Monthly pass', desc: '2 zones including the metro', monthly: 600, icon: 'TrainFront' },
];

export const FOOD: BudgetChoice<BudgetLevel>[] = [
  { value: 'low', label: 'Mostly cook', desc: 'Discount supermarkets and packed lunches', monthly: 2_300 },
  { value: 'mid', label: 'A mix', desc: 'Cook most days, some lunches and takeaway', monthly: 3_300 },
  { value: 'high', label: 'Eat out often', desc: 'Restaurants, takeaway and café lunches', monthly: 5_000 },
];

export const SOCIAL: BudgetChoice<BudgetLevel>[] = [
  { value: 'low', label: 'Quiet', desc: 'A few coffees and a film', monthly: 500 },
  { value: 'mid', label: 'Sometimes', desc: 'A night out every week or two', monthly: 1_200 },
  { value: 'high', label: 'Often', desc: 'Bars, concerts and dinners most weeks', monthly: 2_500 },
];

export const EXTRAS: { value: BudgetExtra; label: string; monthly: number; roles?: BudgetRole[] }[] = [
  { value: 'phone', label: 'Phone plan', monthly: 130 },
  { value: 'insurance', label: 'Contents insurance', monthly: 100 },
  { value: 'gym', label: 'Gym', monthly: 300 },
  { value: 'streaming', label: 'Streaming and apps', monthly: 150 },
  { value: 'trips', label: 'Trips home', monthly: 400 },
  { value: 'akasse', label: 'A-kasse', monthly: 530, roles: ['work'] },
];

/** Clothes, toiletries, cleaning and the other small things everyone buys. */
export const EVERYDAY = 700;
/** Books and study materials, spread over the month. */
export const STUDY_MATERIALS = 300;
/** A second-hand bike and a good lock. */
export const BIKE = 1_200;
/** SIRI's application fee for a residence permit, 2026. */
export const PERMIT_FEE: Record<BudgetRole, number> = { study: 3_060, work: 6_810 };

/** SU for students in higher education who live away from their parents, 2026, before tax. */
export const SU_MONTHLY = 7_426;
/** A typical hourly wage for a student job, used until someone enters their own. */
export const STUDENT_WAGE = 150;
/**
 * Students from outside the EU on a state-approved higher education programme may work this many hours a month,
 * and full time in June, July and August. The limit used to be 20 hours a week; it changed on 1 July 2024.
 */
export const NON_EU_STUDENT_MONTHLY_HOURS = 90;
export const STUDENT_WORK_RULES_URL =
  'https://www.nyidanmark.dk/en-GB/Words-and-concepts/SIRI/Work-permits-for-students-in-higher-educational-programmes';

/** Danish income tax for someone living in Copenhagen Municipality in 2026, not a member of the church. */
export const TAX = {
  year: 2026,
  /** Labour market contribution (AM-bidrag), taken from wages before anything else. */
  am: 0.08,
  personalAllowance: 54_100,
  bottom: 0.1201,
  municipal: 0.2339,
  middle: { rate: 0.075, over: 641_200 },
  top: { rate: 0.075, over: 777_900 },
  topTop: { rate: 0.05, over: 2_592_700 },
  /** Employment deduction (beskæftigelsesfradrag), worked out from wages before AM-bidrag. */
  employment: { rate: 0.1275, max: 63_300 },
  /** Job deduction (jobfradrag). */
  job: { rate: 0.045, over: 235_200, max: 3_100 },
  /** The researcher tax scheme: a flat rate for people hired from abroad on a high salary. */
  researcher: { rate: 0.27, minSalary: 65_400 },
} as const;
