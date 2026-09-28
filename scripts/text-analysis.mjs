import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';

/* ============================================================================
   Amazon text-compliance rules, taken from Amazon's own published requirements.
   Every rule below is a CHECK AGAINST A STATED AMAZON RULE — nothing invented.

   RULE SET A — Title (商品名称 / 主标题)
     A1  <= 75 characters INCLUDING spaces           (2026-07-27 new title policy)
     A2  structure = Brand + core product noun + basic spec/model
     A3  no promotional / subjective wording
     A4  no ALL-CAPS words (except brand/model/abbreviation)
     A5  no repeated words
     A6  prohibited characters ! $ ? _ { } ^ ¬ ¦ ~
     A7  capitalise each word (not short prepositions/conjunctions/articles)
     A8  numbers as numerals
     A9  no contact info / URLs / email

   RULE SET B — Item Highlights (商品亮点, <=125 chars)
     B0  field must exist at all
     B1  <= 125 characters INCLUDING spaces
     B2  no SEMICOLONS
     B3  no promotional wording

   RULE SET C — Bullet points (五点描述)
     C1  <= 5 bullets
     C2  no promotional / guarantee wording
     C3  no seller contact info / URLs
     C4  no incentivised-review language
     C5  no medical claims

   RULE SET D — Compatibility wording (for / compatible with)
   RULE SET E — English mechanics
   ========================================================================== */

const TITLE_MAX = 75;
const HIGHLIGHT_MAX = 125;

const PROMO = [
  'free shipping', 'free gift', 'best seller', 'bestseller', 'hot sale', 'hot item',
  'sale', 'discount', 'clearance', 'buy now', 'limited time', 'order now',
  'money back', 'guarantee', 'guaranteed', '100% satisfaction', 'top rated',
  'amazing', 'perfect gift', 'great gift', 'must have', 'best quality',
  'new arrival', 'cheap', 'lowest price', 'best price',
];
const CONTACT = [
  'contact us', 'email us', 'whatsapp', 'telegram', 'wechat', 'we chat',
  'facebook.com', 'instagram', 'tiktok', 'www.', 'http', '.com', '.net', '@gmail', '@outlook', '@yahoo',
];
const REVIEW_INCENTIVE = [
  'leave a review', 'write a review', 'review for', '5 star review', 'five star review',
  'positive review', 'gift card for review', 'reward for review', 'cash back for review',
];
const MEDICAL = [
  'cure', 'cures', 'treat', 'treats', 'heal', 'heals', 'diagnose', 'prevent disease',
  'fda approved', 'medical grade', 'sterile', 'antibacterial', 'anti-bacterial',
  'kills germs', 'kills 99', 'eliminates bacteria', 'prevents infection',
];
const ALLCAPS_OK = new Set(['BPA', 'PVC', 'ABS', 'USB', 'LED', 'LCD', 'FDA', 'LFGB', 'SGS', 'OZ', 'ML', 'CM', 'MM', 'FT', 'PC', 'PCS', 'SET', 'XL', 'XXL', 'USA', 'UK', 'EU', 'FBA', 'ASIN', 'SKU', 'UPC', 'GTIN', 'PH', 'KG', 'LB', 'LBS', 'CT', 'PK', 'QTY', 'SQ', 'WT',
  // 自有品牌名：A4 规则本身写明「品牌 / 型号 / 缩写」全大写是允许的，不应计入违规
  'LUVCOSY', 'FANTOVO', 'KIICII', 'PUREKRA', 'LAWNFUL', 'VIOTIIN', 'VASTICIDE']);
const TITLE_BANNED_CHARS = ['!', '$', '?', '_', '{', '}', '^', '¬', '¦', '~'];
const SMALL_WORDS = new Set(['a', 'an', 'and', 'or', 'the', 'for', 'with', 'of', 'to', 'in', 'on', 'at', 'by', 'from', 'as', 'but', 'nor', 'per', 'via']);

