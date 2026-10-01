import type { Profile, Stage } from '../types.js';

/** Whole days from today to a YYYY-MM-DD date in local time: 0 on the day itself, negative once it has passed. */
export function daysUntil(date: string, now = new Date()): number | null {
  const t = new Date(`${date}T00:00:00`).getTime();
  if (!Number.isFinite(t)) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((t - today) / 864e5);
}

/** How close “arriving soon” is, in days. The plan builder describes it as within the next month. */
export const SOON_DAYS = 30;

/**
 * The stage to plan with. Someone who was still planning moves to “arriving soon” by themselves once their arrival
 * date is within a month, so the steps that can't wait come first. Having arrived is never assumed: the plan changes a
 * lot once someone is here, so that waits until they say so.
 */
export function effectiveStage(p: Profile, now = new Date()): Stage {
  if (p.stage !== 'planning' || !p.arrival_date) return p.stage;
  const days = daysUntil(p.arrival_date, now);
  return days !== null && days <= SOON_DAYS ? 'soon' : 'planning';
}

/** The profile with its stage brought up to date, for building the plan and answering questions. */
export const withLiveStage = (p: Profile, now = new Date()): Profile => {
  const stage = effectiveStage(p, now);
  return stage === p.stage ? p : { ...p, stage };
};

/** Whether to ask if the person has arrived: their arrival date has come, but they haven't said they're here. */
export function arrivalCheckDue(p: Profile, now = new Date()): boolean {
  if (p.stage === 'arrived' || !p.arrival_date) return false;
  const days = daysUntil(p.arrival_date, now);
  return days !== null && days <= 0;
}

/** The arrival date, when it's still ahead and the person hasn't arrived. Events and Today plan around it. */
export function upcomingArrival(p: Profile | null, now = new Date()): string | null {
  if (!p || p.stage === 'arrived' || !p.arrival_date) return null;
  const days = daysUntil(p.arrival_date, now);
  return days !== null && days > 0 ? p.arrival_date : null;
}

/** A date written for people: “Monday 12 October”. */
export const arrivalLabel = (date: string, opts: { weekday?: boolean } = {}): string =>
  new Date(`${date}T12:00:00`).toLocaleDateString('en-GB', {
    ...(opts.weekday === false ? {} : { weekday: 'long' }),
    day: 'numeric',
    month: 'long',
  });
