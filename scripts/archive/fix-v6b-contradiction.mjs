import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));

// 调整 4（延续）：图文矛盾只保留「直接相反/放反」型，其余一律转为仅提醒。
const downgrade = {
  B0EX0001: [
    { match: /Airtight Seal Design/, note: '副图 PT02 文案 "Airtight Seal Design" 配的是「掀盖/倒置」动作瞬间，属展示角度问题，非直接矛盾' },
    { match: /No more spills/, note: 'A+ 图 05 "No more spills" 配倾倒洒粉画面，属演示场景选择问题，非直接矛盾' },
  ],
  B0EX0002: [
    { match: /Poor quality/, note: '副图 PT03 对竞品的负面描述与画面不符，但文案本身表述正常、方向未颠倒' },
    { match: /Messy vs Tidy/, note: '副图 PT06 "Messy vs Tidy" 两格场景/机型不同，按 v4「灰度化即视为已完成对比」不扣分' },
  ],
};

for (const [asin, items] of Object.entries(downgrade)) {
  const e = v[asin];
  if (!e) continue;
  const keep = [];
  for (const m of e.misleadingContradiction || []) {
    const hit = items.find((d) => d.match.test(m.msg));
    if (hit) e.unshownClaims = [...(e.unshownClaims || []), { msg: hit.note }];
    else keep.push(m);
  }
  e.misleadingContradiction = keep;
}

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('图文矛盾（误导性）最终保留：');
for (const [a, e] of Object.entries(v)) {
  if (a.startsWith('_')) continue;
  console.log(` ${a}: ${(e.misleadingContradiction || []).length} 条`);
  for (const m of e.misleadingContradiction || []) console.log('    - ' + m.msg.slice(0, 90));
}
