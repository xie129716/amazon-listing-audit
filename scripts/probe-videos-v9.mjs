/* ============================================================================
   视频统计 v9 —— 权威口径（2026-09-16 最终修正，用户核对通过）

   v7/v8 错在哪：直接数 `#va-related-videos-widget` 的条目，会把
   「同变体家族 / 相关商品」的视频算进来。B0FDQMCKRM 因此被算成 8 条红人。

   v9 正确做法：
     1. 读主图角标 `#videoCount` → 该 listing 视频总数（前台权威数字）。
     2. 点主图区「N VIDEOS」缩略图打开**沉浸式视频面板**；
        面板里分段为 `Videos for this product` 与 `Related videos for this product`，
        只取前者的条目（条数应当 == 角标）。
     3. 按条目链接里的 aci 判定类型（不依赖易失的 JSON 元数据）：
          aci 含 `amzn1.ive.seller.video`   → Seller    → **品牌视频**
          aci 含 `amzn1.vse.video`          → Influencer → **红人视频**
          aci 含 `amzn1.productreview`      → Customer   → **用户视频**
          （兜底：href 含 /gp/customer-reviews/ 或 /product-reviews/ → 用户视频）
     4. 同一红人的多条视频**不去重**，按条目计数。
     5. 报告与表格同时给出角标，便于随时复核。
   ========================================================================== */
