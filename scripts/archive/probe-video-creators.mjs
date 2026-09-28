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
  await sleep(3500);

  // 视频条目数据藏在页面 script / data 属性里，含 creatorType / videoType / videoTitle / vendorName
  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const html = document.documentElement.innerHTML;
    const items = [];
    const re = /"videoTitle"\\s*:\\s*"([^"]*)"[\\s\\S]{0,600}?"creatorType"\\s*:\\s*"([^"]*)"/g;
    let m;
    while ((m = re.exec(html))) items.push({ title: m[1], creatorType: m[2] });
    // 反序再抓一次（字段顺序可能不同）
    const re2 = /"creatorType"\\s*:\\s*"([^"]*)"[\\s\\S]{0,900}?"videoTitle"\\s*:\\s*"([^"]*)"/g;
    while ((m = re2.exec(html))) items.push({ title: m[2], creatorType: m[1] });
    // 去重
    const seen = new Set(); const uniq = [];
    for (const it of items) { const k = it.creatorType + '|' + it.title; if (!seen.has(k)) { seen.add(k); uniq.push(it); } }

    const seller = uniq.filter(x => /seller/i.test(x.creatorType));
    const creators = uniq.filter(x => /customer|creator|influencer/i.test(x.creatorType));
    return {
      heroVideoCountText: txt(document.querySelector('#videoCount')?.innerText || ''),
      all: uniq,
      sellerCount: seller.length,
      creatorCount: creators.length,
      creatorTitles: creators.map(x => x.title).slice(0, 12),
      sellerTitles: seller.map(x => x.title).slice(0, 6),
    };
  })()`);
  out[asin] = d;
  console.log(`${asin} | 主图区标注: ${d.heroVideoCountText} | Videos for this product(卖家): ${d.sellerCount} | Related videos for this product(红人/用户): ${d.creatorCount}`);
  if (d.creatorTitles?.length) console.log('   红人视频标题:', JSON.stringify(d.creatorTitles));
  await sleep(2500);
}
writeFileSync('E:/listing_exam/data/derived/video-creators.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
