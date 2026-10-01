import type { Question } from '../types.js';
import { CITY_LABELS } from './labels.js';

/**
 * The plan builder's questions, in the order they're asked. Follow-up questions have a `when` condition,
 * so a student is asked about their studies and someone moving for work about their job.
 */
export const QUESTIONS: Question[] = [
  {
    key: 'moveReason',
    label: 'Moving for',
    prompt: 'What brings you to Denmark?',
    hint: 'Your reason for moving decides which permits, registrations and tax steps apply to you.',
    choices: [
      { value: 'student', label: 'Studying', desc: 'University, exchange or college', icon: 'GraduationCap' },
      { value: 'work', label: 'Working', desc: 'A job, or looking for one', icon: 'BriefcaseBusiness' },
      { value: 'family', label: 'Joining family', desc: 'Moving with or to a partner or parent', icon: 'Heart' },
      { value: 'other', label: 'Something else', desc: 'Research, a business or another reason', icon: 'Compass' },
    ],
  },
  {
    key: 'studyType',
    label: 'Studies',
    prompt: 'What kind of studies?',
    hint: 'Exchange and degree students find housing and support through different routes.',
    when: d => d.moveReason === 'student',
    choices: [
      { value: 'exchange', label: 'Exchange or guest student', desc: 'One or two semesters', icon: 'Plane' },
      { value: 'degree', label: 'A full degree', desc: 'Bachelor, master’s or PhD', icon: 'GraduationCap' },
    ],
  },
  {
    key: 'jobStatus',
    label: 'Job',
    prompt: 'Do you have a job in Denmark yet?',
    hint: 'With an offer we focus on your contract and tax card. Without one, on finding work.',
    when: d => d.moveReason === 'work',
    choices: [
      { value: 'offer', label: 'Yes, I have an offer', desc: 'Contract signed or on the way', icon: 'CircleCheck' },
      { value: 'looking', label: 'Not yet', desc: 'I’m looking for work', icon: 'Search' },
    ],
  },
  {
    key: 'residencyGroup',
    label: 'Citizenship',
    prompt: 'Which citizenship will you use in Denmark?',
    hint: 'Nordic, EU and other citizens follow different residence rules. If you have several, pick the one you’ll use.',
    choices: [
      { value: 'nordic', label: 'Nordic', desc: 'Denmark, Finland, Iceland, Norway or Sweden', icon: 'Flag' },
      {
        value: 'eu-eea',
        label: 'EU, EEA or Swiss',
        desc: 'Any other EU or EEA country, or Switzerland',
        icon: 'UsersRound',
      },
      { value: 'non-eu', label: 'Another country', desc: 'For example the US, India or Brazil', icon: 'Globe' },
    ],
  },
  {
    key: 'city',
    label: 'City',
    prompt: 'Which city will you call home?',
    hint: 'We’ll point you to your local International House or citizen service.',
    choices: Object.entries(CITY_LABELS).map(([value, label]) => ({
      value,
      label: value === 'other' ? 'Somewhere else' : label,
      icon: value === 'other' ? 'House' : 'MapPin',
    })),
  },
  {
    key: 'stage',
    label: 'Your move',
    prompt: 'Where are you in your move?',
    hint: 'We’ll put the time-sensitive steps first.',
    choices: [
      { value: 'planning', label: 'Still planning', desc: 'Moving in more than a month', icon: 'Compass' },
      { value: 'soon', label: 'Arriving soon', desc: 'Within the next month', icon: 'Plane' },
      { value: 'arrived', label: 'Already here', desc: 'I live in Denmark now', icon: 'MapPin' },
    ],
  },
  {
    key: 'housing',
    label: 'Home',
    prompt: 'Do you have a place to live?',
    hint: 'You need an address to register for a CPR number, so this shapes your first steps.',
    choices: [
      { value: 'searching', label: 'Not yet', desc: 'Still looking', icon: 'Search' },
      { value: 'temporary', label: 'A temporary place', desc: 'Hostel, short let or friends', icon: 'BedDouble' },
      { value: 'settled', label: 'Yes, a long-term home', desc: 'Lease signed or arranged', icon: 'House' },
    ],
  },
  {
    key: 'household',
    label: 'Moving with',
    prompt: 'Who’s moving with you?',
    hint: 'Partners and children have registrations of their own, and we’ll add them to your plan.',
    choices: [
      { value: 'solo', label: 'Just me', icon: 'User' },
      { value: 'partner', label: 'My partner', icon: 'Heart' },
      { value: 'kids', label: 'My children', icon: 'Baby' },
      { value: 'partner-kids', label: 'Partner and children', icon: 'UsersRound' },
    ],
  },
  {
    key: 'cprStage',
    label: 'CPR number',
    prompt: 'Where are you with your CPR number?',
    hint: 'The CPR number is Denmark’s personal ID number. Most other steps need it, so your plan works around it.',
    askIf: d => d.stage !== 'planning',
    choices: [
      { value: 'none', label: 'Not started', desc: 'No appointment yet', icon: 'Circle' },
      {
        value: 'booked',
        label: 'Appointment booked',
        desc: 'With International Citizen Service or Borgerservice',
        icon: 'CalendarDays',
      },
      { value: 'waiting', label: 'Registered, waiting for it', desc: 'I’ve been to my appointment', icon: 'Clock3' },
      { value: 'have', label: 'I have my CPR number', icon: 'CircleCheck' },
    ],
  },
];
