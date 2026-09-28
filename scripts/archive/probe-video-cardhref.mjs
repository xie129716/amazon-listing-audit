/* dump 沉浸式面板里每张视频卡的 href / 内部链接，用来做不依赖元数据的分类兜底。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asin = process.argv[2] || 'B0FDQMCKRM';
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1400, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`window.scrollTo(0,0)`);
await sleep(5000);
await ev(`(() => { const li = document.querySelector('#altImages li.videoThumbnail'); if (li) { const t = li.querySelector('img') || li; t.click(); li.click(); } return 1; })()`);
await sleep(11000);

const d = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const heads = [...document.querySelectorAll('*')].filter((e) => e.children.length === 0 && /^Videos for this product$/i.test(txt(e.innerText)));
  let cards = [];
  for (const h of heads) {
    let n = h;
    for (let up = 0; up < 12 && n; up++) {
      n = n.parentElement; if (!n) break;
      const found = [...n.querySelectorAll('a')].filter((a) => { const t = txt(a.innerText); return /\\d+:\\d\\d/.test(t) && t.length < 220; });
      if (found.length) { cards = found; break; }
    }
    if (cards.length) break;
  }
  return cards.map((a) => ({
    href: a.getAttribute('href') || '',
    cls: (a.className || '').toString().slice(0, 70),
    text: txt(a.innerText).replace(/\\n/g, ' | '),
    inner: [...a.querySelectorAll('a')].map((x) => x.getAttribute('href') || '').slice(0, 4),
    parts: [...a.querySelectorAll('*')].filter((e) => e.children.length === 0).map((e) => ({
      cls: (e.className || '').toString().slice(0, 70), txt: (e.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 60),
    })),
  }));
})()`);

console.log(`${asin}: ${d.length} 张卡`);
for (const [i, c] of d.entries()) {
  console.log(`\n${i + 1}. "${c.text.slice(0, 90)}"`);
  console.log(`   href : ${c.href.slice(0, 90)}`);
  console.log(`   parts: ${JSON.stringify(c.parts)}`);
}
cdp.ws.close();
