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
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4200, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 220)); } return 1; })()`);
  await sleep(10000);

  const d = await ev(`(() => {
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    const html = w ? w.innerHTML : document.documentElement.innerHTML;

    // 每个视频条目的 JSON 块：抓 { ... videoTitle ... }，并配对同一块内的 creatorType / vendorName / aciContentId
    const blocks = [];
    // 用 aciContentId 作为锚点切块（每条视频都有）
    const parts = html.split(/"aciContentId"\\s*:\\s*"([^"]*)"/);
    for (let i = 1; i < parts.length; i += 2) {
      const id = parts[i];
      const seg = parts[i + 1] || '';
      const prev = parts[i - 1] || '';
      const ctx = prev.slice(-1500) + seg.slice(0, 2500);
      const pick = (k) => (ctx.match(new RegExp('"' + k + '"\\\\s*:\\\\s*"([^"]*)"')) || [])[1] || null;
      blocks.push({
        aciContentId: id,
        videoTitle: pick('videoTitle'),
        creatorType: pick('creatorType'),
        videoType: pick('videoType'),
        vendorName: pick('vendorName'),
        isSeller: /seller/i.test(id),
        isIve: /ive\\.(customer|creator|influencer)/i.test(id),
      });
    }
    // 去重
    const seen = new Set(); const uniq = [];
    for (const b of blocks) { const k = b.aciContentId; if (!seen.has(k)) { seen.add(k); uniq.push(b); } }

    return {
      videoCountText: (document.querySelector('#videoCount')?.innerText || '').replace(/\\s+/g,' ').trim(),
      blocks: uniq,
      total: uniq.length,
      sellerBlocks: uniq.filter(b => b.isSeller || /seller/i.test(b.creatorType || '')).length,
      creatorBlocks: uniq.filter(b => b.isIve || /customer|creator|influencer/i.test(b.creatorType || '')).length,
    };
  })()`);
  out[asin] = d;
  console.log(`\n========== ${asin} | 主图区标注: ${d.videoCountText} | 抓到条目 ${d.total} 条（seller ${d.sellerBlocks} / ive ${d.creatorBlocks}）`);
  d.blocks.forEach((b, i) => {
    console.log(`  [${i + 1}] type=${b.creatorType} vType=${b.videoType} vendor=${b.vendorName} | aci=${b.aciContentId}`);
    console.log(`       title=${JSON.stringify(b.videoTitle)}`);
  });
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-metadata.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
