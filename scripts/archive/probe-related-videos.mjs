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
  // 滚到 related videos 模块并等待懒加载
  await ev(`(async () => {
    const el = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    if (el) el.scrollIntoView();
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 150)); }
    return 1;
  })()`);
  await sleep(7000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const o = {};
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    o.widgetFound = !!w;
    o.widgetText = txt(w?.innerText || '').slice(0, 2000);
    // 模块内的视频卡片
    const cards = [];
    if (w) {
      for (const n of w.querySelectorAll('li, [class*="video-item"], [class*="vse-video"]')) {
        const t = txt(n.innerText);
        if (!t || t.length > 300) continue;
        const img = n.querySelector('img');
        cards.push({ text: t.slice(0, 200), alt: txt(img?.getAttribute('alt') || '').slice(0, 120) });
      }
    }
    o.cards = cards.slice(0, 25);
    // 模块内嵌的视频元数据
    const html = w ? w.innerHTML : '';
    o.embedded = [...html.matchAll(/"videoTitle"\\s*:\\s*"([^"]{0,80})"/g)].map(x => x[1]).slice(0, 20);
    o.creatorTypes = [...html.matchAll(/"creatorType"\\s*:\\s*"([^"]+)"/g)].map(x => x[1]);
    // 全页：Related videos 标题是否存在
    const all = document.body.innerText || '';
    o.relatedHeadingFound = /Related videos for this product/i.test(all);
    const i = all.indexOf('Related videos for this product');
    o.relatedCtx = i >= 0 ? txt(all.slice(i, i + 600)) : null;
    o.videoCountText = txt(document.querySelector('#videoCount')?.innerText || '');
    return o;
  })()`);
  out[asin] = d;
  console.log(`\n========== ${asin} | 主图区: ${d.videoCountText}`);
  console.log('  模块存在:', d.widgetFound, '| Related videos 标题:', d.relatedHeadingFound);
  console.log('  模块文本:', d.widgetText.slice(0, 500));
  console.log('  内嵌视频标题:', JSON.stringify(d.embedded));
  console.log('  creatorType:', JSON.stringify(d.creatorTypes));
  console.log('  卡片数:', d.cards.length);
  d.cards.slice(0, 10).forEach((c, i) => console.log(`   [${i + 1}] alt="${c.alt}" | ${c.text.slice(0, 140)}`));
  await sleep(2500);
}
writeFileSync('E:/listing_exam/data/derived/video-related-widget.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
