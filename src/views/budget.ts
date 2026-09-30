import {
  BIKE,
  BUDGET_SOURCES,
  EXTRAS,
  FOOD,
  HOMES,
  NON_EU_STUDENT_MONTHLY_HOURS,
  PRICES_CHECKED,
  SOCIAL,
  STUDENT_WAGE,
  STUDENT_WORK_RULES_URL,
  SU_MONTHLY,
  TAX,
  TRANSPORT,
} from '../data/budget.js';
import type { BudgetChoice } from '../data/budget.js';
import type { IconName } from '../data/icons.js';
import { cityName } from '../data/labels.js';
import { budgetDefaults, budgetProfileFields, estimateBudget, eur, kr } from '../lib/budget.js';
import type { BudgetAmountField, BudgetEstimate, BudgetLine } from '../lib/budget.js';
import { esc, ext, icon } from '../lib/dom.js';
import { S } from '../state/state.js';
import type { BudgetHome, BudgetInputs, Choice, Profile, RouteName } from '../types.js';
import { goLink, options, toastHTML } from './shared.js';

/** The saved answers, filled in from the profile the first time the calculator opens. */
export function ensureBudget(): BudgetInputs {
  if (!S.bud) S.bud = budgetDefaults(S.profile);
  return S.bud;
}

/** The answers to calculate with. With a profile, who you are comes from it, so the plan and the budget agree. */
export function currentBudget(): BudgetInputs {
  const b = ensureBudget();
  return S.profile ? { ...b, ...budgetProfileFields(S.profile) } : b;
}

const num = (n: number): string => n.toLocaleString('en-GB');
const krRange = ([low, high]: [number, number]): string => `${num(low)}–${kr(high)}`;
const isFlat = (home: BudgetHome): boolean => home === 'studio' || home === 'flat1' || home === 'flat2';
const RESEARCHER_TOTAL = (1 - (1 - TAX.am) * (1 - TAX.researcher.rate)) * 100;
const AKASSE = EXTRAS.find(e => e.value === 'akasse')?.monthly ?? 0;

/** A typed amount as its field shows it: “4,500”, or empty for nothing. */
export const fieldValue = (b: BudgetInputs, key: BudgetAmountField): string => (b[key] ? num(b[key]) : '');

const priced = <T extends string>(list: BudgetChoice<T>[]): Choice[] =>
  list.map(c => ({ value: c.value, label: c.label, desc: c.desc, aside: kr(c.monthly), icon: c.icon }));

const question = (id: string, title: string, body: string): string =>
  `<div class="bud-q"><h3 class="bud-q-title" id="${id}">${title}</h3>${body}</div>`;

const toggle = (id: string, label: string, on: boolean, hintId: string): string =>
  `<button type="button" class="chip bud-switch" data-act="bud-toggle" data-id="${id}" aria-pressed="${on}" aria-describedby="${hintId}">${icon(on ? 'SquareCheckBig' : 'Square', 16)}<span>${label}</span></button>`;

/** A number field with its unit beside it. The unit is read out as part of the label. */
function amountField(
  b: BudgetInputs,
  key: BudgetAmountField,
  id: string,
  label: string,
  unit: string,
  hint = '',
  placeholder = '0',
): string {
  const hintId = `${id}-hint`;
  return `<div class="bud-field">
    <label class="strong small" for="${id}">${label}<span class="sr-only">, ${unit}</span></label>
    <div class="money"><input id="${id}" class="input" type="text" inputmode="numeric" autocomplete="off" maxlength="9" data-bud="${key}" value="${fieldValue(b, key)}" placeholder="${esc(placeholder)}"${hint ? ` aria-describedby="${hintId}"` : ''}><span class="money-unit" aria-hidden="true">${unit}</span></div>
    ${hint ? `<p class="tiny muted" id="${hintId}">${hint}</p>` : ''}
  </div>`;
}

