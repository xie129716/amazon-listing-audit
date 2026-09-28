/**
 * v8 修订：v7 合规度放宽 —— 第三方道具/适配对象「本体自带」的背书徽章不再扣分。
 * 用于把已产出的 visual-findings 数据按新口径修正（onProp 标记）。
 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));

const MSG = 'A+ 图 06 画面中央的第三方 Bar Keepers Friend 罐体上印有 "VOTED PRODUCT OF THE YEAR / HEALTHCARE PROFESSIONAL" 获奖徽章。该徽章是道具罐体出厂自带的印刷内容，并非我方叠加或借用，按 v7 规则豁免（道具仅用于展示适配场景）。';
const NOTE = 'A+ 图 06：罐体自带的第三方获奖徽章属道具本体印刷内容，按 v7 豁免；但同图拼写错误 PROFESSINAL 需整改';

let changed = 0;
for (const asin of Object.keys(v)) {
  const e = v[asin];
  if (!e || typeof e !== 'object' || !Array.isArray(e.borrowedEndorsement)) continue;
  const wantExempt = e.borrowedEndorsement.filter((b) => b.onProp !== true && /本体|罐体|瓶身|包装上自带|道具自带/.test(String(b.msg || '')));
  if (!wantExempt.length && asin !== 'B0EX0001') continue;
  if (asin === 'B0EX0001') {
    e.borrowedEndorsement = [{ onProp: true, msg: MSG }];
    e.remainingIssues = (e.remainingIssues || []).filter((r) => !/VOTED PRODUCT OF THE YEAR/.test(String(r.msg || '')));
    e.notes = (e.notes || []).map((n) => (n.includes('借用第三方获奖徽章') ? NOTE : n));
    changed++;
  }
}
writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('updated ASINs:', changed);
for (const asin of ['B0EX0001']) {
  console.log(asin, 'borrowed=', JSON.stringify(v[asin].borrowedEndorsement));
  console.log(asin, 'remaining=', (v[asin].remainingIssues || []).map((r) => `${r.level}@${r.where}`).join(' | '));
}