import { setTimeout as sleep } from 'node:timers/promises';
import { readFileSync, writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const sheet = JSON.parse(readFileSync('E:/listing_exam/data/derived/sheet-all-records.json', 'utf8'));
const recByAsin = {};
for (const r of sheet.records) recByAsin[r.ASIN] = r;

const DEFAULT = ['B0DJQS14DS', 'B0GF1Z3CFH', 'B0FL6X3HRW', 'B0FF8YBX8P', 'B0GGNM98LD', 'B0FDQMCKRM'];
const ASINS = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;

/** 取主图角标视频数（注意：只有 1 条时亚马逊显示 "VIDEO" 而非 "1 VIDEO"） */
const BADGE_JS = `(() => {
  const t = (document.querySelector('#videoCount')?.innerText || '').trim();
  const m = t.match(/(\\d+)/);
  if (m) return parseInt(m[1], 10);
  return /VIDEO/i.test(t) ? 1 : 0;
})()`;

/** 点开沉浸式面板 */
const OPEN_JS = `(() => {
  const li = document.querySelector('#altImages li.videoThumbnail');
  if (!li) return 'no-thumb';
  const t = li.querySelector('img') || li;
  t.click(); li.click();
  return 'clicked';
})()`;

/** 从沉浸式面板取所有分段的视频卡（面板清单 = 本 listing 的全部视频，条数应等于角标） */
const VIEWER_JS = `(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const isVideoCard = (a) => /\\d+:\\d\\d/.test(txt(a.innerText)) && txt(a.innerText).length < 260;
  const carousels = [...document.querySelectorAll('ol.a-carousel')].filter((ol) => ol.querySelector('a.vse-carousel-item'));

  const segs = [];
  for (const ol of carousels) {
    let cur = null;
    for (const c of ol.children) {
      const t = txt(c.innerText || '');
      const cls = (c.className || '').toString();
      const isHead = /^(Videos for this product|Related videos for this product|Customer review videos)$/i.test(t)
        || (/vse-flex-carousel-header/.test(cls) && t.length < 45);
      if (isHead) { cur = { title: t, items: [] }; segs.push(cur); continue; }
      const a = c.querySelector('a.vse-carousel-item');
      if (a && isVideoCard(a)) {
        if (!cur) { cur = { title: '', items: [] }; segs.push(cur); }
        const g = (sel) => { const e = a.querySelector(sel); return e ? txt(e.textContent) : ''; };
        cur.items.push({
          href: a.getAttribute('href') || '',
          text: txt(a.innerText).replace(/\\n/g, ' | '),
          dur: g('.vse-video-duration'),
          title: g('.vse-video-title-text'),
          creator: g('.vse-video-vendorname'),
        });
      }
    }
  }
  // 合并同名分段
  const merged = [];
  for (const s of segs) {
    const hit = merged.find((m) => m.title === s.title);
    if (hit) hit.items.push(...s.items); else merged.push({ title: s.title, items: [...s.items] });
  }
  const all = merged.flatMap((s) => s.items.map((it) => ({ ...it, seg: s.title })));
  if (!all.length) {  // 兜底：全页视频卡
    const fb = [...document.querySelectorAll('ol.a-carousel a.vse-carousel-item')].filter(isVideoCard)
      .map((a) => ({ href: a.getAttribute('href') || '', text: txt(a.innerText).replace(/\\n/g, ' | '), seg: '(fallback)' }));
    return { all: fb, segTitles: ['(fallback):' + fb.length] };
  }
  return { all, segTitles: merged.map((s) => s.title + ':' + s.items.length) };
})()`;

function typeOf(card) {
  const h = String(card.href || '');
  const m = h.match(/aci=([^&]+)/);
  const aci = m ? decodeURIComponent(m[1]) : '';
  if (/amzn1\.ive\./.test(aci)) return 'Seller';
  if (/amzn1\.vse\.video/.test(aci)) return 'Influencer';
  if (/amzn1\.productreview/.test(aci)) return 'Customer';
  if (/\/(gp\/customer-reviews|product-reviews)\//.test(h)) return 'Customer';
  return 'Unknown';
}

const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);
const out = {};

for (const asin of ASINS) {
  const parent = String(recByAsin[asin]?.['父ASIN'] || '').trim();
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1400, deviceScaleFactor: 1, mobile: false }, sessionId);
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await ev(`window.scrollTo(0,0)`);
  await sleep(4500);

  const badge = await ev(BADGE_JS);
  let viewer = { all: [], segTitles: [] };
  if (badge > 0) {
    const r = await ev(OPEN_JS);
    await sleep(11000);
    viewer = await ev(VIEWER_JS);
    if (!viewer.all.length) { await sleep(8000); viewer = await ev(VIEWER_JS); }
    if (r === 'no-thumb') viewer.note = '主图无视频缩略图';
  }

  // 去重（同一条目只算一次）
  const seen = new Set();
  const items = [];
  for (const c of viewer.all) {
    const key = (c.text || '').replace(/Now playing/i, '').replace(/\s+/g, ' ').trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const type = typeOf(c);
    const dur = c.dur || (c.text.match(/^(\d+:\d\d)/) || [])[1] || '';
    const title = c.title || (c.text.replace(/^(\d+:\d\d)\s*(Now playing\s*)?/i, '').trim());
    items.push({ dur, text: title, creator: c.creator || '', type, href: c.href, seg: c.seg || '' });
  }

  const brand = items.filter((x) => x.type === 'Seller');
  const creator = items.filter((x) => x.type === 'Influencer');
  const customer = items.filter((x) => x.type === 'Customer');
  const unknown = items.filter((x) => x.type === 'Unknown');

  out[asin] = {
    asin, parentAsin: parent,
    videoCountBadge: badge,
    viewerCount: items.length,
    badgeMatch: badge === 0 ? null : items.length === badge,
    brandCount: brand.length, creatorCount: creator.length, customerCount: customer.length,
    brandVideos: brand.map((x) => ({ dur: x.dur, text: x.text, creator: x.creator, seg: x.seg })),
    creatorVideos: creator.map((x) => ({ dur: x.dur, text: x.text, creator: x.creator, seg: x.seg })),
    customerVideos: customer.map((x) => ({ dur: x.dur, text: x.text, creator: x.creator, seg: x.seg })),
    unknown: unknown.map((x) => ({ dur: x.dur, text: x.text, href: x.href, seg: x.seg })),
    segTitles: viewer.segTitles,
    segments: [...new Set(items.map((x) => x.seg))].map((s) => ({ seg: s, n: items.filter((x) => x.seg === s).length })),
  };

  const o = out[asin];
  console.log(`\n===== ${asin} (父 ${parent || '—'}) | 角标 ${badge} VIDEOS | 面板清单 ${items.length} 条 | 校验: ${o.badgeMatch === null ? '无视频' : o.badgeMatch ? '✅一致' : '❌不一致'}`);
  console.log(`  面板分段: ${JSON.stringify(viewer.segTitles)}`);
  console.log(`  ★ 品牌 ${o.brandCount} / 红人 ${o.creatorCount} / 用户 ${o.customerCount}${unknown.length ? ' / 未知 ' + unknown.length : ''}`);
  for (const v of o.brandVideos) console.log(`    [品牌] ${v.dur} ${v.creator || '(无署名)'} — ${v.text}   <${v.seg}>`);
  for (const v of o.creatorVideos) console.log(`    [红人] ${v.dur} ${v.creator || '(无署名)'} — ${v.text}   <${v.seg}>`);
  for (const v of o.customerVideos) console.log(`    [用户] ${v.dur} ${v.creator || '(无署名)'} — ${v.text}   <${v.seg}>`);
  for (const v of o.unknown) console.log(`    [??] ${v.dur} ${v.text}   <${v.seg}> ${v.href.slice(0, 110)}`);
  await sleep(2000);
}

writeFileSync('E:/listing_exam/data/derived/video-counts-v9.json', JSON.stringify(out, null, 2), 'utf8');
console.log('\n-> data/derived/video-counts-v9.json');
cdp.ws.close();
