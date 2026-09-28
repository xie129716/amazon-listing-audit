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
  await sleep(4000);
  // 点开视频 tab 两次（首次点击可能只展开）
  for (let k = 0; k < 2; k++) {
    await ev(`(() => { const t = document.querySelector('#altImages li.videoThumbnail input, #altImages li.videoThumbnail'); if (t) { try { t.click(); } catch(e){} } return 1; })()`);
    await sleep(3500);
    await ev(`(() => { for (const a of document.querySelectorAll('#ivVideosTabHeading, .iv-tab-heading, a, button')) { if (/^videos$/i.test((a.innerText||'').trim())) { try { a.click(); return 1; } catch(e){} } } return 0; })()`);
    await sleep(4000);
  }
  await ev(`(async () => { window.scrollTo(0, 0); await new Promise(r=>setTimeout(r,300)); const el = document.querySelector('#vvp-videos, #ivVideosTab, [id*="vvp"]'); if (el) el.scrollIntoView(); return 1; })()`);
  await sleep(4000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const html = document.documentElement.innerHTML;
    const body = document.body.innerText || '';

    // 红人合作视频：条目名以 "Product Videos -" 开头（创作者名随后），通常伴 Earns Commissions
    const creatorRaw = [
      ...[...body.matchAll(/(Product Videos\\s*-\\s*[^\\n]{1,90})/g)].map(m => txt(m[1])),
      ...[...html.matchAll(/(Product Videos\\s*-\\s*[^"<]{1,90})/g)].map(m => txt(m[1])),
    ];
    // 用户测评视频：条目名以 "Customer Review:" 开头
    const custRaw = [
      ...[...body.matchAll(/(Customer Review:\\s*[^\\n]{1,90})/g)].map(m => txt(m[1])),
      ...[...html.matchAll(/(Customer Review:\\s*[^"<]{1,90})/g)].map(m => txt(m[1])),
    ];
    // 归一化：截到分号/See full review 之前
    const norm = (s) => txt(s).replace(/See full review.*$/i, '').replace(/Earns commissions.*$/i, '').trim();
    const creator = [...new Set(creatorRaw.map(norm))];
    const customer = [...new Set(custRaw.map(norm))];

    // 卖家自建：主图区标注总数 - 红人 - 用户（若为负则取 1）
    const countText = txt(document.querySelector('#videoCount')?.innerText || '');
    const mm = countText.match(/(\\d+)/);
    const heroTotal = mm ? parseInt(mm[1], 10) : (countText ? 1 : 0);

    return { countText, heroTotal, creator, customer, creatorCount: creator.length, customerCount: customer.length };
  })()`);
  const sellerCount = Math.max(1, d.heroTotal - d.creatorCount - d.customerCount);
  out[asin] = { ...d, sellerCount };
  console.log(`\n===== ${asin} | 主图区: ${d.countText}`);
  console.log(`  红人合作视频 ${d.creatorCount} 条:`, JSON.stringify(d.creator));
  console.log(`  用户测评视频 ${d.customerCount} 条:`, JSON.stringify(d.customer));
  console.log(`  → 卖家自建 ≈ ${sellerCount} 条`);
  await sleep(2500);
}
writeFileSync('E:/listing_exam/data/derived/video-counts3.json', JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
