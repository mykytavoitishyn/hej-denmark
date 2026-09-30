import type { Sampler } from '../global.js';
import { buildTurns, offlineAnswer, parseAnswer, SAMPLE_OFF, stripSources } from '../lib/assistant.js';
import { isWide, uid } from '../lib/dom.js';
import { eventsIn } from '../lib/event-feed.js';
import { eventCity } from '../lib/events.js';
import { md } from '../lib/markdown.js';
import { withLiveStage } from '../lib/stage.js';
import { render } from '../render.js';
import { saveGuestData } from '../state/session.js';
import { S } from '../state/state.js';
import type { Answer, AskMessage, EventItem, Profile } from '../types.js';
import { askThreadHTML, scrollChat } from '../views/ask.js';

let samplePromise: Promise<Sampler | null> | null = null;

/**
 * The optional live language model. It exists only when the page is hosted where Claude's runtime provides
 * `window.claude`. Everywhere else this resolves to null and Ask Hej answers from built-in guidance.
 */
export function getSample(): Promise<Sampler | null> {
  if (!samplePromise) {
    const use = window.claude?.use;
    samplePromise = typeof use === 'function' ? use('sample').catch(() => null) : Promise.resolve(null);
  }
  return samplePromise;
}

const errorCode = (e: unknown): string | undefined =>
  e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : undefined;

const cityEventsFor = (profile: Profile): EventItem[] => eventsIn(S.events.feed, eventCity(profile.city));

async function answerQuestion(question: string, prior: AskMessage[], profile: Profile): Promise<Answer> {
  const events = cityEventsFor(profile);
  const sample = S.sampleOff ? null : await getSample();
  if (!sample) return offlineAnswer(question, profile, S.plan, events);
  try {
    const { text } = await sample(buildTurns(question, prior, profile, S.plan, events), {
      cache: false,
      onText: ({ text }) => streamTo(stripSources(text)),
    });
    return parseAnswer(text);
  } catch (e) {
    const code = errorCode(e);
    if (code && SAMPLE_OFF.has(code)) {
      S.sampleOff = true;
      return offlineAnswer(question, profile, S.plan, events);
    }
    throw e;
  }
}

function streamTo(text: string): void {
  if (!S.ask.pending || !text) return;
  S.ask.streaming = text;
  if (S.route.name !== 'ask') return;
  const el = document.getElementById('ask-stream');
  if (el) el.innerHTML = md(text);
  else {
    const log = document.getElementById('chat-log');
    if (log) log.innerHTML = askThreadHTML();
  }
  scrollChat();
}

const saveAsk = (): void => saveGuestData('ask', S.askHistory.slice(-40));

/** Sends a question to Ask Hej and records the answer. With `addUser` false it retries the last question. */
export async function sendQuestion(q: string, addUser = true): Promise<void> {
  const question = String(q || '').trim();
  const profile = S.profile && withLiveStage(S.profile);
  if (!question || S.ask.pending || !profile) return;
  const prior = addUser ? S.askHistory.slice() : S.askHistory.slice(0, -1);
  if (addUser) {
    S.askHistory.push({ id: uid('user'), role: 'user', text: question });
    saveAsk();
  }
  S.ask.pending = true;
  S.ask.streaming = '';
  S.ask.error = null;
  S.ask.input = '';
  if (S.route.name === 'ask') render();
  try {
    const res = await answerQuestion(question, prior, profile);
    S.askHistory.push({
      id: uid('assistant'),
      role: 'assistant',
      text: res.answer,
      sources: res.sources,
      offline: Boolean(res.offline),
    });
    saveAsk();
  } catch (e) {
    if (errorCode(e) !== 'cancelled') S.ask.error = question;
  } finally {
    S.ask.pending = false;
    S.ask.streaming = '';
    if (S.route.name === 'ask') {
      render();
      if (isWide()) document.getElementById('ask-input')?.focus({ preventScroll: true });
    }
  }
}
