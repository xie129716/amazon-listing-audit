/**
 * 清掉 findings 文本里与「评分规则机制」有关的表述，让报告只讲诊断。
 *
 * 去掉的是这种：
 *   「（仅提示，不扣分）」「按 v10 规则豁免」「（已计入本维度扣分）」
 *   「扣分统一见「三、AMZ 合规度」，本维度不重复计」「（共 N 处…合并计一次）」
 * 保留的是诊断本身：什么图、什么内容、什么问题、建议怎么改。
 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const vf = JSON.parse(readFileSync(P, 'utf8'));

/** 规则机制类片段（会被整段删除） */
const PATTERNS = [
  /（仅提示[^）]*）/g,
  /（[^）]*不重复计[^）]*）/g,
  /（[^）]*不扣分[^）]*）/g,
  /（[^）]*已扣分[^）]*）/g,
  /（[^）]*已计入[^）]*扣分[^）]*）/g,
  /（[^）]*按\s*v?\d*\s*规则[^）]*）/g,
  /（按\s*v\d+[^）]*）/g,
  /（[^）]*v\d+\s*第\s*\d+\s*条[^）]*）/g,
  /（[^）]*v\d+\s*起[^）]*）/g,
  /（[^）]*v\d+\s*标准[^）]*）/g,
  /（[^）]*合并计一次[^）]*）/g,
  /（[^）]*与「AMZ 合规度」[^）]*）/g,
  /（此前记录中的[^）]*已作废）/g,
  /，?扣分统一见「[^」]*」[，,]?\s*本维度不重复计/g,
  /按\s*v\d+\s*(第\s*\d+\s*条)?\s*豁免/g,
  /按规则豁免/g,
  /按\s*v\d+\s*规则/g,
  /计入本维度扣分/g,
  /已计入扣分/g,
  /（\s*）/g,          // 清完全空括号
  // 裸的规则/口径引用（不在括号里的）
  /[，,、；;]?\s*按\s*v?\d+(\.\d+)?\s*「[^」]*」[^，。；]*/g,
  /[，,、；;]?\s*按\s*v?\d+(\.\d+)?\s*(第\s*\d+\s*条)?[^，。；]*/g,
  /[，,、；;]?\s*仅提示无需整改/g,
  /[，,、；;]?\s*仅提示/g,
  /[，,、；;]?\s*仅作提醒/g,
  /[，,、；;]?\s*无需整改/g,
  /[，,、；;]?\s*从宽处理/g,
  /[，,、；;]?\s*道具本体标识豁免/g,
  /[，,、；;]?\s*口径豁免/g,
  /[，,、；;]?\s*豁免不扣分/g,
  /（[^）]*豁免[^）]*）/g,
  /（属道具本体自带[^）]*）/g,
  /（[^）]*道具本体自带[^）]*）/g,
  /（[^）]*无需抹除[^）]*）/g,
];

const clean = (s) => {
  let t = String(s ?? '');
  for (const re of PATTERNS) t = t.replace(re, '');
  t = t.replace(/仅提醒不扣分|不扣分|无需扣分/g, '无需整改');
  t = t.replace(/无需整改[，,、]?\s*无需整改/g, '无需整改');
  // 收拾残留的孤立标点
  t = t.replace(/[，,、]\s*(?=[。；;，,、])/g, '');
  t = t.replace(/[；;]\s*(?=[。；;])/g, '');
  // 整串被一层多余括号包住时去掉外层括号
  if (t.startsWith('（') && t.endsWith('）')) {
    let depth = 0; let balancedWhole = true;
    for (let i = 0; i < t.length; i++) {
      if (t[i] === '（') depth++;
      else if (t[i] === '）') { depth--; if (depth === 0 && i < t.length - 1) { balancedWhole = false; break; } }
    }
    if (balancedWhole && depth === 0) t = t.slice(1, -1).trim();
  }
  return t.replace(/^[，,、；;。\s]+/, '').replace(/[，,、；;\s]+$/, '').trim();
};

const walk = (v, path) => {
  if (typeof v === 'string') return clean(v);
  if (Array.isArray(v)) return v.map((x, i) => walk(x, `${path}[${i}]`));
  if (v && typeof v === 'object') {
    const o = {};
    for (const [k, val] of Object.entries(v)) o[k] = walk(val, `${path}.${k}`);
    return o;
  }
  return v;
};

const ARRAYS = [
  'mainImageThirdPartyLogo', 'thirdPartyUnrelated', 'adaptedObjectBrands', 'borrowedEndorsement',
  'sensitive', 'propDrugNameRisk', 'disparagementAbnormal', 'spellingInImage', 'absoluteClaims',
  'materialClaims', 'brandVariants', 'countColorTension', 'unreadableProps',
  'misleadingContradiction', 'imageSpelling', 'unshownClaims', 'notes', 'remainingIssues',
];

let changed = 0;
const samples = [];
for (const [asin, e] of Object.entries(vf)) {
  if (!e || typeof e !== 'object' || asin.startsWith('_')) continue;
  // 整条清洗，但 **排除 creatorVideo**（里面的视频标题/创作者名是原始抓取数据，不能改动）
  const video = e.creatorVideo;
  const before = JSON.stringify({ ...e, creatorVideo: undefined });
  for (const k of Object.keys(e)) {
    if (k === 'creatorVideo') continue;
    e[k] = walk(e[k], `${asin}.${k}`);
  }
  const after = JSON.stringify({ ...e, creatorVideo: undefined });
  if (before !== after) {
    changed++;
    if (samples.length < 4) samples.push(`${asin}\n   - ${before.slice(0, 140)}\n   + ${after.slice(0, 140)}`);
  }
  if (video) e.creatorVideo = video;
}

writeFileSync(P, JSON.stringify(vf, null, 2), 'utf8');
console.log(`已清洗 ${changed} 个字段\n`);
for (const s of samples) console.log(s + '\n');
