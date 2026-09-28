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
  await sleep(4000);
  // 打开视频抽屉，让红人/用户视频条目全部渲染
  await ev(`(() => { const t = document.querySelector('#altImages li.videoThumbnail input, #altImages li.videoThumbnail'); if (t) { try { t.click(); } catch(e){} } return 1; })()`);
  await sleep(5000);
  await ev(`(() => { const tabs = document.querySelectorAll('#ivVideosTabHeading, .iv-tab-heading, a, button'); for (const a of tabs) { if (/^videos$/i.test((a.innerText||'').trim())) { try { a.click(); return 1; } catch(e){} } } return 0; })()`);
  await sleep(7000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    const html = document.documentElement.innerHTML;
    const body = document.body.innerText || '';

    // 1) 卖家自建（Videos for this product）：creatorType=Seller 的条目
    const sellerEntries = [...html.matchAll(/"videoTitle"\\s*:\\s*"([^"]*)"[\\s\\S]{0,900}?"creatorType"\\s*:\\s*"Seller"/g)].map(m => m[1]);
    const sellerEntries2 = [...html.matchAll(/"creatorType"\\s*:\\s*"Seller"[\\s\\S]{0,900}?"videoTitle"\\s*:\\s*"([^"]*)"/g)].map(m => m[1]);
    const sellerTitles = [...new Set([...sellerEntries, ...sellerEntries2])];

    // 2) 红人合作视频：「Product Videos - <创作者名>」并带 Earns Commissions
    const productVideoTitles = [...new Set([...body.matchAll(/(Product Videos\\s*-\\s*[^\\n]{0,90})/g)].map(m => txt(m[1])))];
    const productVideoTitlesHtml = [...new Set([...html.matchAll(/(Product Videos\\s*-\\s*[^"<]{0,90})/g)].map(m => txt(m[1])))];

    // 3) 用户测评视频：「Customer Review: <标题>」
    const custReviewTitles = [...new Set([...body.matchAll(/(Customer Review:\\s*[^\\n]{0,90})/g)].map(m => txt(m[1])))];
    const custReviewTitlesHtml = [...new Set([...html.matchAll(/(Customer Review:\\s*[^"<]{0,90})/g)].map(m => txt(m[1])))];

    // 4) 主图区标注的总数
    const countText = txt(document.querySelector('#videoCount')?.innerText || '');
    const m = countText.match(/(\\d+)/);

    return {
      countText,
      heroTotal: m ? parseInt(m[1], 10) : (countText ? 1 : 0),
      sellerTitles: sellerTitles.slice(0, 10),
      sellerCount: sellerTitles.length,
      creatorTitles: [...new Set([...productVideoTitles, ...productVideoTitlesHtml])].slice(0, 10),
      customerTitles: [...new Set([...custReviewTitles, ...custReviewTitlesHtml])].slice(0, 10),
      earnsCommissions: (html.match(/Earns Commissions/gi) || []).length,
    };
  })()`);
  out[asin] = d;
  console.log(`\n===== ${asin} | 主图区标注: ${d.countText}`);
  console.log(`  卖家自建视频 ${d.sellerCount} 条:`, JSON.stringify(d.sellerTitles.slice(0, 4)));
  console.log(`  红人合作视频 ${d.creatorTitles.length} 条:`, JSON.stringify(d.creatorTitles.slice(0, 6)));
  console.log(`  用户测评视频 ${d.customerTitles.length} 条:`, JSON.stringify(d.customerTitles.slice(0, 6)));
  console.log(`  Earns Commissions 出现 ${d.earnsCommissions} 次`);
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-counts-final.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
