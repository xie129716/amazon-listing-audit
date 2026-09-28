import { setTimeout as sleep } from 'node:timers/promises';
import { connect, getPageSession, extractAsin } from './amz-lib.mjs';

const ASINS = process.argv.slice(2);
if (!ASINS.length) { console.error('usage: node fetch-asins.mjs ASIN1 ASIN2 ...'); process.exit(1); }

const cdp = await connect();
const sessionId = await getPageSession(cdp);
console.log('connected to page session');

for (const asin of ASINS) {
  const t0 = Date.now();
  try {
    const d = await extractAsin(cdp, sessionId, asin);
    if (d.botCheck || d.timeout) { console.log(JSON.stringify({ asin, botCheck: !!d.botCheck, timeout: !!d.timeout })); continue; }
    console.log(JSON.stringify({
      asin,
      ms: Date.now() - t0,
      titleLen: d.titleLen,
      hasHighlights: d.hasItemHighlights,
      highlightsLen: d.itemHighlightsLen,
      bullets: d.bullets.length,
      mainImage: !!d.mainImage?.src || !!d.mainImage?.hiRes,
      galleryImages: d.galleryImageCount,
      galleryVideos: d.galleryVideoCount,
      hiRes: d.hiResCount,
      hasAplus: d.hasAplus,
      aplusModules: d.aplusModuleCount,
      aplusImages: d.aplusImageCount,
      rating: d.rating,
      reviews: d.reviewCount,
      price: d.price,
      addToCart: d.addToCartPresent,
      availability: d.availability,
      breadcrumbs: d.breadcrumbs.join(' > '),
      bsr: d.bsr ? d.bsr.slice(0, 90) : null,
    }));
  } catch (e) {
    console.log(JSON.stringify({ asin, error: String(e).slice(0, 250) }));
  }
  await sleep(4000);
}
cdp.ws.close();
console.log('=== DONE ===');
