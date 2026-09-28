import { readFileSync, writeFileSync } from 'node:fs';
const P = 'E:/listing_exam/data/derived/vf-B0DF7K87B1.json';
const v = JSON.parse(readFileSync(P, 'utf8'));
v.remainingIssues = v.remainingIssues.filter((r) => {
  const w = String(r.where || ''), m = String(r.msg || '');
  if (w === '副图 PT06' && /无对应图片地址/.test(m)) return false;          // 与另一条 PT06 重复
  if (w === 'A+ 图 30' && r.level === 'P2' && /Keeps your Spam/.test(m)) return false; // 已被 P1 覆盖
  return true;
});
writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('问题清单 ' + v.remainingIssues.length + ' 条');
for (const r of v.remainingIssues) console.log('  [' + r.level + '] ' + (r.where || ''));
