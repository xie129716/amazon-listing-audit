/** B0EX0005 / B0EX0006 的最终校准。 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const D = `${ROOT}/data/derived`;

/* ---- B0EX0005：尼古丁袋关联是**卖家自己叠加的文案**问题，不是「背景道具上的品牌」 ---- */
{
  const f = `${D}/vf-B0EX0005.json`;
  const v = JSON.parse(readFileSync(f, 'utf8'));
  // ZYN 不是道具品牌，是卖家在图内文案里点名的第三方品牌 → 由 compliance-extra 统一记 −20，
  // 这里清空 thirdPartyUnrelated / sensitive，避免同一问题重复计分
  v.thirdPartyUnrelated = [];
  v.sensitive = [];
  // A+ 图 03 / 04 的「金属扁平收纳盒」同一根因 → 合并为一条
  if ((v.misleadingContradiction || []).length) {
    v.misleadingContradiction = [{
      where: 'A+ 图 03 / A+ 图 04',
      msg: '这两张图的主体是**金属扁平收纳盒**（盒内白色条状物），与本商品（夹在遮阳板上的圆罐收纳夹）形态完全不同，'
        + '疑为同店铺其它变体串图。买家会误以为收到金属盒，建议删除或换成本商品实拍。',
    }];
  }
  // 把「赠礼诱导」单独留成提示
  v.remainingIssues = (v.remainingIssues || []).filter((r) => !/ZYN|Zyn/.test(String(r.msg || '')) || r.level === '提示');
  v.remainingIssues = [
    ...v.remainingIssues.filter((r) => !/Special Gift|赠礼/.test(String(r.msg || ''))),
    { level: 'P1', where: '副图 PT06 / A+ 图 08', msg: '把该商品包装成「Special Gift for Your Loved One」作赠礼推荐；与尼古丁关联品类叠加会放大合规风险，建议去掉赠礼属性' },
    { level: 'P0', where: '标题 + 副图 PT01/PT02/PT05 + A+ 图 05', msg: '全链路点名 ZYN（尼古丁袋）品牌：标题 2 处、图内叠加文案 4 处（Perfect fit for ZYN Can / Premium Zyn Clip Holder / Easy to take out Zyn / Easily grab your ZYN can / Smart Storage for ZYN）。亚马逊限制烟草/尼古丁类商品及其配件，建议改为中性表述（small round tins / your tin），并从文案到图片全面去 ZYN 化' },
  ].filter((r, i, a) => a.findIndex((y) => y.level + y.msg === r.level + r.msg) === i);
  writeFileSync(f, JSON.stringify(v, null, 2), 'utf8');
  console.log('B0EX0005: 第三方/敏感已清空（交由 compliance-extra 统一计 −20）；图文矛盾合并为 1 条');
}

/* ---- B0EX0006：笔记本上的 Apple 标志属生活场景道具 → 不作为问题，仅建议裁切 ---- */
{
  const f = `${D}/vf-B0EX0006.json`;
  const v = JSON.parse(readFileSync(f, 'utf8'));
  v.thirdPartyUnrelated = (v.thirdPartyUnrelated || []).map((m) => ({ ...m, onProp: true }));
  v.remainingIssues = (v.remainingIssues || []).map((r) => (/Apple/i.test(String(r.msg || '')) ? { ...r, level: '提示' } : r));
  writeFileSync(f, JSON.stringify(v, null, 2), 'utf8');
  console.log('B0EX0006: Apple 标志归为道具本体（仅提示，不扣分）');
}

/* ---- B0EX0001 / B0EX0002 / B0EX0004 / B0EX0003：竞品对比属正常负面描述，只留提示 ---- */
for (const asin of ['B0EX0001', 'B0EX0002', 'B0EX0004', 'B0EX0003']) {
  const f = `${D}/vf-${asin}.json`;
  const v = JSON.parse(readFileSync(f, 'utf8'));
  if ((v.disparagementAbnormal || []).length) {
    v.unshownClaims = [...(v.unshownClaims || []), ...v.disparagementAbnormal.map((m) => ({ ...m, msg: `竞品对比栏：${m.msg}（对无品牌通用竞品的负面描述，建议中性化）` }))];
    v.disparagementAbnormal = [];
    console.log(`${asin}: 竞品对比由扣分项改为提示`);
  }
}
console.log('done');
