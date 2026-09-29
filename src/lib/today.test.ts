import { describe, expect, it } from 'vitest';
import { WORDS } from '../data/words.js';
import { arrivalMessage, dailyWord, greeting } from './today.js';

describe('greeting', () => {
  it.each([
    [9, 59, 'Godmorgen'],
    [10, 0, 'Goddag'],
    [17, 59, 'Goddag'],
    [18, 0, 'Godaften'],
    [0, 0, 'Godmorgen'],
  ])('at %i:%i says %s', (h, m, danish) => {
    expect(greeting(new Date(2026, 8, 29, h, m)).danish).toBe(danish);
  });
});

describe('dailyWord', () => {
  it('gives the same word all day and a different one the next day', () => {
    const a = dailyWord(new Date(2026, 8, 29, 0, 5));
    expect(dailyWord(new Date(2026, 8, 29, 23, 55))).toBe(a);
    expect(dailyWord(new Date(2026, 8, 30))).not.toBe(a);
  });

  it('always returns a word from the list, across a year and into the past', () => {
    for (let i = -400; i < 400; i++) {
      expect(WORDS).toContain(dailyWord(new Date(2026, 8, 29 + i)));
    }
  });
});

describe('arrivalMessage', () => {
  const now = new Date(2026, 8, 29, 15, 0);

  it('counts days since arrival, starting at day 1', () => {
    expect(arrivalMessage('2026-09-29', now)).toBe('Day 1 in Denmark');
    expect(arrivalMessage('2026-09-20', now)).toBe('Day 10 in Denmark');
  });

  it('counts down to a future arrival with the right plural', () => {
    expect(arrivalMessage('2026-09-30', now)).toBe('Arriving in 1 day');
    expect(arrivalMessage('2026-10-02', now)).toBe('Arriving in 3 days');
  });

  it('returns null without a usable date', () => {
    expect(arrivalMessage(null, now)).toBeNull();
    expect(arrivalMessage('', now)).toBeNull();
    expect(arrivalMessage('not-a-date', now)).toBeNull();
  });
});
