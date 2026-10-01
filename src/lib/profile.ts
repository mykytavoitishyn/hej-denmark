import { AVATAR_COLORS, AVATAR_EMOJI } from '../data/avatars.js';
import { QUESTIONS } from '../data/questions.js';
import type {
  Avatar,
  CityId,
  CprStage,
  Household,
  HousingStatus,
  JobStatus,
  MoveReason,
  Profile,
  ProfileDraft,
  Question,
  QuestionKey,
  ResidencyGroup,
  Stage,
  StudyType,
} from '../types.js';

const MOVES: readonly MoveReason[] = ['student', 'work', 'family', 'other'];
const GROUPS: readonly ResidencyGroup[] = ['nordic', 'eu-eea', 'non-eu'];
const CITIES: readonly CityId[] = ['copenhagen', 'aarhus', 'odense', 'aalborg', 'other'];
const STAGES: readonly Stage[] = ['planning', 'soon', 'arrived'];
const HOUSING: readonly HousingStatus[] = ['searching', 'temporary', 'settled'];
const HOUSEHOLDS: readonly Household[] = ['solo', 'partner', 'kids', 'partner-kids'];
const STUDIES: readonly StudyType[] = ['exchange', 'degree'];
const JOBS: readonly JobStatus[] = ['offer', 'looking'];
const CPR_STAGES: readonly CprStage[] = ['none', 'booked', 'waiting', 'have'];

const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): T | undefined =>
  typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

export const MAX_NAME = 40;
// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

/** Trims a display name, drops control characters and caps its length. */
export const cleanName = (v: unknown): string =>
  typeof v === 'string' ? v.replace(CONTROL_CHARS, '').replace(/\s+/g, ' ').trim().slice(0, MAX_NAME) : '';

/** Reads a CPR stage from a button's value. Anything unexpected counts as not started. */
export const cprStageOf = (v: unknown): CprStage => oneOf(v, CPR_STAGES) ?? 'none';

/** A calendar date written as YYYY-MM-DD. */
export const isDateString = (v: unknown): v is string =>
  typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v));

/**
 * The questions that apply to these answers, in order. The plan builder also leaves out questions whose answer
 * is almost always the same at that point (nobody who hasn't arrived yet has a CPR number), to keep it short.
 */
export function questionsFor(d: ProfileDraft, mode: 'onboarding' | 'edit'): Question[] {
  return QUESTIONS.filter(q => (!q.when || q.when(d)) && (mode === 'edit' || !q.askIf || q.askIf(d)));
}

/** A draft answer as the string its question's choices use. */
export function draftValue(d: ProfileDraft, key: QuestionKey): string | undefined {
  return d[key];
}

/** Records one answer. Values that aren't among the question's choices are ignored. */
export function withAnswer(d: ProfileDraft, key: QuestionKey, value: string): ProfileDraft {
  const q = QUESTIONS.find(x => x.key === key);
  if (!q || !q.choices.some(c => c.value === value)) return d;
  return { ...d, [key]: value };
}

/** Turns finished answers into a profile, or null while an answer that applies is still missing. */
export function profileFromDraft(
  d: ProfileDraft,
  extra: { name?: string; arrivalDate?: string | null } = {},
): Profile | null {
  const { moveReason, residencyGroup, city, stage, housing, household } = d;
  if (!moveReason || !residencyGroup || !city || !stage || !housing || !household) return null;
  if (moveReason === 'student' && !d.studyType) return null;
  if (moveReason === 'work' && !d.jobStatus) return null;
  return {
    move_reason: moveReason,
    residency_group: residencyGroup,
    city,
    has_cpr: d.cprStage === 'have',
    cpr_stage: d.cprStage ?? 'none',
    arrival_date: isDateString(extra.arrivalDate) ? extra.arrivalDate : null,
    stage,
    housing,
    household,
    study_type: moveReason === 'student' ? (d.studyType ?? null) : null,
    job_status: moveReason === 'work' ? (d.jobStatus ?? null) : null,
    name: cleanName(extra.name),
    onboarding_completed: true,
  };
}

/** The answers behind a profile, so it can be edited with the same questions. */
export function draftFromProfile(p: Profile): ProfileDraft {
  return {
    moveReason: p.move_reason,
    studyType: p.study_type ?? undefined,
    jobStatus: p.job_status ?? undefined,
    residencyGroup: p.residency_group,
    city: p.city,
    stage: p.stage,
    housing: p.housing,
    household: p.household,
    cprStage: p.cpr_stage,
  };
}

function inferStage(hasCpr: boolean, arrival: string | null, now: Date): Stage {
  if (hasCpr) return 'arrived';
  if (arrival) return Date.parse(`${arrival}T23:59:59`) < now.getTime() ? 'arrived' : 'soon';
  return 'soon';
}

/**
 * Reads a stored profile. Stored data is untrusted, so every field is checked. Profiles saved by earlier
 * versions of the site lack the newer answers; they get neutral defaults so existing plans keep working.
 */
export function normalizeProfile(raw: unknown, now = new Date()): Profile | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const p = raw as Record<string, unknown>;
  const move = oneOf(p.move_reason, MOVES),
    group = oneOf(p.residency_group, GROUPS),
    city = oneOf(p.city, CITIES);
  if (!move || !group || !city) return null;
  // Profiles from before CPR stages only said whether someone had a CPR number.
  const cprStage = oneOf(p.cpr_stage, CPR_STAGES) ?? (p.has_cpr === true ? 'have' : 'none');
  const hasCpr = cprStage === 'have';
  const arrival = isDateString(p.arrival_date) ? p.arrival_date : null;
  return {
    move_reason: move,
    residency_group: group,
    city,
    has_cpr: hasCpr,
    cpr_stage: cprStage,
    arrival_date: arrival,
    stage: oneOf(p.stage, STAGES) ?? inferStage(hasCpr, arrival, now),
    housing: oneOf(p.housing, HOUSING) ?? 'searching',
    household: oneOf(p.household, HOUSEHOLDS) ?? 'solo',
    study_type: move === 'student' ? (oneOf(p.study_type, STUDIES) ?? null) : null,
    job_status: move === 'work' ? (oneOf(p.job_status, JOBS) ?? null) : null,
    name: cleanName(p.name),
    onboarding_completed: true,
  };
}

/** Photos are resized before they're saved, so anything much bigger than that didn't come from this site. */
export const MAX_PHOTO_CHARS = 400_000;
const PHOTO_RE = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/;

/** Reads a stored profile picture, accepting only a known emoji or a small inline image. */
export function normalizeAvatar(raw: unknown): Avatar | null {
  if (!raw || typeof raw !== 'object') return null;
  const a = raw as Record<string, unknown>;
  if (a.kind === 'emoji' && AVATAR_EMOJI.some(e => e.emoji === a.value))
    return { kind: 'emoji', value: a.value as string, color: oneOf(a.color, AVATAR_COLORS) ?? 'green' };
  if (a.kind === 'photo' && typeof a.value === 'string' && a.value.length <= MAX_PHOTO_CHARS && PHOTO_RE.test(a.value))
    return { kind: 'photo', value: a.value };
  return null;
}

/** Up to two initials from a name, for the default profile picture. */
export function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => Array.from(w)[0] ?? '')
    .join('')
    .toUpperCase();
}
