import { describe, expect, it } from 'vitest';
import { esc, hostOf, icon, isOfficial, uid } from './dom.js';

describe('esc', () => {
  it('escapes the characters that matter in HTML text and attributes', () => {
    expect(esc(`<a href="x" title='y'>&</a>`)).toBe('&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  });

  it('turns null and undefined into an empty string', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('converts other values to text', () => {
    expect(esc(42)).toBe('42');
  });
});

describe('isOfficial', () => {
  it('accepts pages on official hosts', () => {
    expect(isOfficial('https://lifeindenmark.borger.dk/healthcare')).toBe(true);
    expect(isOfficial('https://www.mitid.dk/en-gb/')).toBe(true);
  });

  it('rejects other hosts, look-alike hosts and non-web schemes', () => {
    expect(isOfficial('https://evil.example/')).toBe(false);
    expect(isOfficial('https://lifeindenmark.borger.dk.evil.example/')).toBe(false);
    expect(isOfficial('javascript:alert(1)')).toBe(false);
    expect(isOfficial('not a url')).toBe(false);
  });
});

describe('hostOf', () => {
  it('returns the host without a leading www', () => {
    expect(hostOf('https://www.mitid.dk/en-gb/')).toBe('mitid.dk');
    expect(hostOf('https://skat.dk/en-us/individuals')).toBe('skat.dk');
  });

  it('returns an empty string for something that is not a URL', () => {
    expect(hostOf('nope')).toBe('');
  });
});

describe('icon', () => {
  it('renders a decorative SVG with the requested size', () => {
    const svg = icon('Check', 16);
    expect(svg).toContain('width="16"');
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('<path');
  });
});

describe('uid', () => {
  it('uses the prefix and is unique across calls', () => {
    const a = uid('user');
    expect(a.startsWith('user-')).toBe(true);
    expect(uid('user')).not.toBe(a);
  });
});
