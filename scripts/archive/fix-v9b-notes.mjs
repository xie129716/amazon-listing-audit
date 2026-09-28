/**
 * v9 数据修订 ②：清理「逐图核查记录」里与现行规则冲突的陈旧表述
 *
 * 用户反馈：同一处拼写错误不该在「三、AMZ 合规度」与「五、视觉准确度」重复出现；
 * 顺带发现核查记录里还残留：
 *   · B0FDQMCKRM 写着 "Protoble（应为 Portable）、Alian（应为 Align）" ——
 *     这两个都是早期子代理的**误读**（图上实际是 "Protable"；"Alian" 系 "Align" 的误报），
 *     已在 v5 规则里纠正过，但这条 note 没同步。
 *   · 多条 note 仍挂着 P0/P1 标签，与 v4/v7 放宽后的实际扣分不符（主图只看白底、
 *     适配对象本体豁免、宣称多于演示只提醒等）。
 */
import { readFileSync, writeFileSync } from 'node:fs';

const P = 'E:/listing_exam/data/derived/visual-findings.json';
const vf = JSON.parse(readFileSync(P, 'utf8'));

/** 精确替换（old 必须整条 note 的完整文本） */
const REPL = {
  B0FDQMCKRM: [
    [
      '图内拼写错误 2 处：Protoble（应为 Portable）、Alian（应为 Align）',
      '图内拼写错误：副图 PT03 与 A+ 图 02 "Protable"（应为 "Portable"）；'
      + '扣分统一见「三、AMZ 合规度」，本维度不重复计（此前记录中的另一条拼写疑似项经放大复核已作废）',
    ],
    [
      '副图 PT04 绿色卡片上的粉色小猪形象疑似 Peppa Pig 角色，建议替换卡通素材规避形象版权风险',
      '副图 PT04 绿色卡片上的粉色小猪形象疑似 Peppa Pig 角色，建议替换卡通素材规避形象版权风险（仅提示，不扣分）',
    ],
    [
      'A+ 图 07/08 展示的是 Yoto 播放器保护套与背带，不在标题售卖清单内',
      'A+ 图 07/08 展示的是 Yoto 播放器保护套与背带，不在标题售卖清单内（货不对板风险，扣分见「五、视觉准确度」）',
    ],
  ],
  B0FL6X3HRW: [
    [
      '主图 MAIN：纯白底、无文字水印；但右侧两只道具罐罐身压印 LA FERMIÈRE（第三方品牌出现在主图，P0）',
      '主图 MAIN：纯白底、无文字水印，主图检查通过；右侧两只道具罐罐身压印 LA FERMIÈRE，属**适配对象本体**，按规则豁免不扣分',
    ],
    [
      '副图 PT04：对 OTHER LIDS 的负面指控无画面证据（贬损性对比，P1）',
      '副图 PT04：出现对 OTHER LIDS 的负面指控文案但无画面证据，属「宣称多于演示」，仅提醒不扣分（未构成文案颠倒型贬损对比）',
    ],
    [
      '副图 PT05：冰箱内出现 M&S 第三方食品包装（P0 背景道具）',
      '副图 PT05：冰箱内出现 M&S 第三方食品包装，属背景道具且未出现在商品主体上，仅提示不扣分',
    ],
    [
      '副图 PT03 / A+ 图 05 图内拼写错误 freshn',
      '副图 PT03 / A+ 图 05：检出图内拼写错误 "freshn"（应为 "freshness"），扣分统一见「三、AMZ 合规度」，本维度不重复计',
    ],
  ],
  B0FF8YBX8P: [
    [
      '主图 MAIN：4 宫格拼图、产品占比实测 73%、同图两种插板结构 → 主图规范不合（P1）',
      '主图 MAIN：纯白底，主图检查通过（v4 起主图只检查是否白底；4 宫格拼图、占比、道具一律不看）',
    ],
    [
      '容量宣称 48 瓶与主图实测 21 瓶不符；"Perfectly Embedded" 与瓶体横躺画面矛盾',
      '容量宣称 48 瓶与主图实测 21 瓶不符、"Perfectly Embedded" 与瓶体横躺画面存在张力，属「宣称多于演示」，仅提醒不扣分',
    ],
    [
      '副图 PT02："Generous Compacity" 拼写错误（应为 Capacity）',
      '副图 PT02：检出图内拼写错误 "Generous Compacity"（应为 "Generous Capacity"），扣分统一见「三、AMZ 合规度」，本维度不重复计',
    ],
    [
      '副图 PT03：Short/Tall 尺寸命名与厚度数值反向（Short 标注 1.63"、Tall 标注 0.75"）',
      '副图 PT03：Short/Tall 尺寸命名与厚度数值反向（Short 标注 1.63"、Tall 标注 0.75"），建议核对标注（仅提示）',
    ],
    [
      '副图 PT05 / A+ 图 05：对 "Others" 的贬损性描述无画面支撑',
      '副图 PT05 / A+ 图 05：对 "Others" 的描述无画面支撑，文案形容本身正常，仅提醒不扣分',
    ],
  ],
  B0GGNM98LD: [
    [
      '主图 MAIN：产品占比实测仅 52%，且混入整台第三方吸奶器与奶瓶等非售卖道具 → 主图规范不合（P1）',
      '主图 MAIN：纯白底，主图检查通过（v4 起主图只检查是否白底；占比偏低、含非售卖道具一律不看）',
    ],
    [
      '主图出现第三方设备 Spectra 吸奶器主机 → 主图第三方品牌（P0）',
      '主图出现的 Spectra 吸奶器主机是**适配对象本体**（我们售卖的是它的支架），按规则豁免不扣分；仅提示主体辨识度可再提高',
    ],
  ],
  B0DJQS14DS: [
    [
      '副图 PT02：文案 Airtight Seal Design 与「掀盖未密封」画面冲突',
      '副图 PT02：文案 Airtight Seal Design 配的是「掀盖/倒置」动作瞬间，属展示角度问题，非直接矛盾，仅提醒不扣分',
    ],
    [
      '副图 PT01：尺寸标注与图形自身比例不符（按图内比例内径仅约 6.4cm，标注为 7.3cm）',
      '副图 PT01：尺寸标注与图形自身比例不符（按图内比例内径约 6.4cm，标注 7.3cm），建议核对标注（仅提示）',
    ],
    [
      '副图 PT01/PT05：检出幽灵文字 "Item - 2.88"',
      '副图 PT01/PT05：检出幽灵文字 "Item - 2.88" 与淡化圆角方框图标轮廓，属生成式图像/模板渗入，建议重新导出（仅提示）',
    ],
  ],
  B0GF1Z3CFH: [
    [
      '副图 PT04 为 Before/After 对比图，标签正确（After=整齐、Before=散乱），仅左右顺序反直觉',
      '副图 PT04 为 Before/After 对比图，标签正确（After=整齐、Before=散乱），无放反，仅左右顺序反直觉（不扣分）',
    ],
  ],
};

let changed = 0;
for (const [asin, pairs] of Object.entries(REPL)) {
  const e = vf[asin];
  if (!e) continue;
  e.notes = (e.notes || []).map((n) => {
    for (const [from, to] of pairs) if (n === from) { changed++; return to; }
    return n;
  });
}
writeFileSync(P, JSON.stringify(vf, null, 2), 'utf8');
console.log(`已修订 ${changed} 条核查记录`);

// 复核：不应再出现 Alian / Protoble / 陈旧 P0 标签
for (const asin of Object.keys(REPL)) {
  for (const n of vf[asin].notes || []) {
    if (/Alian|Protoble/.test(n)) console.log(`  ⚠ ${asin} 仍含误读: ${n.slice(0, 80)}`);
  }
}
console.log('done');
