import { describe, expect, it } from 'vitest';
import { profile } from '../../tests/helpers.js';
import type { AskMessage } from '../types.js';
import { buildTurns, offlineAnswer, parseAnswer, stripSources } from './assistant.js';
import { nextStep, planFor } from './plan.js';

const me = profile();
const plan = planFor(me, new Set());

describe('stripSources', () => {
  it('removes a finished SOURCES line', () => {
    expect(stripSources('Use MitID.\nSOURCES: https://www.mitid.dk/en-gb/')).toBe('Use MitID.');
    expect(stripSources('Use MitID.\n**SOURCES**: none')).toBe('Use MitID.');
  });

  it('removes a half-streamed SOURCES word', () => {
    expect(stripSources('Use MitID.\nSOUR')).toBe('Use MitID.');
  });

  it('leaves text without sources alone', () => {
    expect(stripSources('Use MitID.  ')).toBe('Use MitID.');
  });
});

describe('parseAnswer', () => {
  it('splits the answer from its sources and keeps only official, unique links', () => {
    const { answer, sources } = parseAnswer(
      'Use MitID.\n\nSOURCES: https://www.mitid.dk/en-gb/ https://evil.example/x https://www.mitid.dk/en-gb/, https://skat.dk/en-us/individuals.',
    );
    expect(answer).toBe('Use MitID.');
    expect(sources).toEqual([
      { title: 'mitid.dk', url: 'https://www.mitid.dk/en-gb/' },
      { title: 'skat.dk', url: 'https://skat.dk/en-us/individuals' },
    ]);
  });

  it('keeps at most three sources', () => {
    const urls = [
      'https://www.mitid.dk/en-gb/',
      'https://skat.dk/en-us/individuals',
      'https://www.nyidanmark.dk/',
      'https://ihcph.kk.dk/',
    ];
    expect(parseAnswer(`Hi\nSOURCES: ${urls.join(' ')}`).sources).toHaveLength(3);
  });

  it('handles an answer with no SOURCES line', () => {
    expect(parseAnswer('Just text')).toEqual({ answer: 'Just text', sources: [] });
  });

  it('gives a polite fallback for an empty answer', () => {
    expect(parseAnswer('   ').answer).toContain('don’t have a good answer');
  });
});

describe('offlineAnswer', () => {
  it('points to the next step in the plan', () => {
    const next = nextStep(plan);
    const res = offlineAnswer('What should I do this week?', me, plan);
    expect(res.offline).toBe(true);
    expect(res.answer).toContain(`**${next?.title}**`);
  });

  it('explains MitID with official sources', () => {
    const res = offlineAnswer('How do I get MitID?', me, plan);
    expect(res.answer).toContain('MitID');
    expect(res.sources.map(s => s.title)).toContain('mitid.dk');
  });

  it('names the local citizen-service office for CPR questions, but only when there is one', () => {
    expect(offlineAnswer('How do I get a CPR number?', me, plan).answer).toContain('International House Copenhagen');
    expect(offlineAnswer('How do I get a CPR number?', profile({ city: 'other' }), plan).answer).not.toContain(
      'start with',
    );
  });

  it('warns about deposit scams for housing questions', () => {
    expect(offlineAnswer('Is this landlord a scam?', me, plan).answer).toContain('deposit');
  });

  it('says hello back', () => {
    expect(offlineAnswer('hej', me, plan).answer).toContain('Hej!');
  });

  it('admits when it has no ready answer and points to the official guide', () => {
    const res = offlineAnswer('zzz qqq', me, plan);
    expect(res.offline).toBe(true);
    expect(res.answer).toContain('don’t have a ready answer');
    expect(res.sources[0].title).toBe('lifeindenmark.borger.dk');
  });
});

describe('buildTurns', () => {
  const history = (n: number): AskMessage[] =>
    Array.from({ length: n }, (_, i) => ({ id: String(i), role: i % 2 ? 'assistant' : 'user', text: `m${i}` }));

  it('starts with instructions and context, and ends with the question', () => {
    const turns = buildTurns('Where do I register?', [], me, plan);
    expect(turns).toHaveLength(2);
    expect(turns[0].role).toBe('user');
    expect(turns[0].content).toContain('You are Hej');
    expect(turns[0].content).toContain('reason for moving: Work');
    expect(turns[0].content).toContain('- Register your EU residence: to do, Urgent');
    expect(turns[0].content).toContain('locked until an earlier step is done');
    expect(turns[0].content).toContain('https://www.mitid.dk/en-gb/');
    expect(turns.at(-1)).toEqual({ role: 'user', content: 'Where do I register?' });
  });

  it('includes only the last eight messages of history', () => {
    const turns = buildTurns('q', history(12), me, plan);
    expect(turns).toHaveLength(1 + 8 + 1);
    expect(turns[1].content).toBe('m4');
  });
});
