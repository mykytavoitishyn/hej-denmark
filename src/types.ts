import type { IconName } from './data/icons.js';

export type MoveReason = 'student' | 'work' | 'other';
export type ResidencyGroup = 'eu-eea' | 'non-eu';
export type CityId = 'copenhagen' | 'aarhus' | 'odense' | 'aalborg' | 'other';
export type Priority = 'Urgent' | 'Soon' | 'Later';
export type EventCategory =
  'music' | 'culture' | 'food' | 'social' | 'outdoors' | 'sport' | 'learning' | 'family' | 'other';
export type WhenFilter = 'all' | 'today' | 'weekend' | 'week';

export interface Profile {
  move_reason: MoveReason;
  residency_group: ResidencyGroup;
  city: CityId;
  has_cpr: boolean;
  arrival_date: string | null;
  onboarding_completed?: boolean;
}

export interface Office {
  name: string;
  url: string;
}

export interface OfficialLink {
  url: string;
  label: string;
}

export interface Step {
  id: number;
  slug: string;
  title: string;
  description: string;
  tip: string;
  applies_to: {
    move_reason?: MoveReason[];
    residency_group?: ResidencyGroup[];
    city?: CityId[];
    has_cpr?: boolean[];
  };
  requires: number[];
  why_matters: string;
  checklist: { id: string; label: string }[];
  office_by_city: Partial<Record<CityId, Office>>;
  time_needed: string | null;
  official_links: OfficialLink[];
}

/** A step as it appears in one person's plan, with progress and lock state. */
export interface PlanStep extends Step {
  completed: boolean;
  locked: boolean;
  /** Ids of prerequisite steps that are in the plan but not done yet. */
  unmet: number[];
}

export interface PhaseDef {
  id: string;
  title: string;
  intro: string;
  slugs: string[];
}

export interface Phase extends PhaseDef {
  steps: PlanStep[];
}

export interface PlanSummary {
  completed: number;
  total: number;
  percentage: number;
  currentPhase: Phase | null;
  nextStep: PlanStep | null;
}

export interface EventItem {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  dateLabel: string;
  timeLabel: string;
  location: string;
  category: EventCategory;
  sourceUrl: string;
  sourceName: string;
  isFallback: boolean;
}

/** One row of the bundled event snapshot: id, title, start (ISO), date label, time label, location, category. */
export type EventRow = [string, string, string, string, string, string, EventCategory];

export interface Source {
  title: string;
  url: string;
}

export interface AskMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: Source[];
  offline?: boolean;
}

export interface Answer {
  answer: string;
  sources: Source[];
  offline?: boolean;
}

export interface Turn {
  role: 'user' | 'assistant';
  content: string;
}

export interface Reminder {
  stepId: number;
  remindAt: string;
  notificationId: string | null;
}

export type RouteName =
  'home' | 'start' | 'saving' | 'login' | 'today' | 'journey' | 'step' | 'ask' | 'events' | 'profile';
export type Route = { name: Exclude<RouteName, 'step'> } | { name: 'step'; id: number };

export interface Choice {
  value: string;
  label: string;
  icon?: IconName;
}

export type QuestionKey = 'moveReason' | 'residencyGroup' | 'city' | 'hasCpr';

export interface Question {
  key: QuestionKey;
  prompt: string;
  choices: Choice[];
}

/** Answers collected while building or editing a profile. */
export interface ProfileDraft {
  moveReason?: MoveReason;
  residencyGroup?: ResidencyGroup;
  city?: CityId;
  hasCpr?: boolean;
}

export interface ProfileEdit extends ProfileDraft {
  arrivalDate: string | null;
}

export interface EventsState {
  profileCity: CityId | null;
  city: CityId;
  when: WhenFilter;
  cat: EventCategory | 'all';
  savedOnly: boolean;
  loading: boolean;
  notice: string | null;
}

export interface Toast {
  screen: string;
  text: string;
  kind: 'check' | 'sparkles';
  tok: object;
}

export interface State {
  guestId: string | null;
  profile: Profile | null;
  done: Set<number>;
  checklist: Record<string, string[]>;
  reminders: Reminder[];
  saved: EventItem[];
  askHistory: AskMessage[];
  plan: PlanStep[];
  route: Route;
  scroll: Record<string, number>;
  onb: { i: number; draft: ProfileDraft };
  gateNote: string | null;
  pe: ProfileEdit | null;
  peError: string | null;
  jf: { urgent: boolean; hideDone: boolean };
  openPhases: Set<string> | null;
  phaseKey: string | null;
  selStep: number | null;
  ev: EventsState | null;
  ask: { pending: boolean; streaming: string; error: string | null; input: string };
  todayAsk: string;
  toast: Toast | null;
  lastPct: number;
  stepError: string | null;
  todayError: string | null;
  sampleOff: boolean;
}
