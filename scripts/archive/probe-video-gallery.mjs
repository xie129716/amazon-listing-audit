/* 点击主图区的「N VIDEOS」缩略图，打开商品自己的视频列表，取出权威清单。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asin = process.argv[2] || 'B0FF8YBX8P';
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1200, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`window.scrollTo(0,0)`);
await sleep(4000);

// 点主图区的视频缩略图
const clicked = await ev(`(() => {
  const li = document.querySelector('#altImages li.videoThumbnail') || document.querySelector('#altImages .videoBlockIngress');
  if (!li) return 'no-thumb';
  const t = li.querySelector('img') || li.querySelector('div') || li;
  t.click(); li.click();
  return 'clicked';
})()`);
console.log('click:', clicked);
await sleep(9000);

const dump = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const out = { containers: [] };
  for (const sel of ['#ivVideosGrid', '#ivVideos', '#videoBlock', '#imageBlock', '#immersive-view', '.ivVideosGrid', '#videoCount']) {
    const el = document.querySelector(sel);
    if (el) out.containers.push({ sel, text: txt(el.innerText).slice(0, 1500) });
  }
  // 页面上所有出现 'Videos for this product' / 'videos' 的可见块
  out.headings = [...document.querySelectorAll('h1,h2,h3,h4,span,div')]
    .filter((e) => e.children.length === 0 && /videos?\\b/i.test(txt(e.innerText)) && txt(e.innerText).length < 60)
    .map((e) => txt(e.innerText)).slice(0, 25);
  out.videoEls = [...document.querySelectorAll('[id*="video" i], [class*="video" i]')].slice(0, 60)
    .map((e) => ({ tag: e.tagName, id: e.id, cls: (e.className || '').toString().slice(0, 70), txt: txt(e.innerText).slice(0, 80) }));
  return out;
})()`);

writeFileSync(`E:/listing_exam/.tmp/gallery-${asin}.json`, JSON.stringify(dump, null, 2), 'utf8');
console.log('\ncontainers:');
for (const c of dump.containers) console.log(`  ${c.sel}: ${c.text.slice(0, 600)}`);
console.log('\nheadings:', JSON.stringify(dump.headings));
console.log('\nvideo elements:');
for (const v of dump.videoEls) console.log(`  ${v.tag} #${v.id} .${v.cls} :: ${v.txt}`);
cdp.ws.close();
