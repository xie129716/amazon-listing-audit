import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4200, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url: 'https://www.amazon.com/dp/B0EX0001' }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 220)); } return 1; })()`);
await sleep(10000);

const dump = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
  if (!w) return JSON.stringify({ err: 'no widget' });

  // 找每个视频卡片元素，从卡片内解析其自身的 creator 信息
  const cards = [];
  const cand = w.querySelectorAll('[data-video-url], [data-video-asin], .vse-video-item, [class*="vse-video"], [class*="card"], li');
  for (const el of cand) {
    const t = txt(el.innerText);
    const attrs = {};
    for (const a of el.attributes || []) attrs[a.name] = String(a.value).slice(0, 400);
    // 卡片内是否含 creator 关键词
    const inner = el.innerHTML || '';
    const hasCreatorMeta = /creatorType|vendorName/.test(inner);
    if (t || hasCreatorMeta) cards.push({ text: t.slice(0, 200), attrs, hasCreatorMeta, htmlLen: inner.length });
  }

  // 逐条视频：用 aciContentId 定位它在 HTML 中的位置，并打印其前后 300 字符以看标题/作者归属
  const html = w.innerHTML;
  const positions = [];
  const re = /"aciContentId"\\s*:\\s*"([^"]+)"/g;
  let m;
  while ((m = re.exec(html))) positions.push({ id: m[1], at: m.index });

  const entries = positions.map((p) => {
    const seg = html.slice(Math.max(0, p.at - 2600), p.at + 2600);
    const pick = (k) => (seg.match(new RegExp('"' + k + '"\\\\s*:\\\\s*"([^"]*)"')) || [])[1] || null;
    return {
      aci: p.id,
      creatorType: pick('creatorType'),
      vendorName: pick('vendorName'),
      videoTitle: pick('videoTitle'),
      altText: (pick('altText') || '').slice(0, 120),
    };
  });

  return JSON.stringify({
    videoCountText: txt(document.querySelector('#videoCount')?.innerText || ''),
    cardsCount: cards.length,
    cards: cards.slice(0, 15).map(c => ({ text: c.text, hasCreatorMeta: c.hasCreatorMeta })),
    entries,
    distinct: [...new Set(entries.map(e => e.aci))].length,
  }).slice(0, 9000);
})()`);
console.log(dump);
writeFileSync(`${ROOT}/data/derived/video-rigorous-B0EX0001.json`, dump, 'utf8');
cdp.ws.close();