export function analyseTitle(title) {
  const issues = [];
  if (!title) return [{ code: 'A0', level: 'P0', msg: '标题缺失' }];
  const len = title.length;

  if (len > TITLE_MAX) issues.push({ code: 'A1', level: 'P0', msg: `标题 ${len} 字符（含空格），超出亚马逊 75 字符上限 ${len - TITLE_MAX} 字符` });
  else issues.push({ code: 'A1', level: 'OK', msg: `标题 ${len} 字符，符合 ≤75 字符要求` });

  const firstWord = title.split(/\s+/)[0];
  issues.push({ code: 'A2', level: 'INFO', msg: `标题首词为 "${firstWord}"（亚马逊规范结构：品牌 + 核心品类词 + 基础规格/适配型号）` });

  const promo = PROMO.filter((w) => title.toLowerCase().includes(w));
  if (promo.length) issues.push({ code: 'A3', level: 'P1', msg: `标题含促销/主观词：${promo.join(', ')}` });

  const caps = (title.match(/\b[A-Z]{3,}\b/g) || []).filter((w) => !ALLCAPS_OK.has(w));
  if (caps.length) issues.push({ code: 'A4', level: 'P2', msg: `标题含非常规全大写词：${[...new Set(caps)].join(', ')}` });

  const words = title.toLowerCase().match(/[a-z]{3,}/g) || [];
  const freq = {};
  for (const w of words) freq[w] = (freq[w] || 0) + 1;
  const dup = Object.entries(freq).filter(([, n]) => n > 1);
  if (dup.length) issues.push({ code: 'A5', level: 'P2', msg: `标题重复词：${dup.map(([w, n]) => `${w}×${n}`).join(', ')}` });

  const bad = TITLE_BANNED_CHARS.filter((c) => title.includes(c));
  if (bad.length) issues.push({ code: 'A6', level: 'P1', msg: `标题含亚马逊禁用字符：${bad.join(' ')}` });

  const rawWords = title.split(/\s+/).filter((w) => /[A-Za-z]/.test(w));
  const lowerStart = rawWords.filter((w) => {
    const clean = w.replace(/[^A-Za-z'-]/g, '');
    if (!clean || SMALL_WORDS.has(clean.toLowerCase())) return false;
    return /^[a-z]/.test(clean);
  });
  if (lowerStart.length) issues.push({ code: 'A7', level: 'P3', msg: `标题实义词首字母未大写：${lowerStart.join(', ')}` });

  const numWords = title.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\b/gi);
  if (numWords) issues.push({ code: 'A8', level: 'P3', msg: `标题用英文单词表示数字（亚马逊建议用阿拉伯数字）：${[...new Set(numWords)].join(', ')}` });

  const contact = CONTACT.filter((w) => title.toLowerCase().includes(w));
  if (contact.length) issues.push({ code: 'A9', level: 'P0', msg: `标题含联系方式/网址：${contact.join(', ')}` });

  return issues;
}

export function analyseHighlights(hl) {
  const issues = [];
  if (!hl) {
    return [{
      code: 'B0', level: 'P0',
      msg: '未设置「商品亮点 / Item Highlights」字段。亚马逊自 2026-07-27 起将原标题拆分为 标题(≤75 字符) + 商品亮点(≤125 字符) 两个独立字段；缺失该字段会导致卖点无法被独立索引收录，并可能被系统自动改写。',
    }];
  }
  if (hl.length > HIGHLIGHT_MAX) issues.push({ code: 'B1', level: 'P0', msg: `亮点 ${hl.length} 字符，超出 125 字符上限 ${hl.length - HIGHLIGHT_MAX} 字符` });
  else issues.push({ code: 'B1', level: 'OK', msg: `亮点 ${hl.length} 字符，符合 ≤125 字符要求` });
  if (hl.includes(';') || hl.includes('；')) issues.push({ code: 'B2', level: 'P1', msg: '亮点中使用分号；亚马逊亮点规范以逗号分隔，应改用逗号' });
  const promo = PROMO.filter((w) => hl.toLowerCase().includes(w));
  if (promo.length) issues.push({ code: 'B3', level: 'P1', msg: `亮点含促销/主观词：${promo.join(', ')}` });
  return issues;
}

export function analyseBullets(bullets) {
  const issues = [];
  if (!bullets || !bullets.length) return [{ code: 'C0', level: 'P0', msg: '五点描述缺失' }];
  if (bullets.length > 5) issues.push({ code: 'C1', level: 'P1', msg: `五点描述共 ${bullets.length} 条，超出亚马逊 5 条上限` });
  else issues.push({ code: 'C1', level: 'OK', msg: `五点描述 ${bullets.length} 条` });

  const joined = bullets.join('\n');
  const lower = joined.toLowerCase();
  const promo = PROMO.filter((w) => lower.includes(w));
  if (promo.length) issues.push({ code: 'C2', level: 'P1', msg: `五点含促销/保证类词：${promo.join(', ')}` });
  const contact = CONTACT.filter((w) => lower.includes(w));
  if (contact.length) issues.push({ code: 'C3', level: 'P0', msg: `五点含联系方式/网址：${contact.join(', ')}` });
  const med = MEDICAL.filter((w) => new RegExp(`\\b${w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(joined));
  if (med.length) issues.push({ code: 'C5', level: 'P0', msg: `五点含医疗/疗效声明：${med.join(', ')}` });
  const inc = REVIEW_INCENTIVE.filter((w) => lower.includes(w));
  if (inc.length) issues.push({ code: 'C4', level: 'P0', msg: `五点含诱导评价类表述：${inc.join(', ')}` });
  return issues;
}

export function analyseCompatibility(label, text) {
  const issues = [];
  if (!text) return issues;
  // a third-party brand appearing with NO "compatible with"/"for" framing right next to it is the risk
  if (/\bfor\b/i.test(text) && !/compatible with/i.test(text)) {
    issues.push({ code: 'D1', level: 'P2', msg: `${label}：兼容性使用了 "for"，亚马逊更规范表述为 "Compatible with"` });
  }
  if (/compatible with/i.test(text)) {
    issues.push({ code: 'D1', level: 'OK', msg: `${label}：已使用 "Compatible with" 表述适配性` });
  }
  return issues;
}

export function analyseMechanics(label, text) {
  const issues = [];
  if (!text) return issues;
  const dbl = text.match(/[^\S\n]{2,}/g);
  if (dbl) issues.push({ code: 'E1', level: 'P2', msg: `${label}：${dbl.length} 处连续多空格`, samples: dbl.slice(0, 3) });
  const sbp = text.match(/\s+[,.;:!?]/g);
  if (sbp) issues.push({ code: 'E2', level: 'P2', msg: `${label}：${sbp.length} 处标点前多余空格`, samples: sbp.slice(0, 3) });
  const msp = text.match(/[a-z][,;:][A-Za-z]/g);
  if (msp) issues.push({ code: 'E3', level: 'P2', msg: `${label}：${msp.length} 处标点后缺空格`, samples: msp.slice(0, 3) });
  const dp = text.match(/[,.;:!?]{2,}/g);
  if (dp) issues.push({ code: 'E4', level: 'P2', msg: `${label}：${dp.length} 处重复标点`, samples: dp.slice(0, 3) });
  const open = (text.match(/\(/g) || []).length, close = (text.match(/\)/g) || []).length;
  if (open !== close) issues.push({ code: 'E5', level: 'P2', msg: `${label}：圆括号不配对（${open} 个 "(" / ${close} 个 ")"）` });
  const curly = text.match(/[\u2018\u2019\u201C\u201D]/g);
  if (curly) issues.push({ code: 'E6', level: 'P3', msg: `${label}：含 ${curly.length} 个弯引号/弯撇号，建议改用直引号`, samples: [...new Set(curly)] });
  const nonAscii = text.match(/[^\x00-\x7F]/g);
  if (nonAscii) issues.push({ code: 'E6b', level: 'P3', msg: `${label}：含非 ASCII 字符`, samples: [...new Set(nonAscii)].slice(0, 10) });
  return issues;
}

const COMMON_TYPOS = {
  freshn: 'freshness', recieve: 'receive', seperate: 'separate', occured: 'occurred',
  enviroment: 'environment', sucess: 'success', wich: 'which', teh: 'the',
  adress: 'address', calender: 'calendar', definately: 'definitely', accomodate: 'accommodate',
  thier: 'their', untill: 'until', similiar: 'similar', prodcut: 'product',
  protct: 'protect', durablity: 'durability',
};
export function analyseSpelling(label, text) {
  const issues = [];
  if (!text) return issues;
  const words = text.toLowerCase().match(/[a-z']+/g) || [];
  for (const [bad, good] of Object.entries(COMMON_TYPOS)) {
    if (words.includes(bad)) issues.push({ code: 'E8', level: 'P0', msg: `${label}：拼写错误 "${bad}" 应为 "${good}"` });
  }
  return issues;
}

export function analyseAsin(json) {
  return {
    asin: json.asin,
    title: json.title,
    titleLen: json.titleLen,
    itemHighlights: json.itemHighlights || null,
    itemHighlightsLen: json.itemHighlightsLen || 0,
    hasItemHighlights: !!json.hasItemHighlights,
    bullets: json.bullets || [],
    title_issues: analyseTitle(json.title),
    highlights_issues: analyseHighlights(json.itemHighlights),
    bullets_issues: analyseBullets(json.bullets),
    compatibility: [
      ...analyseCompatibility('标题', json.title),
      ...analyseCompatibility('五点描述', (json.bullets || []).join('\n')),
    ],
    mechanics: [
      ...analyseMechanics('标题', json.title),
      ...analyseMechanics('亮点', json.itemHighlights),
      ...analyseMechanics('五点描述', (json.bullets || []).join('\n')),
    ],
    spelling: [
      ...analyseSpelling('标题', json.title),
      ...analyseSpelling('亮点', json.itemHighlights),
      ...analyseSpelling('五点描述', (json.bullets || []).join('\n')),
    ],
  };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const RAW = 'E:/listing_exam/data/raw';
  const OUT = 'E:/listing_exam/data/derived/text-analysis.json';
  // 支持 `node text-analysis.mjs ASIN...`；不传参数则处理 data/raw 下全部
  const argAsins = process.argv.slice(2).filter((a) => /^B0[A-Z0-9]{8}$/.test(a));
  const ASINS = argAsins.length
    ? argAsins
    : readdirSync(RAW).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));

  // 合并写入：不能覆盖已有 ASIN 的结果（build-reports 依赖全量）
  let all = {};
  try { all = JSON.parse(readFileSync(OUT, 'utf8')); } catch {}

  for (const a of ASINS) {
    let j;
    try { j = JSON.parse(readFileSync(`${RAW}/${a}.json`, 'utf8')); } catch { console.log(`${a}: 缺少 data/raw/${a}.json，跳过`); continue; }
    all[a] = analyseAsin(j);
    const r = all[a];
    console.log(`\n=================== ${a} ===================`);
    console.log(`标题 ${r.titleLen} 字符 | 亮点: ${r.hasItemHighlights ? r.itemHighlightsLen + ' 字符' : '缺失'} | 五点 ${r.bullets.length} 条`);
    for (const i of r.title_issues) console.log(`  [${i.code}] ${i.level.padEnd(4)} ${i.msg}`);
    for (const i of r.highlights_issues) console.log(`  [${i.code}] ${i.level.padEnd(4)} ${i.msg}`);
    for (const i of r.bullets_issues) console.log(`  [${i.code}] ${i.level.padEnd(4)} ${i.msg}`);
    for (const i of r.compatibility) console.log(`  [${i.code}] ${i.level.padEnd(4)} ${i.msg}`);
    for (const i of [...r.mechanics, ...r.spelling]) console.log(`  [${i.code}] ${i.level.padEnd(4)} ${i.msg}${i.samples ? ' -> ' + JSON.stringify(i.samples) : ''}`);
  }
  mkdirSync('E:/listing_exam/data/derived', { recursive: true });
  writeFileSync(OUT, JSON.stringify(all, null, 2), 'utf8');
  console.log(`\nwritten ${OUT}（共 ${Object.keys(all).length} 个 ASIN）`);
}
