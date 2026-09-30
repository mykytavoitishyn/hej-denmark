import type { IconName } from './data/icons.js';

export type MoveReason = 'student' | 'work' | 'family' | 'other';
/** Nordic citizens, EU/EEA and Swiss citizens, and everyone else follow different residence rules. */
export type ResidencyGroup = 'nordic' | 'eu-eea' | 'non-eu';
export type CityId = 'copenhagen' | 'aarhus' | 'odense' | 'aalborg' | 'other';
/** How far along the move is: still planning, arriving within about a month, or already in Denmark. */
export type Stage = 'planning' | 'soon' | 'arrived';
export type HousingStatus = 'searching' | 'temporary' | 'settled';
export type Household = 'solo' | 'partner' | 'kids' | 'partner-kids';
export type StudyType = 'exchange' | 'degree';
export type JobStatus = 'offer' | 'looking';
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
  stage: Stage;
  housing: HousingStatus;
  household: Household;
  /** Only set for students. */
  study_type: StudyType | null;
  /** Only set for people moving for work. */
  job_status: JobStatus | null;
  /** What Hej calls you. Optional, so it can be empty. */
  name: string;
  onboarding_completed?: boolean;
}

export type AvatarColor = 'green' | 'sage' | 'sand' | 'rose' | 'sky' | 'clay';
/** A profile picture: an emoji on a coloured background, or a small photo kept on this device. */
export type Avatar = { kind: 'emoji'; value: string; color: AvatarColor } | { kind: 'photo'; value: string };

export interface Office {
  name: string;
  url: string;
}

export interface OfficialLink {
  url: string;
  label: string;
}

/** Conditions a step applies under. Every listed field must match; a missing field matches everyone. */
export interface AppliesTo {
  move_reason?: MoveReason[];
  residency_group?: ResidencyGroup[];
  city?: CityId[];
  has_cpr?: boolean[];
  stage?: Stage[];
  housing?: HousingStatus[];
  household?: Household[];
  study_type?: StudyType[];
  job_status?: JobStatus[];
}

export interface Step {
  id: number;
  slug: string;
  title: string;
  description: string;
  tip: string;
  applies_to: AppliesTo;
  requires: number[];
  why_matters: string;
  /** When in the move this usually happens, for example “Before you move” or “Within 5 days”. */
  timing: string;
  checklist: { id: string; label: string }[];
  office_by_city: Partial<Record<CityId, Office>>;
  time_needed: string | null;
  official_links: OfficialLink[];
}

/** A step as it appears in one person's plan, with progress and lock state. */
export interface PlanStep extends Step {
  completed: boolean;
  /** Marked “not relevant for me”. Skipped steps don't count towards progress or block other steps. */
  skipped: boolean;
  locked: boolean;
  /** Ids of prerequisite steps that are in the plan but not done yet. */
  unmet: number[];
  priority: Priority;
}

