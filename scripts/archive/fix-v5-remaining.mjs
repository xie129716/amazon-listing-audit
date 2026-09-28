import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));

// ============================================================================
// 修正 1（用户指正）：B0EX0005 售卖的是「肽类/胰岛素小瓶的收纳盒」，
// 主图/副图以 Insulin 示意属【用途示意】，A+ 以 peptide 定位亦属同一产品的
// 不同使用场景 —— 二者并非定位冲突，撤销该条图文矛盾扣分。
// 保留：主图示意标签出现处方药名「Insulin」这一独立风险（品牌/药品关联）。
// ============================================================================
const e3 = v.B0EX0005;
e3.misleadingContradiction = [];                     // 撤销「定位冲突」扣分
e3.productPositioningNote = '本 ASIN 售卖的是「3ml 肽类/胰岛素小瓶收纳盒」。主图与副图以 Insulin 小瓶示意、A+ 以 peptide 场景定位，均属**同一产品的不同使用场景**，不构成定位冲突。仅保留「主图示意标签出现处方药名 Insulin」这一独立风险项。';
// 主图上出现处方药名 → 归入合规度（品牌/药品关联），而非图文矛盾
e3.absoluteClaims = e3.absoluteClaims || [];
e3.propDrugNameRisk = [
  { msg: '主图 MAIN 与副图 PT01 的示意小瓶手写标签为 "Insulin Solu… / 3mL"，在亚马逊主图上直接出现处方药名，属医疗/药品关联风险，建议改为无文字中性标签' },
];