/** A short, personal pointer to what matters most right now, following where the person is in their move. */
function advice(b: BudgetInputs, p: Profile | null): string {
  const lines: string[] = [];
  if (!b.arrived)
    lines.push(
      isFlat(b.home)
        ? 'Before you move, save for getting the keys: a private landlord can ask for up to six months’ rent up front.'
        : 'Before you move, set aside the deposit and your first month. Dorms and rooms usually ask for less up front than flats.',
    );
  else if (p && p.housing !== 'settled')
    lines.push('You’re here and still looking for a home, so check what moving in costs further down.');
  else lines.push('You’re here, so this is about your monthly numbers and what you can put aside.');
  if (b.role === 'study' && isFlat(b.home))
    lines.push('A dorm or a room in a shared flat costs far less than a flat of your own.');
  if (b.role === 'work' && !b.salary) lines.push('Add your salary to see your take-home pay after Danish tax.');
  if (p && p.city !== 'copenhagen')
    lines.push(`These prices are for Copenhagen. Rent in ${cityName(p.city, 'most of Denmark')} is usually lower.`);
  if (p && (p.household === 'kids' || p.household === 'partner-kids'))
    lines.push('Add childcare and your children’s costs under “Anything else”.');
  return lines.slice(0, 3).join(' ');
}

function aboutSection(b: BudgetInputs, p: Profile | null): string {
  const citizen = b.citizen === 'eu' ? 'EU, EEA, Swiss or Nordic' : 'Another country';
  if (p) {
    const tile = (label: string, value: string) =>
      `<div class="tile"><span class="tiny muted">${label}</span><span class="strong">${value}</span></div>`;
    return `<section class="card bud-card" aria-labelledby="bud-about-t">
      <div class="row between wrap gap12"><h2 class="h4" id="bud-about-t">About you</h2>${goLink('profile', '<span>Change in Profile</span>')}</div>
      <div class="tiles">${tile('Here to', b.role === 'study' ? 'Study' : 'Work')}${tile('Citizenship', citizen)}${tile('In Denmark', b.arrived ? 'Already here' : 'Not yet')}${tile('Rent and bills', b.shared ? 'Split with a partner' : 'Just me')}</div>
      <p class="tiny muted">From your profile, so your plan and your budget stay in step.</p>
    </section>`;
  }
  const yesNo = (v: boolean) => (v ? 'yes' : 'no');
  return `<section class="card bud-card" aria-labelledby="bud-about-t">
    <h2 class="h4" id="bud-about-t">About you</h2>
    ${question(
      'bud-q-role',
      'What brings you to Copenhagen?',
      options(
        'bud-role',
        [
          { value: 'study', label: 'Studying', icon: 'GraduationCap' },
          { value: 'work', label: 'Working', icon: 'BriefcaseBusiness' },
        ],
        b.role,
        'compact',
        'bud-q-role',
      ),
    )}
    ${question(
      'bud-q-citizen',
      'Your citizenship',
      options(
        'bud-citizen',
        [
          { value: 'eu', label: 'EU, EEA, Swiss or Nordic' },
          { value: 'non-eu', label: 'Another country' },
        ],
        b.citizen,
        'compact',
        'bud-q-citizen',
      ),
    )}
    ${question(
      'bud-q-arrived',
      'Are you in Denmark yet?',
      options(
        'bud-arrived',
        [
          { value: 'no', label: 'Not yet' },
          { value: 'yes', label: 'Already here' },
        ],
        yesNo(b.arrived),
        'compact',
        'bud-q-arrived',
      ),
    )}
    ${question(
      'bud-q-shared',
      'Splitting rent with a partner?',
      options(
        'bud-shared',
        [
          { value: 'no', label: 'No, just me' },
          { value: 'yes', label: 'Yes, half each' },
        ],
        yesNo(b.shared),
        'compact',
        'bud-q-shared',
      ),
    )}
    <p class="tiny muted">${goLink('start', 'Build your plan', 'link', false)} and these are filled in for you.</p>
  </section>`;
}

function homeSection(b: BudgetInputs): string {
  const home = HOMES[b.home];
  const kind = home.label.toLowerCase();
  const homes: Choice[] = (Object.keys(HOMES) as BudgetHome[]).map(id => ({
    value: id,
    label: HOMES[id].label,
    desc: HOMES[id].desc,
    aside: kr(HOMES[id].rent),
    icon: HOMES[id].icon,
  }));
  return `<section class="card bud-card" aria-labelledby="bud-home-t">
    <h2 class="h4" id="bud-home-t">${b.arrived ? 'Your home' : 'Where you’ll live'}</h2>
    ${options('bud-home', homes, b.home, 'compact stack', 'bud-home-t')}
    ${amountField(b, 'rent', 'bud-rent', 'Rent for the whole home', 'kr a month', `Typical for a ${kind}: ${krRange(home.range)}.${b.shared ? ' You pay half.' : ''}`)}
    <div class="col gap6">${toggle('billsIncluded', 'Bills are included in the rent', b.billsIncluded, 'bud-bills-hint')}
      <p class="tiny muted" id="bud-bills-hint">Heating, water, electricity and internet. Usually included for dorms and rooms. For a ${kind} they come to about ${kr(home.bills)} a month.</p></div>
  </section>`;
}

