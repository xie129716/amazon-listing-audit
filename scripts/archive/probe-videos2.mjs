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
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); } return 1; })()`);
  await sleep(3000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const o = {};
    // 主图区视频计数文案
    o.videoCountText = txt(document.querySelector('#videoCount')?.innerText || '');
    o.galleryVideoThumbs = document.querySelectorAll('#altImages li.videoThumbnail').length;
    // 视频条目标题
    o.videoTitles = Array.from(document.querySelectorAll('.vse-video-title, .video-title-container-left, [class*="vse-video-title"]'))
      .map(e => txt(e.innerText)).filter(Boolean).slice(0, 20);
    // 是否红人/达人（Amazon 现在把红人视频并入视频模块，标题带创作者信息或头像链接）
    o.hasCreatorSection = !!document.querySelector('[id*="influencer"],[class*="influencer"],[data-testid*="creator"]');
    o.creatorVideoItems = document.querySelectorAll('[class*="creator-video"], [class*="influencer-video"]').length;
    // 视频模块总数
    o.vseVideoItems = document.querySelectorAll('.vse-video-item, [data-csa-c-content-id*="vse"]').length;
    // 抓取完整视频列表文本（用于人工判断红人）
    const vt = document.querySelector('.vse-video-title, #vvp-videos, [class*="vse-video-title"]');
    o.videoSectionText = txt(document.querySelector('[class*="vse-video-title"]')?.closest('div')?.innerText || '').slice(0, 500);
    return o;
  })()`);
  out[asin] = d;
  console.log(asin, '|', d.videoCountText, '| 视频标题:', JSON.stringify(d.videoTitles.slice(0, 8)));
  console.log('   hasCreatorSection:', d.hasCreatorSection, '| creatorVideoItems:', d.creatorVideoItems, '| vseItems:', d.vseVideoItems);
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-probe2.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
