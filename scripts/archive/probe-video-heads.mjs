/* 定位页面里「Related videos for this product」小节，取它的条目（= 不属于本商品的那些）。 */
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
    const doc = document;
    const leaves = [...doc.querySelectorAll('*')].filter((e) => e.children.length === 0);
    const heads = leaves.filter((e) => /videos for this product/i.test(txt(e.innerText)) && txt(e.innerText).length < 45);
    const res = { videoCount: txt(doc.querySelector('#videoCount')?.innerText || ''), heads: [] };
    for (const h of heads) {
      const info = { text: txt(h.innerText), path: [], items: [] };
      let n = h;
      for (let up = 0; up < 10 && n; up++) {
        n = n.parentElement;
        if (!n) break;
        info.path.push(n.tagName + '.' + (n.className || '').toString().slice(0, 50) + '#' + (n.id || ''));
        const items = [...n.querySelectorAll('a.vse-carousel-item')];
        if (items.length && !info.items.length) {
          info.items = items.map((a) => txt(a.innerText).replace(/\\n/g, ' | '));
          info.containerId = n.id || ''; info.containerCls = (n.className || '').toString().slice(0, 90);
        }
        if (info.items.length && up >= 5) break;
      }
      res.heads.push(info);
    }
    return res;
  })()`);
  out[asin] = d;
  console.log(`\n===== ${asin} | #videoCount=${d.videoCount} | 找到 ${d.heads.length} 个 'videos for this product' 标题`);
  d.heads.forEach((h, i) => {
    console.log(`  [${i}] "${h.text}" container=#${h.containerId} .${h.containerCls}`);
    console.log(`       路径: ${h.path.slice(0, 5).join(' < ')}`);
    console.log(`       条目 ${h.items.length}:`);
    for (const t of h.items) console.log(`         - ${t}`);
  });
  await sleep(2000);
}
writeFileSync('E:/listing_exam/.tmp/video-heads.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
