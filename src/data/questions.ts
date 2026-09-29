import type { Question } from '../types.js';
import { CITY_LABELS } from './labels.js';

export const QUESTIONS: Question[] = [
  {
    key: 'moveReason',
    prompt: 'What brings you to Denmark?',
    choices: [
      { value: 'student', label: 'Student', icon: 'GraduationCap' },
      { value: 'work', label: 'Work', icon: 'BriefcaseBusiness' },
      { value: 'other', label: 'Other', icon: 'Compass' },
    ],
  },
  {
    key: 'residencyGroup',
    prompt: 'Where are you moving from?',
    choices: [
      { value: 'eu-eea', label: 'EU/EEA', icon: 'UsersRound' },
      { value: 'non-eu', label: 'Non-EU', icon: 'Plane' },
    ],
  },
  {
    key: 'city',
    prompt: 'Which city will you call home?',
    choices: Object.entries(CITY_LABELS).map(([value, label]) => ({
      value,
      label,
      icon: value === 'other' ? 'House' : 'MapPin',
    })),
  },
  {
    key: 'hasCpr',
    prompt: 'Do you have a CPR number (your personal ID number)?',
    choices: [
      { value: 'yes', label: 'Yes', icon: 'CircleCheck' },
      { value: 'no', label: 'Not yet', icon: 'HeartPulse' },
    ],
  },
];
