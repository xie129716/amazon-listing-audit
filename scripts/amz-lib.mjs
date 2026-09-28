import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';

export const PORT = 9333;
export const RAW_DIR = `${ROOT}/data/raw`;

export class CDP {
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
      setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); reject(new Error('timeout ' + method)); } }, 180000);
    });
  }
}

export async function connect(port = PORT) {
  const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const ws = new WebSocket(v.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res, { once: true }); ws.addEventListener('error', rej, { once: true }); });
  return new CDP(ws);
}

export async function getPageSession(cdp) {
  const { targetInfos } = await cdp.send('Target.getTargets');
  const pages = targetInfos.filter((t) => t.type === 'page' && !t.url.startsWith('edge://'));
  const page = pages.find((p) => p.url.includes('amazon.com')) || pages[0];
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: page.targetId, flatten: true });
  await cdp.send('Page.enable', {}, sessionId);
  await cdp.send('Runtime.enable', {}, sessionId);
  await cdp.send('Network.enable', {}, sessionId);
  return sessionId;
}

export function makeEval(cdp, sessionId) {
  return async function ev(expression) {
    const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId);
    if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails).slice(0, 400));
    return r.result?.value;
  };
}

/* ------------------------------------------------------------------
   Full structured extraction of an Amazon detail page.
   Naming per Amazon convention:
     mainImage = the single hero image (#landingImage / variant-MAIN)
     gallery   = every subsequent image (variant-PTxx) + video entries
   ------------------------------------------------------------------ */
