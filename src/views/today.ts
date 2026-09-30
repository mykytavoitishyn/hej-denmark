import { CAT_ICONS } from '../data/events.js';
import { cityName, MOVE_LABELS, RES_LABELS } from '../data/labels.js';
import { promptsFor } from '../data/prompts.js';
import { esc, icon } from '../lib/dom.js';
import { dateLabel, eventDays, eventsIn, timeLabel, whenMatch } from '../lib/event-feed.js';
import { eventCity } from '../lib/events.js';
import { actionableSteps, activeSteps, journeyPhases, planSummary, prio } from '../lib/plan.js';
import { BADGES, earnedBadges, STEP_XP } from '../lib/rewards.js';
import { arrivalCheckDue, arrivalLabel, upcomingArrival } from '../lib/stage.js';
import { arrivalMessage, dailyWord, greeting } from '../lib/today.js';
import { currentLevel, rewardInput } from '../state/progress.js';
import { S, requireProfile } from '../state/state.js';
import type { EventItem, Profile } from '../types.js';
import { avatarHTML, badge, goLink, ring, roadmap, toastHTML, xpBar } from './shared.js';

function miniEvent(e: EventItem): string {
  return `<a class="card mini-ev" href="#events" data-act="go" data-to="events" aria-label="${esc(`${e.title}, ${dateLabel(e)}, ${timeLabel(e)}. Open Events`)}">
    <span class="row gap10"><span class="icon-circle sm">${icon(CAT_ICONS[e.category] || 'CalendarDays', 18)}</span><span class="tiny strong">${esc(dateLabel(e))}${e.kind === 'event' && !e.allDay ? ` · ${esc(timeLabel(e))}` : ''}</span></span>
    <span class="h4 clamp2">${esc(e.title)}</span>
    <span class="loc">${icon('MapPin', 14, 'var(--muted)')}<span class="clamp1">${esc(e.venue || 'See event page')}</span></span>
  </a>`;
}

/** Events this week, or before someone arrives, events from their arrival date. */
function eventsSection(city: string, cityLabel: string, arrival: string | null): string {
  const all = eventsIn(S.events.feed, eventCity(city));
  const week = arrival ? [] : all.filter(e => e.kind === 'event' && whenMatch(e, 'week'));
  const later = all.filter(e => e.kind === 'event' && (!arrival || eventDays(e)[1] >= arrival));
  const shown = (week.length ? week : later).slice(0, 3);
  const title = arrival
    ? `Your first weeks in ${cityLabel}`
    : week.length
      ? `This week in ${cityLabel}`
      : `Coming up in ${cityLabel}`;
  let body: string;
  if (S.events.status === 'loading' && !S.events.feed)
    body = `<div class="mini-grid">${'<div class="card mini-ev"><div class="skeleton" style="height:18px;width:50%"></div><div class="skeleton" style="height:22px"></div><div class="skeleton" style="height:14px;width:70%"></div></div>'.repeat(3)}</div>`;
  else if (shown.length) body = `<div class="mini-grid">${shown.map(miniEvent).join('')}</div>`;
  else
    body = `<div class="card card-sm row gap12">${icon('CalendarDays', 22, 'var(--muted)')}<p class="muted">${S.events.status === 'error' ? 'Events couldn’t load right now.' : arrival ? `Events from ${esc(arrivalLabel(arrival, { weekday: false }))} show up here as your move gets closer.` : 'No events listed here yet.'} Events has ideas for meeting people in the meantime.</p></div>`;
  return `<section class="span-12 col gap16" aria-labelledby="week-title">
    <div class="row between wrap gap16"><h2 class="h3" id="week-title">🎈 ${esc(title)}</h2>${goLink('events', '<span>See all events</span>')}</div>
    ${body}
  </section>`;
}

/**
 * Once the arrival date comes, asks whether the person has arrived, then whether they have a CPR number yet.
 * The plan changes a lot on arrival, so it waits for them to confirm rather than switching by itself.
 */
function arrivalCard(p: Profile): string {
  const card = (title: string, text: string, actions: string, focusable = false) =>
    `<section class="card checkin span-12" aria-labelledby="checkin-title"><span class="checkin-flag" aria-hidden="true">🇩🇰</span><div class="col gap6 min0 flex1"><h2 class="h3" id="checkin-title"${focusable ? ' tabindex="-1"' : ''}>${title}</h2><p class="muted">${text}</p></div><div class="row wrap gap10">${actions}</div></section>`;
  if (S.arrivalStep === 'cpr')
    return card(
      'Do you have a CPR number yet?',
      'If you do, your plan moves on to MitID, a bank account and your health card.',
      `<button class="btn btn-primary" data-act="arrive-cpr" data-value="have">Yes, I have one</button><button class="btn btn-secondary" data-act="arrive-cpr" data-value="booked">Appointment booked</button><button class="btn btn-secondary" data-act="arrive-cpr" data-value="none">Not yet</button>`,
      true,
    );
  if (!p.arrival_date || !arrivalCheckDue(p)) return '';
  return card(
    'Velkommen til Danmark!',
    `Did you arrive on ${esc(arrivalLabel(p.arrival_date))}? Once you’re here, your plan moves on to registering, and your budget, events and suggestions follow.`,
    `<button class="btn btn-primary" data-act="arrive-yes">Yes, I’m here</button><button class="btn btn-secondary" data-act="arrive-change">My date changed</button>`,
  );
}

