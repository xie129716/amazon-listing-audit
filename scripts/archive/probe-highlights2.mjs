import { setTimeout as sleep } from 'node:timers/promises';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Page.navigate', { url: 'https://www.amazon.com/dp/B0EX0001' }, sessionId);
for (let i = 0; i < 40; i++) {
  await sleep(1000);
  const ready = await ev(`!!document.querySelector('#productTitle')`).catch(() => false);
  if (ready) break;
}
await sleep(3000);

const probe = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const out = { candidates: [] };
  // any element whose text contains the Prime Video promo we mis-captured
  for (const el of document.querySelectorAll('[id*="ighlight"],[class*="ighlight"]')) {
    const t = txt(el.innerText);
    if (t && t.length < 500) out.candidates.push({ sel: (el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]), text: t.slice(0, 240) });
  }
  // the real field: Amazon renders Item Highlights just under the title in a specific container
  const near = [];
  const title = document.querySelector('#productTitle');
  if (title) {
    let n = title.parentElement;
    for (let d = 0; d < 5 && n; d++) {
      for (const el of n.querySelectorAll('div,span,p')) {
        const t = txt(el.innerText);
        if (t && t.length > 20 && t.length < 300 && !/productTitle/.test(el.className||'')) near.push({ tag: el.tagName, cls: String(el.className).slice(0,80), text: t.slice(0, 240) });
      }
      n = n.parentElement;
    }
  }
  out.nearTitle = near.slice(0, 25);
  out.url = location.href;
  return JSON.stringify(out).slice(0, 6000);
})()`);
console.log(probe);
cdp.ws.close();
