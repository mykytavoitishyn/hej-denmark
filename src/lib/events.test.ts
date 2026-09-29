import { describe, expect, it } from 'vitest';
import { eventCity } from './events.js';

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
