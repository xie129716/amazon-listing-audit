/** B0DF7K87B1 人工校准（本人复核后）。 */
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'E:/listing_exam/data/derived/vf-B0DF7K87B1.json';
const v = JSON.parse(readFileSync(P, 'utf8'));

/* 1. 冰箱场景里的酒类品牌：道具本体上（非卖家叠加）→ 合并为一条、标 onProp（不作为问题，仅建议裁切）
      本人已放大复核 PT05：Heineken 绿瓶 + EFFECT Steady Blonde Ale 罐确实清晰可辨。 */
v.thirdPartyUnrelated = [{
  brand: 'Heineken / EFFECT Steady Blonde Ale',
  onProp: true,
  where: '副图 PT05 下半（冷藏场景）：右侧 Heineken 绿色啤酒瓶（瓶身 star logo 可辨）与左侧 "EFFECT / STEADY BLONDE ALE" 白色易拉罐',
  msg: '副图 PT05 冷藏场景背景出现 Heineken 啤酒瓶与 EFFECT Steady Blonde Ale 易拉罐。二者均非本品适配对象（本品是 3 英寸圆盖），'
    + '属背景道具；建议裁掉或替换为无品牌容器 —— 厨房用品图里出现酒类品牌观感也不佳。',
}];

/* 2. 图文矛盾：本人复核 A+ 图 02/03 是【圆形】盖（黄色/红色/蓝色/绿色圆盖盖在 Spaghettios 等罐上），与本商品形态一致，不是问题；
      只有 A+ 图 04 是【长方形】盖（SPAM 方罐），形态完全不符 → 保留这一条。 */
v.misleadingContradiction = [{
  where: 'A+ 图 04',
  msg: '本商品是 3.0 英寸**圆形**罐盖，但 A+ 图 04 展示的是适配 SPAM 方形午餐肉罐的**长方形**盖子（图片 alt 写明 "Rectangle Lid"）。'
    + '形状与在售商品完全不符，买家易误以为收到长方形盖，建议替换为圆盖实拍。',
}];

/* 3. 把「Fit for 清单里列了但画面没演示」的项归到「宣称多于演示」（仅提示） */
v.unshownClaims = [
  ...(v.unshownClaims || []),
  { where: '副图 PT01「Fit for」清单', msg: '清单列出 "Chef Boyardee Spaghetti and Meatballs Can 14.5 oz"，但画面只演示了 Pizza Sauce、Mini ABC\'s & 123\'s 两款 Chef Boyardee 罐，未演示该项。' },
].filter((x, i, a) => a.findIndex((y) => y.msg === x.msg) === i);

/* 4. remainingIssues 同步：A+ 02/03 降级为提示；酒类改为提示；PT06 缺图保留提示 */
v.remainingIssues = (v.remainingIssues || []).map((r) => {
  if (/A\+ 图 02 \/ A\+ 图 03/.test(r.where || '')) {
    return { level: '提示', where: 'A+ 图 02 / A+ 图 03', msg: '这两张小图为圆形多色盖（黄/红/蓝/绿）配 Spaghettios、吞拿鱼等道具罐，形态与本商品一致；仅颜色与本 ASIN 的蓝+粉不同，建议注明「其他颜色单独售卖」' };
  }
  if (/Heineken|Steady Blonde/.test(String(r.msg))) {
    return { level: '提示', where: '副图 PT05 下半', msg: '冷藏场景出现 Heineken 啤酒瓶与 EFFECT Steady Blonde Ale 易拉罐，建议裁掉或换无品牌容器（厨房用品图不宜出现酒类品牌）' };
  }
  return r;
});
v.remainingIssues = [
  ...v.remainingIssues.filter((r) => !/A\+ 图 02 \/ A\+ 图 03/.test(r.where || '') || r.level === '提示'),
  { level: '提示', where: '副图 PT06', msg: '该图位在页面上无对应图片地址（疑似视频位或隐藏图位），本批未取到图，请确认是否本该有图' },
].filter((r, i, a) => a.findIndex((y) => y.level + y.msg === r.level + r.msg) === i);

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('B0DF7K87B1 校准完成');
console.log('  thirdPartyUnrelated:', v.thirdPartyUnrelated.length, '(onProp:', v.thirdPartyUnrelated.filter((x) => x.onProp).length + ')');
console.log('  misleadingContradiction:', v.misleadingContradiction.length);
console.log('  brandVariants:', v.brandVariants.length, '| materialClaims:', v.materialClaims.length);
console.log('  remainingIssues:', v.remainingIssues.map((r) => r.level + '@' + (r.where || '')).join(' | '));
