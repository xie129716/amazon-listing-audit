/* 核查购买框：是否真的不可购买，还是浏览器配送地址导致。 */
import { setTimeout as sleep } from 'node:timers/promises';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const asins = process.argv.slice(2);
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

for (const asin of asins) {
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 1200, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 40; i++) { await sleep(1000); if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break; }
  await sleep(7000);
  const d = await ev(`(() => {
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    return {
      title: txt(document.querySelector('#productTitle')?.innerText).slice(0, 60),
      addToCartBtn: !!document.querySelector('#add-to-cart-button'),
      buyNow: !!document.querySelector('#buy-now-button'),
      buybox: txt(document.querySelector('#buybox')?.innerText).slice(0, 260),
      availability: txt(document.querySelector('#availability')?.innerText).slice(0, 200),
      outOfStock: txt(document.querySelector('#outOfStock')?.innerText).slice(0, 200),
      deliveryBlock: txt(document.querySelector('#contextualIngressPtLabel_deliveryShortLine, #glow-ingress-line2')?.innerText).slice(0, 120),
      shipsFrom: txt(document.querySelector('#fulfillerInfoFeature_feature_div, #merchant-info')?.innerText).slice(0, 160),
      offerCount: txt(document.querySelector('#olp-upd-new-freeshipping, #aod-offer')?.innerText).slice(0, 120),
      unavailable: !!document.querySelector('#availability .a-color-price, #exports_desktop_qualifiedBuyBox_unqualified'),
    };
  })()`);
  console.log(`\n===== ${asin} — ${d.title}`);
  console.log('  add-to-cart 按钮 :', d.addToCartBtn, '| Buy Now:', d.buyNow);
  console.log('  配送地址         :', d.deliveryBlock);
  console.log('  availability     :', d.availability || '(空)');
  console.log('  outOfStock       :', d.outOfStock || '(空)');
  console.log('  发货/卖家        :', d.shipsFrom);
  console.log('  buybox 摘要      :', d.buybox.slice(0, 240).replace(/\n/g, ' | '));
  await sleep(2000);
}
cdp.ws.close();
