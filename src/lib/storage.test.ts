import { afterEach, describe, expect, it, vi } from 'vitest';
import { KEY, readJSON, store, writeJSON } from './storage.js';

afterEach(() => vi.restoreAllMocks());

describe('store', () => {
  it('round-trips values through localStorage', () => {
    store.set('k', 'v');
    expect(localStorage.getItem('k')).toBe('v');
    expect(store.get('k')).toBe('v');
    store.del('k');
    expect(store.get('k')).toBeNull();
  });

  it('keeps working in memory when localStorage is blocked', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    store.set('private-mode', 'still here');
    expect(store.get('private-mode')).toBe('still here');
  });
});

describe('readJSON and writeJSON', () => {
  it('round-trips JSON', () => {
    writeJSON('data', { a: [1, 2] });
    expect(readJSON('data', null)).toEqual({ a: [1, 2] });
  });

  it('returns the fallback for missing or corrupt data', () => {
    expect(readJSON('missing', 'fallback')).toBe('fallback');
    localStorage.setItem('bad', '{not json');
    expect(readJSON('bad', 'fallback')).toBe('fallback');
  });
});

describe('KEY', () => {
  it('keeps each guest’s data under its own key', () => {
    expect(KEY.profile('a')).not.toBe(KEY.profile('b'));
    expect(KEY.done('a')).toContain('a');
  });
});
