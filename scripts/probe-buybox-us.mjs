/* 把浏览器配送地址改成美国 ZIP，再核查购买框（避免因探测机地址导致误判"不可购买"）。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const ZIP = process.argv[2] || '10001';
const asins = process.argv.slice(3);
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false }, sessionId);
await cdp.send('Page.navigate', { url: 'https://www.amazon.com/' }, sessionId);
await sleep(5000);

// 打开配送地址弹窗
const opened = await ev(`(() => {
  const a = document.querySelector('#nav-global-location-popover-link') || document.querySelector('#glow-ingress-block');
  if (!a) return 'no-link';
  a.click();
  return 'clicked';
})()`);
console.log('打开地址弹窗:', opened);
await sleep(4000);

const filled = await ev(`(() => {
  const inp = document.querySelector('#GLUXZipUpdateInput') || document.querySelector('input[name="zipCode"]');
  if (!inp) return 'no-input';
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
  setter.call(inp, '${ZIP}');
  inp.dispatchEvent(new Event('input', { bubbles: true }));
  inp.dispatchEvent(new Event('change', { bubbles: true }));
  const btn = document.querySelector('#GLUXZipUpdate input[type="submit"]') || document.querySelector('#GLUXZipUpdate') || document.querySelector('input[aria-labelledby="GLUXZipUpdate-announce"]');
  if (btn) { btn.click(); return 'submitted'; }
  return 'no-submit';
})()`);
console.log('填入 ZIP 并提交:', filled, ZIP);
await sleep(5000);

// 关掉可能的 continue 弹窗
await ev(`(() => { const b = document.querySelector('button[name="glowDoneButton"], .a-popover-footer input[type="submit"], #GLUXConfirmClose'); if (b) b.click(); return 1; })()`);
await sleep(2500);

const loc = await ev(`(() => (document.querySelector('#glow-ingress-line2')?.innerText || '').replace(/\\s+/g,' ').trim())()`);
console.log('当前配送地址:', loc);

for (const asin of asins) {
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 40; i++) { await sleep(1000); if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break; }
  await sleep(6000);
  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    return {
      loc: txt(document.querySelector('#glow-ingress-line2')?.innerText),
      addToCart: !!document.querySelector('#add-to-cart-button'),
      buyNow: !!document.querySelector('#buy-now-button'),
      availability: txt(document.querySelector('#availability')?.innerText).slice(0, 160),
      buybox: txt(document.querySelector('#buybox')?.innerText).slice(0, 200),
    };
  })()`);
  console.log(`\n${asin} @ ${d.loc} | addToCart=${d.addToCart} buyNow=${d.buyNow}`);
  console.log('  availability:', d.availability || '(空)');
  console.log('  buybox      :', d.buybox.replace(/\n/g, ' | ').slice(0, 190));
}
cdp.ws.close();
