/** 行 13–15 的语义类文案问题补充（正则覆盖不到的部分）。 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const P = `${ROOT}/data/derived/copy-extra.json`;
const ce = existsSync(P) ? JSON.parse(readFileSync(P, 'utf8')) : {};

ce.B0EX0001 = {
  copy: [
    { deduct: 2, level: 'P2', msg: '标题堆砌多个第三方食品品牌名（Chef Boyardee｜Van Camp\'s｜Goya｜Bush\'s Best｜Farmer\'s Market），既拉长标题又踩竞品品牌，建议改为「Compatible with most standard 3-inch cans」这类通用表述，把具体品牌移到五点或亮点字段' },
    { deduct: 1, level: 'P3', msg: '标题括号内 "Lids ONLY" 为非常规全大写，建议改为 "Lids Only"' },
    { deduct: 1, level: 'P3', msg: '五点描述含非常规全大写词（如 "✨【INDEX ...】" 类装饰性大写/特殊字符），建议改为常规大小写' },
  ],
};

ce.B0EX0002 = {
  copy: [
    { deduct: 1, level: 'P3', msg: '标题中单位与实义词未大写：出现了小写的 "oz" 与 "fit"，建议统一首字母大写（12 Oz / Fits）' },
    { deduct: 1, level: 'P3', msg: '五点描述含弯撇号 ’，建议改用直引号，避免部分系统显示异常' },
  ],
};

ce.B0EX0003 = {
  copy: [
    { deduct: 1, level: 'P3', msg: '标题数量词用英文单词 "One"（Cosco All-in-One），亚马逊建议数字用阿拉伯数字，可保留型号写法但避免歧义' },
    { deduct: 1, level: 'P3', msg: '标题实义词未大写："1st" 建议写作 "1st"→"1st"（保持大写规范）或改写为 "First"' },
    { deduct: 1, level: 'P3', msg: '五点描述含弯撇号 ’ 与装饰性特殊字符（✨【】等数学粗体字母），建议改用常规字符' },
  ],
};

writeFileSync(P, JSON.stringify(ce, null, 2), 'utf8');
console.log('copy-extra 覆盖 ASIN 数：', Object.keys(ce).filter((k) => !k.startsWith('_')).length);
