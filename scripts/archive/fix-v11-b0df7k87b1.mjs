/** B0DF7K87B1 合并后的最终校准：同因合并 + 去重。 */
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'E:/listing_exam/data/derived/vf-B0DF7K87B1.json';
const v = JSON.parse(readFileSync(P, 'utf8'));

/* 1. 「A+ 展示非本商品形态（长方形/马克杯/烤盘盖）」同一根因 → 合并为一条 */
v.misleadingContradiction = [{
  where: 'A+ 图 04 / A+ 图 21 / A+ 图 22 / A+ 图 23 / A+ 图 24 / A+ 图 28 / A+ 图 29',
  msg: 'A+ 多张图展示的不是本商品：本 ASIN 卖的是 **3.0 英寸圆形**罐盖，但 A+ 图 04、21、22 展示的是配 SPAM 方罐的**长方形**盖，'
    + 'A+ 图 23、24 是铝箔长方形餐盒的矩形盖，A+ 图 28 是马克杯盖，A+ 图 29 是长方烤盘盖，且画面均无「其它规格」字样标注。'
    + '买家易误以为收到长方形盖，建议统一替换为本商品圆盖实拍，或明确标注「其它规格单独售卖」。',
}];

/* 2. 自制「五星+顾客评价」拼图：图片政策风险，单列（不参与扣分分档，但必须整改） */
v.remainingIssues = (v.remainingIssues || []).filter((r) => !/A\+ 图 30 \/ A\+ 图 15|A\+ 图 15/.test(String(r.msg || '')) || !/logo/.test(String(r.msg || '')));
v.remainingIssues.push({
  level: 'P1',
  where: 'A+ 图 30',
  msg: '该图为卖家自制的「五星 + 三条顾客评价」拼图，其中一条评价（"Keeps your Spam fresh longer…"）配的是方盖 SKU 的图，与本 ASIN 不是同一商品；'
    + '且自制评价式素材一般不被图片政策接受，建议整张替换为真实使用场景图。',
});

/* 3. remainingIssues 同因合并 + 去重：把 A+ 04/21/22/23/24/28/29 的条目并成一条 */
const merged = [];
let mergedShape = false;
for (const r of v.remainingIssues) {
  const m = String(r.msg || '');
  if (/A\+ 图 04|A\+ 图 21|A\+ 图 23|A\+ 图 28/.test(String(r.where || '')) && /非本商品|形态|替换/.test(m)) {
    if (!mergedShape) {
      mergedShape = true;
      merged.push({ level: 'P1', where: 'A+ 图 04 / 21 / 22 / 23 / 24 / 28 / 29', msg: 'A+ 展示的是长方形盖、马克杯盖、长方烤盘盖等**非本商品**形态（本商品为 3.0 寸圆盖），须替换为圆盖实拍或明确标注其它规格' });
    }
    continue;
  }
  merged.push(r);
}
// 去重
const seen = new Set();
v.remainingIssues = merged.filter((r) => {
  const k = r.level + '|' + (r.where || '') + '|' + String(r.msg).slice(0, 40);
  if (seen.has(k)) return false;
  seen.add(k); return true;
});
// A+ 图 30 的提示与 P1 合并
v.remainingIssues = v.remainingIssues.filter((r) => !(r.level === '提示' && /A\+ 图 30/.test(r.where || '') && /句号前多一个空格/.test(String(r.msg))));

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('B0DF7K87B1 最终校准：');
console.log('  图文矛盾:', v.misleadingContradiction.length, '（合并为 1 条，覆盖 7 张图）');
console.log('  问题清单:', v.remainingIssues.length);
for (const r of v.remainingIssues) console.log('   [' + r.level + '] ' + (r.where || '') + ' :: ' + String(r.msg).slice(0, 95));
