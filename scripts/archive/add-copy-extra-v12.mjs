/** 行 16–25 的语义类文案问题补充（正则覆盖不到的部分）。 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const P = `${ROOT}/data/derived/copy-extra.json`;
const ce = existsSync(P) ? JSON.parse(readFileSync(P, 'utf8')) : {};

const LC = (unit) => ({ deduct: 1, level: 'P3', msg: `标题中单位/连写词未按规范大写：${unit}，建议统一为数字+大写单位（如 12 Oz / 4 Oz）` });
const CURLY = (n) => ({ deduct: 1, level: 'P3', msg: `五点描述含 ${n} 个弯撇号 ’ 或装饰性特殊字符，建议改用直引号与常规字符` });

ce.B0EX0005 = { copy: [LC('oz、21oz)、14oz)'), CURLY(1), { deduct: 1, level: 'P3', msg: '五点描述兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' }] };
ce.B0EX0006 = { copy: [CURLY(1), { deduct: 1, level: 'P3', msg: '标题与五点兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' }] };
ce.B0EX0001 = { copy: [{ deduct: 1, level: 'P3', msg: '标题中 "not" 未按规范首字母大写（(Container not Included)），建议改为 Not' }, { deduct: 1, level: 'P3', msg: '标题兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' }] };
ce.B0EX0004 = { copy: [{ deduct: 1, level: 'P3', msg: '标题中 "not" 未按规范首字母大写（(Container not Included)），建议改为 Not' }, { deduct: 1, level: 'P3', msg: '标题兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' }] };
ce.B0EX0009 = { copy: [CURLY(2), { deduct: 2, level: 'P2', msg: '标题关键词堆砌严重：zyn 3 次、for 4 次、car/visor/holder/clip 各 2 次' }] };
ce.B0EX0007 = { copy: [{ deduct: 1, level: 'P3', msg: '五点描述兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' }] };
ce.B0EX0002 = { copy: [{ deduct: 1, level: 'P3', msg: '标题中 "not" 未按规范首字母大写（(Container not Included)），建议改为 Not' }, { deduct: 1, level: 'P3', msg: '标题与五点兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' }] };
ce.B0EX0008 = { copy: [LC('4oz'), CURLY(1), { deduct: 1, level: 'P3', msg: '标题与五点兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' }] };
ce.B0EX0010 = { copy: [{ deduct: 1, level: 'P3', msg: '标题中品牌 "eufy" 未按官方写法首字母大写（Eufy）' }, { deduct: 1, level: 'P3', msg: '标题兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' }] };
ce.B0EX0003 = { copy: [{ deduct: 1, level: 'P3', msg: '标题中 "not" 未按规范首字母大写（(Container not Included)），建议改为 Not' }, { deduct: 1, level: 'P3', msg: '标题兼容性用 "for" 表述，亚马逊更规范写法为 "Compatible with"' }] };

writeFileSync(P, JSON.stringify(ce, null, 2), 'utf8');
console.log('copy-extra 覆盖 ASIN 数：', Object.keys(ce).filter((k) => !k.startsWith('_')).length);

/* ---- compliance-extra：受管制品类关联（正则与 findings 字段都覆盖不到） ---- */
const PC = `${ROOT}/data/derived/compliance-extra.json`;
const co = existsSync(PC) ? JSON.parse(readFileSync(PC, 'utf8')) : {
  _note: '人工判定类合规问题（正则与 findings 字段都覆盖不到），按 ASIN 维护，由 build-reports.mjs 读入。',
};
co.B0EX0009 = {
  issues: [{
    deduct: 20, level: 'P0', rule: '受管制品类关联',
    msg: '标题把本商品与 **ZYN（尼古丁袋）** 直接绑定：出现 "Compatible with ZYN Pouches Can"、"Holster Clip for ZYN"、'
      + '"Gift for Zyn Lovers" 等多处。亚马逊对**烟草 / 尼古丁类商品及其配件**实行限制销售政策，'
      + '把车载收纳夹定位成尼古丁袋配件会触发商品受限 / 下架风险。建议改为中性表述（如 "Car Visor Organizer Clip for Small Round Tins"），'
      + '并在图片中避免出现任何烟包 / 尼古丁袋实物与品牌字样。',
  }],
};
writeFileSync(PC, JSON.stringify(co, null, 2), 'utf8');
console.log('compliance-extra 覆盖 ASIN：', Object.keys(co).filter((k) => !k.startsWith('_')).join(', ') || '（无）');
