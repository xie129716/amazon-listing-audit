/* 把 #va-related-videos-widget 拆成「Videos for this product」与「Related videos for this product」两段，分别取条目。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asins = process.argv.slice(2).length ? process.argv.slice(2) : ['B0FF8YBX8P'];
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
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    if (!w) return { err: 'no widget' };
    // 找两个小节标题
    const leaves = [...w.querySelectorAll('*')].filter((e) => e.children.length === 0);
    const findHead = (re) => leaves.find((e) => re.test(txt(e.innerText)) && txt(e.innerText).length < 40);
    const hMain = findHead(/^Videos for this product/i);
    const hRel = findHead(/^Related videos for this product/i);

    // 从小节标题往下收集 carousel 条目
    const collect = (head) => {
      if (!head) return { count: 0, items: [] };
      let node = head;
      for (let up = 0; up < 8 && node; up++) {
        node = node.parentElement;
        if (!node) break;
        const items = [...node.querySelectorAll('a.vse-carousel-item')];
        if (items.length) {
          return {
            count: items.length,
            items: items.map((a) => ({ href: (a.getAttribute('href') || '').slice(0, 150), text: txt(a.innerText).slice(0, 130) })),
          };
        }
      }
      return { count: 0, items: [] };
    };
    // 直接按 DOM 顺序切：把所有 carousel-item 按出现位置分组到最近的上方标题
    const all = [...w.querySelectorAll('a.vse-carousel-item')];
    const groups = { main: [], related: [], unknown: [] };
    for (const a of all) {
      let n = a, tag = 'unknown';
      for (let up = 0; up < 14 && n; up++) {
        n = n.parentElement;
        if (!n) break;
        const t = txt(n.innerText || '');
        if (/^Related videos for this product/i.test(t)) { tag = 'related'; break; }
        if (/^Videos for this product/i.test(t) && !/Related videos/i.test(t)) { tag = 'main'; break; }
      }
      groups[tag].push(txt(a.innerText).slice(0, 130));
    }
    return {
      videoCount: txt(document.querySelector('#videoCount')?.innerText || ''),
      hasMainHead: !!hMain, hasRelHead: !!hRel,
      mainHeadText: txt(hMain?.innerText || ''), relHeadText: txt(hRel?.innerText || ''),
      groups,
    };
  })()`);
  out[asin] = d;
  console.log(`\n===== ${asin} | #videoCount=${d.videoCount} | 小节标题 main=${d.hasMainHead} related=${d.hasRelHead}`);
  for (const g of ['main', 'related', 'unknown']) {
    console.log(`  [${g}] ${(d.groups?.[g] || []).length} 条`);
    for (const t of d.groups?.[g] || []) console.log(`      ${t.replace(/\\n/g, ' | ')}`);
  }
  await sleep(2000);
}
writeFileSync('E:/listing_exam/.tmp/video-sections.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
