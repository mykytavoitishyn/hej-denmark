import { CAT_ICONS, CAT_LABELS, CAT_ORDER, EVENT_CITIES, MEET_IDEAS, WHEN_OPTS } from '../data/events.js';
import { esc, ext, hostOf, icon } from '../lib/dom.js';
import {
  calendarLink,
  dateLabel,
  eventDays,
  eventsIn,
  isUpcoming,
  timeLabel,
  updatedAgo,
  whenMatch,
} from '../lib/event-feed.js';
import { eventCity } from '../lib/events.js';
import { arrivalLabel, upcomingArrival } from '../lib/stage.js';
import { S } from '../state/state.js';
import type { CityId, EventItem, EventsState } from '../types.js';

function ensureEventState(): EventsState {
  const pc = S.profile ? eventCity(S.profile.city) : null;
  if (!S.ev || S.ev.profileCity !== pc)
    S.ev = {
      profileCity: pc,
      city: pc && pc !== 'other' ? pc : 'copenhagen',
      when: 'all',
      cat: 'all',
      savedOnly: false,
      fromArrival: upcomingArrival(S.profile) !== null,
      notice: null,
    };
  return S.ev;
}

function eventCard(e: EventItem, saved: boolean, i: number): string {
  const past = !isUpcoming(e);
  return `<article class="ev-card${past ? ' past' : ''}" style="--i:${i}">
    <div class="ev-tile ev-${e.category}">${icon(CAT_ICONS[e.category] || 'CalendarDays', 26, 'var(--on-green)')}<span class="ev-tile-label">${esc(CAT_LABELS[e.category] || 'More')}</span>
      <span class="ev-flags">${e.kind === 'ongoing' ? '<span class="ev-flag">Ongoing</span>' : ''}${e.isFree ? '<span class="ev-flag">Free</span>' : ''}${past ? '<span class="ev-flag">Ended</span>' : ''}</span>
      <button class="ev-save" data-act="ev-save" data-id="${esc(e.id)}" aria-pressed="${saved}" aria-label="${esc(saved ? `Remove ${e.title} from saved events` : `Save ${e.title}`)}">${icon('Heart', 20, saved ? 'var(--green)' : 'var(--muted)', { fill: saved ? 'currentColor' : 'none' })}</button></div>
    <div class="ev-body">
      <p class="ev-date">${icon('CalendarDays', 16, 'var(--green)')}<span>${esc(dateLabel(e))}</span></p>
      <h2 class="h4 clamp2">${esc(e.title)}</h2>
      <p class="ev-loc">${icon('Clock3', 16, 'var(--muted)')}<span class="clamp1">${esc(timeLabel(e))}</span></p>
      <p class="ev-loc">${icon('MapPin', 16, 'var(--muted)')}<span class="clamp1">${esc(e.venue || 'Location on the event page')}</span></p>
      <p class="tiny muted ev-via">via ${esc(e.sourceName)}</p>
    </div>
    <div class="ev-actions">
      <a href="${esc(e.url)}" ${ext} aria-label="${esc(`Details for ${e.title} on ${e.sourceName}`)}">${icon('ExternalLink', 16, 'var(--muted)')}<span>Details</span></a>
      <a href="${esc(calendarLink(e))}" ${ext} data-act="ev-cal">${icon('CalendarDays', 16, 'var(--muted)')}<span>Calendar</span></a>
      <button data-act="ev-share" data-id="${esc(e.id)}" aria-label="${esc(`Share ${e.title}`)}">${icon('Share2', 16, 'var(--muted)')}<span>Share</span></button>
    </div>
  </article>`;
}

const evSkeleton = () =>
  `<div class="ev-skel"><div class="skeleton" style="height:118px;border-radius:0"></div><div class="col gap12" style="padding:18px 20px"><div class="skeleton" style="height:14px;width:45%"></div><div class="skeleton" style="height:22px"></div><div class="skeleton" style="height:14px;width:70%"></div></div></div>`;

