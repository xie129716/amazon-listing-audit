import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));

// ============================================================================
// 调整 2：视频 —— 实测「主图区标注总数」与「卖家自建视频数」，
//         红人/用户视频数 = 总数 − 卖家自建数（Amazon 把红人视频并入 #videoCount）
// ============================================================================
const VIDEO = {
  B0EX0001: { total: 6, seller: 1, creator: 5 },
  B0EX0005: { total: 4, seller: 1, creator: 3 },
  B0EX0004: { total: 5, seller: 1, creator: 4 },
  B0EX0003: { total: 7, seller: 1, creator: 6 },
  B0EX0006: { total: 1, seller: 1, creator: 0 },
  B0EX0002: { total: 7, seller: 1, creator: 6 },
};
for (const [asin, c] of Object.entries(VIDEO)) {
  if (v[asin]) v[asin].creatorVideo = { total: c.total, sellerCount: c.seller, creatorCount: c.creator };
}

// ============================================================================
// 调整 4：图文矛盾进一步从宽 —— 撤销 B0EX0003 的两条（属「宣称多于演示」，
//         非直接矛盾），仅保留「直接相反」型（如宣称不漏却展示漏水）
// ============================================================================
if (v.B0EX0003) {
  const removed = v.B0EX0003.misleadingContradiction || [];
  v.B0EX0003.unshownClaims = [...(v.B0EX0003.unshownClaims || []), ...removed.map((x) => ({ msg: x.msg + '（按 v6 从宽：属宣称多于演示，非直接矛盾，仅提醒）' }))];
  v.B0EX0003.misleadingContradiction = [];
}

// ============================================================================
// 调整 3：品牌白名单加严 —— 本 listing 只能出现「本店铺自有品牌」；
//         出现本公司其他店铺品牌，也会被亚马逊判定品牌不一致并产生绩效警告。
// ============================================================================
const STORE_BRAND = {
  'BRAND_A-US': 'BRAND_A', 'BRAND_B-US': 'BRAND_B', 'BRAND_C-US': 'BRAND_C',
  'BRAND_D-US': 'BRAND_D', 'STORE_E': 'LAWNFUL', 'BRAND_F-US': 'BRAND_F', 'BRAND_G-US': 'BRAND_G',
};
v._storeBrandMap = STORE_BRAND;
v._brandRuleNote = '品牌判定：图片/文案中仅「本店铺自有品牌」为豁免项；出现本公司其他店铺品牌（如 KC 店铺出现 FT 品牌）同样视为品牌不一致，会触发亚马逊绩效警告，按 −20 计。';

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('已写入：');
for (const [a, e] of Object.entries(v)) {
  if (a.startsWith('_')) continue;
  console.log(` ${a}: 视频 总${e.creatorVideo?.total}/卖家${e.creatorVideo?.sellerCount}/红人${e.creatorVideo?.creatorCount} | 误导矛盾=${(e.misleadingContradiction || []).length}`);
}
