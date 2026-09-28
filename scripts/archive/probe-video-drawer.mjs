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
  await sleep(3000);

  // 点开视频抽屉：点主图区视频缩略图，再点 "VIDEOS" tab
  await ev(`(() => { const t = document.querySelector('#altImages li.videoThumbnail input, #altImages li.videoThumbnail'); if (t) { try { t.click(); } catch(e){} } return 1; })()`);
  await sleep(5000);
  await ev(`(() => { for (const a of document.querySelectorAll('#ivVideosTabHeading, .iv-tab-heading, a, button')) { if (/^videos$/i.test((a.innerText||'').trim())) { try { a.click(); return 1; } catch(e){} } } return 0; })()`);
  await sleep(6000);

  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    // 抽屉里的每个视频卡片
    const cards = document.querySelectorAll('#vvp-videos .vse-video-item, .vse-video-item, #videoBlock .vse-video-item, [id*="vvp"] li, [class*="vvp"] li');
    const list = [];
    cards.forEach((c, i) => {
      const t = txt(c.innerText);
      const img = c.querySelector('img');
      const href = c.querySelector('a')?.getAttribute('href') || '';
      if (t) list.push({ i: i + 1, text: t.slice(0, 200), alt: txt(img?.getAttribute('alt') || '').slice(0, 120), href: href.slice(0, 160) });
    });
    // 抽屉标题与分组
    const drawerText = txt(document.querySelector('#vvp, #videoBlock, [id*="vvp"]')?.innerText || '').slice(0, 1200);
    const html = document.documentElement.innerHTML;
    return {
      videoCountText: txt(document.querySelector('#videoCount')?.innerText || ''),
      cards: list.slice(0, 20),
      drawerText,
      earnsCommissions: (html.match(/Earns Commissions/gi) || []).length,
      customerReview: (html.match(/Customer Review:/gi) || []).length,
      productVideosDash: (html.match(/Product Videos\\s*-/gi) || []).length,
    };
  })()`);
  out[asin] = d;
  console.log(`\n===== ${asin} | ${d.videoCountText} | EarnsCommissions:${d.earnsCommissions} CustomerReview:${d.customerReview} ProductVideos:${d.productVideosDash}`);
  console.log('  抽屉文本:', d.drawerText.slice(0, 400));
  console.log('  卡片数:', d.cards.length);
  d.cards.slice(0, 12).forEach((c) => console.log(`   [${c.i}] alt="${c.alt}" | text="${c.text.slice(0, 150)}"`));
  await sleep(2500);
}
writeFileSync(`${ROOT}/data/derived/video-drawer.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
