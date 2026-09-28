/** 为本轮 5 个 ASIN 补充「正则覆盖不到的语义类文案问题」。 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const P = `${ROOT}/data/derived/copy-extra.json`;
const ce = existsSync(P) ? JSON.parse(readFileSync(P, 'utf8')) : {};

ce.B0EX0004 = {
  copy: [
    { deduct: 10, level: 'P0', msg: '标题拼写错误："Ajustable" 应为 "Adjustable"（图面 PT01/PT02 上均写作正确的 "Adjustable"，属标题笔误）' },
    { deduct: 2, level: 'P3', msg: '五点描述第 4 条英文不地道："No Accident Spill" 建议改为 "No Accidental Spills"' },
    { deduct: 1, level: 'P3', msg: '五点描述含弯撇号 ’，建议改用直引号' },
  ],
};

ce.B0EX0003 = {
  copy: [
    { deduct: 2, level: 'P3', msg: '标题关键词堆砌：ultimate 出现 3 次、yogurt 3 次、lids 3 次、jars 2 次，信息重复' },
    { deduct: 1, level: 'P3', msg: '标题含非常规全大写词 "NOT"（在括号内 NOT Included，建议改为 Not Included）' },
    { deduct: 1, level: 'P3', msg: '标题兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' },
  ],
};

ce.B0EX0002 = {
  copy: [
    { deduct: 2, level: 'P3', msg: '标题关键词堆砌：yoto 出现 3 次、card/cards 共 4 次、for 2 次，信息重复' },
    { deduct: 1, level: 'P3', msg: '标题首词为 "20"，未以品牌开头（建议以 BRAND_F 开头）' },
  ],
};

ce.B0EX0001 = {
  copy: [
    { deduct: 1, level: 'P3', msg: '标题兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' },
    { deduct: 1, level: 'P3', msg: '五点描述含华氏/摄氏混排（℉/℃），建议统一为一种单位制' },
  ],
};

ce.B0EX0005 = {
  copy: [
    { deduct: 2, level: 'P3', msg: '标题关键词堆砌：storage 2 次、for 2 次、peptide 2 次、vials 2 次，信息重复' },
    { deduct: 3, level: 'P2', msg: '标题材质表述不实：标题写 "Silicone"，但该 SKU 为 TPE 材质（MSKU: FTWPtpe…），图面亦写 "Soft Plastic Material"，建议改为实际材质' },
  ],
};

writeFileSync(P, JSON.stringify(ce, null, 2), 'utf8');
console.log('copy-extra.json 已更新，覆盖 ASIN：', Object.keys(ce).filter((k) => !k.startsWith('_')).join(', '));
