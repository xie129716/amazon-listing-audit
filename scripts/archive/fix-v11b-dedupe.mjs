/** 收尾去重：删掉已被合并条目覆盖的重复项。 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/vf-B0EX0001.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));

const DROP = [
  /A\+ 图 28 \/ A\+ 图 29/,                     // 已被合并的「非本商品形态」覆盖
  /Keeps your Spam fresh longer/,               // 已被 P1「自制评价拼图」覆盖
];
const seenWhere = new Map();
v.remainingIssues = v.remainingIssues.filter((r) => {
  const w = String(r.where || '');
  if (DROP.some((re) => re.test(w) && /非本商品|无关|评价/.test(String(r.msg)))) return false;
  // 同一 where 的重复提示只留一条
  const key = r.level + '|' + w;
  if (seenWhere.has(key) && String(r.msg).length <= seenWhere.get(key)) return false;
  seenWhere.set(key, String(r.msg).length);
  return true;
});
// 二次去重
const seen = new Set();
v.remainingIssues = v.remainingIssues.filter((r) => {
  const k = r.level + '|' + String(r.msg).slice(0, 60);
  if (seen.has(k)) return false; seen.add(k); return true;
});

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('剩余问题清单 ' + v.remainingIssues.length + ' 条：');
for (const r of v.remainingIssues) console.log('  [' + r.level + '] ' + (r.where || '') + ' :: ' + String(r.msg).slice(0, 90));
