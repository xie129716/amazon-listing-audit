/**
 * 把子代理产出的 vf-<ASIN>.json 合并进 data/derived/visual-findings.json。
 *
 * 用法：node scripts/merge-visual-findings.mjs [ASIN...]
 *
 * 设计要点：
 *  - 子代理各自写独立文件，避免并发写同一个 JSON；
 *  - 合并前做基本字段校验，缺字段的按空数组补齐；
 *  - 记录来源与合并时间，便于回溯。
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const ROOT = 'E:/listing_exam';
const P = `${ROOT}/data/derived/visual-findings.json`;
const vf = JSON.parse(readFileSync(P, 'utf8'));

const DEFAULT = ['B0FZKG6V1K', 'B0FJXZ25GY', 'B0FDW97HZZ', 'B0DB7J5C47', 'B0G42HD23D'];
const ASINS = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;

const ARRAY_FIELDS = [
  'mainImageThirdPartyLogo', 'thirdPartyUnrelated', 'adaptedObjectBrands', 'borrowedEndorsement',
  'sensitive', 'propDrugNameRisk', 'disparagementAbnormal', 'spellingInImage', 'absoluteClaims',
  'materialClaims', 'brandVariants', 'countColorTension', 'unreadableProps',
  'misleadingContradiction', 'imageSpelling', 'unshownClaims', 'notes', 'remainingIssues',
];

let merged = 0;
for (const asin of ASINS) {
  const f = `${ROOT}/data/derived/vf-${asin}.json`;
  if (!existsSync(f)) { console.log(`${asin}: 缺少 ${f}，跳过`); continue; }
  let src;
  try { src = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { console.log(`${asin}: JSON 解析失败 - ${e.message}`); continue; }
  if (src.asin && src.asin !== asin) { console.log(`${asin}: 文件里的 asin 是 ${src.asin}，跳过以防错配`); continue; }

  // 保留已有的 creatorVideo（v9 视频统计），其余用子代理结果覆盖
  const keepVideo = vf[asin]?.creatorVideo;
  const entry = { ...src };
  delete entry.asin;
  for (const k of ARRAY_FIELDS) if (!Array.isArray(entry[k])) entry[k] = [];
  if (!entry.aiToolWatermark || typeof entry.aiToolWatermark !== 'object') entry.aiToolWatermark = { found: false };
  if (typeof entry.mainImageWhiteBackground !== 'boolean') entry.mainImageWhiteBackground = true;
  if (typeof entry.cartOk !== 'boolean') entry.cartOk = true;
  if (keepVideo) entry.creatorVideo = keepVideo;
  entry._source = 'subagent-visual-vf-json';
  entry._mergedAt = new Date().toISOString();

  vf[asin] = entry;
  merged++;
  const risky = ['mainImageThirdPartyLogo', 'thirdPartyUnrelated', 'sensitive', 'propDrugNameRisk', 'spellingInImage', 'misleadingContradiction', 'absoluteClaims']
    .map((k) => `${k}=${entry[k].length}`).join(' ');
  console.log(`${asin}: 已合并 | ${risky} | notes=${entry.notes.length} remaining=${entry.remainingIssues.length}`);
}

writeFileSync(P, JSON.stringify(vf, null, 2), 'utf8');
console.log(`\n合并 ${merged} 个 ASIN；visual-findings.json 现共 ${Object.keys(vf).filter((k) => !k.startsWith('_')).length} 个 ASIN`);
