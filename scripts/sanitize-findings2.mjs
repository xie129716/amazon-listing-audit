/** 清掉子代理 notes 里「已计入 xxx 字段」这类内部记账式表述。 */
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'E:/listing_exam/data/derived/visual-findings.json';
const vf = JSON.parse(readFileSync(P, 'utf8'));

const FIELD = '(adaptedObjectBrands|thirdPartyUnrelated|unreadableProps|remainingIssues|brandVariants|materialClaims|spellingInImage|absoluteClaims|countColorTension|notes)';
const RE = [
  new RegExp(`[，,、；;]?\\s*已计入\\s*${FIELD}`, 'g'),
  new RegExp(`[，,、；;]?\\s*计入\\s*${FIELD}`, 'g'),
  new RegExp(`[，,、；;]?\\s*见\\s*${FIELD}`, 'g'),
  /，?\s*为道具本体出厂自带标识/g,
  /，?\s*属道具本体出厂自带标识/g,
  /，?\s*道具本体出厂自带标识/g,
];

const clean = (s) => {
  let t = String(s ?? '');
  for (const re of RE) t = t.replace(re, '');
  t = t.replace(/[，,、]\s*(?=[。；;，,、])/g, '');
  return t.replace(/^[，,、；;。\s]+/, '').replace(/[，,、；;\s]+$/, '').trim();
};
const walk = (v) => {
  if (typeof v === 'string') return clean(v);
  if (Array.isArray(v)) return v.map(walk);
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = k === 'creatorVideo' ? x : walk(x); return o; }
  return v;
};

let n = 0;
for (const asin of Object.keys(vf)) {
  const e = vf[asin];
  if (!e || typeof e !== 'object' || asin.startsWith('_')) continue;
  const before = JSON.stringify({ ...e, creatorVideo: undefined });
  for (const k of Object.keys(e)) { if (k !== 'creatorVideo') e[k] = walk(e[k]); }
  if (before !== JSON.stringify({ ...e, creatorVideo: undefined })) n++;
}
writeFileSync(P, JSON.stringify(vf, null, 2), 'utf8');
console.log('清洗 ASIN 数:', n);

const bad = /道具本体出厂自带|已计入|计入 adapted|计入 unreadable/;
let hits = 0;
const scan = (v) => { if (typeof v === 'string') { if (bad.test(v)) hits++; } else if (Array.isArray(v)) v.forEach(scan); else if (v && typeof v === 'object') Object.values(v).forEach(scan); };
Object.values(vf).forEach(scan);
console.log('残留:', hits);
