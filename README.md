# Hej Denmark

A calm, personal guide for settling into life in Denmark. Answer four questions and get a plan that fits you:
the registrations and documents that apply to your situation, in the right order, with official links, plus
a Danish word of the day, local events and an assistant that points you to official sources.

Everything runs in the browser. There is no backend and no account: your plan is saved on your device.

## What's in it

| Screen  | What it does                                                                                  |
| ------- | --------------------------------------------------------------------------------------------- |
| Home    | Explains the problem and starts the plan builder.                                             |
| Start   | Four questions: why you're moving, where from, which city, and whether you have a CPR number. |
| Today   | Your next step, progress ring, reminders, events this week, the Danish word of the day.       |
| Journey | Steps grouped into phases, filterable, with checklists, offices per city and prerequisites.   |
| Ask Hej | Chat about settling in. Answers cite official pages only.                                     |
| Events  | Filter by city, date and category. Save events, add them to a calendar, share them.           |
| Budget  | Monthly costs in Copenhagen, take-home pay after tax, and the money to have ready to move in. |
| Profile | Edit your answers. Your plan updates and completed steps stay completed.                      |

## Getting started

You need Node.js 20.19 or newer (`.nvmrc` pins 22).

```sh
npm install
npm run dev        # http://localhost:5173
```

| Script                 | Purpose                                                          |
| ---------------------- | ---------------------------------------------------------------- |
| `npm run dev`          | Start the dev server with hot reload.                            |
| `npm run build`        | Type-check, then build to `dist/`.                               |
| `npm run preview`      | Serve the production build locally.                              |
| `npm test`             | Run the unit and DOM tests once (`npm run test:watch` to watch). |
| `npm run typecheck`    | Strict TypeScript check.                                         |
| `npm run lint`         | ESLint (`lint:fix` to auto-fix).                                 |
| `npm run format`       | Format with Prettier (`format:check` to verify).                 |
| `npm run check`        | Everything CI runs, in one command.                              |
| `npm run events:fetch` | Rebuild the events feed from its sources.                        |
| `npm run links:check`  | Check that every link in the app still opens.                    |

## Project layout

```
index.html            Page shell and font links
src/
  main.ts             Entry point
  app.ts              Start-up: restore guest, route, bind events, first render
  router.ts           Hash routing and the "needs a plan" gate
  render.ts           Picks the view for the current route and renders it
  actions.ts          Click, input and submit handling (data-act attributes)
  types.ts            Shared types
  data/               Content: plan steps, phases, labels, events, links, icons, words
  lib/                Pure logic: plan building, events, dates, markdown, assistant, storage
  state/              The single state object and guest session persistence
  services/ask.ts     Ask Hej: optional live model, otherwise built-in answers
  views/              One module per screen, plus shared pieces and layout
  styles/main.css     Styles and design tokens
tests/                Test setup and helpers
scripts/events/       Builds public/data/events.json from its sources (npm run events:fetch)
scripts/check-links.mjs  Checks that every link in the app still opens
```

## How it works

- **State.** One mutable object (`src/state/state.ts`). Actions change it and call `render()`, which rebuilds
  the page from it. There is no framework, so views are functions that return HTML strings.
- **Events.** Elements carry `data-act` attributes. A single set of listeners on the root looks up the matching
  handler in `actions.ts`, so views never attach handlers themselves.
- **Routing.** Hash routes (`#today`, `#step-6`) work on any static host. Screens that need a plan send people
  without one to the plan builder.
- **Where you are in your move.** The profile records whether someone is still planning, arriving soon or already
  here (`src/lib/stage.ts`). A planned move counts as arriving soon once the arrival date is within a month. Arriving
  is never assumed: when the date comes, Today asks whether the person is here, then about their CPR number. Before
  arrival, Events starts from the arrival date, Ask Hej suggests questions about getting ready and Budget leads with
  the money to have ready.
- **Persistence.** Guest data lives in `localStorage`, with an in-memory fallback when storage is blocked.
  Stored data is treated as untrusted and validated on load.
- **Safety.** Everything interpolated into HTML goes through `esc()`. Assistant text is rendered by a small
  Markdown subset that only links to official hosts (`src/data/links.ts`).

## Content

Plan steps, phases, offices and official links live in `src/data/`. Adding or changing a step is a data edit:
`src/data/plan.ts` lists each step with the conditions it applies to (`applies_to`) and the steps it needs first
(`requires`).

Events live in `public/data/events.json`, which `npm run events:fetch` rebuilds (Node 22.18 or newer). A GitHub
Actions workflow (`.github/workflows/events.yml`) runs it every morning and commits the result. It keeps the next 60
days of events that help newcomers meet people and settle in:

- **Public libraries** in Copenhagen, Aarhus, Odense and Aalborg, through the event API every Danish library site
  offers ([DPL CMS](https://github.com/danskernesdigitalebibliotek/dpl-cms)). Library listings are mostly in Danish, so
  only international and English events, language cafés, talk clubs, meet-ups and communal dining are kept.
- **Dear World**, a Copenhagen community for internationals, from its public Luma calendar.
- **Copenhagen Expat Meetup**, from its public Meetup calendar.

Sources are listed in `scripts/events/sources.ts`, and the filtering, de-duplication and checks are in
`scripts/events/pipeline.ts`. No images are taken, every event links back to its organiser, and the app credits each
source. Sites that don't allow reuse, such as KultuNaut without an agreement, Eventbrite and Facebook, aren't used.
If a source can't be reached, its events from the last run stay, marked as possibly out of date. The script refuses
to write a feed the app wouldn't accept, or one far smaller than the last (`--force` overrides that after you've
checked why). Once every listing in a city has passed, the app shows recurring ideas instead.

Links are checked weekly by `npm run links:check` (`.github/workflows/links.yml`), which fails when an official page
moves.

The budget calculator's prices, rents, 2026 tax rates, SU rate and residence permit fees live in `src/data/budget.ts`,
with the sources the page shows. They were checked in September 2026. Update them each January, when tax rates, SU,
fares and fees change. The tax estimate (`src/lib/budget.ts`) covers Copenhagen Municipality without church tax,
pension or other deductions. With a profile, the calculator takes who you are (studying or working, citizenship, whether
you've arrived, a partner) from it, so the plan and budget agree. Before arrival it leads with the money to have ready;
after arrival, with monthly spending.

## Ask Hej

Out of the box, Ask Hej answers common questions from built-in guidance (`src/lib/assistant.ts`). When the page
runs where Claude's runtime provides `window.claude`, it uses a live model instead, with the same profile and plan
as context, and falls back to the built-in answers if that isn't available. There is no server component.

## Deploying

`npm run build` produces a static site in `dist/`. Asset paths are relative and routing uses the URL hash, so it
works from any static host or sub-path (GitHub Pages, Netlify, S3, and so on).

## Disclaimer

Hej Denmark is an independent guide, not a government service. Rules change, so always check the official pages
linked in each step.
