import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { event } from '../../tests/helpers.js';
import { KN } from '../data/events.js';
import { calendarLink, cityEvents, eventCity, fallbackEvents, whenMatch } from './events.js';

// Wednesday 30 September 2026, 12:00 local time.
const NOW = new Date(2026, 8, 30, 12, 0, 0);
const at = (y: number, m: number, d: number, h = 12) => new Date(y, m, d, h).toISOString();

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});
afterEach(() => vi.useRealTimers());

describe('eventCity', () => {
  it('keeps the cities we list events for and defaults everything else to Copenhagen', () => {
    expect(eventCity('Aarhus')).toBe('aarhus');
    expect(eventCity('odense')).toBe('odense');
    expect(eventCity('other')).toBe('other');
    expect(eventCity('copenhagen')).toBe('copenhagen');
    expect(eventCity('Berlin')).toBe('copenhagen');
    expect(eventCity(undefined)).toBe('copenhagen');
    expect(eventCity(null)).toBe('copenhagen');
  });
});

describe('cityEvents', () => {
  it('lists upcoming snapshot events in date order', () => {
    const { events, usingFallback } = cityEvents('copenhagen');
    expect(usingFallback).toBe(false);
    expect(events.length).toBeGreaterThan(0);
    const times = events.map(e => Date.parse(e.startsAt));
    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times.every(t => t >= NOW.getTime())).toBe(true);
    expect(events[0].sourceUrl.startsWith(KN)).toBe(true);
  });

  it('falls back to recurring ideas for “other” cities', () => {
    const { events, usingFallback } = cityEvents('other');
    expect(usingFallback).toBe(true);
    expect(events).toHaveLength(10);
    expect(events.every(e => e.isFallback && e.location === 'Denmark')).toBe(true);
  });

  it('falls back once every snapshot event is in the past', () => {
    vi.setSystemTime(new Date(2100, 0, 1));
    expect(cityEvents('copenhagen').usingFallback).toBe(true);
  });
});

describe('fallbackEvents', () => {
  it('schedules ideas in the future, labelled for the city', () => {
    const events = fallbackEvents('aarhus');
    expect(events.every(e => Date.parse(e.startsAt) > NOW.getTime())).toBe(true);
    expect(events[0].location).toBe('Aarhus');
    expect(events[0].sourceName).toBe('KultuNaut');
  });
});

describe('whenMatch', () => {
  it('sanity check: the fixed “now” is a Wednesday', () => {
    expect(NOW.getDay()).toBe(3);
  });

  it('matches everything for “all”', () => {
    expect(whenMatch(event({ startsAt: at(2030, 0, 1) }), 'all')).toBe(true);
  });

  it('matches only today for “today”', () => {
    expect(whenMatch(event({ startsAt: at(2026, 8, 30, 18) }), 'today')).toBe(true);
    expect(whenMatch(event({ startsAt: at(2026, 9, 1, 9) }), 'today')).toBe(false);
  });

  it('matches the next seven days for “week”', () => {
    expect(whenMatch(event({ startsAt: at(2026, 9, 6, 12) }), 'week')).toBe(true);
    expect(whenMatch(event({ startsAt: at(2026, 9, 7, 12) }), 'week')).toBe(false);
  });

  it('matches Saturday and Sunday for “weekend”', () => {
    expect(whenMatch(event({ startsAt: at(2026, 9, 3, 10) }), 'weekend')).toBe(true);
    expect(whenMatch(event({ startsAt: at(2026, 9, 4, 23) }), 'weekend')).toBe(true);
    expect(whenMatch(event({ startsAt: at(2026, 9, 2, 20) }), 'weekend')).toBe(false);
    expect(whenMatch(event({ startsAt: at(2026, 9, 5, 0) }), 'weekend')).toBe(false);
  });
});

describe('calendarLink', () => {
  it('builds a Google Calendar link with a one-hour default length', () => {
    const url = new URL(calendarLink(event({ title: 'Harbour walk & swim' })));
    expect(url.origin + url.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(url.searchParams.get('action')).toBe('TEMPLATE');
    expect(url.searchParams.get('text')).toBe('Harbour walk & swim');
    expect(url.searchParams.get('dates')).toBe('20261025T120000Z/20261025T130000Z');
    expect(url.searchParams.get('details')).toContain('kultunaut.dk');
  });

  it('uses the event’s own end time when it has one', () => {
    const url = new URL(calendarLink(event({ endsAt: '2026-10-25T15:30:00Z' })));
    expect(url.searchParams.get('dates')).toBe('20261025T120000Z/20261025T153000Z');
  });
});