export interface PhaseDef {
  id: string;
  title: string;
  intro: string;
  icon: IconName;
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

/** Whether an event happens at a point in time, or runs over a longer period like an exhibition. */
export type EventKind = 'event' | 'ongoing';

export interface EventItem {
  id: string;
  title: string;
  /** ISO 8601 date-time with an offset or Z. */
  startsAt: string;
  endsAt: string | null;
  /** The source only gave a date, not a time. */
  allDay: boolean;
  kind: EventKind;
  venue: string;
  city: CityId;
  category: EventCategory;
  url: string;
  sourceId: string;
  sourceName: string;
  isFree: boolean | null;
}

export interface EventSourceInfo {
  id: string;
  name: string;
  url: string;
}

/** The events file the site loads: normalised events from every source, and when they were fetched. */
export interface EventFeed {
  version: 1;
  generatedAt: string;
  sources: EventSourceInfo[];
  events: EventItem[];
}

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

export type BudgetRole = 'study' | 'work';
export type BudgetCitizen = 'eu' | 'non-eu';
export type BudgetHome = 'dorm' | 'room' | 'studio' | 'flat1' | 'flat2';
export type BudgetTransport = 'bike' | 'mix' | 'pass';
/** How much someone spends on food, or on going out. */
export type BudgetLevel = 'low' | 'mid' | 'high';
export type BudgetExtra = 'phone' | 'insurance' | 'gym' | 'streaming' | 'trips' | 'akasse';

/** Everything the budget calculator asks. Amounts are whole kroner a month. */
export interface BudgetInputs {
  role: BudgetRole;
  /** EU, EEA, Swiss or Nordic citizens, or everyone else, who needs a residence permit and rarely gets SU. */
  citizen: BudgetCitizen;
  /** Already living in Denmark. Before arriving, the money needed to move in matters most. */
  arrived: boolean;
  /** Rent and bills are split with a partner. */
  shared: boolean;
  home: BudgetHome;
  /** Rent for the whole home. */
  rent: number;
  billsIncluded: boolean;
  transport: BudgetTransport;
  food: BudgetLevel;
  social: BudgetLevel;
  extras: BudgetExtra[];
  /** Any other monthly costs. */
  other: number;
  /** Salary before tax. Only used when working. */
  salary: number;
  researcher: boolean;
  /** Gets SU, the state education grant. Only used when studying. */
  su: boolean;
  jobHours: number;
  wage: number;
  /** Savings, family or a scholarship, already after tax. */
  otherIncome: number;
}

export type RouteName =
  | 'home'
  | 'start'
  | 'saving'
  | 'login'
  | 'today'
  | 'journey'
  | 'step'
  | 'ask'
  | 'events'
  | 'housing'
  | 'budget'
  | 'profile';
export type Route = { name: Exclude<RouteName, 'step'> } | { name: 'step'; id: number };

export interface Choice {
  value: string;
  label: string;
  /** A short second line under the label. */
  desc?: string;
  /** A short value at the end of the row, such as a price. */
  aside?: string;
  icon?: IconName;
}

export type QuestionKey =
  'moveReason' | 'studyType' | 'jobStatus' | 'residencyGroup' | 'city' | 'stage' | 'housing' | 'household' | 'hasCpr';

export interface Question {
  key: QuestionKey;
  prompt: string;
  /** Why we ask, shown under the question. */
  hint: string;
  /** The short name used in summaries, for example “Moving for”. */
  label: string;
  choices: Choice[];
  /** Ask this question only when the earlier answers make it relevant. */
  when?: (d: ProfileDraft) => boolean;
  /** Ask it in the plan builder only when this holds too. The profile editor always shows it. */
  askIf?: (d: ProfileDraft) => boolean;
}

/** Answers collected while building or editing a profile. */
export interface ProfileDraft {
  moveReason?: MoveReason;
  studyType?: StudyType;
  jobStatus?: JobStatus;
  residencyGroup?: ResidencyGroup;
  city?: CityId;
  stage?: Stage;
  housing?: HousingStatus;
  household?: Household;
  hasCpr?: boolean;
}

export interface ProfileEdit extends ProfileDraft {
  arrivalDate: string | null;
  name: string;
}

export interface EventsState {
  profileCity: CityId | null;
  city: CityId;
  when: WhenFilter;
  cat: EventCategory | 'all';
  savedOnly: boolean;
  notice: string | null;
}

/** The events feed and where loading it has got to. A failed refresh keeps the last feed that loaded. */
export interface FeedState {
  feed: EventFeed | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
}

export type HousingKind = 'official' | 'student' | 'nonprofit' | 'portal' | 'community' | 'temporary';

export interface HousingState {
  city: CityId;
  kind: HousingKind | 'all';
}

export interface Toast {
  screen: string;
  text: string;
  kind: 'check' | 'sparkles' | 'badge' | 'level';
  tok: object;
}

export interface State {
  guestId: string | null;
  profile: Profile | null;
  avatar: Avatar | null;
  done: Set<number>;
  skipped: Set<number>;
  checklist: Record<string, string[]>;
  reminders: Reminder[];
  saved: EventItem[];
  askHistory: AskMessage[];
  plan: PlanStep[];
  route: Route;
  scroll: Record<string, number>;
  /**
   * Plan builder: the position among the questions that apply (one past the last is the review screen),
   * the answers so far, and which way the last move went, for the slide animation.
   */
  onb: { i: number; draft: ProfileDraft; name: string; arrivalDate: string | null; dir: 'fwd' | 'back' | null };
  gateNote: string | null;
  pe: ProfileEdit | null;
  peError: string | null;
  /** The avatar picker on the profile page is open. */
  avatarOpen: boolean;
  /** Why the last photo couldn't be used, shown in the avatar picker. */
  avatarError: string | null;
  jf: { urgent: boolean; hideDone: boolean };
  openPhases: Set<string> | null;
  phaseKey: string | null;
  selStep: number | null;
  ev: EventsState | null;
  events: FeedState;
  hs: HousingState | null;
  /** The budget calculator's answers. Null until the calculator is opened, then filled in from the profile. */
  bud: BudgetInputs | null;
  ask: { pending: boolean; streaming: string; error: string | null; input: string };
  todayAsk: string;
  toast: Toast | null;
  lastPct: number;
  stepError: string | null;
  todayError: string | null;
  sampleOff: boolean;
  /** Set right after the plan is built, so the Journey can welcome the person once. */
  welcome: boolean;
}
