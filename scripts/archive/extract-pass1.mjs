import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const ASINS = ['B0DJQS14DS', 'B0GF1Z3CFH', 'B0FL6X3HRW'];

function decode(s) {
  return (s || '')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ');
}

const BANNED = [
  { re: /\b(best seller|#1|number one|top rated|guaranteed|guarantee)\b/gi, tag: '夸大/保证类' },
  { re: /\b(free shipping|free gift|discount|coupon code|promo code)\b/gi, tag: '促销引流类' },
  { re: /\b(review|reviews)\b[^.]{0,60}\b(gift|card|refund|reward|free|discount|cash)\b/gi, tag: '诱导评价-利益交换' },
  { re: /\b(gift card|giftcard)\b/gi, tag: '礼品卡(诱导评价高危)' },
  { re: /\b(5[- ]star|five[- ]star|positive review|leave (us )?a review|write a review)\b/gi, tag: '诱导评价' },
  { re: /\b(contact us|email us|whatsapp|telegram|wechat|we chat|facebook|instagram|tiktok|twitter|@[a-z0-9.-]+\.(com|net|org))\b/gi, tag: '站外引流/联系方式' },
  { re: /\b(100%|fully) (safe|cure|treat|heal|prevent)\b/gi, tag: '医疗/绝对化声明' },
  { re: /\b(cure|treat|heal|diagnose|prevent disease|cancer|fda approved|epa approved)\b/gi, tag: '医疗声明' },
  { re: /\b(eco[- ]?friendly|biodegradable|non[- ]toxic|organic|natural)\b/gi, tag: '环保/成分宣称(需证据)' },
  { re: /\b(bpa[- ]free|food[- ]grade|fda)\b/gi, tag: '合规宣称(需证据)' },
  { re: /(亚马逊|微信|淘宝|拼多多)/g, tag: '中文/站外' },
  { re: /\b(cheapest|lowest price|best price|free returns forever)\b/gi, tag: '价格绝对化' },
];

function scanText(text, label) {
  const hits = [];
  for (const b of BANNED) {
    const m = text.match(b.re);
    if (m) hits.push({ tag: b.tag, matches: [...new Set(m.map((x) => x.toLowerCase()))].slice(0, 8), where: label });
  }
  return hits;
}

const out = {};
for (const asin of ASINS) {
  const html = readFileSync(`E:/listing_exam/data/raw/${asin}.html`, 'utf8');
  const json = JSON.parse(readFileSync(`E:/listing_exam/data/raw/${asin}.json`, 'utf8'));

  // ---------- A+ image urls ----------
  const aplusSections = [];
  // capture the aplus containers
  const aplusRegion = (() => {
    const i = html.indexOf('id="aplus"');
    if (i < 0) return '';
    return html.slice(i, i + 400000);
  })();

  const aplusImgs = new Set();
  for (const m of aplusRegion.matchAll(/(?:data-src|data-a-hires|src)="(https:\/\/m\.media-amazon\.com\/images\/S\/aplus-media[^"]+)"/g)) {
    aplusImgs.add(decode(m[1]));
  }
  // fallback: any aplus-media url in the whole doc
  for (const m of html.matchAll(/https:\/\/m\.media-amazon\.com\/images\/S\/aplus-media\/[^"'\\ ]+/g)) {
    aplusImgs.add(decode(m[0]));
  }
  const aplusList = [...aplusImgs].filter((u) => /\.(jpg|jpeg|png|webp)/i.test(u));

  // A+ module structure
  for (const m of aplusRegion.matchAll(/class="[^"]*aplus-module[^"]*"/g)) aplusSections.push(m[0]);

  // ---------- evidence of brand removal ----------
  const brandTokens = ['Luvcosy', 'LUVCOSY', 'fantovo', 'FANTOVO', 'Kiicii', 'KIICII',
    'Bar Keepers Friend', 'Comet', 'Ajax', 'Bonami', 'La Fermiere', 'La Fermière'];
  const brandMentions = {};
  for (const t of brandTokens) {
    const n = (html.match(new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')) || []).length;
    if (n) brandMentions[t] = n;
  }

  // ---------- compliance scan ----------
  const scanTargets = [
    { label: 'TITLE', text: json.title || '' },
    { label: 'BULLETS', text: (json.bullets || []).join('\n') },
    { label: 'A+TEXT', text: json.aplusText || '' },
    { label: 'APLUS_ALT', text: (json.aplusImageAlts || []).join(' | ') },
  ];
  const compliance = [];
  for (const t of scanTargets) compliance.push(...scanText(t.text, t.label));

  // ---------- "for / compatible with" phrasing check ----------
  const compatPatterns = [
    /compatible with/i, /for [A-Z]/, /\bfits\b/i, /designed for/i, /replacement for/i,
    /\bworks with\b/i, /\bsuitable for\b/i,
  ];

  out[asin] = {
    aplusImageCount: aplusList.length,
    aplusImageUrls: aplusList.slice(0, 40),
    aplusSectionCount: aplusSections.length,
    brandMentions,
    compliance,
    title: json.title,
    bullets: json.bullets,
    imageUrls: json.imageUrls,
    mainImageDataOldHires: json.mainImageDataOldHires,
    galleryThumbs: json.galleryThumbs,
    aplusImageAlts: json.aplusImageAlts,
  };
}

mkdirSync('E:/listing_exam/data/derived', { recursive: true });
writeFileSync('E:/listing_exam/data/derived/extract-pass1.json', JSON.stringify(out, null, 2), 'utf8');

for (const [asin, d] of Object.entries(out)) {
  console.log('=====', asin, '=====');
  console.log('A+ images:', d.aplusImageCount, '| aplus-module class hits:', d.aplusSectionCount);
  console.log('A+ urls:'); d.aplusImageUrls.slice(0, 12).forEach((u) => console.log('   ', u));
  console.log('brand mentions in html:', JSON.stringify(d.brandMentions));
  console.log('compliance hits:', JSON.stringify(d.compliance));
  console.log('');
}