export function pageToday() {
  const p = requireProfile(),
    sum = planSummary(S.plan),
    g = greeting(),
    word = dailyWord(),
    arr = arrivalMessage(p.arrival_date);
  const cityLabel = cityName(p.city, 'Denmark');
  const reminders = S.reminders.filter(r => Date.parse(r.remindAt) >= Date.now());
  const [next, ...later] = actionableSteps(S.plan);
  const lvl = currentLevel();
  const input = rewardInput();
  const earned = input ? new Set(earnedBadges(input).map(b => b.id)) : new Set<string>();
  const nextBadge = BADGES.find(b => !earned.has(b.id));
  const dateLine = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const upNext = next
    ? `
      <div class="row between gap12"><p class="eyebrow">Up next</p>${badge(prio(next))}</div>
      <h2 class="h3">${esc(next.title)}</h2>
      <p class="muted">${esc(next.description)}</p>
      <div class="row wrap gap10 mt-auto">
        <button class="btn btn-primary" data-act="today-done" data-id="${next.id}">${icon('Check', 18, 'currentColor', { stroke: 2.5 })}<span>Mark done · +${STEP_XP[prio(next)]} XP</span></button>
        <a class="btn btn-secondary" href="#step-${next.id}" data-act="step" data-id="${next.id}">See details</a>
      </div>
      ${
        later.length
          ? `<div class="then"><p class="tiny strong muted">Then</p>${later
              .slice(0, 2)
              .map(
                s =>
                  `<a class="then-row" href="#step-${s.id}" data-act="step" data-id="${s.id}">${icon('Circle', 16, 'var(--faint)')}<span class="flex1 min0 clamp1">${esc(s.title)}</span>${badge(prio(s))}</a>`,
              )
              .join('')}</div>`
          : ''
      }`
    : `<p class="eyebrow">Up next</p><h2 class="h3">Nothing waiting right now</h2><p class="muted">${sum.completed === sum.total ? `Every step in your plan is done. Keep an eye on Digital Post and on what’s happening in ${esc(cityLabel)}.` : 'The steps left are waiting for an earlier step. Check your Journey to see what they need.'}</p>`;
  const remHTML = reminders.length
    ? `<section class="card span-12" aria-labelledby="rem-title"><h2 class="h3" id="rem-title" style="margin-bottom:8px">Reminders</h2>${reminders
        .map(r => {
          const st = S.plan.find(s => s.id === r.stepId);
          const when = new Date(r.remindAt).toLocaleString('en-GB', {
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
  const housingNudge =
    p.housing === 'settled'
      ? ''
      : `<a class="card span-12 nudge" href="#housing" data-act="go" data-to="housing">
      <span class="icon-circle">${icon('House', 22, 'var(--green)')}</span>
      <span class="col gap4 min0 flex1"><span class="h4">${p.housing === 'temporary' ? 'Ready for a long-term home?' : 'Still looking for a home?'}</span><span class="muted small">The housing guide for ${esc(cityLabel)}: dorms, rental sites, Facebook groups, your rights and how to spot scams.</span></span>
      ${icon('ArrowRight', 20, 'var(--green)')}</a>`;
  return `<div class="container">
    <div class="page-head">
      <div class="row gap16 min0">${avatarHTML('lg')}<div class="col gap6 min0"><p class="eyebrow">${esc(dateLine)}</p><h1 class="h1">${esc(g.danish)}${p.name ? `, ${esc(p.name)}` : ''} <span class="wave" aria-hidden="true">👋</span></h1><p class="lead">${esc(g.english)}${arr ? ` · <span class="accent strong">${esc(arr)}</span>` : ''}</p></div></div>
      <a class="pill-link" href="#profile" data-act="go" data-to="profile">${icon('MapPin', 16, 'var(--sage)')}<span>${esc(cityLabel)} · ${esc(MOVE_LABELS[p.move_reason])} · ${esc(RES_LABELS[p.residency_group])}</span></a>
    </div>
    <div class="dash stagger">
      ${arrivalCard(p)}
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
      ${
        lvl
          ? `<section class="card level-card span-5" aria-labelledby="level-title">
        <h2 class="sr-only" id="level-title">Your level</h2>
        ${xpBar(lvl.xp, lvl.lp)}
        <div class="row between wrap gap12"><span class="badge-strip" aria-label="${earned.size} badges earned">${
          [...earned]
            .slice(-5)
            .map(id => {
              const b = BADGES.find(x => x.id === id);
              return b ? `<span class="badge-dot" title="${esc(b.title)}">${b.emoji}</span>` : '';
            })
            .join('') || '<span class="tiny muted">No badges yet</span>'
        }</span>${goLink('profile', '<span>All badges</span>')}</div>
        ${nextBadge ? `<p class="tiny muted">Next badge: <span class="strong">${esc(nextBadge.title)}</span>. ${esc(nextBadge.desc)}.</p>` : ''}
      </section>`
          : ''
      }
      <section class="card span-7 col gap12" aria-labelledby="road-title">
        <div class="row between gap12"><h2 class="h4" id="road-title">Your roadmap</h2>${goLink('journey', '<span>Open</span>')}</div>
        ${roadmap(journeyPhases(activeSteps(S.plan)), { compact: true })}
      </section>
      ${remHTML}
      ${housingNudge}
      ${eventsSection(p.city, cityLabel, upcomingArrival(p))}
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