function lifeSection(b: BudgetInputs): string {
  return `<section class="card bud-card" aria-labelledby="bud-life-t">
    <h2 class="h4" id="bud-life-t">Everyday life</h2>
    ${question('bud-q-transport', 'Getting around', options('bud-transport', priced(TRANSPORT), b.transport, 'compact stack', 'bud-q-transport'))}
    ${question('bud-q-food', 'Food', options('bud-food', priced(FOOD), b.food, 'compact stack', 'bud-q-food'))}
    ${question('bud-q-social', 'Going out', options('bud-social', priced(SOCIAL), b.social, 'compact stack', 'bud-q-social'))}
  </section>`;
}

function extrasSection(b: BudgetInputs): string {
  const extras = EXTRAS.filter(e => !e.roles || e.roles.includes(b.role));
  return `<section class="card bud-card" aria-labelledby="bud-extras-t">
    <h2 class="h4" id="bud-extras-t">Extras</h2>
    <div class="chip-row" role="group" aria-labelledby="bud-extras-t">${extras
      .map(
        e =>
          `<button type="button" class="chip" data-act="bud-toggle" data-id="${e.value}" aria-pressed="${b.extras.includes(e.value)}">${esc(e.label)}<span class="chip-amt">${kr(e.monthly)}</span></button>`,
      )
      .join('')}</div>
    ${b.role === 'work' ? '<p class="tiny muted">A-kasse is unemployment insurance. It only pays out once you’ve been a member for a year, so it’s worth joining early.</p>' : ''}
    ${amountField(b, 'other', 'bud-other', 'Anything else', 'kr a month', 'Childcare, loan repayments, a pet or anything else you pay each month.')}
  </section>`;
}

function incomeSection(b: BudgetInputs): string {
  const study = b.role === 'study';
  const body = study
    ? `<div class="col gap6">${toggle('su', `I get SU: ${kr(SU_MONTHLY)} a month before tax`, b.su, 'bud-su-hint')}
        <p class="tiny muted" id="bud-su-hint">${b.citizen === 'eu' ? 'EU, EEA and Swiss students on a full degree who work about 10–12 hours a week may qualify.' : 'SU is mainly for Danish and EU citizens, though some residence permits qualify.'} <a class="link" href="https://www.su.dk/" ${ext}>Check on su.dk${icon('ArrowUpRight', 12)}</a></p></div>
      <div class="bud-pair">
        ${amountField(b, 'jobHours', 'bud-hours', 'Student job', 'hours a week')}
        ${amountField(b, 'wage', 'bud-wage', 'Pay', 'kr an hour', '', num(STUDENT_WAGE))}
      </div>
      ${b.citizen === 'non-eu' ? `<p class="tiny muted">Students from outside the EU can usually work up to ${NON_EU_STUDENT_MONTHLY_HOURS} hours a month, about ${Math.round((NON_EU_STUDENT_MONTHLY_HOURS * 12) / 52)} a week, and full time in June, July and August. <a class="link" href="${STUDENT_WORK_RULES_URL}" ${ext}>SIRI’s rules${icon('ArrowUpRight', 12)}</a></p>` : ''}`
    : `${amountField(b, 'salary', 'bud-salary', 'Salary before tax', 'kr a month', `From your contract. We estimate Danish tax for Copenhagen in ${TAX.year}.`, 'For example 42,000')}
      <div class="col gap6">${toggle('researcher', 'Researcher tax scheme', b.researcher, 'bud-res-hint')}
        <p class="tiny muted" id="bud-res-hint">A flat ${RESEARCHER_TOTAL.toFixed(2)}% for people hired from abroad on at least ${kr(TAX.researcher.minSalary)} a month.</p></div>`;
  return `<section class="card bud-card" id="bud-income" aria-labelledby="bud-income-t">
    <h2 class="h4 bud-target" id="bud-income-t" tabindex="-1">Your income <span class="muted small">Optional</span></h2>
    ${body}
    ${amountField(b, 'otherIncome', 'bud-more', 'Other money each month', 'kr a month', study ? 'Savings, family or a scholarship, after tax.' : 'Savings or help from family, after tax.')}
  </section>`;
}

