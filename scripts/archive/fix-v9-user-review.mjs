/**
 * v8 数据修订（用户复核反馈）
 *
 * 用户指出 3 处问题，均已按图片原图核实：
 *  ① B0EX0001 报的 "HEALTHCARE PROFESSINAL"（A+ 图 06）**图上根本不存在** → 子代理误报，整条删除。
 *     连带删除同源的「借用第三方获奖徽章」条目（同图同样不存在该徽章）。
 *     A+ 图 04 "Vibrant colors" 亦不成立（画面确有多色罐体）→ 改列提醒。
 *  ② 「无法辨认的道具」→ 既然无法辨认，就不存在品牌侵权风险 → 不再扣分（规则已改，数据保留为提示）。
 *  ③ 「展示数量/颜色与标题不一致」→ 展示数量不需要跟着标题走 → 不再扣分（规则已改，数据保留为提示）。
 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));
const a = v['B0EX0001'];

/* ① 删除被证伪的拼写错误与借用背书 */
const removedSpelling = a.spellingInImage || [];
const removedBorrowed = a.borrowedEndorsement || [];
a.spellingInImage = [];
a.borrowedEndorsement = [];

/* ①b A+ 图 04 的颜色复数说法不成立 → 从绝对化表述移出，仅保留「未演示」到 unshownClaims */
const removedAbs = a.absoluteClaims || [];
a.absoluteClaims = [];
a.unshownClaims = [
  ...(a.unshownClaims || []),
  { msg: 'A+ 图 01 "No Moisture / No Leakage" 宣称，画面无对应液体演示（宣称多于演示，仅提醒不扣分）' },
].filter((x, i, arr) => arr.findIndex((y) => y.msg === x.msg) === i);

/* ①c 从实质问题清单删除被证伪条目的 P0 */
a.remainingIssues = (a.remainingIssues || []).filter((r) => {
  if (/PROFESSINAL/i.test(String(r.msg || ''))) return false;
  if (/无红人合作视频/.test(String(r.msg || ''))) return false; // 陈旧结论：实测红人视频 5 条
  return true;
});

/* ①d 修正 notes */
const NOTE_FIX = [
  ['借用了第三方获奖徽章；图内拼写错误 PROFESSINAL', '经原图放大复核：图上并无 "PROFESSINAL" 字样，亦无获奖徽章，原结论已撤销'],
];
a.notes = (a.notes || [])
  .map((n) => {
    let s = String(n);
    for (const [from, to] of NOTE_FIX) s = s.replace(from, to);
    s = s.replace('但右下角出现第三方 Bar Keepers Friend 清洁粉罐（P0）', '右下角出现第三方 Bar Keepers Friend 清洁粉罐（道具本体，按规则豁免）');
    return s;
  })
  .filter((n) => !/PROFESSINAL|VOTED PRODUCT/.test(n));

a.notes.push(
  '【v8 复核记录】2026-09-16 按用户反馈对 A+ 图 01–06 全图放大逐张重看：'
  + '未发现 "HEALTHCARE PROFESSIONAL / PROFESSINAL" 字样，亦无第三方获奖徽章 —— 原「图片拼写错误」与「借用第三方背书」两条结论作废；'
  + 'A+ 图 04 画面确有多色罐体，"Vibrant colors" 复数说法成立；'
  + 'A+ 图 01 卖家 logo 的字母 S 确为镜像（Ƨ），该条保留。',
);

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('removed spelling :', JSON.stringify(removedSpelling));
console.log('removed borrowed :', JSON.stringify(removedBorrowed));
console.log('removed absolute :', JSON.stringify(removedAbs));
console.log('remainingIssues  :', a.remainingIssues.map((r) => `${r.level}@${r.where}`).join(' | '));
console.log('notes count      :', a.notes.length);
