/* 单次加载内同时取：角标、segment 条目（带 aci）、元数据（related/creatorType），并对齐分析。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const sheet = JSON.parse(readFileSync('E:/listing_exam/data/derived/sheet-all-records.json', 'utf8'));
const recByAsin = {};
for (const r of sheet.records) recByAsin[r.ASIN] = r;

const asins = process.argv.slice(2).length ? process.argv.slice(2) : ['B0FDQMCKRM', 'B0FF8YBX8P'];
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

for (const asin of asins) {
  const parent = String(recByAsin[asin]?.['父ASIN'] || '').trim();
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4200, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); } return 1; })()`);
  await sleep(14000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const html = document.documentElement.outerHTML
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    function arr(key) {
      const k = html.indexOf('"' + key + '":'); if (k < 0) return null;
      const i = html.indexOf('[', k); if (i < 0) return null;
      let depth = 0, j = i, inStr = false, esc = false;
      for (; j < html.length; j++) { const c = html[j];
        if (inStr) { if (esc) esc = false; else if (c === '\\\\') esc = true; else if (c === '"') inStr = false; continue; }
        if (c === '"') { inStr = true; continue; }
        if (c === '[' || c === '{') depth++; else if (c === ']' || c === '}') { depth--; if (depth === 0) { j++; break; } } }
      try { return JSON.parse(html.slice(i, j)); } catch (e) { return null; }
    }
    const meta = (arr('carouselItems') || []).map((x) => ({ aci: x.aciContentId || '', id: x.contentId || '', related: x.relatedProductsAsins || '', type: x.creatorType || '', name: x.publicName || '' }));
    // segment 条目
    const carousels = [...document.querySelectorAll('ol.a-carousel')].filter((ol) => ol.querySelector('a.vse-carousel-item'));
    let videoseg = null;
    for (const ol of carousels) {
      let cur = null; const segs = [];
      for (const c of ol.children) {
        const t = txt(c.innerText || '');
        if (/^(Videos for this product|Related videos for this product)$/i.test(t)) { cur = { title: t, items: [] }; segs.push(cur); continue; }
        const a = c.querySelector('a.vse-carousel-item');
        if (a) { const m = (a.getAttribute('href') || '').match(/aci=([^&]+)/); if (!cur) { cur = { title: '(none)', items: [] }; segs.push(cur); } cur.items.push({ aci: m ? decodeURIComponent(m[1]) : '', text: txt(a.innerText).replace(/\\n/g, ' | ') }); }
      }
      const v = segs.find((s) => /^Videos for this product$/i.test(s.title));
      if (v) { videoseg = { title: v.title, n: v.items.length, items: v.items, otherSegs: segs.filter((s) => s !== v).map((s) => ({ title: s.title, n: s.items.length })) }; break; }
    }
    return { videoCount: txt(document.querySelector('#videoCount')?.innerText || ''), meta, videoseg };
  })()`);

  const metaByAci = {};
  for (const m of d.meta) metaByAci[m.aci] = m;

  console.log(`\n========== ${asin} | 角标 ${d.videoCount} | 'Videos for this product' 段 ${d.videoseg?.n ?? 0} 条 | 其他段 ${JSON.stringify(d.videoseg?.otherSegs || [])}`);
  const family = new Set([asin, parent].filter(Boolean));
  let hit = 0;
  for (const it of d.videoseg?.items || []) {
    const m = metaByAci[it.aci] || {};
    const rel = String(m.related || '').split(',').map((s) => s.trim()).filter(Boolean);
    const inFam = rel.some((a) => family.has(a));
    if (inFam) hit++;
    console.log(`  ${inFam ? '✅' : '❌'} [${m.type}] ${it.text}  | related=${m.related || '(缺元数据)'}`);
  }
  console.log(`  → 归属 {本ASIN,父 ${parent}} 的条目: ${hit} / ${d.videoseg?.n ?? 0}`);
  await sleep(2000);
}
cdp.ws.close();
