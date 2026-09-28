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
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); } return 1; })()`);
  await sleep(3500);

  const d = await ev(`(() => {
    const html = document.documentElement.innerHTML;
    // 抓所有形如 {...videoTitle...creatorType...} 的片段（同一条目字段顺序可能不同，双向抓）
    const grab = (a, b) => {
      const res = [];
      const re = new RegExp('"' + a + '"\\\\s*:\\\\s*"([^"]*)"[\\\\s\\\\S]{0,1200}?"' + b + '"\\\\s*:\\\\s*"([^"]*)"', 'g');
      let m; while ((m = re.exec(html))) res.push({ [a]: m[1], [b]: m[2] });
      return res;
    };
    const p1 = grab('videoTitle', 'creatorType');
    const p2 = grab('videoTitle', 'videoType');
    const p3 = grab('videoTitle', 'vendorName');
    const p4 = grab('creatorType', 'videoTitle');

    // 合并成条目表（按 videoTitle 归并）
    const map = new Map();
    const put = (title, key, val) => {
      if (!title) return;
      if (!map.has(title)) map.set(title, { title });
      if (val && !map.get(title)[key]) map.get(title)[key] = val;
    };
    for (const x of p1) put(x.videoTitle, 'creatorType', x.creatorType);
    for (const x of p2) put(x.videoTitle, 'videoType', x.videoType);
    for (const x of p3) put(x.videoTitle, 'vendorName', x.vendorName);
    for (const x of p4) put(x.videoTitle, 'creatorType', x.creatorType);

    // 页面里可见的视频条目名（含红人/用户）
    const visibleNames = [];
    for (const m of html.matchAll(/(Product Videos\\s*-\\s*[^"<]{0,80})/g)) visibleNames.push(m[1].trim());
    for (const m of html.matchAll(/(Customer Review:\\s*[^"<]{0,80})/g)) visibleNames.push(m[1].trim());

    return {
      videoCountText: (document.querySelector('#videoCount')?.innerText || '').replace(/\\s+/g,' ').trim(),
      entries: [...map.values()],
      visibleNames: [...new Set(visibleNames)],
      earnsCommissions: (html.match(/Earns Commissions/gi) || []).length,
    };
  })()`);
  out[asin] = d;
  console.log(`\n===== ${asin} | 主图区: ${d.videoCountText} | EarnsCommissions:${d.earnsCommissions}`);
  console.log('  内嵌条目:', d.entries.length);
  d.entries.forEach((e) => console.log(`   - creatorType=${e.creatorType || '?'} videoType=${e.videoType || '?'} vendor=${e.vendorName || '?'} title=${JSON.stringify(e.title).slice(0, 70)}`));
  console.log('  可见条目名:', JSON.stringify(d.visibleNames.slice(0, 10)));
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-entries.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
