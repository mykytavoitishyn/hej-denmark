import type { CityId } from '../types.js';

/** Maps a profile city to one we list events for. Anything unknown falls back to Copenhagen. */
export const eventCity = (c?: string | null): CityId => {
  const v = (c || '').toLowerCase();
  return v === 'aarhus' || v === 'odense' || v === 'aalborg' || v === 'other' ? v : 'copenhagen';
};
