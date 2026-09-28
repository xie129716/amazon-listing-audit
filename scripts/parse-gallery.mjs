// Recover the COMPLETE, ordered image inventory from the page's colorImages blob.
import { readFileSync } from 'node:fs';

export function parseGallery(html) {
  const i = html.indexOf("colorImages");
  if (i < 0) return [];
  const seg = html.slice(i, i + 400000);
  const m = seg.match(/parseJSON\('(\[.*?\])'\)/s);
  if (!m) return [];
  const jsonStr = m[1]
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, '\\');
  let arr;
  try { arr = JSON.parse(jsonStr); } catch (e) { return [{ __parseError: String(e).slice(0, 200) }]; }
  return arr.map((e, idx) => ({
    idx,
    variant: e.variant || null,
    hiRes: e.hiRes || null,
    large: e.large || null,
    thumb: e.thumb || null,
    altText: e.altText || null,
    kind: e.variant === 'MAIN' ? 'main' : 'image',
  }));
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  for (const asin of ['B0DJQS14DS', 'B0GF1Z3CFH', 'B0FL6X3HRW', 'B0FF8YBX8P', 'B0GGNM98LD']) {
    const html = readFileSync(`E:/listing_exam/data/raw/${asin}.html`, 'utf8');
    const g = parseGallery(html);
    console.log(`===== ${asin}: ${g.length} entries`);
    g.forEach((e) => console.log(`  ${String(e.idx + 1).padStart(2)}. ${String(e.variant).padEnd(6)} ${e.hiRes}`));
  }
}
