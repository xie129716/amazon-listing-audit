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
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 180)); } window.scrollTo(0,0); return 1; })()`);
  await sleep(4000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const html = document.documentElement.innerHTML;
    const count = (re) => (html.match(re) || []).length;
    // creatorType 取值统计
    const types = {};
    for (const m of html.matchAll(/"creatorType"\\s*:\\s*"([^"]+)"/g)) types[m[1]] = (types[m[1]] || 0) + 1;
    const vtypes = {};
    for (const m of html.matchAll(/"videoType"\\s*:\\s*"([^"]+)"/g)) vtypes[m[1]] = (vtypes[m[1]] || 0) + 1;
    // 红人/用户视频的标题：定位 Customer Review: 与 Product Videos - 两种前缀
    const titles = [];
    for (const m of html.matchAll(/"videoTitle"\\s*:\\s*"([^"]+)"/g)) titles.push(m[1]);
    for (const m of html.matchAll(/(Customer Review:[^"<]{0,90})/g)) titles.push(txt(m[1]));
    for (const m of html.matchAll(/(Product Videos\\s*-\\s*[^"<]{0,90})/g)) titles.push(txt(m[1]));
    const uniqTitles = [...new Set(titles)];
    return {
      heroVideoCountText: txt(document.querySelector('#videoCount')?.innerText || ''),
      creatorTypeCounts: types,
      videoTypeCounts: vtypes,
      titles: uniqTitles.slice(0, 20),
      sellerVendorMentions: count(/"creatorType"\\s*:\\s*"Seller"/g),
    };
  })()`);
  out[asin] = d;
  console.log(`\n===== ${asin} | 主图区: ${d.heroVideoCountText}`);
  console.log('  creatorType 统计:', JSON.stringify(d.creatorTypeCounts), '| videoType:', JSON.stringify(d.videoTypeCounts));
  console.log('  标题样本:', JSON.stringify(d.titles.slice(0, 10)));
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-creators2.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
