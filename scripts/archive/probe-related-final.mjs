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

  // 反复滚动 Related videos 模块，触发懒加载，直到条目数稳定
  let prev = -1, stable = 0;
  for (let round = 0; round < 12 && stable < 3; round++) {
    await ev(`(async () => {
      const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
      if (w) w.scrollIntoView({ block: 'center' });
      window.scrollBy(0, 400);
      await new Promise(r => setTimeout(r, 600));
      return 1;
    })()`);
    await sleep(2500);
    const n = await ev(`(() => {
      const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
      if (!w) return 0;
      const seen = new Set();
      for (const el of w.querySelectorAll('li, [class*="video-item"], [class*="vse-video"], [class*="card"]')) {
        const t = (el.innerText || '').replace(/\\s+/g, ' ').trim();
        if (t && t.length < 300) seen.add(t);
      }
      return seen.size;
    })()`);
    if (n === prev) stable++; else { stable = 0; prev = n; }
  }

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    const o = { videoCountText: txt(document.querySelector('#videoCount')?.innerText || '') };

    // 收集模块内所有视频条目名（去重）
    const names = new Set();
    if (w) {
      for (const el of w.querySelectorAll('li, [class*="video-item"], [class*="vse-video"], [class*="card"], div, span')) {
        const t = txt(el.innerText);
        if (!t || t.length > 220) continue;
        if (/Product Videos\\s*-|Customer Review:/i.test(t)) names.add(t.replace(/See full review.*/i, '').replace(/Earns commissions?.*/i, '').trim());
      }
    }
    o.entries = [...names].slice(0, 30);

    // 分类：红人合作（Product Videos - 创作者） vs 用户测评（Customer Review）
    const creatorEntries = o.entries.filter(t => /Product Videos\\s*-/i.test(t));
    const customerEntries = o.entries.filter(t => /Customer Review:/i.test(t));
    o.creatorCount = creatorEntries.length;
    o.customerCount = customerEntries.length;
    o.creatorEntries = creatorEntries;
    o.customerEntries = customerEntries;
    // 主图区总数
    const mm = o.videoCountText.match(/(\\d+)/);
    o.heroTotal = mm ? parseInt(mm[1], 10) : (o.videoCountText ? 1 : 0);
    return o;
  })()`);
  out[asin] = d;
  console.log(`\n========== ${asin} | 主图区标注: ${d.videoCountText} (总 ${d.heroTotal})`);
  console.log(`  红人合作视频 ${d.creatorCount} 条:`, JSON.stringify(d.creatorEntries));
  console.log(`  用户测评视频 ${d.customerCount} 条:`, JSON.stringify(d.customerEntries));
  console.log(`  品牌视频（Videos for this product）≈ ${Math.max(0, d.heroTotal - d.creatorCount - d.customerCount)} 条`);
  await sleep(2500);
}
writeFileSync('E:/listing_exam/data/derived/video-related-final.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
