import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4200, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url: 'https://www.amazon.com/dp/B0DJQS14DS' }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); } return 1; })()`);
await sleep(12000);
// 再滚回模块顶部
await ev(`(() => { const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget'); if (w) w.scrollIntoView({block:'start'}); return 1; })()`);
await sleep(5000);

const raw = await ev(`(() => {
  const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  // 每个可见的“视频卡片”元素文本，按 DOM 顺序列出（不做任何推断）
  const items = [];
  if (w) {
    const nodes = w.querySelectorAll('[class*="vse-video-item"], [class*="card-"], [data-csa-c-item-id], li[class*="item"]');
    nodes.forEach((n, i) => {
      const t = txt(n.innerText);
      if (t && t.length < 260) items.push({ i: i + 1, text: t });
    });
  }
  return JSON.stringify({
    url: location.href,
    videoCountText: txt(document.querySelector('#videoCount')?.innerText || ''),
    wholeWidgetText: txt(w?.innerText || '').slice(0, 3000),
    items,
  });
})()`);
const d = JSON.parse(raw);
console.log('URL:', d.url);
console.log('videoCount:', d.videoCountText);
console.log('\n=== 模块完整文本（未解析）===');
console.log(d.wholeWidgetText);
console.log('\n=== DOM 顺序的条目文本 ===');
d.items.forEach((it) => console.log(`  [${it.i}] ${it.text}`));
writeFileSync('E:/listing_exam/data/derived/video-raw-B0DJQS14DS.json', JSON.stringify(d, null, 2), 'utf8');
cdp.ws.close();
