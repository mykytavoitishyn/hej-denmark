import { CAT_ICONS, CAT_LABELS, CAT_ORDER, EVENT_CITIES, WHEN_OPTS } from '../data/events.js';
import { esc, ext, icon } from '../lib/dom.js';
import { calendarLink, cityEvents, eventCity, whenMatch } from '../lib/events.js';
import { S } from '../state/state.js';
import type { EventItem, EventsState } from '../types.js';

function ensureEventState(): EventsState {
  const pc = S.profile ? eventCity(S.profile.city) : null;
  if (!S.ev || S.ev.profileCity !== pc)
    S.ev = {
      profileCity: pc,
      city: pc || 'copenhagen',
      when: 'all',
      cat: 'all',
      savedOnly: false,
      loading: false,
      notice: null,
    };
  return S.ev;
}
function eventCard(e: EventItem, saved: boolean): string {
  return `<article class="ev-card">
    <div class="ev-tile">${icon(CAT_ICONS[e.category] || 'CalendarDays', 26, 'var(--on-green)')}<span class="ev-tile-label">${esc(CAT_LABELS[e.category] || 'More')}</span>
      <button class="ev-save" data-act="ev-save" data-id="${esc(e.id)}" aria-pressed="${saved}" aria-label="${esc(saved ? `Remove ${e.title} from saved events` : `Save ${e.title}`)}">${icon('Heart', 20, saved ? 'var(--green)' : 'var(--muted)', { fill: saved ? 'currentColor' : 'none' })}</button></div>
    <div class="ev-body">
      <p class="ev-date">${icon('CalendarDays', 16, 'var(--green)')}<span>${esc(e.dateLabel)} · ${esc(e.timeLabel)}</span></p>
      <h2 class="h4 clamp2">${esc(e.title)}</h2>
      <p class="ev-loc">${icon('MapPin', 16, 'var(--muted)')}<span class="clamp1">${esc(e.location)}</span></p>
    </div>
    <div class="ev-actions">
      <a href="${esc(e.sourceUrl)}" ${ext}>${icon('ExternalLink', 16, 'var(--muted)')}<span>Details</span></a>
      <a href="${esc(calendarLink(e))}" ${ext} data-act="ev-cal">${icon('CalendarDays', 16, 'var(--muted)')}<span>Calendar</span></a>
      <button data-act="ev-share" data-id="${esc(e.id)}" aria-label="${esc(`Share ${e.title}`)}">${icon('Share2', 16, 'var(--muted)')}<span>Share</span></button>
    </div>
  </article>`;
}
const evSkeleton = () =>
  `<div class="ev-skel"><div class="skeleton" style="height:118px;border-radius:0"></div><div class="col gap12" style="padding:18px 20px"><div class="skeleton" style="height:14px;width:45%"></div><div class="skeleton" style="height:22px"></div><div class="skeleton" style="height:14px;width:70%"></div></div></div>`;
export function pageEvents() {
  const ev = ensureEventState(),
    feed = cityEvents(ev.city);
  const base = ev.savedOnly ? S.saved : feed.events;
  const cats = CAT_ORDER.filter(c => base.some(e => e.category === c));
  const list = base.filter(e => whenMatch(e, ev.when) && (ev.cat === 'all' || e.category === ev.cat));
  const savedIds = new Set(S.saved.map(e => e.id));
  const cityLabel = EVENT_CITIES.find(c => c.id === ev.city)?.label ?? 'Denmark';
  const chip = (label: string, sel: boolean, act: string, extra = ''): string =>
    `<button class="chip" data-act="${act}" aria-pressed="${sel}" ${extra}>${label}</button>`;
  const notice = ev.notice || (feed.usingFallback && !ev.savedOnly ? 'Showing recurring ideas for now.' : '');
  let body;
  if (ev.loading)
    body = `<div class="ev-grid" role="progressbar" aria-label="Loading events in ${esc(cityLabel)}">${evSkeleton()}${evSkeleton()}${evSkeleton()}${evSkeleton()}</div>`;
  else if (!list.length)
    body = `<div class="card empty">${icon('CalendarDays', 30, 'var(--muted)')}<h2 class="h4">${ev.savedOnly ? 'No saved events yet' : 'No events match these filters'}</h2><p class="muted">${ev.savedOnly ? 'Tap the heart on an event to save it here.' : 'Try another date, category, or city.'}</p><button class="btn btn-secondary btn-sm" data-act="ev-clear">Clear filters</button></div>`;
  else
    body = `<div class="ev-grid">${list.map(e => eventCard(e, savedIds.has(e.id))).join('')}</div><p class="tiny muted" style="text-align:center;padding:20px 0 0">Check the event page for the latest time, price and availability.</p>`;
  return `<div class="container">
    <div class="page-head">
      <div class="col gap10"><p class="eyebrow">Explore ${esc(cityLabel)}</p><h1 class="h1">Events</h1><p class="lead">Meet people and find things to do in your city.</p></div>
      <button class="btn btn-outline" data-act="ev-refresh">${icon('RefreshCw', 17, 'var(--green)')}<span>Refresh</span></button>
    </div>
    <div class="events-layout">
      <aside class="filters" aria-label="Filter events">
        <div><p class="filter-title">${icon('MapPin', 15, 'var(--muted)')}City</p><div class="chip-row">${EVENT_CITIES.map(c => chip(`${esc(c.label)}${c.id === ev.profileCity ? ' <span class="you">You</span>' : ''}`, ev.city === c.id, 'ev-city', `data-id="${c.id}"`)).join('')}</div></div>
        <div><p class="filter-title">${icon('Clock3', 15, 'var(--muted)')}When</p><div class="chip-row">${WHEN_OPTS.map(w => chip(esc(w.label), ev.when === w.id, 'ev-when', `data-id="${w.id}"`)).join('')}</div></div>
        <div><p class="filter-title">${icon('SlidersHorizontal', 15, 'var(--muted)')}Show</p><div class="chip-row">${chip('All events', !ev.savedOnly, 'ev-all')}${chip('Saved' + (S.saved.length ? ` · ${S.saved.length}` : ''), ev.savedOnly, 'ev-saved')}${cats.map(c => chip(esc(CAT_LABELS[c]), ev.cat === c, 'ev-cat', `data-id="${c}"`)).join('')}</div></div>
        <p class="tiny muted" id="ev-notice" aria-live="polite"${notice ? '' : ' hidden'}>${esc(notice)}</p>
      </aside>
      <div>${body}</div>
    </div>
  </div>`;
}
