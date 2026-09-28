import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));

const FIX = {
  B0EX0001: [
    ['图内拼写错误：副图 PT03 与 A+ 图 02 "Protable"（应为 "Portable"）；扣分统一见「三、AMZ 合规度」，本维度不重复计（此前记录中的另一条拼写疑似项经放大复核已作废）',
      '副图 PT03 / A+ 图 02：检出图内拼写错误 "Protable"（应为 "Portable"）；扣分统一见「三、AMZ 合规度」，本维度不重复计（此前记录中的另一条拼写疑似项经放大复核已作废）'],
    ['A+ 图 07/08 展示的是 Yoto 播放器保护套与背带，不在标题售卖清单内（货不对板风险，扣分见「五、视觉准确度」）',
      'A+ 图 07 / A+ 图 08：展示的是 Yoto 播放器保护套与背带，不在标题售卖清单内，货不对板风险（已计入本维度扣分）'],
  ],
  B0EX0004: [
    ['主图出现的 Spectra 吸奶器主机是**适配对象本体**（我们售卖的是它的支架），按规则豁免不扣分；仅提示主体辨识度可再提高',
      '主图 MAIN：出现的 Spectra 吸奶器主机是**适配对象本体**（我们售卖的是它的支架），按规则豁免不扣分；仅提示主体辨识度可再提高'],
  ],
  B0EX0003: [
    ['副图 PT03 / A+ 图 05：检出图内拼写错误 "freshn"（应为 "freshness"），扣分统一见「三、AMZ 合规度」，本维度不重复计',
      '副图 PT03 / A+ 图 05：检出图内拼写错误 "freshn"（应为 "freshness"）；扣分统一见「三、AMZ 合规度」，本维度不重复计'],
  ],
  B0EX0002: [
    ['副图 PT02：检出图内拼写错误 "Generous Compacity"（应为 "Generous Capacity"），扣分统一见「三、AMZ 合规度」，本维度不重复计',
      '副图 PT02：检出图内拼写错误 "Generous Compacity"（应为 "Generous Capacity"）；扣分统一见「三、AMZ 合规度」，本维度不重复计'],
  ],
};

let n = 0;
for (const [asin, pairs] of Object.entries(FIX)) {
  v[asin].notes = (v[asin].notes || []).map((x) => {
    for (const [a, b] of pairs) if (x === a) { n++; return b; }
    return x;
  });
}
writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('修订', n, '条');
for (const asin of Object.keys(FIX)) {
  for (const x of v[asin].notes) if (/拼写|Spectra|货不对板/.test(x)) console.log(` ${asin}: ${x.slice(0, 70)}...`);
}
