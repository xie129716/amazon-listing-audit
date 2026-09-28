import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));
const NEW = '图内拼写错误：副图 PT03 与 A+ 图 02 "Protable"（应为 "Portable"）；扣分统一见「三、AMZ 合规度」，本维度不重复计（此前记录中的另一条拼写疑似项经放大复核已作废）';
let n = 0;
v['B0EX0001'].notes = v['B0EX0001'].notes.map((x) => {
  if (/^图内拼写错误/.test(x)) { n++; return NEW; }
  return x;
});
writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('replaced', n);
console.log(v['B0EX0001'].notes.filter((x) => /拼写/.test(x)));
