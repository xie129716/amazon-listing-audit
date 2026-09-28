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
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); } return 1; })()`);
  await sleep(3000);
  await ev(`(() => { const t = document.querySelector('#altImages li.videoThumbnail input, #altImages li.videoThumbnail'); if (t) { try { t.click(); } catch(e){} } return 1; })()`);
  await sleep(6000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const countText = txt(document.querySelector('#videoCount')?.innerText || '');   // 例如 "6 VIDEOS" / "VIDEO"
    const m = countText.match(/(\\d+)\\s*VIDEO/i);
    const total = m ? parseInt(m[1], 10) : (/VIDEO/i.test(countText) ? 1 : 0);
    // 轮播条目数（作为交叉校验）
    const carousel = document.querySelectorAll('#vvp-videos .vse-video-item, .vse-video-item, [data-csa-c-content-id*="vvp"] .vse-video-item').length;
    // 卖家自建视频（creatorType=Seller / vendorName=自有品牌）
    const html = document.documentElement.innerHTML;
    const sellerVideos = (html.match(/"creatorType"\\s*:\\s*"Seller"/g) || []).length;
    return { countText, total, carousel, sellerVideos };
  })()`);
  out[asin] = d;
  console.log(`${asin}: 主图区标注 "${d.countText}" → 视频总数 ${d.total} | 轮播条目 ${d.carousel} | 卖家自建 ${d.sellerVideos} → 红人/用户视频 ≈ ${Math.max(0, d.total - Math.max(d.sellerVideos, d.total > 0 ? 1 : 0))}`);
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-totals.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
