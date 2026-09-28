/** 合并「一个大 ASIN 由两个子代理分头审查」的结果（vf-<ASIN>.json + vf-<ASIN>-b.json）。 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = 'E:/listing_exam/data/derived';
const asin = process.argv[2];
if (!asin) { console.error('usage: node merge-vf-parts.mjs ASIN'); process.exit(1); }

const a = `${ROOT}/vf-${asin}.json`;
const b = `${ROOT}/vf-${asin}-b.json`;
if (!existsSync(a) || !existsSync(b)) { console.log(`${asin}: 缺少分片文件（a=${existsSync(a)} b=${existsSync(b)}），跳过`); process.exit(0); }

const A = JSON.parse(readFileSync(a, 'utf8'));
const B = JSON.parse(readFileSync(b, 'utf8'));
const ARR = ['mainImageThirdPartyLogo', 'thirdPartyUnrelated', 'adaptedObjectBrands', 'borrowedEndorsement',
  'sensitive', 'propDrugNameRisk', 'disparagementAbnormal', 'spellingInImage', 'absoluteClaims',
  'materialClaims', 'brandVariants', 'countColorTension', 'unreadableProps', 'misleadingContradiction',
  'imageSpelling', 'unshownClaims', 'notes', 'remainingIssues'];

let added = 0;
for (const k of ARR) {
  const av = Array.isArray(A[k]) ? A[k] : [];
  const bv = Array.isArray(B[k]) ? B[k] : [];
  const seen = new Set(av.map((x) => JSON.stringify(x)));
  for (const x of bv) { const s = JSON.stringify(x); if (!seen.has(s)) { av.push(x); seen.add(s); added++; } }
  A[k] = av;
}
for (const k of ['aiToolWatermark', 'mainImageWhiteBackground', 'cartOk', 'productPositioningNote']) {
  if (A[k] === undefined || A[k] === null) A[k] = B[k];
}
writeFileSync(a, JSON.stringify(A, null, 2), 'utf8');
console.log(`${asin}: 合并分片 +${added} 条 | notes=${A.notes.length} remaining=${A.remainingIssues.length} 拼写=${A.spellingInImage.length} 图文矛盾=${A.misleadingContradiction.length}`);