function verdictHTML(est: BudgetEstimate): string {
  const inc = est.income,
    left = est.leftOver;
  if (!inc || left == null)
    return `<p class="bud-hint">${icon('Info', 16, 'var(--muted)')}<span>Add your income to see what’s left each month. <button type="button" class="link link-btn" data-act="bud-jump" data-to="bud-income-t">Add income</button></span></p>`;
  const ok = left >= 0;
  return `<div class="bud-verdict ${ok ? 'ok' : 'short'}">${icon(ok ? 'CircleCheck' : 'CircleAlert', 20, ok ? 'var(--green)' : 'var(--urgent)')}
    <div class="col gap4 min0">
      <p class="strong">${ok ? `${kr(left)} left each month` : `${kr(-left)} short each month`}</p>
      <p class="tiny muted">You bring in about ${kr(inc.net)}${inc.tax > 0 ? ` after ${kr(inc.tax)} in tax` : ''}.</p>
      ${inc.researcherBelowMin ? `<p class="tiny muted">The researcher tax scheme needs a salary of at least ${kr(TAX.researcher.minSalary)}, so this uses normal tax.</p>` : ''}
    </div>
  </div>`;
}

function summaryHTML(b: BudgetInputs, est: BudgetEstimate): string {
  const rows = est.lines
    .map(l => {
      const pct = est.total ? (l.amount / est.total) * 100 : 0;
      return `<li class="bud-row"><span class="bud-row-label">${esc(l.label)}${l.note ? `<span class="tiny muted">${esc(l.note)}</span>` : ''}</span><span class="bud-amt">${kr(l.amount)}<span class="sr-only">, ${Math.round(pct)}% of the month</span></span><span class="bud-bar" aria-hidden="true"><span style="width:${pct.toFixed(1)}%"></span></span></li>`;
    })
    .join('');
  const ready = b.arrived
    ? `<div class="bud-ready"><span class="col min0"><span class="tiny strong muted">Moving to a new home?</span><span class="strong">${kr(est.startupTotal)} in one-off costs</span></span><button type="button" class="link link-btn small" data-act="bud-jump" data-to="bud-startup-t">See costs</button></div>`
    : `<div class="bud-ready"><span class="col min0"><span class="tiny strong muted">Have ready when you arrive</span><span class="bud-ready-num">${kr(est.haveReady)}</span></span><button type="button" class="link link-btn small" data-act="bud-jump" data-to="bud-startup-t">What’s in it</button></div>`;
  return `<h2 class="eyebrow bud-target" id="bud-summary-t" tabindex="-1">${b.shared ? 'Your share of a month' : 'Your month in Copenhagen'}</h2>
    <p class="bud-total"><span class="bud-num">${num(est.total)}</span><span class="bud-unit">kr a month</span></p>
    <p class="small muted">About ${eur(est.total)}</p>
    ${verdictHTML(est)}
    <ul class="bud-rows" aria-label="Monthly costs, largest first">${rows}</ul>
    ${ready}`;
}

function stickyHTML(est: BudgetEstimate): string {
  const left = est.leftOver;
  return `<span class="col min0"><span class="strong">${kr(est.total)} a month</span>${left == null ? '' : `<span class="tiny">${left >= 0 ? `${kr(left)} left over` : `${kr(-left)} short`}</span>`}</span>
    <button type="button" class="btn btn-light btn-sm" data-act="bud-jump" data-to="bud-summary-t">See breakdown</button>`;
}

function startupHTML(b: BudgetInputs, est: BudgetEstimate): string {
  const first: BudgetLine = {
    id: 'first',
    label: 'Your first month',
    amount: est.total,
    note: 'Living costs until money starts coming in',
  };
  const lines = b.arrived ? est.startup : [first, ...est.startup];
  return `<div class="row between wrap gap16">
      <div class="col gap6 min0"><h2 class="h3 bud-target" id="bud-startup-t" tabindex="-1">${b.arrived ? 'If you move to a new home' : 'Money to have ready when you arrive'}</h2>
        <p class="muted small">${b.arrived ? 'The one-off costs of moving into a new place.' : 'Moving in costs money before your first pay arrives. Monthly salaries in Denmark are usually paid at the end of the month.'}</p></div>
      <p class="bud-ready-big">${kr(b.arrived ? est.startupTotal : est.haveReady)}</p>
    </div>
    <ul class="bud-list">${lines
      .map(
        l =>
          `<li><span class="col min0"><span>${esc(l.label)}</span>${l.note ? `<span class="tiny muted">${esc(l.note)}</span>` : ''}</span><span class="bud-amt">${kr(l.amount)}</span></li>`,
      )
      .join('')}</ul>
    <p class="warn-line">${icon('ShieldAlert', 16, 'var(--urgent)')}<span>Never pay a deposit before you’ve seen the home and signed a lease.</span></p>
    <p class="tiny muted">Landlords can ask for up to 3 months’ deposit and 3 months’ prepaid rent. For flats we count both, so you aren’t caught short. ${goLink('housing', 'Housing guide', 'link', false)}</p>`;
}

