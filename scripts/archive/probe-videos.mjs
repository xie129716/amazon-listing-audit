import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const ASINS = process.argv.slice(2);
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);
const out = {};

for (const asin of ASINS) {
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    const r = await ev(`!!document.querySelector('#productTitle')`).catch(() => false);
    if (r) break;
  }
  // 滚动以加载视频模块
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0,0); return 1; })()`);
  await sleep(3500);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const out = {};
    // 主图区视频（品牌视频）
    out.galleryVideoThumbs = document.querySelectorAll('#altImages li.videoThumbnail, #altImages li.videoBlockIngress').length;

    // 红人合作视频常见容器
    const creatorSels = [
      '#va-related-videos-widget', '#vse-related-videos-widget',
      '[data-csa-c-content-id*="creator"]', '[data-testid*="creator"]',
      '#creator-videos', '.creator-video-widget', '#influencer-video-carousel',
      '#vse-influencer-videos', '[id*="influencer"]', '[class*="influencer"]',
    ];
    out.creatorContainers = [];
    for (const s of creatorSels) {
      for (const el of document.querySelectorAll(s)) {
        const t = txt(el.innerText);
        if (t) out.creatorContainers.push({ sel: s, text: t.slice(0, 300) });
      }
    }
    // 查找 “Related videos for this product” 字样
    const all = document.body.innerText || '';
    const idx = all.indexOf('Related videos for this product');
    out.relatedVideosHeadingFound = idx >= 0;
    if (idx >= 0) out.relatedVideosContext = txt(all.slice(idx, idx + 700));

    // 视频总数（含红人）
    out.videoElements = document.querySelectorAll('video').length;
    out.videoBlock = txt(document.querySelector('#videoBlock, #va-video-block, [data-hook="video-block"]')?.innerText || '').slice(0, 300);
    // 视频区里出现的创作者/达人链接
    out.creatorLinks = Array.from(document.querySelectorAll('a[href*="/shopper/"], a[href*="/creator/"], a[href*="/influencer/"]')).length;
    return out;
  })()`);
  out[asin] = d;
  console.log(asin, JSON.stringify(d).slice(0, 700));
  await sleep(2500);
}

writeFileSync(`${ROOT}/data/derived/video-probe.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
