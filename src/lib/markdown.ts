import { esc, ext, isOfficial } from './dom.js';

type Block = { type: 'p'; text: string } | { type: 'li'; ordered: boolean; index: number; text: string };

function inlineMD(s: string): string {
  return s
    .split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\(https?:\/\/[^)\s]+\)|\*[^*\n]+\*)/g)
    .filter(Boolean)
    .map(part => {
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**'))
        return `<strong>${esc(part.slice(2, -2))}</strong>`;
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`'))
        return `<code>${esc(part.slice(1, -1))}</code>`;
      const l = part.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
      if (l) return isOfficial(l[2]) ? `<a href="${esc(l[2])}" ${ext}>${esc(l[1])}</a>` : esc(l[1]);
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) return `<em>${esc(part.slice(1, -1))}</em>`;
      return esc(part);
    })
    .join('');
}
export function md(text: string): string {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) {
      blocks.push({ type: 'p', text: para.join(' ') });
      para = [];
    }
  };
  for (const raw of String(text).replace(/\r\n?/g, '\n').split('\n')) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const m = line.match(/^(?:(\d+)[.)]|[-*•])\s+(.+)$/);
    if (m) {
      flush();
      blocks.push({ type: 'li', ordered: Boolean(m[1]), index: m[1] ? Number(m[1]) : 0, text: m[2] });
    } else para.push(line.replace(/^#{1,6}\s+/, ''));
  }
  flush();
  return blocks
    .map(b =>
      b.type === 'li'
        ? `<div class="md-li"><span class="md-bullet">${b.ordered ? b.index + '.' : '•'}</span><span class="min0 flex1">${inlineMD(b.text)}</span></div>`
        : `<p>${inlineMD(b.text)}</p>`,
    )
    .join('');
}
