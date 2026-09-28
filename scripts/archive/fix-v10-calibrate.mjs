/** 规范化后的人工校准（仅针对本轮 5 个 ASIN 的具体条目）。 */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = 'E:/listing_exam';

/* ---- B0FJXZ25GY：Del Monte 合并为一条、统一 onProp: true ---- */
{
  const f = `${ROOT}/data/derived/vf-B0FJXZ25GY.json`;
  const v = JSON.parse(readFileSync(f, 'utf8'));
  v.thirdPartyUnrelated = [{
    brand: 'Del Monte',
    onProp: true,
    where: '副图 PT06、副图 PT07、A+ 图 01：木质储物柜内的 Del Monte "Fresh Cut Leaf Spinach" 菠菜罐头（三张图同一道具）',
    msg: '第三方品牌「Del Monte」出现在背景储物柜的菠菜罐头（道具）上，罐身 "Del Monte / Quality / MADE WITH / Fresh Cut / LEAF SPINACH" 清晰可读。'
      + '该罐头与本品（酸奶罐盖）无适配关系，但属**道具本体**（不是我方商品），按 v10「道具只是用来展示」口径豁免；'
      + '建议裁切/涂抹做成零风险画面。',
  }];
  writeFileSync(f, JSON.stringify(v, null, 2), 'utf8');
  console.log('B0FJXZ25GY: Del Monte 合并为 1 条（onProp 豁免）');
}

/* ---- B0FDW97HZZ：A+07 / A+08 货不对板 合并为一条 ---- */
{
  const f = `${ROOT}/data/derived/vf-B0FDW97HZZ.json`;
  const v = JSON.parse(readFileSync(f, 'utf8'));
  v.misleadingContradiction = [{
    where: 'A+ 图 07 / A+ 图 08',
    msg: '货不对板：A+ 图 07 整张图只展示「Yoto 播放器硅胶保护套 + 挂绳」，画面里没有任何在售商品；'
      + 'A+ 图 08 又把「保护套 + 挂绳」与卡槽并列为展示主体。保护套与挂绳均不在本 listing 售卖清单内'
      + '（我们只卖 20 个卡槽 + 6 个金属环），买家易误认为随附配件。与同款 10 装 B0FDQMCKRM 的同类问题一致。',
  }];
  writeFileSync(f, JSON.stringify(v, null, 2), 'utf8');
  console.log('B0FDW97HZZ: A+07/08 合并为 1 条');
}

/* ---- B0G42HD23D：补记「标题写 Silicone / 图面写 Soft Plastic」的直接矛盾 ---- */
{
  const f = `${ROOT}/data/derived/vf-B0G42HD23D.json`;
  const v = JSON.parse(readFileSync(f, 'utf8'));
  v.misleadingContradiction = [{
    where: '副图 PT04、副图 PT05、A+ 图 03 / A+ 图 04',
    msg: '材质口径直接相反：标题写 "Silicone 3ml Vial Storage Inserts"，但副图 PT04/PT05 与 A+ 图 03 图面写的是 '
      + '"Food-grade Soft Plastic Material"、A+ 图 04 写 "Soft Plastic Material"，同一商品在文案与图面上给出了互相矛盾的材质。'
      + '（该 SKU 为 FTWPtpe 系列，实际材质为 TPE；标题的 "Silicone" 属不实宣称，风险高于图面。）建议统一口径。',
  }];
  v.remainingIssues = (v.remainingIssues || []).concat([{
    level: 'P1', where: '副图 PT04、副图 PT05、A+ 图 03 / A+ 图 04',
    msg: '标题材质与图面矛盾：标题写 Silicone，图面写 Soft Plastic / TPE，建议统一为实际材质（TPE / 软塑），避免不实材质宣称',
  }]);
  writeFileSync(f, JSON.stringify(v, null, 2), 'utf8');
  console.log('B0G42HD23D: 已补记材质口径矛盾（P1）');
}
