// Fetches events from every source and writes public/data/events.json. Run with `npm run events:fetch`.
// Needs Node 22.18 or newer, which runs the TypeScript modules it imports directly.
//
//   --dry-run   build and check the feed, but don't write it
//   --verbose   also list the labels library events use, to help tune the newcomer filter
//   --force     write even when the checks would refuse, after you've looked at why
import { readFile, writeFile } from 'node:fs/promises';
import { cphDay, parseFeed } from '../../src/lib/event-feed.ts';
import { buildFeed, publishProblems } from './pipeline.ts';
import { SOURCES } from './sources.ts';

const OUT = new URL('../../public/data/events.json', import.meta.url);
const args = new Set(process.argv.slice(2));
const UA = 'HejDenmarkEvents/1.0 (+https://github.com/mykytavoitishyn/hej-denmark)';

async function readPrevious() {
  try {
    return parseFeed(JSON.parse(await readFile(OUT, 'utf8')));
  } catch {
    return null;
  }
}

async function fetchSource(source, today) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(source.feed(today), {
        headers: { 'user-agent': UA, accept: source.kind === 'dpl' ? 'application/json' : 'text/calendar' },
        signal: AbortSignal.timeout(60_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return { source, body: source.kind === 'dpl' ? await res.json() : await res.text() };
    } catch (e) {
      if (attempt === 2) return { source, error: e.cause?.code ?? e.message };
      await new Promise(r => setTimeout(r, 3000));
    }
  }
}

const previous = await readPrevious();
const today = cphDay(Date.now());
const results = await Promise.all(SOURCES.map(s => fetchSource(s, today)));

if (args.has('--verbose'))
  for (const r of results.filter(r => r.source.kind === 'dpl' && Array.isArray(r.body))) {
    const labels = new Map();
    for (const e of r.body)
      for (const l of [...(e.categories ?? []), ...(e.tags ?? [])]) labels.set(l, (labels.get(l) ?? 0) + 1);
    const top = [...labels].sort((a, b) => b[1] - a[1]).slice(0, 40);
    console.log(`\n${r.source.name} labels: ${top.map(([l, n]) => `${l} (${n})`).join(', ')}`);
  }

const { feed, report } = buildFeed(results, previous);
console.table(report);
const counts = {};
for (const e of feed.events) counts[e.city] = (counts[e.city] ?? 0) + 1;
console.log(
  `${feed.events.length} events: ${Object.entries(counts)
    .map(([c, n]) => `${c} ${n}`)
    .join(', ')}`,
);

const problems = publishProblems(feed, previous);
if (problems.length) {
  console.error(`Not publishing:\n- ${problems.join('\n- ')}`);
  if (!args.has('--force')) process.exit(1);
  console.error('Publishing anyway because of --force.');
}
if (args.has('--dry-run')) console.log('Dry run: nothing written.');
else {
  await writeFile(OUT, JSON.stringify(feed, null, 2) + '\n');
  console.log(`Wrote ${new URL(OUT).pathname}`);
}
const stale = report.filter(r => r.stale);
// A GitHub Actions warning, so a source that keeps failing gets noticed without stopping the update.
if (stale.length)
  console.log(`::warning::Couldn't reach ${stale.map(r => r.id).join(', ')}. Kept their earlier events.`);
