/* 取主图区视频角标 #videoCount + 图集里的视频缩略图数量，与 carousel 条目数对比。 */
import { setTimeout as sleep } from 'node:timers/promises';
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
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); } window.scrollTo(0,0); return 1; })()`);
await sleep(10000);

const d = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const out = {};
  out.videoCount = txt(document.querySelector('#videoCount')?.innerText || '');
  out.videoCountHTML = (document.querySelector('#videoCount')?.outerHTML || '').slice(0, 400);
  // 图集 altImages 里的视频缩略图
  const li = [...document.querySelectorAll('#altImages li')];
  out.altCount = li.length;
  out.altItems = li.map((e) => ({
    cls: (e.className || '').toString().slice(0, 80),
    txt: txt(e.innerText).slice(0, 60),
    img: (e.querySelector('img')?.src || '').slice(-90),
  }));
  // 页面里所有 videoCount / 'VIDEOS' 字样
  out.videosWord = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^\\d+\\s*VIDEO/i.test(txt(e.innerText))).map((e) => txt(e.innerText)).slice(0, 10);
  out.htmlHasIve = (document.documentElement.innerHTML.match(/amzn1\\.ive\\.[a-z.]+/g) || []).slice(0, 30);
  out.vseIds = [...new Set((document.documentElement.innerHTML.match(/amzn1\\.vse\\.video\\.[0-9a-f]+/g) || []))];
  out.iveIds = [...new Set((document.documentElement.innerHTML.match(/amzn1\\.ive\\.[a-z.]+\\.[0-9a-f]+/g) || []))];
  out.reviewVideoIds = [...new Set((document.documentElement.innerHTML.match(/amzn1\\.productreview\\.[A-Z0-9]+/g) || []))];
  return out;
})()`);

console.log('videoCount      :', d.videoCount);
console.log('videoCountHTML  :', d.videoCountHTML);
console.log('altImages count :', d.altCount);
console.log('VIDEOS 字样      :', JSON.stringify(d.videosWord));
console.log('vse.video ids   :', d.vseIds.length, JSON.stringify(d.vseIds));
console.log('ive.* ids       :', d.iveIds.length, JSON.stringify(d.iveIds));
console.log('productreview   :', d.reviewVideoIds.length, JSON.stringify(d.reviewVideoIds));
console.log('\naltImages items:');
for (const [i, x] of d.altItems.entries()) console.log(`  ${i + 1}. [${x.cls}] "${x.txt}" ${x.img}`);
cdp.ws.close();