interface Tip {
  icon: IconName;
  title: string;
  text: string;
  link?: { label: string; url: string } | { label: string; to: RouteName };
}

/** A cheaper kind of home that suits this person, as a sentence, or nothing when there isn't a sensible one. */
function cheaperHome(b: BudgetInputs): string {
  const room = kr(HOMES.room.rent),
    dorm = kr(HOMES.dorm.rent);
  if (b.role === 'study') {
    if (isFlat(b.home))
      return `A room in a shared flat costs about ${room} and a dorm room about ${dorm}, usually with bills included.`;
    if (b.home === 'room')
      return `A dorm room is usually the cheapest way to live in Copenhagen, at about ${dorm}. Join the waiting lists early.`;
    return '';
  }
  if (b.home === 'flat1' || b.home === 'flat2')
    return `A studio costs about ${kr(HOMES.studio.rent)}, and a room in a shared flat about ${room} with bills included.`;
  if (b.home === 'studio') return `A room in a shared flat costs about ${room}, usually with bills included.`;
  return '';
}

/** A few ways to spend less, picked for these answers, most useful first. */
function tipsFor(b: BudgetInputs, est: BudgetEstimate): Tip[] {
  const tips: Tip[] = [];
  const rent = est.lines.find(l => l.id === 'rent')?.amount ?? 0;
  const short = est.leftOver != null && est.leftOver < 0;
  // Rent over half the month is normal for someone working, so only raise it with them when the money runs short.
  const tight = short || (b.role === 'study' && est.leftOver == null && rent > est.total / 2);
  const cheaper = cheaperHome(b);
  if (tight && cheaper)
    tips.push({
      icon: 'House',
      title: 'Rent is the big one',
      text: cheaper,
      link: { label: 'Where to look', to: 'housing' },
    });
  if (b.transport === 'pass')
    tips.push({
      icon: 'Bike',
      title: 'Try a bike',
      text: `A second-hand bike costs about ${kr(BIKE)} and pays for itself in two months. Copenhagen is built for cycling.`,
    });
  if (b.food !== 'low')
    tips.push({
      icon: 'Utensils',
      title: 'Cook more, spend less',
      text: `Cooking most meals costs about ${kr(FOOD[0].monthly)} a month. Discount supermarkets like Netto, Lidl and Rema 1000 help, and so do apps like Too Good To Go.`,
    });
  if (b.role === 'work')
    tips.push({
      icon: 'FileText',
      title: 'Get your tax card first',
      text: 'Without a tax card, your employer has to take 55% of your pay. Sort it out before your first payday.',
      link: { label: 'Danish Tax Agency', url: 'https://skat.dk/en-us/individuals' },
    });
  if (b.role === 'study' && b.citizen === 'eu' && !b.su)
    tips.push({
      icon: 'GraduationCap',
      title: 'Check if you can get SU',
      text: `EU, EEA and Swiss students on a full degree who work about 10–12 hours a week may get ${kr(SU_MONTHLY)} a month before tax.`,
      link: { label: 'su.dk', url: 'https://www.su.dk/' },
    });
  if (b.role === 'work' && !b.extras.includes('akasse'))
    tips.push({
      icon: 'ShieldCheck',
      title: 'Join an a-kasse early',
      text: `Unemployment insurance only pays out after a year of membership. It costs about ${kr(AKASSE)} a month, and you can deduct it from your taxable income.`,
    });
  if (!b.arrived)
    tips.push({
      icon: 'Wallet',
      title: 'Bring a buffer',
      text: 'Monthly salaries are usually paid at the end of the month, so plan to cover your first weeks yourself.',
    });
  return tips.slice(0, 4);
}

