/**
 * 把子代理产出的 vf-<ASIN>.json 规范化成 visual-findings.json 的标准结构，
 * 并做**同因合并**与**政策校准**。
 *
 * 用法：node scripts/normalize-vf.mjs [ASIN...]   （原地改写 vf-*.json）
 *
 * 关键处理：
 *  1. 子代理各字段的 entry 形状不一（有的用 msg，有的用 text/where/note）→ 统一成 {msg} 或 {brand,where}。
 *  2. **同因合并**：同一个根因跨多张图出现时合并为一条（列出全部位置），
 *     避免"一处问题在两个维度/多张图上重复扣分"。已在 v8/v9 反复踩过这个坑。
 *  3. **政策校准**：
 *     · 第三方品牌出现在「道具/适配对象本体」上 → 打 `onProp: true`（v10 豁免，只提示可裁切）
 *     · 仅仅「句号后缺空格」这类**标点**问题不算拼写错误 → 移出 spellingInImage，改为提示
 *     · `imageSpelling` 一律清空（拼写只在合规维度计一次）
 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DEFAULT = ['B0EX0004', 'B0EX0003', 'B0EX0002', 'B0EX0001', 'B0EX0005'];
const ASINS = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT;

/** 把任意形状的 entry 压成一句话 */
function toMsg(e) {
  if (typeof e === 'string') return e;
  if (e.msg) return e.msg;
  const parts = [];
  if (e.text) parts.push(`"${e.text}"`);
  if (e.where) parts.push(`（${e.where}）`);
  if (e.note) parts.push(`— ${e.note}`);
  return parts.join(' ') || JSON.stringify(e);
}
const asMsgArr = (a) => (a || []).map((e) => ({ ...e, msg: toMsg(e) }));
const lvlOf = (l) => (['P0', 'P1', 'P2', '提示'].includes(l) ? l : String(l).startsWith('P0') ? 'P0' : String(l).startsWith('P1') ? 'P1' : String(l).startsWith('P2') ? 'P2' : '提示');