export const EXTRACT_JS = String.raw`(() => {
  const txt = (s) => (s || '').replace(/\s+/g, ' ').trim();
  const q = (sel) => document.querySelector(sel);
  const qa = (sel) => Array.from(document.querySelectorAll(sel));
  const abs = (u) => { if (!u) return null; try { return new URL(u, location.href).href; } catch { return u; } };
  const out = {};

  out.url = location.href;
  out.capturedAt = new Date().toISOString();
  out.lang = document.documentElement.lang;
  out.pageTitle = document.title;
  out.botCheck = /continue shopping|Click the button below/i.test(document.body.innerText || '');
  out.asin = (location.href.match(/\/(?:dp|gp\/product)\/([A-Z0-9]{10})/) || [])[1] || null;

  // ---------- text ----------
  out.title = txt(q('#productTitle')?.textContent) || null;
  out.titleLen = out.title ? out.title.length : 0;
  out.byline = txt(q('#bylineInfo')?.textContent) || null;
  out.bullets = qa('#feature-bullets li').filter(li => !li.classList.contains('aok-hidden'))
    .map(li => txt(li.querySelector('span.a-list-item')?.textContent || '')).filter(Boolean);

  // Item Highlights (new 125-char field) — probe only real containers, never Amazon's own promo widgets
  const hlSels = ['#itemHighlights', '[data-feature-name="itemHighlights"]', '#productHighlights',
                  '#highlights_feature_div', '#hbopWrapper', '[data-cy="item-highlights"]'];
  out.itemHighlights = null;
  out.itemHighlightsSelector = null;
  for (const s of hlSels) {
    const el = q(s);
    const t = el ? txt(el.innerText) : '';
    if (t) { out.itemHighlights = t; out.itemHighlightsSelector = s; break; }
  }
  // secondary probe: id/class mentioning highlights, excluding Amazon promo/choice widgets
  if (!out.itemHighlights) {
    const BLOCK = /Prime Video|Shop what you see|Amazon's Choice|Explore looks|See more|customer reviews|highly rated/i;
    for (const el of qa('[id*="ighlight"],[class*="ighlight"]')) {
      const t = txt(el.innerText);
      if (!t || t.length < 10 || t.length > 300) continue;
      if (BLOCK.test(t)) continue;
      out.itemHighlights = t;
      out.itemHighlightsSelector = (el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]);
      break;
    }
  }
  out.hasItemHighlights = !!out.itemHighlights;
  out.itemHighlightsLen = out.itemHighlights ? out.itemHighlights.length : 0;

  // ---------- buy box / cart ----------
  out.price = txt(q('.a-price .a-offscreen')?.textContent) || txt(q('#corePrice_feature_div .a-offscreen')?.textContent) || null;
  out.addToCartPresent = !!q('#add-to-cart-button');
  out.addToCartText = txt(q('#add-to-cart-button')?.getAttribute('value') || q('#add-to-cart-button')?.textContent) || null;
  out.buyboxPresent = !!q('#buybox, #desktop_buybox');
  out.availability = txt(q('#availability')?.innerText) || null;
  out.merchant = txt(q('#sellerProfileTriggerId')?.textContent) || txt(q('#merchant-info')?.innerText) || null;
  out.shipsFrom = txt(q('#fulfillerInfoFeature_feature_div')?.innerText) || null;

  // ---------- rating ----------
  const rEl = q('#acrPopover .a-icon-alt') || q('i[data-hook="average-star-rating"] .a-icon-alt') || q('#acrPopover');
  out.rating = txt(rEl?.getAttribute?.('title') || rEl?.textContent) || null;
  out.reviewCount = txt(q('#acrCustomerReviewText')?.textContent) || null;

  // ---------- category breadcrumb ----------
  out.breadcrumbs = qa('#wayfinding-breadcrumbs_feature_div a').map(a => txt(a.textContent)).filter(Boolean);

  // ---------- gallery: MAIN + PTxx + video ----------
  const mainImg = q('#landingImage');
  out.mainImage = {
    src: abs(mainImg?.getAttribute('src')),
    hiRes: abs(mainImg?.getAttribute('data-old-hires')),
    dynamicImage: (() => { try { return abs(JSON.parse(mainImg?.getAttribute('data-a-dynamic-image') || '{}') && Object.keys(JSON.parse(mainImg.getAttribute('data-a-dynamic-image') || '{}'))[0]); } catch { return null; } })(),
  };
  out.gallery = qa('#altImages li').map((li, idx) => {
    const img = li.querySelector('img');
    const isVideo = /videoThumbnail/.test(li.className);
    const variant = (String(li.className).match(/variant-([A-Z0-9]+)/) || [])[1] || null;
    return {
      index: idx,
      variant,
      kind: isVideo ? 'video' : (variant === 'MAIN' ? 'main' : 'image'),
      thumb: abs(img?.getAttribute('src')),
      alt: txt(img?.getAttribute('alt') || '') || null,
      classes: String(li.className),
    };
  });
  out.galleryImageCount = out.gallery.filter(g => g.kind === 'image').length;
  out.galleryVideoCount = out.gallery.filter(g => g.kind === 'video').length;

  // hi-res urls from the colorImages script blob (ordered MAIN, PT01, PT02...)
  const hires = [];
  try {
    const blob = qa('script[type="text/javascript"]').map(s => s.textContent).filter(Boolean).join('\n');
    const m = blob.match(/colorImages\s*[:=]\s*(\{[\s\S]*?\})\s*,\s*["']?colorToAsin/);
    const region = m ? m[1] : blob;
    const re = /"hiRes"\s*:\s*"(https:[^"]+)"/g;
    let x; const seen = new Set();
    while ((x = re.exec(region))) { if (!seen.has(x[1])) { seen.add(x[1]); hires.push(x[1]); } }
    if (!hires.length) {
      const re2 = /"large"\s*:\s*"(https:[^"]+)"/g;
      while ((x = re2.exec(blob))) { if (!seen.has(x[1])) { seen.add(x[1]); hires.push(x[1]); } }
    }
  } catch (e) {}
  out.hiResImages = hires;
  out.hiResCount = hires.length;

  // ---------- A+ ----------
  const aplus = q('#aplus, #aplus_feature_div, #aplus3p_feature_div');
  out.hasAplus = !!aplus;
  out.aplusModuleCount = qa('#aplus .aplus-module, #aplus_feature_div .aplus-module, #aplus3p_feature_div .aplus-module').length;
  out.aplusImageCount = qa('#aplus img, #aplus_feature_div img, #aplus3p_feature_div img').length;
  out.aplusVideoCount = qa('#aplus video, #aplus_feature_div video').length;
  out.aplusText = txt(aplus?.innerText || '').slice(0, 6000);
  out.aplusImageAlts = qa('#aplus img, #aplus_feature_div img, #aplus3p_feature_div img').map(i => txt(i.getAttribute('alt') || '')).filter(Boolean).slice(0, 60);
  out.aplusImageSrcs = qa('#aplus img, #aplus_feature_div img, #aplus3p_feature_div img')
    .map(i => abs(i.getAttribute('data-src') || i.getAttribute('data-a-hires') || i.getAttribute('src'))).filter(Boolean).slice(0, 60);
  out.aplusHtmlLength = aplus ? aplus.outerHTML.length : 0;

  // ---------- rank / detail bullets ----------
  out.detailBullets = qa('#detailBullets_feature_div li').map(li => txt(li.innerText)).filter(Boolean);
  out.bsr = out.detailBullets.find(t => /Best Sellers Rank/i.test(t)) || null;
  out.productDetailsRows = qa('#productDetails_detailBullets_sections1 tr, #productDetails_techSpec_section_1 tr').map(tr => txt(tr.innerText)).filter(Boolean);
  // fallback: some layouts render Best Sellers Rank inside the productDetails table or as loose text
  if (!out.bsr) {
    const row = out.productDetailsRows.find(t => /Best Sellers Rank/i.test(t));
    if (row) out.bsr = row;
  }
  if (!out.bsr) {
    const mm = (document.body.innerText || '').match(/Best Sellers Rank[\s\S]{0,220}/);
    if (mm) out.bsr = txt(mm[0]);
  }
  out.asinDetail = out.detailBullets.find(t => /^ASIN/i.test(t)) || null;
  out.manufacturer = out.detailBullets.find(t => /Manufacturer/i.test(t)) || null;
  out.brandDetail = out.detailBullets.find(t => /^Brand/i.test(t)) || null;
  out.dateFirstAvailable = out.detailBullets.find(t => /Date First Available/i.test(t)) || null;

  // ---------- page-level AI markers (exclude Amazon's own review-summary disclaimer) ----------
  const bodyText = document.body.innerText || '';
  const aiAll = bodyText.match(/AI[- ]generated|Generated by AI|Made with AI|AI generated/gi) || [];
  out.aiMarkers = {
    all: [...new Set(aiAll)],
    // Amazon injects this into the review widget; it is NOT listing content
    amazonReviewDisclaimer: /AI Generated from the text of customer reviews/i.test(bodyText),
  };

  out.htmlLength = document.documentElement.outerHTML.length;
  return out;
})()`;

