/* 从页面 HTML 中抽取 vse 视频元数据数组（videoDataList / carouselItems / relatedCarouselItems）。 */
import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asin = process.argv[2] || 'B0EX0001';
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4200, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); } return 1; })()`);
await sleep(12000);

const d = await ev(`(() => {
  const html = document.documentElement.outerHTML
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  function extractArray(key) {
    const k = html.indexOf('"' + key + '":');
    if (k < 0) return null;
    const i = html.indexOf('[', k);
    if (i < 0) return null;
    let depth = 0, j = i, inStr = false, esc = false;
    for (; j < html.length; j++) {
      const c = html[j];
      if (inStr) { if (esc) esc = false; else if (c === '\\\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') { inStr = true; continue; }
      if (c === '[' || c === '{') depth++;
      else if (c === ']' || c === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    try { return JSON.parse(html.slice(i, j)); } catch (e) { return { __err: String(e), __raw: html.slice(i, i + 400) }; }
  }
  const out = {};
  for (const key of ['videoDataList', 'carouselItems', 'relatedCarouselItems']) out[key] = extractArray(key);
  const slim = (arr) => Array.isArray(arr) ? arr.map((x) => ({
    contentId: x.contentId, title: x.title, dur: x.formattedDuration,
    vendorName: x.vendorName, publicName: x.publicName, creatorType: x.creatorType,
    relatedProductsAsins: x.relatedProductsAsins, aci: x.aciContentId,
  })) : arr;
  return {
    videoCount: (document.querySelector('#videoCount')?.innerText || '').trim(),
    videoDataList: slim(out.videoDataList),
    carouselItems: slim(out.carouselItems),
    relatedCarouselItems: slim(out.relatedCarouselItems),
  };
})()`);

writeFileSync(`${ROOT}/.tmp/video-data-${asin}.json`, JSON.stringify(d, null, 2), 'utf8');
console.log('videoCount:', d.videoCount);
for (const k of ['videoDataList', 'carouselItems', 'relatedCarouselItems']) {
  const a = d[k];
  console.log(`\n=== ${k} === (${Array.isArray(a) ? a.length : 'n/a'})`);
  if (!Array.isArray(a)) { console.log('  ', JSON.stringify(a).slice(0, 300)); continue; }
  for (const x of a) console.log(`  [${x.creatorType}] ${x.dur} "${(x.title || '').slice(0, 60)}" — ${x.publicName} | related=${x.relatedProductsAsins}`);
}
cdp.ws.close();
