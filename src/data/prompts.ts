import type { Profile } from '../types.js';

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
export const promptsFor = (p: Profile): string[] => (p.move_reason === 'student' ? STUDENT_PROMPTS : DEFAULT_PROMPTS);