function tipsHTML(b: BudgetInputs, est: BudgetEstimate): string {
  const tips = tipsFor(b, est);
  if (!tips.length) return '';
  const link = (l: Tip['link']): string =>
    !l
      ? ''
      : 'to' in l
        ? goLink(l.to, esc(l.label), 'tiny link')
        : `<a class="tiny link" href="${esc(l.url)}" ${ext}>${esc(l.label)}${icon('ArrowUpRight', 12)}</a>`;
  return `<h2 class="h3">Ways to make it go further</h2>
    <div class="tips-grid">${tips
      .map(
        t =>
          `<div class="card card-sm tip-card"><span class="icon-circle sm">${icon(t.icon, 18)}</span><div class="col gap4 min0"><p class="strong">${esc(t.title)}</p><p class="small muted">${esc(t.text)}</p>${link(t.link)}</div></div>`,
      )
      .join('')}</div>`;
}

function sourcesHTML(): string {
  return `<section class="card card-sm bud-sources" aria-labelledby="bud-sources-t">
    <h2 class="h4" id="bud-sources-t">Where these numbers come from</h2>
    <ul class="bud-src-list">${BUDGET_SOURCES.map(
      s =>
        `<li><a class="link" href="${esc(s.url)}" ${ext}>${esc(s.label)}${icon('ArrowUpRight', 14)}</a><span class="tiny muted">${esc(s.by)}</span></li>`,
    ).join('')}</ul>
    <p class="tiny muted">Prices checked ${PRICES_CHECKED}. Food, going out and extras are rounded typical prices. Tax is an estimate for Copenhagen Municipality without church tax, pension or other deductions. Everyone’s costs are different, so treat this as a starting point.</p>
  </section>`;
}

type PartId = 'bud-summary' | 'bud-sticky' | 'bud-startup' | 'bud-tips';

function parts(b: BudgetInputs, est: BudgetEstimate): Record<PartId, string> {
  return {
    'bud-summary': summaryHTML(b, est),
    'bud-sticky': stickyHTML(est),
    'bud-startup': startupHTML(b, est),
    'bud-tips': tipsHTML(b, est),
  };
}

/** The parts of the page that follow the numbers, by element id, so typing can update them without a full render. */
export function budgetParts(): Record<PartId, string> {
  const b = currentBudget();
  return parts(b, estimateBudget(b));
}

/** A short line for screen readers after an amount changes. */
export function budgetAnnouncement(): string {
  const est = estimateBudget(currentBudget());
  const left = est.leftOver;
  return `${kr(est.total)} a month.${left == null ? '' : left >= 0 ? ` ${kr(left)} left over.` : ` ${kr(-left)} short.`}`;
}

export function pageBudget(): string {
  const b = currentBudget(),
    p = S.profile,
    est = estimateBudget(b),
    html = parts(b, est);
  const lead = b.arrived
    ? `What a month costs, and what’s left after tax. Prices checked ${PRICES_CHECKED}.`
    : `What a month costs, and how much to have ready before you move. Prices checked ${PRICES_CHECKED}.`;
  return `<div class="container">
    <div class="page-head">
      <div class="col gap10"><p class="eyebrow">Budget calculator</p><h1 class="h1">Your Copenhagen budget</h1><p class="lead">${esc(lead)}</p></div>
      <button type="button" class="btn btn-outline" data-act="bud-reset">${icon('RotateCcw', 16, 'var(--green)')}<span>Start over</span></button>
    </div>
    <div class="bud-toast">${toastHTML('budget')}</div>
    <div class="card advice">${icon('Lightbulb', 22, 'var(--green)')}<p>${esc(advice(b, p))}</p></div>
    <div class="budget-layout">
      <div class="col gap20 min0">
        ${aboutSection(b, p)}
        ${homeSection(b)}
        ${lifeSection(b)}
        ${extrasSection(b)}
        ${incomeSection(b)}
        <div class="bud-sticky" id="bud-sticky">${html['bud-sticky']}</div>
      </div>
      <aside class="budget-side"><section class="card bud-summary" id="bud-summary" aria-labelledby="bud-summary-t">${html['bud-summary']}</section></aside>
    </div>
    <section class="card bud-startup" id="bud-startup" aria-labelledby="bud-startup-t">${html['bud-startup']}</section>
    <section class="col gap16 bud-tips" id="bud-tips" aria-label="Ways to make it go further">${html['bud-tips']}</section>
    ${sourcesHTML()}
    <p class="sr-only" id="bud-live" aria-live="polite"></p>
  </div>`;
}
