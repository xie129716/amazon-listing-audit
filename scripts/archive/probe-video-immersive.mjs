/* 打开沉浸式视频面板（点主图「N VIDEOS」），按 'Videos for this product' / 'Related videos...' 两段取权威清单。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync, readFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const sheet = JSON.parse(readFileSync('E:/listing_exam/data/derived/sheet-all-records.json', 'utf8'));
const recByAsin = {};
for (const r of sheet.records) recByAsin[r.ASIN] = r;

const asins = process.argv.slice(2).length ? process.argv.slice(2) : ['B0FDQMCKRM', 'B0FF8YBX8P'];
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);
const out = {};

for (const asin of asins) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1400, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev(`window.scrollTo(0,0)`);
  await sleep(4000);

  await ev(`(() => { const li = document.querySelector('#altImages li.videoThumbnail'); if (li) { const t = li.querySelector('img') || li; t.click(); li.click(); } return 1; })()`);
  await sleep(11000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    // 沉浸式面板里通常有一个 video 列表容器
    const heads = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0
      && /^(Videos for this product|Related videos for this product)$/i.test(txt(e.innerText)));
    const res = { videoCount: txt(document.querySelector('#videoCount')?.innerText || ''), heads: [] };
    for (const h of heads) {
      // 向上找到含多个视频卡片的祖先
      let n = h, box = null;
      for (let up = 0; up < 12 && n; up++) {
        n = n.parentElement; if (!n) break;
        const cards = [...n.querySelectorAll('a[href*="/vdp/"], a[href*="aci="]')].filter((a) => /\\d+:\\d\\d/.test(txt(a.innerText)));
        if (cards.length) { box = { n: cards.length, items: cards.map((a) => txt(a.innerText).replace(/\\n/g, ' | ').slice(0, 140)), cls: (n.className || '').toString().slice(0, 80), id: n.id || '' }; break; }
      }
      res.heads.push({ text: txt(h.innerText), box });
    }
    // 兜底：整页所有 "m:ss ..." 卡片
    const all = [...document.querySelectorAll('a[href*="/vdp/"]')].map((a) => txt(a.innerText).replace(/\\n/g, ' | ').slice(0, 140)).filter((t) => /\\d+:\\d\\d/.test(t));
    res.allVdp = [...new Set(all)];
    return res;
  })()`);

  out[asin] = d;
  console.log(`\n========== ${asin} | 角标 ${d.videoCount} | 标题数 ${d.heads.length}`);
  for (const h of d.heads) {
    console.log(`  [${h.text}] box=${h.box ? h.box.n + ' 条 #' + h.box.id + ' .' + h.box.cls : 'n/a'}`);
    for (const t of h.box?.items || []) console.log(`      ${t}`);
  }
  console.log(`  全页 /vdp/ 卡片 ${d.allVdp.length} 条:`);
  for (const t of d.allVdp || []) console.log(`      ${t}`);
  await sleep(2000);
}
writeFileSync('E:/listing_exam/.tmp/video-immersive.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
