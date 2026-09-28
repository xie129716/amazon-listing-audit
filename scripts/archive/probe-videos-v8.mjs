/* ============================================================================
   视频统计 v8 —— 权威口径（2026-09-16 修正）

   背景：v7 用 `#va-related-videos-widget` 的可见条目原文计数，
   但该 carousel 里**混入了「相关商品」的视频**，导致 B0EX0002 算成 8 条红人（实际 5 条）。

   正确做法：读页面内嵌的视频元数据 `carouselItems`，每条都带
     · creatorType        : Seller | Influencer | Customer
     · relatedProductsAsins : 这条视频关联的 ASIN 列表（逗号分隔）
     · publicName / title / formattedDuration

   归属判定：只保留 `relatedProductsAsins` 中包含 **本 ASIN 或本记录的父 ASIN** 的条目。
   交叉校验：过滤后的条目总数应等于主图角标 `#videoCount` 的数字。

   分类：Seller → 品牌视频；Influencer → 红人视频；Customer → 用户视频。
   （同一红人的多条视频不去重，按条目计。）
   ========================================================================== */
import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const sheet = JSON.parse(readFileSync(`${ROOT}/data/derived/sheet-all-records.json`, 'utf8'));
const recByAsin = {};
for (const r of sheet.records) recByAsin[r.ASIN] = r;

const DEFAULT = ['B0EX0001', 'B0EX0005', 'B0EX0004', 'B0EX0003', 'B0EX0006', 'B0EX0002'];
const ASINS = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;

const EXTRACT = `(() => {
  const html = document.documentElement.outerHTML
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  function extractArray(key) {
    const k = html.indexOf('"' + key + '":');
    if (k < 0) return null;
    const i = html.indexOf('[', k);
    if (i < 0) return null;
    let depth = 0, j = i, inStr = false, esc = false;
    for (; j < html.length; j++) {
      const c = html[j];
      if (inStr) { if (esc) esc = false; else if (c === '\\\\') esc = true; else if (c === '"') inStr = false; continue; }
      if (c === '"') { inStr = true; continue; }
      if (c === '[' || c === '{') depth++;
      else if (c === ']' || c === '}') { depth--; if (depth === 0) { j++; break; } }
    }
    try { return JSON.parse(html.slice(i, j)); } catch (e) { return null; }
  }
  const items = extractArray('carouselItems') || extractArray('videoDataList') || [];
  const slim = items.map((x) => ({
    contentId: x.contentId || x.asin || '',
    title: x.title || x.metadata?.title || '',
    dur: x.formattedDuration || x.metadata?.formattedDuration || '',
    publicName: x.publicName || x.vendorName || '',
    creatorType: x.creatorType || '',
    related: x.relatedProductsAsins || '',
    aci: x.aciContentId || '',
  })).filter((x) => x.aci || x.contentId);
  return {
    videoCount: parseInt((document.querySelector('#videoCount')?.innerText || '').replace(/\\D+/g, ''), 10) || 0,
    items: slim,
  };
})()`;

const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);
const out = {};

for (const asin of ASINS) {
  const parent = String(recByAsin[asin]?.['父ASIN'] || '').trim();
  const family = new Set([asin, parent].filter(Boolean));

  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 4200, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); } window.scrollTo(0,0); return 1; })()`);
  await sleep(12000);

  const raw = await ev(EXTRACT);
  const seen = new Set();
  const mine = [];
  for (const it of raw.items) {
    const rel = String(it.related || '').split(',').map((s) => s.trim()).filter(Boolean);
    if (!rel.some((a) => family.has(a))) continue;      // 只保留属于本记录（含父 ASIN）的视频
    const key = it.contentId || it.aci;
    if (seen.has(key)) continue;
    seen.add(key);
    mine.push(it);
  }

  const brand = mine.filter((x) => x.creatorType === 'Seller');
  const creator = mine.filter((x) => x.creatorType === 'Influencer');
  const customer = mine.filter((x) => x.creatorType === 'Customer');
  const unknown = mine.filter((x) => !['Seller', 'Influencer', 'Customer'].includes(x.creatorType));

  out[asin] = {
    asin, parentAsin: parent, familyAsins: [...family],
    videoCountBadge: raw.videoCount,
    totalForProduct: mine.length,
    badgeMatch: raw.videoCount === 0 ? null : mine.length === raw.videoCount,
    rawCarouselTotal: raw.items.length,
    brandCount: brand.length, creatorCount: creator.length, customerCount: customer.length,
    unknownType: unknown,
    brandVideos: brand.map((x) => ({ dur: x.dur, text: x.title, creator: x.publicName })),
    creatorVideos: creator.map((x) => ({ dur: x.dur, text: x.title, creator: x.publicName, related: x.related })),
    customerVideos: customer.map((x) => ({ dur: x.dur, text: x.title, creator: x.publicName })),
    excludedCount: raw.items.length - mine.length,
  };

  const o = out[asin];
  console.log(`\n===== ${asin} (父 ${parent || '—'}) | 角标 ${raw.videoCount} VIDEOS | carousel 原始 ${raw.items.length} 条`);
  console.log(`  归属本记录 ${o.totalForProduct} 条（剔除相关商品视频 ${o.excludedCount} 条） | 角标校验: ${o.badgeMatch === null ? '无角标' : o.badgeMatch ? '✅一致' : '❌不一致'}`);
  console.log(`  品牌 ${o.brandCount} / 红人 ${o.creatorCount} / 用户 ${o.customerCount}${unknown.length ? ' / 未分类 ' + unknown.length : ''}`);
  for (const v of o.brandVideos) console.log(`    [品牌] ${v.dur} ${v.creator} — ${v.text}`);
  for (const v of o.creatorVideos) console.log(`    [红人] ${v.dur} ${v.creator} — ${v.text}`);
  for (const v of o.customerVideos) console.log(`    [用户] ${v.dur} ${v.creator} — ${v.text}`);
  await sleep(2000);
}

writeFileSync(`${ROOT}/data/derived/video-counts-v8.json`, JSON.stringify(out, null, 2), 'utf8');
console.log('\n-> data/derived/video-counts-v8.json');
cdp.ws.close();
