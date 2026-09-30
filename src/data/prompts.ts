import type { Profile } from '../types.js';

const BEFORE_PROMPTS = [
  'What should I do before I move?',
  'Which documents should I bring?',
  'How do I find a room safely?',
  'What do I do in my first week?',
];

const DEFAULT_PROMPTS = [
  'What’s my next step?',
  'How do I get MitID?',
  'Help me write to the kommune',
  'What’s on this weekend?',
];

/** Suggested questions. Before someone arrives they're about getting ready; after, about settling in. */
export function promptsFor(p: Profile): string[] {
  if (p.stage !== 'arrived') return BEFORE_PROMPTS;
  if (p.move_reason !== 'student') return DEFAULT_PROMPTS;
  return [
    'What should I do this week?',
    // Students still looking need a room first; once they have one, the question is what help they can get.
    p.housing === 'settled' ? 'Can I get housing benefit?' : 'How do I find a room safely?',
    'Can I work while studying?',
    'How do I make friends at uni?',
  ];
}
