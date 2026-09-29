import type {
  CityId,
  Household,
  HousingStatus,
  JobStatus,
  MoveReason,
  ResidencyGroup,
  Stage,
  StudyType,
} from '../types.js';

export const MOVE_LABELS: Record<MoveReason, string> = {
  student: 'Student',
  work: 'Work',
  family: 'Family',
  other: 'Other',
};
export const RES_LABELS: Record<ResidencyGroup, string> = { nordic: 'Nordic', 'eu-eea': 'EU/EEA', 'non-eu': 'Non-EU' };
export const CITY_LABELS: Record<CityId, string> = {
  copenhagen: 'Copenhagen',
  aarhus: 'Aarhus',
  odense: 'Odense',
  aalborg: 'Aalborg',
  other: 'Other',
};
export const STAGE_LABELS: Record<Stage, string> = {
  planning: 'Planning the move',
  soon: 'Arriving soon',
  arrived: 'In Denmark',
};
export const HOUSING_LABELS: Record<HousingStatus, string> = {
  searching: 'Looking for a home',
  temporary: 'Temporary place',
  settled: 'Home sorted',
};
export const HOUSEHOLD_LABELS: Record<Household, string> = {
  solo: 'Just me',
  partner: 'With a partner',
  kids: 'With children',
  'partner-kids': 'Partner and children',
};
export const STUDY_LABELS: Record<StudyType, string> = { exchange: 'Exchange', degree: 'Full degree' };
export const JOB_LABELS: Record<JobStatus, string> = { offer: 'Job offer', looking: 'Looking for work' };

/** A city name for sentences: “Copenhagen”, or “your city” when the person lives elsewhere. */
export const cityName = (c: CityId, other = 'your city'): string => (c === 'other' ? other : CITY_LABELS[c]);
