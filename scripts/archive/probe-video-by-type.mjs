import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const ASINS = process.argv.slice(2);
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(sessionId, sessionId); // placeholder
const ev2 = makeEval(cdp, sessionId);
const out = {};

for (const asin of ASINS) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4200, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev2(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev2(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 220)); } return 1; })()`);
  await sleep(10000);

  const d = await ev2(`(() => {
    const w = document.querySelector('#va-related-videos-widget_feature_div, #va-related-videos-widget, #vse-related-videos-widget');
    const html = w ? w.innerHTML : document.documentElement.innerHTML;
    const parts = html.split(/"aciContentId"\\s*:\\s*"([^"]*)"/);
    const rows = [];
    for (let i = 1; i < parts.length; i += 2) {
      const ctx = (parts[i - 1] || '').slice(-1500) + (parts[i + 1] || '').slice(0, 2500);
      const pick = (k) => (ctx.match(new RegExp('"' + k + '"\\\\s*:\\\\s*"([^"]*)"')) || [])[1] || null;
      rows.push({ aci: parts[i], creatorType: pick('creatorType'), vendorName: pick('vendorName'), videoTitle: pick('videoTitle') });
    }
    const seen = new Set(); const uniq = [];
    for (const r of rows) { if (!seen.has(r.aci)) { seen.add(r.aci); uniq.push(r); } }

    const by = (t) => uniq.filter(r => (r.creatorType || '').toLowerCase() === t);
    const seller = by('seller');
    const creators = by('influencer');
    const customers = by('customer');
    const creatorNames = creators.map(r => r.vendorName).filter(Boolean);

    return {
      videoCountText: (document.querySelector('#videoCount')?.innerText || '').replace(/\\s+/g,' ').trim(),
      sellerCount: seller.length,
      creatorEntries: creators.length,
      creatorUnique: new Set(creatorNames).size,
      customerCount: customers.length,
      creatorNames,
      customerNames: customers.map(r => r.vendorName),
      sellerNames: seller.map(r => r.vendorName),
    };
  })()`);
  out[asin] = d;
  console.log(`\n===== ${asin} | 主图区: ${d.videoCountText}`);
  console.log(`  seller(品牌)=${d.sellerCount} ${JSON.stringify(d.sellerNames)}`);
  console.log(`  influencer(红人) 条目=${d.creatorEntries} 去重创作者=${d.creatorUnique}`);
  console.log(`      ${JSON.stringify(d.creatorNames)}`);
  console.log(`  customer(用户)=${d.customerCount} ${JSON.stringify(d.customerNames)}`);
  await sleep(2000);
}
writeFileSync('E:/listing_exam/data/derived/video-by-creatortype.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
