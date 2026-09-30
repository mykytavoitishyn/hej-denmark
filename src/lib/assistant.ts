import {
  CITY_LABELS,
  HOUSEHOLD_LABELS,
  HOUSING_LABELS,
  JOB_LABELS,
  MOVE_LABELS,
  RES_LABELS,
  STAGE_LABELS,
  STUDY_LABELS,
} from '../data/labels.js';
import { OFFICIAL } from '../data/links.js';
import { STEPS } from '../data/plan.js';
import type { Answer, AskMessage, CityId, EventItem, PlanStep, Profile, Source, Turn } from '../types.js';
import { hostOf, isOfficial } from './dom.js';
import { dateLabel, timeLabel } from './event-feed.js';
import { nextStep, planSummary, prio } from './plan.js';

const eventLine = (e: EventItem): string =>
  `${e.title} (${dateLabel(e)} · ${timeLabel(e)}${e.venue ? `, ${e.venue}` : ''})`;

/**
 * Builds the conversation sent to the language model: instructions and context first, then recent history,
 * then the question. `events` are the upcoming listings in the person's city.
 */
export function buildTurns(
  question: string,
  prior: AskMessage[],
  p: Profile,
  plan: PlanStep[],
  events: EventItem[] = [],
): Turn[] {
  const eventLines = events
    .slice(0, 6)
    .map(e => `- ${eventLine(e)}`)
    .join('\n');
  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const planLines = plan
    .map(
      s =>
        `- ${s.title}: ${s.completed ? 'done' : s.locked ? 'locked until an earlier step is done' : 'to do'}, ${prio(s)}`,
    )
    .join('\n');
  const rules = `You are Hej, the assistant inside Hej Denmark, which gives newcomers a calm, personal plan for settling into life in Denmark.

Answer the newcomer's latest message, using their profile and plan below.
- Be warm, practical and brief: under 170 words, in short paragraphs or a short list.
- Format: plain text with optional **bold**, "- " bullets and [text](url) links. No headings, tables or emoji.
- Rules and processing times change. When you are unsure, say so and point to the official page. Never invent prices, phone numbers, opening hours or deadlines.
- Never ask for passwords, MitID codes or full CPR numbers.
- When it helps, connect the answer to their plan: what to do next and what it unlocks.
- For questions about what's on, use the events list below.

End your reply with one final line that starts with "SOURCES:" followed by up to 3 URLs, separated by spaces, taken only from this list and only when they back up the answer. If none fit, write "SOURCES: none".
${OFFICIAL.map(([u, t]) => `${u} (${t})`).join('\n')}

Today: ${today}
Profile: ${p.name ? `name: ${p.name}; ` : ''}reason for moving: ${MOVE_LABELS[p.move_reason]}${p.study_type ? ` (${STUDY_LABELS[p.study_type]})` : ''}${p.job_status ? ` (${JOB_LABELS[p.job_status]})` : ''}; citizenship: ${RES_LABELS[p.residency_group]}; home city: ${p.city === 'other' ? 'another Danish city' : CITY_LABELS[p.city]}; where they are in the move: ${STAGE_LABELS[p.stage]}; home: ${HOUSING_LABELS[p.housing]}; moving with: ${HOUSEHOLD_LABELS[p.household]}; CPR number: ${p.has_cpr ? 'yes' : 'not yet'}; arrival date: ${p.arrival_date || 'not set'}.
Their plan, in order:
${planLines}
Events in ${p.city === 'other' ? 'Denmark' : CITY_LABELS[p.city]}:
${eventLines || '- none listed'}`;
  return [
    { role: 'user', content: rules },
    ...prior.slice(-8).map(m => ({ role: m.role, content: m.text })),
    { role: 'user', content: question },
  ];
}
/** Hides the trailing SOURCES line, including a half-streamed one, from text that is still arriving. */
export function stripSources(t: string): string {
  const i = t.search(/\n\s*\**\s*SOURCES\b/i);
  let out = i >= 0 ? t.slice(0, i) : t;
  out = out.replace(/\n\s*\**\s*S(?:O(?:U(?:R(?:C(?:E(?:S)?)?)?)?)?)?\s*$/i, '');
  return out.trimEnd();
}
export function parseAnswer(text: string): Answer {
  const m = text.match(/^([\s\S]*?)\n\s*\**\s*SOURCES\**\s*:?([\s\S]*)$/i);
  const answer = (m ? m[1] : text).trim();
  const urls = ((m ? m[2] : '').match(/https?:\/\/[^\s)>\]]+/g) || []).map(u => u.replace(/[.,;]+$/, ''));
  const seen = new Set(),
    sources = [];
  for (const u of urls) {
    if (!isOfficial(u) || seen.has(u)) continue;
    seen.add(u);
    sources.push({ title: hostOf(u), url: u });
    if (sources.length === 3) break;
  }
  return { answer: answer || 'I don’t have a good answer for that yet. Try asking it another way.', sources };
}
const src = (url: string): Source => ({ title: hostOf(url), url });
function officeFor(city: CityId) {
  return STEPS.find(s => s.slug === 'city-services')?.office_by_city[city] || null;
}
/** Answers common questions from built-in guidance when no language model is available. */
export function offlineAnswer(q: string, p: Profile, plan: PlanStep[], events: EventItem[] = []): Answer {
  const t = q.toLowerCase();
  const cityName = p.city === 'other' ? 'your city' : CITY_LABELS[p.city];
  const office = officeFor(p.city);
  const officeLine = office ? `\n\nIn ${cityName}, start with **${office.name}**.` : '';
  const topics: [RegExp, () => Answer][] = [
    [
      /next step|what should i do|this week|where (do|should) i start|what now/,
      () => {
        const n = nextStep(plan),
          sum = planSummary(plan);
        if (!n)
          return {
            answer:
              'You’ve finished every step in your plan. Nice work! Keep an eye on Digital Post and your city’s events to keep settling in.',
            sources: [],
          };
        return {
          answer: `Your next step is **${n.title}** (${prio(n)}).\n\n${n.description}\n\nYou’ve done ${sum.completed} of ${sum.total} steps. Open it in Journey for the checklist, where to go and official links.`,
          sources: (n.official_links || []).map(l => src(l.url)),
        };
      },
    ],
    [
      /\bcpr\b|personal (id|number)/,
      () => ({
        answer: `Your CPR number is Denmark’s personal ID number, and most other steps depend on it.\n\nYou apply by registering your address with your municipality once you meet the requirements for your stay. Bring:\n- Housing documentation for your registered address\n- Residence documentation that applies to your stay\n- The original documents your municipality asks for${officeLine}\n\nWith a CPR number you can set up MitID, a bank account and your yellow health card.`,
        sources: [src('https://lifeindenmark.borger.dk/theme/when-you-arrive'), ...(office ? [src(office.url)] : [])],
      }),
    ],
    [
      /mitid|nemid|digital id/,
      () => ({
        answer: `MitID is Denmark’s digital ID. You use it for public self-service, banking and Digital Post.\n\nYou normally need a CPR number first. Then set it up through the official MitID channels or at citizen service.\n\nUse only official MitID channels and never share your approval codes with anyone.`,
        sources: [
          src('https://www.mitid.dk/en-gb/'),
          src('https://lifeindenmark.borger.dk/apps-and-digital-services/mitid'),
        ],
      }),
    ],
    [
      /room|housing|apartment|flat|rent|landlord|deposit|scam|address/,
      () => ({
        answer: `Look for a place where you can register your address, because CPR registration normally needs a valid Danish address.\n\nTo stay safe:\n- Never transfer a deposit before you’ve verified the landlord, the contract and the property.\n- Be careful with offers that look too cheap or push you to pay fast.\n- Get a written contract before you pay anything.`,
        sources: [src('https://lifeindenmark.borger.dk/housing-and-moving')],
      }),
    ],
    [
      /bank|nemkonto|account/,
      () => ({
        answer: `Danish banks usually ask for ID, a CPR number and proof of address, and sometimes tax or income documents. Requirements differ between banks, so check with the bank before you book a meeting.\n\nOnce you have an account, you can make it your NemKonto, the account where public payments land.`,
        sources: [src('https://lifeindenmark.borger.dk/money-and-tax')],
      }),
    ],
    [
      /tax|skat|salary|payslip/,
      () => ({
        answer: `When you start working, check your tax card and preliminary income assessment (forskudsopgørelse) with the Danish Tax Agency.\n\nWithout a tax card, your employer withholds 55% tax, so it’s worth sorting out early. If your situation is unclear, contact the Danish Tax Agency.`,
        sources: [src('https://skat.dk/en-us/individuals')],
      }),
    ],
    [
      /doctor|health|yellow card|sundhedskort|sick/,
      () => ({
        answer: `After CPR registration you’re assigned a doctor and get the yellow health card (sundhedskort).\n\nCheck that your address and doctor are right. The physical card may arrive by post, so put your name on the mailbox.`,
        sources: [src('https://lifeindenmark.borger.dk/healthcare')],
      }),
    ],
    [
      /digital post|e-boks|letters?\b/,
      () => ({
        answer: `Public authorities send important letters through Digital Post. Once you’re registered and have MitID, check it regularly and turn on notifications so deadlines don’t surprise you.`,
        sources: [src('https://lifeindenmark.borger.dk/apps-and-digital-services/Digital-Post')],
      }),
    ],
    [
      /kommune|municipality|borgerservice|write to/,
      () => ({
        answer: `Here’s a short message you can adapt:\n\nDear Borgerservice,\nI moved to ${cityName} on [date] and would like to [register my address / book a time for a CPR number]. My name is [full name] and my address is [address]. Could you tell me which documents to bring and how to book a time?\nKind regards,\n[Name]${office ? `\n\nSend it through the contact options on the official page for **${office.name}**.` : ''}`,
        sources: office
          ? [src(office.url)]
          : [src('https://lifeindenmark.borger.dk/settle-in-denmark/ics-international-citizen-service')],
      }),
    ],
    [
      /work while studying|student job|part[- ]time|work (as a|while)/,
      () => ({
        answer: `It depends on your citizenship. EU/EEA citizens can generally work in Denmark while studying.\n\nIf you’re from outside the EU/EEA, your residence permit sets whether and how much you can work. On a state-approved higher education programme, that’s usually up to 90 hours a month, and full time in June, July and August. Check your own permit before you take a job.`,
        sources: [
          src(
            'https://www.nyidanmark.dk/en-GB/Words-and-concepts/SIRI/Work-permits-for-students-in-higher-educational-programmes',
          ),
        ],
      }),
    ],
    [
      /event|weekend|what'?s on|what’s on|things to do|concert|museum/,
      () => {
        const list = events.filter(e => e.kind === 'event').slice(0, 3);
        return {
          answer: list.length
            ? `Coming up in ${p.city === 'other' ? 'Denmark' : cityName}:\n${list.map(e => `- **${e.title}**, ${dateLabel(e)} · ${timeLabel(e)}${e.venue ? `, ${e.venue}` : ''}`).join('\n')}\n\nSee more and save favourites in Events.`
            : 'I don’t see upcoming events right now. Try Events for another city or date.',
          sources: [src('https://www.kultunaut.dk/UK/')],
        };
      },
    ],
    [
      /friend|social|lonely|meet people|community/,
      () => ({
        answer: `A few easy ways in:\n- Join a club or association (forening) for something you already enjoy\n- Try a Danish conversation café\n- ${p.move_reason === 'student' ? 'Go to student association events and Friday bars at your university' : 'Say yes to after-work plans with colleagues'}\n- Check Events for meetups in ${p.city === 'other' ? 'your area' : cityName}`,
        sources: [src('https://www.kultunaut.dk/UK/')],
      }),
    ],
    [
      /danish class|learn danish|language/,
      () => ({
        answer: `Danish classes (danskuddannelse) are arranged through your municipality once you’re registered. Check your municipality’s website or Life in Denmark for how to sign up.`,
        sources: [src('https://lifeindenmark.borger.dk/leisure-and-networking/danish-language-training')],
      }),
    ],
    [
      /residence|registration certificate|registreringsbevis|permit|visa/,
      () => ({
        answer:
          p.residency_group === 'eu-eea'
            ? `If you’re staying in Denmark under EU rules, check whether you need an EU residence document before you apply for your CPR number. International Citizen Service can often help you combine appointments.`
            : `As a non-EU citizen, your residence permit decides what you can do in Denmark. Check the requirements that apply to your citizenship and reason for moving before you start other registrations, and keep copies of every confirmation.`,
        sources:
          p.residency_group === 'eu-eea'
            ? [src('https://lifeindenmark.borger.dk/theme/before-moving')]
            : [src('https://www.nyidanmark.dk/')],
      }),
    ],
    [
      /^(hej|hi|hello|hey|goddag|godmorgen)\b/,
      () => ({
        answer: `Hej! I’m here to help you settle in ${cityName}. Ask me about your next step, housing, CPR, MitID, work, or what’s on this week.`,
        sources: [],
      }),
    ],
  ];
  for (const [re, fn] of topics) if (re.test(t)) return { ...fn(), offline: true };
  return {
    answer: `I don’t have a ready answer for that here. Life in Denmark, the official guide for newcomers, covers most settling-in questions, and your Journey shows the steps that apply to you.`,
    sources: [src('https://lifeindenmark.borger.dk/settle-in-denmark')],
    offline: true,
  };
}
export const SAMPLE_OFF = new Set([
  'not_granted',
  'sampling_disabled',
  'not_declared',
  'capability_disabled',
  'capability_removed',
  'invalid_request',
  'prompt_too_large',
  'transform_error',
  'queue_overflow',
  'tools_unavailable',
  'images_unavailable',
]);
