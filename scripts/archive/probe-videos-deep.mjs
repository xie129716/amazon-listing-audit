import { setTimeout as sleep } from 'node:timers/promises';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Page.navigate', { url: 'https://www.amazon.com/dp/B0EX0001' }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
// 慢速滚动到视频区
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); } return 1; })()`);
await sleep(4000);

// 找视频相关容器并报告
let r = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const hits = [];
  for (const el of document.querySelectorAll('[id],[class]')) {
    const s = (el.id || '') + ' ' + String(el.className || '');
    if (/vse|video|shoppable|creator|influencer/i.test(s)) {
      const t = txt(el.innerText);
      if (t && t.length < 400) hits.push({ key: (el.id ? '#' + el.id : '') + (el.className ? '.' + String(el.className).split(' ').slice(0,3).join('.') : ''), text: t.slice(0, 220) });
    }
  }
  const seen = new Set(); const uniq = [];
  for (const h of hits) { if (!seen.has(h.key)) { seen.add(h.key); uniq.push(h); } }
  return JSON.stringify({ url: location.href, count: uniq.length, items: uniq.slice(0, 30) });
})()`);
console.log('=== video-ish containers ===');
console.log(r.slice(0, 3000));

// 点击 Videos 标签（若有）再看红人视频
const clicked = await ev(`(() => {
  for (const a of document.querySelectorAll('a,button')) {
    const t = (a.innerText || '').trim();
    if (/^videos?$/i.test(t)) { a.click(); return 'clicked ' + t; }
  }
  return 'no videos tab';
})()`);
console.log('tab:', clicked);
await sleep(5000);

r = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const all = document.body.innerText || '';
  const i = all.indexOf('Related videos');
  return JSON.stringify({
    relatedHeading: i >= 0,
    ctx: i >= 0 ? txt(all.slice(i, i + 500)) : null,
    videoCount: document.querySelectorAll('video').length,
    vseItems: document.querySelectorAll('[class*="vse"] [class*="video"], .vse-video-item').length,
  });
})()`);
console.log('=== after clicking Videos ===');
console.log(r.slice(0, 1500));

cdp.ws.close();
