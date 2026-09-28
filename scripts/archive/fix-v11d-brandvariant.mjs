import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const P = `${ROOT}/data/derived/visual-findings.json`;
const vf = JSON.parse(readFileSync(P, 'utf8'));
const e = vf['B0EX0001'];
// 两条 brandVariants 是同一根因（BRAND_D vs BRAND_D）→ 合并为一条
e.brandVariants = [{
  where: 'A+ 图 05 / A+ 图 14 / A+ 图 15',
  msg: '同一 listing 内品牌出现两种写法：A+ 图 05 图片文字 "BRAND_D 3 Inch Silicone Lids"、A+ 图 14 左上角 logo 写作 "BRAND_D"，'
    + 'A+ 图 15 logo 为小写连体字（放大后仅能辨 "ureKra"），而标题与品牌栏为全大写 "BRAND_D"。建议统一为 BRAND_D。',
}];
writeFileSync(P, JSON.stringify(vf, null, 2), 'utf8');
console.log('B0EX0001 brandVariants 合并为 1 条');
