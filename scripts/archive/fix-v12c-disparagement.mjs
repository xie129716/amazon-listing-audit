/** B0EX0001：把「3D 打印工艺」负面描述从扣分项降为提示（与其它 listing 的竞品对比口径一致）。 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';
const f = `${ROOT}/data/derived/visual-findings.json`;
const vf = JSON.parse(readFileSync(f, 'utf8'));
const v = vf['B0EX0001'];
if ((v.disparagementAbnormal || []).length) {
  v.unshownClaims = [...(v.unshownClaims || []), ...v.disparagementAbnormal.map((m) => ({
    ...m, msg: `${m.msg}（对「3D 打印」工艺的负面描述，措辞本身正常、未颠倒，建议中性化或删除对比栏）`,
  }))];
  v.disparagementAbnormal = [];
}
v.remainingIssues = (v.remainingIssues || []).map((r) => (/3D PRINTING|贬损/.test(String(r.msg || '')) ? { ...r, level: '提示' } : r));
writeFileSync(f, JSON.stringify(vf, null, 2), 'utf8');
console.log('B0EX0001: disparagementAbnormal 清空 → 改为提示');
