import { CITY_LABELS, MOVE_LABELS, RES_LABELS } from '../data/labels.js';
import { HELP_LINKS } from '../data/links.js';
import { promptsFor } from '../data/prompts.js';
import { esc, ext, icon, isOfficial } from '../lib/dom.js';
import { md } from '../lib/markdown.js';
import { nextStep } from '../lib/plan.js';
import { S, requireProfile } from '../state/state.js';
import type { AskMessage } from '../types.js';
import { goLink } from './shared.js';

const botAvatar = `<span class="bot-avatar" aria-hidden="true">${icon('Sparkles', 16, 'var(--green)')}</span>`;
function botMsg(m: AskMessage): string {
  const src = (m.sources || []).filter(s => isOfficial(s.url));
  return `<div class="msg msg-bot">${botAvatar}<div class="answer"><div class="md">${md(m.text)}</div>${src.length ? `<div class="sources"><p class="tiny strong muted">Official references</p>${src.map(s => `<a class="source-link" href="${esc(s.url)}" ${ext} aria-label="Open official source: ${esc(s.title)}"><span class="clamp1">${esc(s.title)}</span>${icon('ArrowUpRight', 15, 'var(--green)')}</a>`).join('')}</div>` : ''}${m.offline ? `<p class="tiny muted">Answered from the Hej guide</p>` : ''}</div></div>`;
}
export function askThreadHTML() {
  const h = S.askHistory;
  let out = h.length
    ? ''
    : `<div class="chat-empty"><span class="icon-circle">${icon('Sparkles', 22, 'var(--green)')}</span><h2 class="h3">How can I help?</h2><p class="muted">Ask about your next step, housing, CPR, MitID, work, or settling in.</p></div>`;
  out += h
    .map(m => (m.role === 'user' ? `<div class="msg msg-user"><p class="bubble">${esc(m.text)}</p></div>` : botMsg(m)))
    .join('');
  if (S.ask.pending) {
    out += S.ask.streaming
      ? `<div class="msg msg-bot">${botAvatar}<div class="answer"><div class="md" id="ask-stream">${md(S.ask.streaming)}</div></div></div>`
      : `<div class="msg msg-bot">${botAvatar}<div class="answer waiting"><span class="spinner sm"></span><span class="muted">Finding an answer…</span></div></div>`;
  }
  if (S.ask.error)
    out += `<div class="card card-sm col gap12" style="border-color:var(--urgent)" role="alert"><div class="col gap4"><p class="strong danger">We couldn’t get an answer right now.</p><p class="tiny muted">Your question is saved. Check your connection and try again.</p></div><button class="btn btn-secondary btn-sm" style="align-self:flex-start" data-act="ask-retry">Try again</button></div>`;
  return out;
}
export function pageAsk() {
  const p = requireProfile(),
    busy = S.ask.pending,
    ready = S.ask.input.trim() && !busy,
    next = nextStep(S.plan);
  return `<div class="container">
    <div class="page-head compact"><div class="col gap10"><p class="eyebrow">Ask Hej</p><h1 class="h1">Ask anything about settling in</h1><p class="lead">Hej knows your plan and points you to official sources.</p></div></div>
    <div class="ask-layout">
      <section class="card chat" aria-label="Conversation with Hej">
        <div class="chat-log" id="chat-log" aria-live="polite">${askThreadHTML()}</div>
        <div class="chat-compose">
          <div class="suggestions">${promptsFor(p)
            .map(
              q =>
                `<button class="chip" data-act="ask-chip" data-q="${esc(q)}"${busy ? ' disabled' : ''}>${esc(q)}</button>`,
            )
            .join('')}</div>
          <form class="compose-row" data-form="ask">
            <label class="sr-only" for="ask-input">Your question</label>
            <input id="ask-input" class="input" type="text" placeholder="Ask about life in Denmark" maxlength="2000" autocomplete="off" enterkeyhint="send" value="${esc(S.ask.input)}"${busy ? ' disabled' : ''}>
            <button type="submit" id="ask-send" class="btn btn-primary btn-icon" aria-label="Send question"${ready ? '' : ' disabled'}>${icon('Send', 19)}</button>
          </form>
        </div>
      </section>
      <aside class="ask-side">
        <div class="card card-sm">
          <p class="eyebrow">What Hej knows</p>
          <div style="margin-top:8px">
            <div class="kv"><span class="muted">City</span><span class="strong">${esc(CITY_LABELS[p.city])}</span></div>
            <div class="kv"><span class="muted">Moving for</span><span class="strong">${esc(MOVE_LABELS[p.move_reason])}</span></div>
            <div class="kv"><span class="muted">Moving from</span><span class="strong">${esc(RES_LABELS[p.residency_group])}</span></div>
            <div class="kv"><span class="muted">CPR number</span><span class="strong">${p.has_cpr ? 'Ready' : 'Not yet'}</span></div>
            <div class="kv"><span class="muted">Next step</span><span class="strong" style="text-align:right">${esc(next ? next.title : 'All done')}</span></div>
          </div>
          <div style="margin-top:12px">${goLink('profile', '<span>Edit profile</span>')}</div>
        </div>
        <div class="card card-sm">
          <p class="eyebrow">Official sources</p>
          <div class="side-links">${HELP_LINKS.map(([u, l]) => `<a href="${u}" ${ext}><span>${esc(l)}</span>${icon('ArrowUpRight', 15, 'var(--green)')}</a>`).join('')}</div>
        </div>
        <p class="tiny muted">Hej can make mistakes. Check the official page before you act on an answer.</p>
      </aside>
    </div>
  </div>`;
}

export function scrollChat() {
  const log = document.getElementById('chat-log');
  if (log) log.scrollTop = log.scrollHeight;
}