export async function extractAsin(cdp, sessionId, asin, opts = {}) {
  const ev = makeEval(cdp, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  let ready = false;
  for (let i = 0; i < 60; i++) {
    await sleep(1000);
    try {
      const st = await ev(`(() => ({ hasTitle: !!document.querySelector('#productTitle'), bot: /continue shopping|Click the button below/i.test(document.body.innerText||''), rs: document.readyState, url: location.href }))()`);
      if (st.bot) return { asin, botCheck: true, url: st.url };
      if (st.hasTitle && st.rs !== 'loading') { ready = true; break; }
    } catch {}
  }
  if (!ready) return { asin, timeout: true, url: await ev('location.href').catch(() => null) };

  // scroll through the page so lazy A+ / gallery modules materialise
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 800) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 120)); } window.scrollTo(0, 0); return 1; })()`);
  await sleep(opts.settleMs ?? 3500);

  const data = await ev(EXTRACT_JS);
  mkdirSync(RAW_DIR, { recursive: true });
  if (opts.saveHtml !== false) {
    const html = await ev('document.documentElement.outerHTML');
    writeFileSync(`${RAW_DIR}/${asin}.html`, html, 'utf8');
  }
  writeFileSync(`${RAW_DIR}/${asin}.json`, JSON.stringify(data, null, 2), 'utf8');
  return data;
}

/** Expand every amazon image url to the largest available variant. */
export function toMaxRes(url) {
  if (!url) return url;
  return url.replace(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png|webp)$/i, '._SL1600_.$1');
}
