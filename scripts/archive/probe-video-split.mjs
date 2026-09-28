/* 用 compareDocumentPosition 按两个小节标题把 carousel 条目精确切分。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asins = process.argv.slice(2).length ? process.argv.slice(2) : ['B0FDQMCKRM', 'B0FF8YBX8P'];
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

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
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget');
    if (!w) return { err: 'no widget' };
    const leaves = [...w.querySelectorAll('*')].filter((e) => e.children.length === 0);
    const hMain = leaves.find((e) => /^Videos for this product$/i.test(txt(e.innerText)));
    const hRel = leaves.find((e) => /^Related videos for this product$/i.test(txt(e.innerText)));
    if (!hMain) return { err: 'no main heading', leaves: leaves.map((e) => txt(e.innerText)).filter((t) => /video/i.test(t)).slice(0, 20) };
    const after = (h, el) => (h.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    const items = [...w.querySelectorAll('a.vse-carousel-item')];
    const main = [], related = [];
    for (const a of items) {
      if (hRel && after(hRel, a)) related.push(txt(a.innerText));
      else if (after(hMain, a)) main.push(txt(a.innerText));
    }
    return {
      videoCount: txt(document.querySelector('#videoCount')?.innerText || ''),
      mainHead: txt(hMain.innerText), relHead: txt(hRel?.innerText || '(无)'),
      mainCount: main.length, relatedCount: related.length,
      main, related,
    };
  })()`);
  console.log(`\n===== ${asin} | #videoCount=${d.videoCount} | main 标题="${d.mainHead}" related 标题="${d.relHead}"`);
  if (d.err) { console.log('  ERR', d.err, JSON.stringify(d.leaves || []).slice(0, 300)); continue; }
  console.log(`  [Videos for this product] ${d.mainCount} 条:`);
  for (const t of d.main) console.log(`      ${t.replace(/\\n/g, ' | ')}`);
  console.log(`  [Related videos for this product] ${d.relatedCount} 条:`);
  for (const t of d.related) console.log(`      ${t.replace(/\\n/g, ' | ')}`);
  await sleep(2000);
}
cdp.ws.close();
