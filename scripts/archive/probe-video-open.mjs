import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const ASINS = process.argv.slice(2);
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);
const out = {};

await cdp.send('Page.setDownloadBehavior', { behavior: 'deny' }).catch(() => {});

for (const asin of ASINS) {
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); } return 1; })()`);
  await sleep(3000);

  // 点击主图区的视频缩略图，打开视频抽屉/列表
  const opened = await ev(`(() => {
    const cands = [
      document.querySelector('#altImages li.videoThumbnail input'),
      document.querySelector('#altImages li.videoThumbnail'),
      document.querySelector('#videoCount'),
      document.querySelector('[data-csa-c-content-id*="video"]'),
    ];
    for (const c of cands) { if (c) { try { c.click(); return 'clicked'; } catch {} } }
    return 'none';
  })()`);
  await sleep(6000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const html = document.documentElement.innerHTML;
    const types = {};
    for (const m of html.matchAll(/"creatorType"\\s*:\\s*"([^"]+)"/g)) types[m[1]] = (types[m[1]] || 0) + 1;
    const titles = [...new Set([...html.matchAll(/"videoTitle"\\s*:\\s*"([^"]+)"/g)].map(x => x[1]))];
    const custReviews = [...new Set([...html.matchAll(/(Customer Review:\\s*[^"<]{0,80})/g)].map(x => txt(x[1])))];
    const prodVideos = [...new Set([...html.matchAll(/(Product Videos\\s*-\\s*[^"<]{0,80})/g)].map(x => txt(x[1])))];
    return {
      url: location.href,
      videoCountText: txt(document.querySelector('#videoCount')?.innerText || ''),
      creatorTypeCounts: types,
      videoTitles: titles.slice(0, 20),
      customerReviewTitles: custReviews.slice(0, 20),
      productVideoTitles: prodVideos.slice(0, 20),
      carouselItems: document.querySelectorAll('#vvp-videos .vse-video-item, .vse-video-item').length,
    };
  })()`);
  out[asin] = { opened, ...d };
  console.log(`\n===== ${asin} (点击:${opened}) | 主图区: ${d.videoCountText} | 轮播条目: ${d.carouselItems}`);
  console.log('  creatorType:', JSON.stringify(d.creatorTypeCounts));
  console.log('  videoTitles:', JSON.stringify(d.videoTitles.slice(0, 10)));
  console.log('  CustomerReview:', JSON.stringify(d.customerReviewTitles.slice(0, 8)));
  console.log('  ProductVideos:', JSON.stringify(d.productVideoTitles.slice(0, 8)));
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-creators3.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