// ============================================================================
// 修正 2（用户要求）：把「v5 后仍存在的实质问题」固化为报告章节，
// 每条都带【图片定位】与【等级】，便于运营直接执行。
// ============================================================================
const remaining = {
  B0EX0001: [
    { level: 'P1', where: 'A+ 图 06', msg: '借用第三方 Bar Keepers Friend 罐体上的 "VOTED PRODUCT OF THE YEAR / HEALTHCARE PROFESSIONAL" 获奖徽章，买家易误认为该背书属于本商品' },
    { level: 'P0', where: 'A+ 图 06', msg: '图内英文拼写错误："PROFESSINAL" 应为 "PROFESSIONAL"' },
    { level: '提示', where: 'A+ 图 01', msg: '卖家 logo "BRAND_A" 的字母 S 呈镜向/反向，建议重新导出 logo' },
    { level: '提示', where: '全部图片', msg: '无红人合作视频（视频模块 6 条均为品牌视频与 Customer Review 用户测评）' },
    { level: '提示', where: '标题/亮点', msg: '未拆分「标题+亮点」两段式，建议按新规补建（见上文建议标题与亮点）' },
  ],
  B0EX0005: [
    { level: 'P0', where: 'A+ 图 03', msg: '真人女性自行向裸露腹部注射针剂（针头刺入、注射器含琥珀色液体）的写实画面，且全 listing 无「非医疗用途/不用于注射」免责声明，属健康类目高敏感内容，建议替换为收纳场景实拍' },
    { level: 'P1', where: '主图 MAIN、副图 PT01', msg: '示意小瓶手写标签出现处方药名 "Insulin"，建议改为无文字中性标签' },
    { level: '提示', where: 'A+ 图 01 / A+ 图 04', msg: '自有品牌写法不一致："BRAND_B" vs "BRAND_B"' },
    { level: '提示', where: '全部图片', msg: '无红人合作视频（视频模块 4 条均为品牌视频与 Customer Review 用户测评）' },
    { level: '提示', where: '标题/亮点', msg: '未拆分「标题+亮点」两段式，建议按新规补建' },
  ],
  B0EX0004: [
    { level: 'P2', where: 'A+ 图 05', msg: '使用 "100% Airtight Design" 绝对化表述，画面仅一只倒置罐体，无法证明 100% 密封' },
    { level: 'P0', where: '副图 PT03、A+ 图 05', msg: '图内英文拼写错误："Ensure long-lasting food freshn"（freshn 应为 freshness）' },
    { level: 'P1', where: '副图 PT05', msg: '三个宣称与配图疑似错位：餐具沥水架照片配 "FREEZER & FRIDGE SAFE"、冰箱照片配 "MICROWAVE SAFE"、微波炉内腔照片配 "DISHWASHER SAFE"' },
    { level: 'P2', where: 'A+ 图 01 / A+ 图 02', msg: '第三方品牌名写法不一致："La Fermière" vs "La Fermiere"（漏重音符号）' },
    { level: '提示', where: '副图 PT05', msg: '冰箱内出现 M&S (Marks & Spencer) 食品包装，非商品主体上的品牌，建议虚化规避' },
    { level: '提示', where: '全部图片', msg: '无红人合作视频（视频模块 5 条均为品牌视频与 Customer Review 用户测评）' },
    { level: '提示', where: '标题/亮点', msg: '未拆分「标题+亮点」两段式，建议按新规补建' },
  ],
  B0EX0003: [
    { level: 'P0', where: '副图 PT02', msg: '图内英文拼写错误："Generous Compacity" 应为 "Generous Capacity"' },
    { level: '提示', where: '副图 PT02 / 副图 PT04', msg: '容量宣称 "3 Inserts Holds 48 Vials" 与画面实测单块插板约 21 个瓶盖不完全吻合；"Perfectly Embedded" 画面中瓶体横躺。按 v5 从宽处理，仅提醒' },
    { level: '提示', where: '副图 PT03', msg: '尺寸命名与厚度数值反向："Short Storage Insert: 1.63 inches"、"Tall Storage Insert: 0.75 inches"，建议核对命名' },
    { level: '提示', where: '副图 PT05 / A+ 图 05', msg: '对 "Others" 的贬损性对比文案本身正常，按 v4 规则不计分；建议保留但确保有实测依据' },
    { level: '提示', where: '全部图片', msg: '无红人合作视频（视频模块 7 条均为品牌视频与 Customer Review 用户测评）' },
    { level: '提示', where: '标题/亮点', msg: '未拆分「标题+亮点」两段式，建议按新规补建' },
  ],
  B0EX0006: [
    { level: 'P0', where: '数据维度', msg: '星级 3.4，为本次检查中唯一低于 4 星标准的 listing，直接影响转化与广告表现，建议优先排查差评原因' },
    { level: 'P2', where: '数据维度', msg: '评论数仅 46 条，基数偏小，星级稳定性弱' },
    { level: '提示', where: '副图 PT03', msg: '对竞品的负面描述文案本身正常，按 v4 规则不计分' },
    { level: '提示', where: '副图 PT06', msg: '"Messy vs Tidy" 上下两格为不同场景/机型，且仅一格灰度化。按 v4 规则（灰度化即视为已完成对比）不计分' },
    { level: '提示', where: '副图 PT02', msg: '英文文案混入中文顿号 "chargers、tissues"，建议改为英文逗号' },
    { level: '提示', where: '全部图片', msg: '无红人合作视频（视频模块仅 1 条 Customer Review 用户测评）' },
    { level: '提示', where: '标题/亮点', msg: '未拆分「标题+亮点」两段式，建议按新规补建' },
  ],
  B0EX0002: [
    { level: 'P0', where: '副图 PT03、A+ 图 02', msg: '图内英文拼写错误："Protable and easy access" 应为 "Portable and easy access"' },
    { level: 'P1', where: 'A+ 图 07、A+ 图 08', msg: '以 Yoto 播放器保护套 + 背带为画面主体，而标题售卖内容为「10 个卡槽 + 3 个金属环」，保护套与背带不在售卖清单内，存在货不对板风险，建议移除或明确标注不含' },
    { level: '提示', where: 'A+ 图 10', msg: '画面中卡槽数量明显多于 10（约 20 个）、金属环约 6-7 个，与标题 10 件装数量存在认知冲突（该图分辨率低，数量为估算）' },
    { level: '提示', where: '副图 PT02', msg: '步骤序号错乱（1→2→4，"3" 出现在中栏之后），并有一只无法解释的印刷数字 "8" 与 "CARS" 并列' },
    { level: '提示', where: '副图 PT04', msg: '文案称 "Steel loops"，画面所示金属环为带彩色连接头的包胶线绳，建议核对实物或调整文案' },
    { level: '提示', where: '全部图片', msg: '无红人合作视频' },
    { level: '提示', where: '标题/亮点', msg: '未拆分「标题+亮点」两段式，建议按新规补建' },
  ],
};

for (const [asin, list] of Object.entries(remaining)) {
  if (v[asin]) v[asin].remainingIssues = list;
}

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('已写入：B0EX0005 定位冲突撤销 + 处方药名风险；各 ASIN remainingIssues');
for (const [a, e] of Object.entries(v)) {
  if (a.startsWith('_')) continue;
  console.log(` ${a}: remaining=${(e.remainingIssues || []).length} | 图文矛盾=${(e.misleadingContradiction || []).length} | 药品名风险=${(e.propDrugNameRisk || []).length}`);
}
