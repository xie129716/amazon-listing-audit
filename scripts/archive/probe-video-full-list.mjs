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
  // 滚到 Related videos 模块并反复滚动以获得全部卡片
  await ev(`(async () => {
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    if (w) w.scrollIntoView({ block: 'start' });
    await new Promise(r => setTimeout(r, 800));
    return 1;
  })()`);
  await sleep(6000);

  const names = new Set();
  for (let pass = 0; pass < 10; pass++) {
    const found = await ev(`(() => {
      const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
      const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
      if (!w) return [];
      const res = [];
      for (const el of w.querySelectorAll('*')) {
        const t = txt(el.innerText);
        if (!t || t.length > 180) continue;
        const m = t.match(/Product Videos\\s*-\\s*([^|]{1,60}?)(?:\\s*Earns commissions?|\\s*See full|$)/i);
        if (m && m[1]) res.push(m[1].trim());
        const c = t.match(/Customer Review:\\s*([^|]{1,60})/i);
        if (c && c[1]) res.push('REVIEW:' + c[1].trim());
      }
      return [...new Set(res)];
    })()`);
    for (const f of found) names.add(f);
    // 尝试点击模块里的 "next" 箭头
    await ev(`(() => { const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget'); if (!w) return 0; for (const b of w.querySelectorAll('button, a, [role="button"]')) { const al = (b.getAttribute('aria-label')||'') + ' ' + (b.className||''); if (/next|right|forward/i.test(al)) { try { b.click(); return 1; } catch(e){} } } return 0; })()`);
    await sleep(1800);
  }

  const creators = [...names].filter((x) => !x.startsWith('REVIEW:'));
  const reviews = [...names].filter((x) => x.startsWith('REVIEW:')).map((x) => x.slice(7));
  const countText = await ev(`(document.querySelector('#videoCount')?.innerText || '').replace(/\\s+/g,' ').trim()`);
  const mm = countText.match(/(\d+)/);
  const heroTotal = mm ? parseInt(mm[1], 10) : (countText ? 1 : 0);

  out[asin] = { countText, heroTotal, creators, reviews };
  console.log(`\n========== ${asin} | 主图区: ${countText} (总 ${heroTotal})`);
  console.log(`  红人创作者（${creators.length}）:`, JSON.stringify(creators));
  console.log(`  用户测评（${reviews.length}）:`, JSON.stringify(reviews));
  console.log(`  → 品牌视频 1 + 红人 ${creators.length} + 用户 ${reviews.length} = ${1 + creators.length + reviews.length}`);
  await sleep(2500);
}
writeFileSync('E:/listing_exam/data/derived/video-full-list.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
