/* 单次加载内对齐：主图角标 #videoCount / carousel 条目 / 页面内 vse 视频 ID / creatorType JSON。 */
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
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const out = {};
  out.videoCount = txt(document.querySelector('#videoCount')?.innerText || '');

  // 1) carousel 条目（权威锚点）
  const items = [...document.querySelectorAll('a.vse-carousel-item')];
  out.carousel = items.map((a) => {
    const href = a.getAttribute('href') || '';
    const m = href.match(/aci=([^&]+)/);
    return { aci: m ? decodeURIComponent(m[1]) : '', text: txt(a.innerText).slice(0, 140) };
  });

  // 2) 页面里所有视频 id
  const html = document.documentElement.innerHTML;
  out.idsVse = [...new Set(html.match(/amzn1\\.vse\\.video\\.[0-9a-f]{16,}/g) || [])];
  out.idsIve = [...new Set(html.match(/amzn1\\.ive\\.[a-z.]+\\.[0-9a-f]{16,}/g) || [])];
  out.idsReview = [...new Set(html.match(/amzn1\\.productreview\\.[A-Z0-9]{6,}/g) || [])];

  // 3) creatorType 出现处的上下文
  out.creatorTypeHits = [];
  const re = /creatorType/g;
  let m;
  while ((m = re.exec(html)) && out.creatorTypeHits.length < 40) {
    out.creatorTypeHits.push(html.slice(Math.max(0, m.index - 320), m.index + 160).replace(/\\s+/g, ' '));
  }

  // 4) 图集视频缩略图区块的 JSON（imageBlock / colorImages）
  const blocks = [...document.querySelectorAll('script[type="text/javascript"], script[data-a-state]')]
    .map((s) => s.textContent || '')
    .filter((t) => /colorImages|videoUrl|videos/i.test(t));
  out.jsonBlocks = blocks.slice(0, 6).map((t) => t.slice(0, 3000));
  return out;
})()`);

writeFileSync(`${ROOT}/.tmp/video-align.json`, JSON.stringify(d, null, 2), 'utf8');
console.log('videoCount:', d.videoCount);
console.log('carousel entries:', d.carousel.length);
for (const c of d.carousel) console.log(`   ${c.aci}  ::  ${c.text.replace(/\\n/g, ' | ')}`);
console.log('idsVse   :', d.idsVse.length, JSON.stringify(d.idsVse));
console.log('idsIve   :', d.idsIve.length, JSON.stringify(d.idsIve));
console.log('idsReview:', d.idsReview.length, JSON.stringify(d.idsReview));
console.log('creatorType hits:', d.creatorTypeHits.length);
cdp.ws.close();
