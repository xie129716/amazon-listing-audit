import { readFileSync, writeFileSync } from 'node:fs';
const P = 'E:/listing_exam/data/derived/visual-findings.json';
const vf = JSON.parse(readFileSync(P, 'utf8'));
let n = 0;
const fix = (s) => String(s).replace(/属道具本体出厂自带的包装印刷文字/g, () => { n++; return '盒面文字是包装本身印刷的内容，无需抹除'; });
const walk = (v) => {
  if (typeof v === 'string') return fix(v);
  if (Array.isArray(v)) return v.map(walk);
  if (v && typeof v === 'object') { const o = {}; for (const [k, x] of Object.entries(v)) o[k] = k === 'creatorVideo' ? x : walk(x); return o; }
  return v;
};
for (const a of Object.keys(vf)) { const e = vf[a]; if (!e || typeof e !== 'object' || a.startsWith('_')) continue; for (const k of Object.keys(e)) if (k !== 'creatorVideo') e[k] = walk(e[k]); }
writeFileSync(P, JSON.stringify(vf, null, 2), 'utf8');
console.log('替换', n, '处');
