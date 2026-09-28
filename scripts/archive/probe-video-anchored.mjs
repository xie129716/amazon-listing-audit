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
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 220)); } return 1; })()`);
  await sleep(10000);

  const d = await ev(`(() => {
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    const html = w ? w.innerHTML : document.documentElement.innerHTML;

    // 只认 <videoId, creatorType, vendorName> 三元组，且必须出现在同一 "window" 内
    const re = /"aciContentId"\\s*:\\s*"([^"]+)"([\\s\\S]{0,400}?)(?="aciContentId"|$)/g;
    const rows = [];
    let m;
    while ((m = re.exec(html))) {
      const id = m[1];
      const seg = m[2] || '';
      const pick = (k) => (seg.match(new RegExp('"' + k + '"\\\\s*:\\\\s*"([^"]*)"')) || [])[1] || null;
      rows.push({ aci: id, creatorType: pick('creatorType'), vendorName: pick('vendorName'), videoTitle: pick('videoTitle'), altText: (pick('altText') || '').slice(0, 80) });
    }
    // 去重：同一 aci 若出现多次，取第一次非空的 creatorType
    const map = new Map();
    for (const r of rows) {
      const cur = map.get(r.aci);
      if (!cur) map.set(r.aci, r);
      else if (!cur.creatorType && r.creatorType) map.set(r.aci, r);
    }
    const uniq = [...map.values()];

    const by = (t) => uniq.filter(r => (r.creatorType || '').toLowerCase() === t);
    const seller = by('seller'), creators = by('influencer'), customers = by('customer');

    return {
      videoCountText: (document.querySelector('#videoCount')?.innerText || '').replace(/\\s+/g,' ').trim(),
      totalDistinct: uniq.length,
      seller: seller.map(r => ({ id: r.aci, name: r.vendorName })),
      creators: creators.map(r => ({ id: r.aci, name: r.vendorName })),
      customers: customers.map(r => ({ id: r.aci, name: r.vendorName })),
      unknown: uniq.filter(r => !r.creatorType).map(r => ({ id: r.aci, name: r.vendorName })),
    };
  })()`);
  out[asin] = d;
  const cUnique = new Set(d.creators.map(c => c.name)).size;
  console.log(`\n===== ${asin} | 主图区: ${d.videoCountText} | 去重条目 ${d.totalDistinct}`);
  console.log(`  Seller(品牌) ${d.seller.length}:`, JSON.stringify(d.seller.map(x => x.name)));
  console.log(`  Influencer(红人) ${d.creators.length} 条 / 去重创作者 ${cUnique}:`, JSON.stringify(d.creators.map(x => x.name)));
  console.log(`  Customer(用户) ${d.customers.length}:`, JSON.stringify(d.customers.map(x => x.name)));
  if (d.unknown.length) console.log(`  未标类型 ${d.unknown.length}:`, JSON.stringify(d.unknown));
  await sleep(2000);
}
writeFileSync(`${ROOT}/data/derived/video-anchored.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
