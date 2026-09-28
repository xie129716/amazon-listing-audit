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
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 240)); } return 1; })()`);
  await sleep(12000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    const whole = txt(w?.innerText || '');

    // 以「时长 m:ss」为分隔符切条目；每条形如 "标题 创作者"
    const parts = whole.split(/(\\d+:\\d\\d)/);
    const entries = [];
    for (let i = 1; i < parts.length; i += 2) {
      const dur = parts[i];
      const after = (parts[i + 1] || '').replace(/^(Now playing)/i, '').trim();
      if (!after) continue;
      entries.push({ dur, text: after.slice(0, 200) });
    }

    // 分类（按条目名原文，不去重）
    const creators = [], customers = [], brand = [];
    for (const e of entries) {
      if (/^Customer Review:/i.test(e.text)) customers.push(e);
      else if (/Product Videos\\s*-/i.test(e.text)) creators.push(e);
      else brand.push(e);   // 无前缀 → 品牌自建
    }
    // 品牌自建条目里，署名等于自有品牌的才算品牌视频
    const ownBrandRe = /(BRAND_A|BRAND_B|BRAND_C|BRAND_D|Lawnful|BRAND_F|BRAND_G)/i;
    const brandOnly = brand.filter(e => ownBrandRe.test(e.text));
    const others = brand.filter(e => !ownBrandRe.test(e.text));

    return {
      videoCountText: txt(document.querySelector('#videoCount')?.innerText || ''),
      entries,
      creatorCount: creators.length,
      creatorTexts: creators.map(e => e.text),
      customerCount: customers.length,
      customerTexts: customers.map(e => e.text),
      brandCount: brandOnly.length,
      brandTexts: brandOnly.map(e => e.text),
      othersTexts: others.map(e => e.text),
    };
  })()`);
  out[asin] = d;
  console.log(`\n===== ${asin} | 主图区: ${d.videoCountText}`);
  console.log(`  品牌视频 ${d.brandCount}:`, JSON.stringify(d.brandTexts));
  console.log(`  红人视频 ${d.creatorCount}（按条目，不去重）:`);
  d.creatorTexts.forEach(t => console.log(`     - ${t}`));
  console.log(`  用户视频 ${d.customerCount}:`, JSON.stringify(d.customerTexts));
  if (d.othersTexts.length) console.log(`  其他(无前缀) ${d.othersTexts.length}:`, JSON.stringify(d.othersTexts));
  await sleep(2000);
}
writeFileSync(`${ROOT}/data/derived/video-final-counts.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