function meetIdeas(city: CityId, cityLabel: string): string {
  const ideas = MEET_IDEAS.filter(m => !m.cities || m.cities.includes(city));
  return `<section class="meet" aria-labelledby="meet-title">
    <div class="col gap6"><h2 class="h3" id="meet-title">More ways to meet people in ${esc(cityLabel)}</h2><p class="muted">Places that list events all year round.</p></div>
    <div class="meet-grid">${ideas
      .map(
        (m, i) =>
          `<a class="card card-sm meet-card" href="${esc(m.url)}" ${ext} style="--i:${i}"><span class="icon-circle sm">${icon(m.icon, 18)}</span><span class="col gap4 min0 flex1"><span class="strong">${esc(m.title)}</span><span class="tiny muted">${esc(m.text)}</span><span class="tiny accent">${esc(hostOf(m.url))}</span></span>${icon('ArrowUpRight', 16, 'var(--green)')}</a>`,
      )
      .join('')}</div>
  </section>`;
}

export function pageEvents() {
  const ev = ensureEventState();
  const { feed, status } = S.events;
  const cityLabel = EVENT_CITIES.find(c => c.id === ev.city)?.label ?? 'Denmark';
  const base = ev.savedOnly ? S.saved : eventsIn(feed, ev.city);
  const cats = CAT_ORDER.filter(c => base.some(e => e.category === c));
  // Before someone arrives, events from their arrival date are the ones they can go to.
  const arrival = upcomingArrival(S.profile);
  const fromArrival = ev.fromArrival && arrival !== null && !ev.savedOnly;
  const list = base.filter(
    e =>
      (!fromArrival || eventDays(e)[1] >= (arrival ?? '')) &&
      whenMatch(e, ev.when) &&
      (ev.cat === 'all' || e.category === ev.cat),
  );
  const dated = list.filter(e => e.kind === 'event'),
    ongoing = list.filter(e => e.kind === 'ongoing');
  const savedIds = new Set(S.saved.map(e => e.id));
  const chip = (label: string, sel: boolean, act: string, extra = ''): string =>
    `<button class="chip" data-act="${act}" aria-pressed="${sel}" ${extra}>${label}</button>`;
  const loading = status === 'loading';
  let n = 0;
  let body: string;
  if (!ev.savedOnly && !feed && (loading || status === 'idle'))
    body = `<div class="ev-grid" role="progressbar" aria-label="Loading events in ${esc(cityLabel)}">${evSkeleton().repeat(4)}</div>`;
  else if (!ev.savedOnly && !feed)
    body = `<div class="card empty">${icon('CloudOff', 30, 'var(--muted)')}<h2 class="h4">Events couldn’t load</h2><p class="muted">Check your connection and try again. The places below list events too.</p><button class="btn btn-secondary btn-sm" data-act="ev-refresh">Try again</button></div>`;
  else if (!list.length && fromArrival && arrival && ev.cat === 'all')
    body = `<div class="card empty">${icon('CalendarDays', 30, 'var(--muted)')}<h2 class="h4">Nothing listed from ${esc(arrivalLabel(arrival, { weekday: false }))} yet</h2><p class="muted">Listings usually appear a few weeks ahead. Check back closer to your move, or see what’s on now.</p><button class="btn btn-secondary btn-sm" data-act="ev-when" data-id="all">Show all dates</button></div>`;
  else if (!list.length) {
    const filtered = ev.when !== 'all' || ev.cat !== 'all' || fromArrival;
    body = `<div class="card empty">${icon('CalendarDays', 30, 'var(--muted)')}<h2 class="h4">${ev.savedOnly ? 'No saved events yet' : filtered ? 'No events match these filters' : `No events listed in ${esc(cityLabel)} right now`}</h2><p class="muted">${ev.savedOnly ? 'Tap the heart on an event to save it here.' : filtered ? 'Try another date or category.' : 'Try another city, or one of the places below.'}</p>${ev.savedOnly || filtered ? `<button class="btn btn-secondary btn-sm" data-act="ev-clear">Clear filters</button>` : ''}</div>`;
  } else
    body = `${dated.length ? `<div class="ev-grid">${dated.map(e => eventCard(e, savedIds.has(e.id), n++)).join('')}</div>` : ''}
      ${ongoing.length ? `<div class="col gap16"><h2 class="h3">Exhibitions and ongoing</h2><div class="ev-grid">${ongoing.map(e => eventCard(e, savedIds.has(e.id), n++)).join('')}</div></div>` : ''}
      <p class="tiny muted" style="text-align:center">Times are Danish time. Check the event page for the latest time, price and availability.</p>`;
  // Credit the sources behind what's on screen, and say when one couldn't be refreshed.
  const shown = new Set(base.map(e => e.sourceId));
  const sources = (feed?.sources ?? [])
    .filter(s => ev.savedOnly || shown.has(s.id))
    .map(
      s =>
        `<a class="link" href="${esc(s.url)}" ${ext}>${esc(s.name)}</a>${s.stale ? ' <span class="muted">(may be out of date)</span>' : ''}`,
    )
    .join(', ');
  const meta = feed
    ? `<p class="tiny muted feed-meta">${icon('RefreshCw', 13, 'var(--muted)')}<span>Updated ${esc(updatedAgo(feed.generatedAt))}${sources ? ` · from ${sources}` : ''}</span></p>`
    : '';
  const notice =
    ev.notice ||
    (status === 'error' && feed ? `Couldn’t refresh just now, so these are from ${updatedAgo(feed.generatedAt)}.` : '');
  return `<div class="container">
    <div class="page-head">
      <div class="col gap10"><p class="eyebrow">Explore ${esc(cityLabel)}</p><h1 class="h1">Events</h1><p class="lead">${arrival ? `Meet people and find things to do. You arrive on ${esc(arrivalLabel(arrival))}, so this starts from then.` : 'Meet people and find things to do in your city.'}</p>${meta}</div>
      <button class="btn btn-outline${loading ? ' is-loading' : ''}" data-act="ev-refresh"${loading ? ' disabled aria-busy="true"' : ''}>${icon('RefreshCw', 17, 'var(--green)')}<span>${loading ? 'Refreshing…' : 'Refresh'}</span></button>
    </div>
    <div class="events-layout">
      <aside class="filters" aria-label="Filter events">
        <div><p class="filter-title">${icon('MapPin', 15, 'var(--muted)')}City</p><div class="chip-row">${EVENT_CITIES.map(c => chip(`${esc(c.label)}${c.id === ev.profileCity ? ' <span class="you">You</span>' : ''}`, ev.city === c.id && !ev.savedOnly, 'ev-city', `data-id="${c.id}"`)).join('')}</div></div>
        <div><p class="filter-title">${icon('Clock3', 15, 'var(--muted)')}When</p><div class="chip-row">${arrival ? chip(`From ${esc(arrivalLabel(arrival, { weekday: false }))}`, fromArrival, 'ev-arrival') : ''}${WHEN_OPTS.map(w => chip(esc(w.label), !fromArrival && ev.when === w.id, 'ev-when', `data-id="${w.id}"`)).join('')}</div></div>
        <div><p class="filter-title">${icon('SlidersHorizontal', 15, 'var(--muted)')}Show</p><div class="chip-row">${chip('All events', !ev.savedOnly, 'ev-all')}${chip('Saved' + (S.saved.length ? ` · ${S.saved.length}` : ''), ev.savedOnly, 'ev-saved')}${cats.map(c => chip(esc(CAT_LABELS[c]), ev.cat === c, 'ev-cat', `data-id="${c}"`)).join('')}</div></div>
        <p class="tiny muted" id="ev-notice" aria-live="polite"${notice ? '' : ' hidden'}>${esc(notice)}</p>
      </aside>
      <div class="col gap32 min0">${body}${meetIdeas(ev.city, cityLabel)}</div>
    </div>
  </div>`;
}
