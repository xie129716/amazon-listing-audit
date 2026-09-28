/* 提取页面内视频元数据 JSON（含 relatedProductsAsins / creatorType / publicName）。 */
import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asin = process.argv[2] || 'B0EX0001';
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4200, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); } return 1; })()`);
await sleep(12000);

const d = await ev(`(() => {
  const html = document.documentElement.innerHTML;
  const out = { jsonVar: [], entrySample: [], keys: [] };
  // 找承载 JSON 的变量名 / script id
  const re = /([A-Za-z0-9_$.\\[\\]"']{0,80})\\s*[:=]\\s*(\\[|\\{)/g;
  out.jsonVar = [...new Set((html.match(/"(?:vseRelatedVideos|relatedVideos|videoData|videos)"\\s*:/g) || []))].slice(0, 20);
  // 找第一个 "relatedProductsAsins" 的完整所在段落
  const i = html.indexOf('relatedProductsAsins');
  out.sampleBefore = i > 0 ? html.slice(Math.max(0, i - 1200), i + 900).replace(/\\s+/g, ' ') : '';
  // 抓一条完整条目的所有 key
  const seg = i > 0 ? html.slice(Math.max(0, i - 2500), i + 2500) : '';
  out.keys = [...new Set((seg.match(/"[a-zA-Z][a-zA-Z0-9_]{1,30}"\\s*:/g) || []).map((s) => s.replace(/["\\s:]/g, '')))].slice(0, 120);
  return out;
})()`);

console.log('jsonVar:', JSON.stringify(d.jsonVar));
console.log('keys   :', JSON.stringify(d.keys));
console.log('\n--- sample ---\n' + d.sampleBefore);
writeFileSync(`${ROOT}/.tmp/video-json-sample.json`, JSON.stringify(d, null, 2), 'utf8');
cdp.ws.close();
