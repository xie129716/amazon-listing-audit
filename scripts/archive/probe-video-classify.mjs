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
  await sleep(3000);
  // 打开视频轮播
  await ev(`(() => { const t = document.querySelector('#altImages li.videoThumbnail input, #altImages li.videoThumbnail'); if (t) { try { t.click(); } catch(e){} } return 1; })()`);
  await sleep(7000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const items = [];
    // VSE 轮播条目：每个条目通常带 video data 属性或内嵌 JSON
    const nodes = document.querySelectorAll('.vse-video-item, [class*="vse-video-item"], [data-csa-c-content-id*="vse"], li[class*="video"]');
    for (const n of nodes) {
      const t = txt(n.innerText);
      if (!t || t.length > 700) continue;
      // 条目内嵌的元数据
      let meta = '';
      for (const a of n.attributes || []) if (/data|json/i.test(a.name)) meta += a.name + '=' + String(a.value).slice(0, 300) + ' | ';
      const inner = n.innerHTML || '';
      const creator = (inner.match(/"creatorType"\\s*:\\s*"([^"]+)"/) || [])[1] || null;
      const vtype = (inner.match(/"videoType"\\s*:\\s*"([^"]+)"/) || [])[1] || null;
      const vtitle = (inner.match(/"videoTitle"\\s*:\\s*"([^"]+)"/) || [])[1] || null;
      const vendor = (inner.match(/"vendorName"\\s*:\\s*"([^"]+)"/) || [])[1] || null;
      items.push({ text: t.slice(0, 220), creator, vtype, vtitle, vendor, meta: meta.slice(0, 300) });
    }
    // 去重（按 text）
    const seen = new Set(); const uniq = [];
    for (const it of items) { if (!seen.has(it.text)) { seen.add(it.text); uniq.push(it); } }
    // 页面级统计：三类关键词出现次数
    const html = document.documentElement.innerHTML;
    const count = (re) => (html.match(re) || []).length;
    return {
      videoCountText: txt(document.querySelector('#videoCount')?.innerText || ''),
      items: uniq.slice(0, 25),
      stats: {
        earnsCommissions: count(/Earns Commissions/gi),
        customerReview: count(/Customer Review:/gi),
        productVideos: count(/Product Videos\\s*-/gi),
        creatorTypeSeller: count(/"creatorType"\\s*:\\s*"Seller"/g),
        videoTypeSeller: count(/"videoType"\\s*:\\s*"seller"/g),
        creatorWord: count(/"creator/gi),
      },
    };
  })()`);
  out[asin] = d;
  console.log(`\n========== ${asin} | 主图区: ${d.videoCountText}`);
  console.log('  关键词统计:', JSON.stringify(d.stats));
  console.log('  条目数:', d.items.length);
  d.items.slice(0, 12).forEach((it, i) => {
    console.log(`   [${i + 1}] creator=${it.creator} vtype=${it.vtype} vendor=${it.vendor} title=${JSON.stringify(it.vtitle)}`);
    console.log(`        text: ${it.text.slice(0, 160)}`);
  });
  await sleep(2500);
}
writeFileSync('E:/listing_exam/data/derived/video-classify.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
