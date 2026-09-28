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
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 180)); } window.scrollTo(0,0); return 1; })()`);
  await sleep(3500);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const o = { url: location.href };
    // 主图区视频计数
    o.heroVideoCountText = txt(document.querySelector('#videoCount')?.innerText || '');
    // 整个视频模块的清单：Amazon 在 videoBlock 里区分 "Videos for this product" / "Related videos for this product"
    const blocks = [];
    for (const sel of ['#videoBlock', '#va-video-block', '[data-hook="video-block"]', '#vse-related-videos-widget', '#va-related-videos-widget']) {
      const el = document.querySelector(sel);
      if (el) blocks.push({ sel, text: txt(el.innerText).slice(0, 1200) });
    }
    o.blocks = blocks;
    // 全页查找两个分组标题
    const all = document.body.innerText || '';
    o.hasVideosForThisProduct = /Videos for this product/i.test(all);
    o.hasRelatedVideos = /Related videos for this product/i.test(all);
    const i1 = all.indexOf('Videos for this product');
    const i2 = all.indexOf('Related videos for this product');
    o.ctxVideosForThisProduct = i1 >= 0 ? txt(all.slice(i1, i1 + 400)) : null;
    o.ctxRelatedVideos = i2 >= 0 ? txt(all.slice(i2, i2 + 900)) : null;
    // 视频条目（含创作者名/标题）
    o.videoItems = Array.from(document.querySelectorAll('.vse-video-item, [class*="vse-video-item"], [data-csa-c-content-id*="vse"]'))
      .map(e => txt(e.innerText)).filter(Boolean).slice(0, 15);
    return o;
  })()`);
  out[asin] = d;
  console.log('=====', asin, '=====');
  console.log(' hero:', d.heroVideoCountText, '| Videos for this product:', d.hasVideosForThisProduct, '| Related videos:', d.hasRelatedVideos);
  if (d.ctxVideosForThisProduct) console.log('  [Videos for this product]', d.ctxVideosForThisProduct.slice(0, 260));
  if (d.ctxRelatedVideos) console.log('  [Related videos]', d.ctxRelatedVideos.slice(0, 420));
  console.log('  items:', JSON.stringify(d.videoItems.slice(0, 8)));
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-probe3.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
