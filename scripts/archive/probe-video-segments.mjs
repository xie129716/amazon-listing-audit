/* 按 carousel 的 segment 切分：'Videos for this product' vs 'Related videos for this product'。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asins = process.argv.slice(2).length ? process.argv.slice(2) : ['B0FDQMCKRM', 'B0FF8YBX8P'];
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);
const out = {};

for (const asin of asins) {
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
    const carousels = [...document.querySelectorAll('ol.a-carousel')].filter((ol) => ol.querySelector('a.vse-carousel-item'));
    const res = { videoCount: txt(document.querySelector('#videoCount')?.innerText || ''), carousels: [] };
    for (const ol of carousels) {
      const cards = [...ol.children];
      const segs = []; let cur = null;
      for (const c of cards) {
        const t = txt(c.innerText || '');
        const isHead = /^(Videos for this product|Related videos for this product)$/i.test(t)
          || (/vse-flex-carousel-header/.test((c.className || '').toString()) && t.length < 45);
        if (isHead) { cur = { title: t, items: [] }; segs.push(cur); continue; }
        const a = c.querySelector('a.vse-carousel-item');
        if (a) {
          const href = a.getAttribute('href') || '';
          const m = href.match(/aci=([^&]+)/);
          if (!cur) { cur = { title: '(无标题段)', items: [] }; segs.push(cur); }
          cur.items.push({ aci: m ? decodeURIComponent(m[1]) : '', text: txt(a.innerText).replace(/\\n/g, ' | ').slice(0, 130) });
        }
      }
      res.carousels.push({ id: ol.id || '', cls: (ol.className || '').toString().slice(0, 70), segs: segs.map((s) => ({ title: s.title, n: s.items.length, items: s.items })) });
    }
    return res;
  })()`);
  out[asin] = d;
  console.log(`\n===== ${asin} | #videoCount=${d.videoCount} | carousel 数 ${d.carousels.length}`);
  for (const c of d.carousels) {
    console.log(`  carousel#${c.id} .${c.cls}`);
    for (const s of c.segs) {
      console.log(`    [${s.title}] ${s.n} 条`);
      for (const it of s.items) console.log(`        ${it.text}   (${it.aci})`);
    }
  }
  await sleep(2000);
}
writeFileSync('E:/listing_exam/.tmp/video-segments.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
