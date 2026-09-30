import type { Profile } from '../types.js';

const BEFORE_PROMPTS = [
  'What should I do before I move?',
  'Which documents should I bring?',
  'How do I find a room safely?',
  'What do I do in my first week?',
];
const STUDENT_PROMPTS = [
  'What should I do this week?',
  'How do I find a room safely?',
  'Can I work while studying?',
  'How do I make friends at uni?',
];
const DEFAULT_PROMPTS = [
  'What’s my next step?',
  'How do I get MitID?',
  'Help me write to the kommune',
  'What’s on this weekend?',
];

/** Suggested questions. Before someone arrives they're about getting ready; after, about settling in. */
export const promptsFor = (p: Profile): string[] =>
  p.stage !== 'arrived' ? BEFORE_PROMPTS : p.move_reason === 'student' ? STUDENT_PROMPTS : DEFAULT_PROMPTS;
