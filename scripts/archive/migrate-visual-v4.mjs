import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));

// v4 字段迁移：mainImageThirdParty -> mainImageThirdPartyLogo（只保留「本商品主体上的 logo」）
// disparagement -> disparagementAbnormal（只看文案是否颠倒/异常）
// 新增 mainImageWhiteBackground（v4 主图只查白底）
const MAIN_IMG_BRAND_LOGO = {
  // 只有品牌 logo 印在「本商品主体」上才算违规；以下均为第三方罐体/设备本体，属展示需要 → 不计
  B0EX0001: [],
  B0EX0005: [],
  B0EX0004: [],
  B0EX0003: [],
  B0EX0006: [],
  B0EX0002: [],
};
const WHITE_BG = {
  B0EX0001: true, B0EX0005: true, B0EX0004: true,
  B0EX0003: true, B0EX0006: true, B0EX0002: true,
};
// 贬损性对比：v4 只看文案是否正常/颠倒。逐条核定：
const DISPARAGEMENT_ABNORMAL = {
  // B0EX0004 PT04 对 OTHER LIDS 的四项负面描述，语句本身正常、未颠倒 → 不计
  B0EX0004: [],
  // B0EX0003 对 Others 的描述语句正常 → 不计
  B0EX0003: [],
  // B0EX0006 PT03 对竞品的四项描述语句正常、方向未颠倒 → 不计
  B0EX0006: [],
};

for (const [asin, e] of Object.entries(v)) {
  if (asin.startsWith('_')) continue;
  // 迁移主图品牌字段：老数据里的适配对象（罐体/设备）不再计为违规
  const old = e.mainImageThirdParty || [];
  e.mainImageThirdPartyLogo = MAIN_IMG_BRAND_LOGO[asin] || [];
  // 把老的适配对象类主图品牌并入「豁免展示」
  if (old.length) {
    e.adaptedObjectBrands = [...(e.adaptedObjectBrands || []),
      ...old.map((x) => ({ brand: x.brand, where: `主图展示（适配对象本体，按 v4 规则豁免）：${x.where || ''}` }))];
  }
  delete e.mainImageThirdParty;
  delete e.visualIssues;
  e.mainImageWhiteBackground = WHITE_BG[asin] ?? true;
  e.disparagementAbnormal = DISPARAGEMENT_ABNORMAL[asin] || [];
  delete e.disparagement;
  // 合并品牌写法不一致
  e.brandVariants = [...(e.internalBrandMismatch || []), ...(e.ownBrandVariants || [])];
  delete e.internalBrandMismatch;
  delete e.ownBrandVariants;
  // v4：AI 痕迹不扣分，保留字段仅用于报告陈述
}

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('visual-findings 已迁移到 v4 字段');
for (const [asin, e] of Object.entries(v)) {
  if (asin.startsWith('_')) continue;
  console.log(` ${asin}: 主图品牌logo=${e.mainImageThirdPartyLogo.length} 白底=${e.mainImageWhiteBackground} 无关品牌=${e.thirdPartyUnrelated.length} 敏感=${e.sensitive.length} 背书=${e.borrowedEndorsement.length} 拼写=${e.spellingInImage.length} 贬损异常=${e.disparagementAbnormal.length}`);
}
