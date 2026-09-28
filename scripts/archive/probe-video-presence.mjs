/* 快速核对某 ASIN 主图区是否真有视频位。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asins = process.argv.slice(2);
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

for (const asin of asins) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 40; i++) { await sleep(1000); if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break; }
  await sleep(6000);
  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const li = [...document.querySelectorAll('#altImages li')];
    return {
      badge: txt(document.querySelector('#videoCount')?.innerText || ''),
      hasVideoThumb: !!document.querySelector('#altImages li.videoThumbnail'),
      altItems: li.map((e) => (e.className || '').toString().slice(0, 90)),
      playIconImgs: [...document.querySelectorAll('#altImages img')].map((i) => i.src).filter((s) => /play-icon/i.test(s)),
      mainImgPlay: [...document.querySelectorAll('#imageBlock img')].map((i) => i.src).filter((s) => /play-icon|SS40/i.test(s)).slice(0, 5),
    };
  })()`);
  console.log(`\n${asin}: badge="${d.badge}" videoThumbnail=${d.hasVideoThumb}`);
  console.log('  altItems:', JSON.stringify(d.altItems));
  console.log('  playIconImgs:', JSON.stringify(d.playIconImgs));
  await sleep(1500);
}
cdp.ws.close();
