import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

// 扩大视口，让轮播一次性渲染更多卡片
await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4000, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url: 'https://www.amazon.com/dp/B0EX0001' }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); } return 1; })()`);
await sleep(8000);

const dump = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
  if (!w) return JSON.stringify({ err: 'no widget' });
  // 所有带 data 属性的元素（可能含完整 item 列表）
  const dataAttrs = [];
  for (const el of w.querySelectorAll('*')) {
    for (const a of el.attributes || []) {
      if (/^data-/i.test(a.name) && a.value && a.value.length > 30 && a.value.length < 20000) {
        dataAttrs.push({ name: a.name, len: a.value.length, val: a.value.slice(0, 1500) });
      }
    }
  }
  // 模块内 script 标签
  const scripts = [...w.querySelectorAll('script')].map(s => (s.textContent || '').slice(0, 2000)).filter(Boolean);
  // 所有可见的条目名（遍历全部后代，宽松匹配）
  const names = new Set();
  for (const el of w.querySelectorAll('*')) {
    const t = txt(el.innerText);
    if (!t || t.length > 200) continue;
    if (/Product Videos\\s*-/i.test(t) || /^Customer Review/i.test(t)) names.add(t);
  }
  return JSON.stringify({
    widgetHtmlLen: w.innerHTML.length,
    dataAttrs: dataAttrs.slice(0, 10),
    scriptsLen: scripts.length,
    scriptSample: scripts.slice(0, 2),
    names: [...names].slice(0, 30),
    wholeText: txt(w.innerText).slice(0, 2000),
    videoCountText: txt(document.querySelector('#videoCount')?.innerText || ''),
  }).slice(0, 8000);
})()`);
console.log(dump);
writeFileSync(`${ROOT}/data/derived/video-widget-dump.json`, dump, 'utf8');
cdp.ws.close();
