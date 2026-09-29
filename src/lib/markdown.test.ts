import { describe, expect, it } from 'vitest';
import { md } from './markdown.js';

describe('md', () => {
  it('renders bold, italic and code', () => {
    const html = md('**bold**, *italic* and `code`');
    expect(html).toContain('<strong>bold</strong>');
    expect(html).toContain('<em>italic</em>');
    expect(html).toContain('<code>code</code>');
  });

  it('escapes HTML instead of rendering it', () => {
    const html = md('<script>alert(1)</script> <img src=x onerror=alert(1)>');
    expect(html).not.toContain('<script');
    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;script&gt;');
  });

  it('turns links to official pages into safe anchors', () => {
    const html = md('[Healthcare](https://lifeindenmark.borger.dk/healthcare)');
    expect(html).toContain('<a href="https://lifeindenmark.borger.dk/healthcare"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('target="_blank"');
  });

  it('shows only the label for links to other sites', () => {
    for (const link of [
      '[Click](https://evil.example/phish)',
      '[Click](https://lifeindenmark.borger.dk.evil.example/)',
    ]) {
      const html = md(link);
      expect(html).not.toContain('<a');
      expect(html).toContain('Click');
    }
  });

  it('never makes a link out of a javascript: URL', () => {
    expect(md('[x](javascript:alert(1))')).not.toContain('<a');
  });

  it('renders bullet and numbered lists', () => {
    const bullets = md('- one\n- two');
    expect(bullets.match(/class="md-li"/g)).toHaveLength(2);
    expect(bullets).toContain('•');
    const numbered = md('1. first\n2) second');
    expect(numbered).toContain('1.');
    expect(numbered).toContain('2.');
  });

  it('joins wrapped lines into one paragraph and splits paragraphs on blank lines', () => {
    expect(md('a\nb\n\nc')).toBe('<p>a b</p><p>c</p>');
    expect(md('a\r\n\r\nb')).toBe('<p>a</p><p>b</p>');
  });

  it('drops heading markers', () => {
    expect(md('## Title')).toBe('<p>Title</p>');
  });
});
