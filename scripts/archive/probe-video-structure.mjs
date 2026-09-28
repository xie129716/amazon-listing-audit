/* 结构化诊断：把 video widget 的原始 DOM / innerText 全量 dump 出来，看清条目到底怎么组织的。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asin = process.argv[2] || 'B0FDQMCKRM';
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4200, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); } window.scrollTo(0,0); return 1; })()`);
await sleep(12000);

const d = await ev(`(() => {
  const txt = (s) => (s || '').replace(/[ \\t]+/g, ' ').replace(/\\n{2,}/g, '\\n').trim();
  const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
  const res = { found: !!w, id: w?.id || '', cls: w?.className || '' };
  if (!w) return res;
  res.innerText = txt(w.innerText);
  res.anchors = [...w.querySelectorAll('a')].slice(0, 80).map(a => ({
    href: (a.getAttribute('href') || '').slice(0, 220),
    text: txt(a.innerText).slice(0, 120),
    cls: (a.className || '').toString().slice(0, 100),
  }));
  // 所有含 video 的 class 名
  const cls = new Set();
  for (const el of w.querySelectorAll('*')) { const c = (el.className || '').toString(); if (/video/i.test(c)) cls.add(c.slice(0, 120)); }
  res.videoClasses = [...cls].slice(0, 60);
  // 外层结构树（3 层）
  const tree = [];
  const walk = (el, depth) => {
    if (depth > 3) return;
    tree.push('  '.repeat(depth) + el.tagName.toLowerCase() + '.' + (el.className || '').toString().slice(0, 60) + ' :: ' + txt(el.innerText).slice(0, 90).replace(/\\n/g, ' / '));
    for (const c of el.children) walk(c, depth + 1);
  };
  walk(w, 0);
  res.tree = tree.slice(0, 120);
  return res;
})()`);

writeFileSync('E:/listing_exam/.tmp/video-structure.json', JSON.stringify(d, null, 2), 'utf8');
console.log('found=', d.found, 'id=', d.id);
console.log('\n===== innerText =====\n' + (d.innerText || '').slice(0, 4000));
console.log('\n===== anchors (' + (d.anchors || []).length + ') =====');
for (const a of d.anchors || []) console.log(`  [${a.cls}] "${a.text}" -> ${a.href}`);
cdp.ws.close();
