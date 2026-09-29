import type { CityId, MoveReason, ResidencyGroup } from '../types.js';

export const MOVE_LABELS: Record<MoveReason, string> = { student: 'Student', work: 'Work', other: 'Other' };
export const RES_LABELS: Record<ResidencyGroup, string> = { 'eu-eea': 'EU/EEA', 'non-eu': 'Non-EU' };
export const CITY_LABELS: Record<CityId, string> = {
  copenhagen: 'Copenhagen',
  aarhus: 'Aarhus',
  odense: 'Odense',
  aalborg: 'Aalborg',
  other: 'Other',
};
