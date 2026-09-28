import { setTimeout as sleep } from 'node:timers/promises';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Page.navigate', { url: 'https://www.amazon.com/dp/B0GF1Z3CFH' }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 160)); } return 1; })()`);
await sleep(3000);
await ev(`(() => { const t = document.querySelector('#altImages li.videoThumbnail input, #altImages li.videoThumbnail'); if (t) { try { t.click(); } catch(e){} } return 1; })()`);
await sleep(6000);

// 打印视频抽屉/播放器区域的完整可见文本，用于识别分组标题
const r = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const out = [];
  for (const sel of ['#vvp', '#vvp-videos', '#videoBlock', '[class*="vvp"]', '[id*="vvp"]', '.vse-player-container', '#ivVideosTab', '[class*="iv-tab"]']) {
    for (const el of document.querySelectorAll(sel)) {
      const t = txt(el.innerText);
      if (t) out.push({ sel, len: t.length, text: t.slice(0, 700) });
    }
  }
  // 全局找分组式标题
  const heads = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,span,div')) {
    const t = txt(el.innerText);
    if (t && t.length < 70 && /video/i.test(t) && /product|related|creator|influencer|commission/i.test(t)) heads.push(t);
  }
  return JSON.stringify({ blocks: out.slice(0, 8), headings: [...new Set(heads)].slice(0, 20), url: location.href }).slice(0, 5000);
})()`);
console.log(r);
cdp.ws.close();
