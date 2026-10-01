// Checks that every web address in the app's source still opens. Official sites move pages without warning, and a
// dead link in a plan step or an answer breaks the promise that every step points to an official page.
// Run with `npm run links:check`. It exits with an error when a page is gone, so a scheduled workflow can flag it.
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname;
const SKIP_HOSTS = new Set(['fonts.googleapis.com', 'fonts.gstatic.com', 'localhost']);
// Sites that turn away scripts but work in a browser. Reported, but not counted as broken.
const BLOCKED = new Set([401, 403, 429]);
const URL_RE = /https?:\/\/[^\s'"`)<>\]]+/g;

async function sourceFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await sourceFiles(path)));
    else if (/\.ts$/.test(entry.name) && !/\.test\.ts$/.test(entry.name)) out.push(path);
  }
  return out;
}

async function urlsIn(files) {
  const urls = new Set();
  for (const file of files)
    for (const match of (await readFile(file, 'utf8')).matchAll(URL_RE)) {
      const url = match[0].replace(/[.,;]+$/, '');
      if (url.includes('${')) continue;
      try {
        if (!SKIP_HOSTS.has(new URL(url).hostname)) urls.add(url);
      } catch {}
    }
  return [...urls].sort();
}

async function status(url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        signal: AbortSignal.timeout(20_000),
        headers: { 'user-agent': 'HejDenmarkLinkCheck/1.0 (+https://github.com/mykytavoitishyn/hej-denmark)' },
      });
      await res.body?.cancel();
      if (res.status < 500 || attempt === 1) return res.status;
    } catch (e) {
      if (attempt === 1) return `error: ${e.cause?.code ?? e.name}`;
    }
  }
}

const urls = await urlsIn(await sourceFiles(join(ROOT, 'src')));
const results = [];
for (let i = 0; i < urls.length; i += 6)
  results.push(...(await Promise.all(urls.slice(i, i + 6).map(async url => ({ url, status: await status(url) })))));

const broken = results.filter(r => typeof r.status !== 'number' || (r.status >= 400 && !BLOCKED.has(r.status)));
const blocked = results.filter(r => BLOCKED.has(r.status));
for (const r of blocked) console.log(`blocked ${r.status}  ${r.url}`);
for (const r of broken) console.log(`BROKEN  ${r.status}  ${r.url}`);
console.log(`${results.length} links checked: ${broken.length} broken, ${blocked.length} refused scripts.`);
if (broken.length) process.exit(1);
