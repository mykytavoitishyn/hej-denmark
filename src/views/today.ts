import { CAT_ICONS } from '../data/events.js';
import { CITY_LABELS, MOVE_LABELS, RES_LABELS } from '../data/labels.js';
import { promptsFor } from '../data/prompts.js';
import { esc, icon } from '../lib/dom.js';
import { cityEvents, eventCity } from '../lib/events.js';
import { planSummary, prio } from '../lib/plan.js';
import { arrivalMessage, dailyWord, greeting } from '../lib/today.js';
import { S, requireProfile } from '../state/state.js';
import type { EventItem } from '../types.js';
import { badge, goLink, ring, toastHTML } from './shared.js';

function miniEvent(e: EventItem): string {
  return `<a class="card mini-ev" href="#events" data-act="go" data-to="events" aria-label="${esc(`${e.title}, ${e.dateLabel} at ${e.timeLabel}. Open Events`)}">
    <span class="row gap10"><span class="icon-circle sm">${icon(CAT_ICONS[e.category] || 'CalendarDays', 18)}</span><span class="tiny strong">${esc(e.dateLabel)} · ${esc(e.timeLabel)}</span></span>
    <span class="h4 clamp2">${esc(e.title)}</span>
    <span class="loc">${icon('MapPin', 14, 'var(--muted)')}<span class="clamp1">${esc(e.location)}</span></span>
  </a>`;
}
export function pageToday() {
  const p = requireProfile(),
    sum = planSummary(S.plan),
    g = greeting(),
    word = dailyWord(),
    arr = arrivalMessage(p.arrival_date);
  const cityLabel = p.city === 'other' ? 'Denmark' : CITY_LABELS[p.city];
  const feed = cityEvents(eventCity(p.city)),
    events = feed.events.slice(0, 3);
  const reminders = S.reminders.filter(r => Date.parse(r.remindAt) >= Date.now());
  const next = sum.nextStep;
  const dateLine = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const upNext = next
    ? `
      <div class="row between gap12"><p class="eyebrow">Up next</p>${badge(prio(next))}</div>
      <h2 class="h3">${esc(next.title)}</h2>
      <p class="muted">${esc(next.description)}</p>
      <div class="row wrap gap10 mt-auto">
        <button class="btn btn-primary" data-act="today-done" data-id="${next.id}">${icon('Check', 18, 'currentColor', { stroke: 2.5 })}<span>Mark done</span></button>
        <a class="btn btn-secondary" href="#step-${next.id}" data-act="step" data-id="${next.id}">See details</a>
      </div>`
    : `<p class="eyebrow">Up next</p><h2 class="h3">Your journey is complete</h2><p class="muted">Every step in your plan is done. Keep an eye on Digital Post and on what’s happening in ${esc(cityLabel)}.</p>`;
  const remHTML = reminders.length
    ? `<section class="card span-12" aria-labelledby="rem-title"><h2 class="h3" id="rem-title" style="margin-bottom:8px">Reminders</h2>${reminders
        .map(r => {
          const st = S.plan.find(s => s.id === r.stepId);
          const when = new Date(r.remindAt).toLocaleString('en-DK', {
            weekday: 'short',
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
          });
          return `<a class="rem-row" href="#step-${r.stepId}" data-act="step" data-id="${r.stepId}">${icon('Bell', 18, 'var(--green)')}<span class="col min0 flex1"><span class="strong rem-title clamp1">${esc(st?.title ?? 'Journey step')}</span><span class="tiny muted">${esc(when)}</span></span>${icon('ArrowRight', 16, 'var(--muted)')}</a>`;
        })
        .join('')}</section>`
    : '';
  return `<div class="container">
    <div class="page-head">
      <div class="col gap10"><p class="eyebrow">${esc(dateLine)}</p><h1 class="h1">${esc(g.danish)} 👋</h1><p class="lead">${esc(g.english)}${arr ? ` · <span class="accent strong">${esc(arr)}</span>` : ''}</p></div>
      <a class="pill-link" href="#profile" data-act="go" data-to="profile">${icon('MapPin', 16, 'var(--sage)')}<span>${esc(cityLabel)} · ${esc(MOVE_LABELS[p.move_reason])} · ${esc(RES_LABELS[p.residency_group])}</span></a>
    </div>
    <div class="dash">
      <section class="card progress-card span-5" aria-label="Settling-in progress">
        ${ring(sum.percentage)}
        <div class="col gap6 min0">
          <p class="eyebrow">Settling-in progress</p>
          <h2 class="h3">${esc(sum.currentPhase?.title ?? 'Journey complete')}</h2>
          <p class="muted">${sum.completed} of ${sum.total} steps done</p>
          ${goLink('journey', '<span>View your journey</span>')}
        </div>
      </section>
      <section class="card upnext span-7" aria-label="Up next">${toastHTML('today')}${upNext}${S.todayError ? `<p class="danger" role="alert">${esc(S.todayError)}</p>` : ''}</section>
      ${remHTML}
      <section class="span-12 col gap16" aria-labelledby="week-title">
        <div class="row between wrap gap16"><h2 class="h3" id="week-title">🎈 This week in ${esc(cityLabel)}</h2>${goLink('events', '<span>See all events</span>')}</div>
        <div class="mini-grid">${events.length ? events.map(miniEvent).join('') : `<div class="card"><p>No upcoming events this week.</p><p class="muted">Check Events for another date or city.</p></div>`}</div>
        ${feed.usingFallback ? `<p class="tiny muted">Showing local ideas for now.</p>` : ''}
      </section>
      <section class="card word-card span-5" aria-labelledby="word-title">
        <h2 class="h3" id="word-title">🇩🇰 Today’s Danish</h2>
        <div class="row wrap gap10"><span class="h2" lang="da">${esc(word.word)}</span><span class="say-pill">Say it: ${esc(word.pronunciation)}</span></div>
        <p class="strong">${esc(word.meaning)}</p>
        <p class="word-example" lang="da">“${esc(word.example)}”</p>
      </section>
      <section class="card span-7 col gap16" aria-labelledby="ask-title">
        <h2 class="h3" id="ask-title">✨ Ask Hej anything</h2>
        <form class="compose-row" data-form="today-ask">
          <label class="sr-only" for="today-ask">Ask Hej a question</label>
          <input id="today-ask" class="input" type="text" placeholder="Ask about life in Denmark" maxlength="2000" autocomplete="off" enterkeyhint="send" value="${esc(S.todayAsk)}">
          <button type="submit" id="today-ask-send" class="btn btn-primary btn-icon" aria-label="Send question to Ask Hej"${S.todayAsk.trim() ? '' : ' disabled'}>${icon('ArrowRight', 19)}</button>
        </form>
        <div class="chip-row">${promptsFor(p)
          .slice(0, 3)
          .map(q => `<button class="chip" data-act="ask-chip" data-q="${esc(q)}">${esc(q)}</button>`)
          .join('')}</div>
      </section>
    </div>
  </div>`;
}
