/** 行 16–25 的人工校准：同因合并 + 政策口径统一。先跑 normalize-vf.mjs。 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const D = 'E:/listing_exam/data/derived';
const ASINS = ['B0FC6D38FZ', 'B0FDQ2VVJW', 'B0DB5Y8273', 'B0DB79R95T', 'B0FQ5SGFYM',
  'B0FJ21QDD7', 'B0DB615DKB', 'B0FPFHW1RJ', 'B0G41529PP', 'B0DB74GYKD'];

const PROP_HINT = /道具|适配对象|罐体|罐身|瓶身|碗体|座椅|机型|适配机型|健身|咖啡机|笔记本|道具本体/;
const dedupe = (arr, keyFn) => {
  const seen = new Set(); const out = [];
  for (const x of arr || []) { const k = keyFn(x); if (seen.has(k)) continue; seen.add(k); out.push(x); }
  return out;
};

for (const asin of ASINS) {
  const f = `${D}/vf-${asin}.json`;
  if (!existsSync(f)) { console.log(`${asin}: 无文件`); continue; }
  const v = JSON.parse(readFileSync(f, 'utf8'));
  const log = [];

  // 1) 第三方品牌：只有「非道具本体」的才算问题；道具上的标 onProp（仅提示）
  if ((v.thirdPartyUnrelated || []).length) {
    for (const m of v.thirdPartyUnrelated) {
      if (m.onProp === undefined) m.onProp = PROP_HINT.test(String(m.where || '') + String(m.msg || ''));
    }
    // 同品牌合并为一条
    const by = new Map();
    for (const m of v.thirdPartyUnrelated) {
      const k = `${String(m.brand).toLowerCase()}|${m.onProp ? 'prop' : 'risk'}`;
      if (!by.has(k)) by.set(k, { ...m });
      else {
        const c = by.get(k); const w = String(m.where || '');
        if (w && !String(c.where || '').includes(w)) c.where = `${c.where}；${w}`;
        log.push(`第三方品牌合并：${m.brand}`);
      }
    }
    v.thirdPartyUnrelated = [...by.values()];
  }

  // 2) 过期的「仅提示/不扣分/按规则」话术已在 sanitize 阶段处理，这里只做结构清理
  if ((v.imageSpelling || []).length) { v.imageSpelling = []; log.push('清空 imageSpelling'); }

  // 3) 数量/颜色展示差异与不可辨认道具：保留描述，仅提示
  v.countColorTension = dedupe(v.countColorTension, (x) => String(x.msg).slice(0, 50));
  v.unreadableProps = dedupe(v.unreadableProps, (x) => String(x.msg).slice(0, 50));
  v.unshownClaims = dedupe(v.unshownClaims, (x) => String(x.msg).slice(0, 50));

  // 4) remainingIssues 去重 + 去掉与已豁免项冲突的扣分级条目
  v.remainingIssues = dedupe(v.remainingIssues, (r) => r.level + '|' + String(r.msg).slice(0, 60));
  v.remainingIssues = (v.remainingIssues || []).map((r) => {
    const hit = (v.thirdPartyUnrelated || []).find((t) => t.onProp && String(r.msg || '').includes(String(t.brand).split(' / ')[0]));
    if (hit && r.level !== '提示') { log.push(`降级为提示：${String(r.msg).slice(0, 30)}`); return { ...r, level: '提示' }; }
    return r;
  });

  writeFileSync(f, JSON.stringify(v, null, 2), 'utf8');
  console.log(`${asin}: 第三方 ${v.thirdPartyUnrelated.length}(豁免 ${v.thirdPartyUnrelated.filter((x) => x.onProp).length}) | 绝对化 ${(v.absoluteClaims || []).length} | 材质 ${(v.materialClaims || []).length} | 图文矛盾 ${(v.misleadingContradiction || []).length} | 问题清单 ${v.remainingIssues.length}${log.length ? ' | ' + log.join(';') : ''}`);
}