for (const asin of ASINS) {
  const f = `${ROOT}/data/derived/vf-${asin}.json`;
  if (!existsSync(f)) { console.log(`${asin}: 无文件，跳过`); continue; }
  const v = JSON.parse(readFileSync(f, 'utf8'));
  const log = [];

  // ---- 1. 统一 entry 形状 ----
  v.mainImageThirdPartyLogo = asMsgArr(v.mainImageThirdPartyLogo);
  v.thirdPartyUnrelated = asMsgArr(v.thirdPartyUnrelated);
  v.adaptedObjectBrands = asMsgArr(v.adaptedObjectBrands);
  v.borrowedEndorsement = asMsgArr(v.borrowedEndorsement);
  v.sensitive = asMsgArr(v.sensitive);
  v.propDrugNameRisk = asMsgArr(v.propDrugNameRisk);
  v.disparagementAbnormal = asMsgArr(v.disparagementAbnormal);
  v.absoluteClaims = asMsgArr(v.absoluteClaims);
  v.materialClaims = asMsgArr(v.materialClaims);
  v.brandVariants = asMsgArr(v.brandVariants);
  v.countColorTension = asMsgArr(v.countColorTension);
  v.unreadableProps = asMsgArr(v.unreadableProps);
  v.misleadingContradiction = asMsgArr(v.misleadingContradiction);
  v.unshownClaims = asMsgArr(v.unshownClaims);

  // ---- 2. imageSpelling 一律清空（拼写只在合规维度计一次）----
  if ((v.imageSpelling || []).length) { log.push(`清空 imageSpelling ${v.imageSpelling.length} 条（合规维度已计）`); v.imageSpelling = []; }

  // ---- 3. 标点类（仅缺空格/多余空格）不算拼写错误 ----
  const keepSpell = [];
  for (const s of v.spellingInImage || []) {
    const t = String(s.text || '');
    const isPunctOnly = !/\s/.test(t) && /[.,]/.test(t) && String(s.should || '').replace(/[.,\s]/g, '') === t.replace(/[.,]/g, '');
    const sameWords = String(s.should || '').replace(/[.\s]/g, '').toLowerCase() === t.replace(/[.\s]/g, '').toLowerCase();
    if (isPunctOnly || (sameWords && /[.]/.test(t) !== /[.]/.test(String(s.should || '')))) {
      log.push(`标点类改列提示：「${t}」`);
      v.remainingIssues = (v.remainingIssues || []).concat([{
        level: '提示', where: s.where || '', msg: `图内英文标点问题：「${t}」（应为「${s.should}」），属标点/空格缺失而非拼写错误，建议修正（不扣分）`,
      }]);
      v.notes = (v.notes || []).concat([`${s.where || '图片'}：句号后缺空格（"${t}" → "${s.should}"），建议修正（仅提示，不扣分）`]);
      continue;
    }
    keepSpell.push(s);
  }
  v.spellingInImage = keepSpell;

  // ---- 4. 拼写错误同因合并：同字面跨图只算一处 ----
  const byText = new Map();
  for (const s of v.spellingInImage) {
    const k = `${String(s.text).toLowerCase()}|${String(s.should).toLowerCase()}`;
    if (!byText.has(k)) byText.set(k, { ...s, where: s.where || '' });
    else {
      const cur = byText.get(k);
      if (s.where && !cur.where.includes(s.where)) cur.where = `${cur.where}、${s.where}`;
      log.push(`拼写同因合并：${s.text} @ ${s.where}`);
    }
  }
  v.spellingInImage = [...byText.values()];

  // ---- 5. 图文矛盾同因合并（同一根因跨图合并，位置并列）----
  const mcSeen = new Map();
  for (const m of v.misleadingContradiction) {
    const k = String(m.msg).replace(/(A\+ 图|副图|PT|图)\s*\d+/gi, '').replace(/\s+/g, '').slice(0, 40);
    if (!mcSeen.has(k)) mcSeen.set(k, m);
    else log.push(`图文矛盾同因合并：${String(m.where || '').slice(0, 30)}`);
  }
  v.misleadingContradiction = [...mcSeen.values()];

  // ---- 6. 第三方品牌出现在道具本体上 → onProp 豁免 ----
  const PROP_HINT = /道具|适配对象|酸奶罐|罐体|罐身|包装盒|食品罐|播放器|保护套|机身|出厂自带|不是我们(售卖|卖)|非我方商品|非售卖/;
  for (const m of v.thirdPartyUnrelated) if (m.onProp === undefined) m.onProp = PROP_HINT.test(String(m.where || '') + String(m.msg || ''));
  // 同一品牌跨图 → 合并为一条（列出全部位置），避免同一道具被重复扣分
  const tpu = new Map();
  for (const m of v.thirdPartyUnrelated) {
    const k = `${String(m.brand).toLowerCase()}|${m.onProp ? 'prop' : 'risk'}`;
    if (!tpu.has(k)) tpu.set(k, { ...m });
    else { const c = tpu.get(k); const w = String(m.where || ''); if (w && !String(c.where).includes(w)) c.where = `${c.where}；${w}`; log.push(`第三方品牌同因合并：${m.brand}`); }
  }
  v.thirdPartyUnrelated = [...tpu.values()];

  // ---- 7. remainingIssues 规范化 ----
  v.remainingIssues = (v.remainingIssues || []).map((r) => ({ level: lvlOf(r.level), where: r.where || '', msg: r.msg || toMsg(r) }));
  // 去掉与已豁免项冲突的 P0/P1（第三方品牌在道具上却标 P0）
  v.remainingIssues = v.remainingIssues.filter((r) => {
    const exemptHit = v.thirdPartyUnrelated.some((t) => t.onProp && r.msg.includes(String(t.brand)));
    if (exemptHit && r.level !== '提示') { log.push(`降级为提示：${r.msg.slice(0, 40)}`); r.level = '提示'; r.msg += '（属道具本体自带，按 v10 豁免；建议裁切/涂抹做成零风险画面）'; }
    return true;
  });
  // 去重
  const seenR = new Set();
  v.remainingIssues = v.remainingIssues.filter((r) => { const k = r.level + '|' + r.msg; if (seenR.has(k)) return false; seenR.add(k); return true; });

  writeFileSync(f, JSON.stringify(v, null, 2), 'utf8');
  console.log(`\n=== ${asin} 规范化完成 ===`);
  for (const l of log) console.log('  · ' + l);
  console.log(`  拼写 ${v.spellingInImage.length} | 第三方 ${v.thirdPartyUnrelated.length}(豁免 ${v.thirdPartyUnrelated.filter((x) => x.onProp).length}) | 图文矛盾 ${v.misleadingContradiction.length} | 材质 ${v.materialClaims.length} | 绝对化 ${v.absoluteClaims.length} | 问题清单 ${v.remainingIssues.length}`);
}
