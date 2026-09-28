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
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4000, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 220)); } return 1; })()`);
  await sleep(14000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    const whole = txt(w?.innerText || '');
    const o = { whole, videoCountText: txt(document.querySelector('#videoCount')?.innerText || '') };

    // 解析：条目形如 "<时长 m:ss> <标题> <创作者名>"；「Videos for this product」段为品牌自建
    const parts = whole.split(/(\\d+:\\d\\d)/);   // 以时长为分隔
    const entries = [];
    for (let i = 1; i < parts.length; i += 2) {
      const dur = parts[i];
      const after = (parts[i + 1] || '').trim();
      // 去掉尾部可能混入的下一段前缀
      entries.push({ dur, text: after.slice(0, 160) });
    }
    o.entries = entries;

    // 品牌视频段：位于 "Videos for this product" 与首个 "Product Videos" 之间
    const brandIdx = whole.indexOf('Videos for this product');
    o.hasBrandSection = brandIdx >= 0;
    // 创作者名：取每个条目文本的最后一个词组（Amazon 把创作者名放最后）
    const creatorNames = [];
    for (const e of entries) {
      const m = e.text.match(/([^0-9:]{2,40})\\s*$/) ;
      if (m) creatorNames.push(m[1].trim());
    }
    o.creatorNamesGuess = creatorNames;
    return o;
  })()`);
  out[asin] = d;
  console.log(`\n========== ${asin} | 主图区标注: ${d.videoCountText}`);
  console.log('  含品牌视频段:', d.hasBrandSection, '| 条目数:', d.entries.length);
  d.entries.forEach((e, i) => console.log(`   [${i + 1}] ${e.dur}  ${e.text.slice(0, 120)}`));
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-parsed-entries.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
