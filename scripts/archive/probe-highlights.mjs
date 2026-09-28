import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync, mkdirSync } from 'node:fs';

const PORT = 9333;
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.pending = new Map(); this.events = [];
    ws.addEventListener('message', (ev) => {
      const m = JSON.parse(ev.data);
      if (m.id && this.pending.has(m.id)) {
        const { resolve, reject } = this.pending.get(m.id);
        this.pending.delete(m.id);
        m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result);
      } else if (m.method) this.events.push(m);
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.id;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, 120000);
    });
  }
}

const v = await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json();
const ws = new WebSocket(v.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
const cdp = new CDP(ws);
const { targetInfos } = await cdp.send('Target.getTargets');
const page = targetInfos.filter((t) => t.type === 'page' && !t.url.startsWith('edge://')).find((p) => p.url.includes('amazon.com')) || targetInfos.filter((t) => t.type === 'page')[0];
const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
await cdp.send('Page.enable', {}, sessionId);
await cdp.send('Runtime.enable', {}, sessionId);
const ev = async (expression) => {
  const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 300));
  return r.result?.value;
};

// probe all plausible title/highlight containers on the current product page
const probe = await ev(`(() => {
  const txt = (s) => (s||'').replace(/\\s+/g,' ').trim();
  const sels = ['#title','#productTitle','#productTitleGroup','#title_feature_div','#itemHighlights','[data-feature-name="itemHighlights"]','#productHighlights','#highlights','#productOverview_feature_div','#feature-bullets','#hqpWrapper','#hbopWrapper'];
  const out = {};
  for (const s of sels) { const el = document.querySelector(s); out[s] = el ? txt(el.innerText).slice(0,400) : null; }
  out.__url = location.href;
  return JSON.stringify(out);
})()`);
console.log(probe);

// also check an Amazon SEARCH result card (where Item Highlights render)
await cdp.send('Page.navigate', { url: 'https://www.amazon.com/s?k=B0EX0001' }, sessionId);
await sleep(7000);
const search = await ev(`(() => {
  const txt = (s) => (s||'').replace(/\\s+/g,' ').trim();
  const card = document.querySelector('[data-component-type="s-search-result"]');
  if (!card) return JSON.stringify({ err: 'no card', body: txt(document.body.innerText).slice(0,300) });
  const grab = (s) => { const e = card.querySelector(s); return e ? txt(e.innerText) : null; };
  return JSON.stringify({
    title: grab('h2'),
    titleSpan: grab('h2 span'),
    highlights: grab('.a-size-base-plus.a-color-base.a-text-normal, [data-cy="title-recipe"] .a-row'),
    cardText: txt(card.innerText).slice(0, 900),
  });
})()`);
console.log('SEARCH CARD:', search);

mkdirSync(`${ROOT}/data/derived`, { recursive: true });
writeFileSync(`${ROOT}/data/derived/probe-highlights.json`, JSON.stringify({ probe, search }, null, 2), 'utf8');
ws.close();
