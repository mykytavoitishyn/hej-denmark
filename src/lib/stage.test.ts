import { describe, expect, it } from 'vitest';
import { profile } from '../../tests/helpers.js';
import { arrivalCheckDue, arrivalLabel, daysUntil, effectiveStage, upcomingArrival, withLiveStage } from './stage.js';

const now = new Date(2026, 8, 30, 15, 0); // 30 September 2026, mid-afternoon

describe('daysUntil', () => {
  it('counts whole days, ignoring the time of day', () => {
    expect(daysUntil('2026-09-30', now)).toBe(0);
    expect(daysUntil('2026-10-01', now)).toBe(1);
    expect(daysUntil('2026-09-20', now)).toBe(-10);
  });

  it('gives up on dates it can’t read', () => {
    expect(daysUntil('soon', now)).toBeNull();
  });
});

describe('effectiveStage', () => {
  it('moves a planned move to “arriving soon” once it is within a month', () => {
    expect(effectiveStage(profile({ stage: 'planning', arrival_date: '2026-10-30' }), now)).toBe('soon');
    expect(effectiveStage(profile({ stage: 'planning', arrival_date: '2026-11-15' }), now)).toBe('planning');
  });

  it('never decides by itself that someone has arrived', () => {
    expect(effectiveStage(profile({ stage: 'soon', arrival_date: '2026-09-01' }), now)).toBe('soon');
    expect(effectiveStage(profile({ stage: 'planning', arrival_date: '2026-09-01' }), now)).toBe('soon');
  });

  it('leaves the stage alone without an arrival date', () => {
    expect(effectiveStage(profile({ stage: 'planning', arrival_date: null }), now)).toBe('planning');
  });

  it('only copies the profile when the stage changes', () => {
    const p = profile({ stage: 'arrived' });
    expect(withLiveStage(p, now)).toBe(p);
    expect(withLiveStage(profile({ stage: 'planning', arrival_date: '2026-10-05' }), now).stage).toBe('soon');
  });
});

describe('arrivalCheckDue', () => {
  it('asks once the arrival date has come', () => {
    expect(arrivalCheckDue(profile({ stage: 'soon', arrival_date: '2026-09-30' }), now)).toBe(true);
    expect(arrivalCheckDue(profile({ stage: 'planning', arrival_date: '2026-09-12' }), now)).toBe(true);
  });

  it('doesn’t ask before the date, without one, or after someone has arrived', () => {
    expect(arrivalCheckDue(profile({ stage: 'soon', arrival_date: '2026-10-01' }), now)).toBe(false);
    expect(arrivalCheckDue(profile({ stage: 'soon', arrival_date: null }), now)).toBe(false);
    expect(arrivalCheckDue(profile({ stage: 'arrived', arrival_date: '2026-09-12' }), now)).toBe(false);
  });
});

describe('upcomingArrival', () => {
  it('returns the arrival date while it is still ahead', () => {
    expect(upcomingArrival(profile({ stage: 'soon', arrival_date: '2026-10-12' }), now)).toBe('2026-10-12');
    expect(upcomingArrival(profile({ stage: 'soon', arrival_date: '2026-09-30' }), now)).toBeNull();
    expect(upcomingArrival(profile({ stage: 'arrived', arrival_date: '2026-10-12' }), now)).toBeNull();
    expect(upcomingArrival(null, now)).toBeNull();
  });
});

describe('arrivalLabel', () => {
  it('writes the date for people', () => {
    expect(arrivalLabel('2026-10-12')).toBe('Monday 12 October');
    expect(arrivalLabel('2026-10-12', { weekday: false })).toBe('12 October');
  });
});
