/* ============================================================================
   评分器 v10 — 按 docs/评分规则.md 执行，纯扣分制，可复算。

   v10 相对 v9 的调整（2026-09-16 用户口径）：
     1. **完整度 · 副图**：原「≥1 张」→ 收紧为「**不少于 3 张**」（MIN_GALLERY_IMAGES）
     2. **完整度 · 五点描述**：原「≥3 条」→ 收紧为「**5 条**」（MIN_BULLETS）

   v9（保留）：
     1. **拼写错误跨维度去重**：只在「合规度」扣 −10/处，视觉维度整条不再列出
     2. **视频口径**：主图角标 #videoCount → 沉浸式面板 → 按 aci 判 Seller/Influencer/Customer
     3. 「展示数量/颜色与标题不一致」「无法辨认的道具」→ 仅提示不扣分
     4. 绝对化表述必须真含绝对化措辞，否则仅提示

   v7（保留）：
     **合规度放宽**：第三方「道具/适配对象本体」上自带的品牌名、标签、奖项徽章、
     认证标识一律豁免；仅当卖家自己叠加/借用才扣分。字段 `onProp: true`。
     报告文档中，凡定位到具体图片的问题，均在表格「对照图」单元格内嵌原图。

   v6（保留）：
     1. 敏感画面 −30 → −15；处方药名 −10 → −5
     2. 品牌白名单加严：本 listing 只能出现本店铺自有品牌；跨店铺自有品牌 → −20
     3. 图文矛盾从宽：仅保留「直接相反/放反」型；宣称多于演示一律仅提醒
   ========================================================================== */

/** 本公司全部自有品牌（跨店铺） */
export const OWN_BRANDS = ['LUVCOSY', 'FANTOVO', 'KIICII', 'PUREKRA', 'LAWNFUL', 'VIOTIIN', 'VASTICIDE'];
/** 店铺 → 该店铺允许出现的自有品牌（唯一） */
export const STORE_BRAND = {
  'Luvcosy-US': 'LUVCOSY', 'Fantovo-US': 'FANTOVO', 'Kiicii-US': 'KIICII',
  'Purekra-US': 'PUREKRA', 'Lawnful-US': 'LAWNFUL', 'Viotiin-US': 'VIOTIIN', 'Vasticide-US': 'VASTICIDE',
};
export const RUBRIC_VERSION = 'v10';

/** 道具/适配对象本体自带标识的通用豁免判定 */
export function isPropExempt(item) {
  return item && item.onProp === true;
}

export function isOwnBrand(name) {
  if (!name) return false;
  const n = String(name).toUpperCase().replace(/[^A-Z]/g, '');
  return OWN_BRANDS.some((b) => n.includes(b));
}
/** 该品牌是否属于指定店铺（用于跨店铺品牌混用判定） */
export function isBrandOfStore(brand, store) {
  const allowed = STORE_BRAND[store];
  if (!allowed) return true;              // 未知店铺不做判定
  if (!brand) return true;
  const n = String(brand).toUpperCase().replace(/[^A-Z]/g, '');
  return n.includes(allowed);
}

export const COMPLETENESS_ITEMS = [
  ['mainImage', '主图'], ['galleryImages', '副图'], ['video', '视频'], ['aplus', 'A+ 页面'],
  ['title', '标题'], ['bullets', '五点描述'], ['cart', '购物车按钮'], ['category', '类目节点'],
];

/** v10 完整度合格线 */
export const MIN_GALLERY_IMAGES = 3;   // 副图：原「≥1 张」→ 收紧为「不少于 3 张」
export const MIN_BULLETS = 5;          // 五点描述：原「≥3 条」→ 收紧为「5 条」

export function scoreCompleteness(checks) {
  const per = 100 / COMPLETENESS_ITEMS.length;
  let score = 0; const detail = [];
  for (const [key, label] of COMPLETENESS_ITEMS) {
    const c = checks[key] || { ok: false, note: '未采集' };
    const got = c.ok ? per : 0;
    score += got;
    detail.push({ key, label, ok: !!c.ok, got, note: c.note || '', extra: c.extra || '' });
  }
  return { score: Math.round(score), detail };
}

export function scoreDeduct(max, issues, floor = 0) {
  const cap = Math.round(max * 0.85);
  const raw = issues.reduce((s, i) => s + (i.deduct || 0), 0);
  return Math.max(floor, max - Math.min(raw, cap));
}

export function riskLevel(total) {
  if (total >= 90) return '良好';
  if (total >= 80) return '合格，需优化';
  if (total >= 70) return '需整改';
  if (total >= 60) return '高风险，优先整改';
  return '严重风险，立即整改';
}

export function finalise(dims) {
  const v = [dims.completeness, dims.compliance, dims.copy, dims.visual, dims.health];
  return { ...dims, total: Math.round(v.reduce((a, b) => a + b, 0) / v.length), risk: riskLevel(Math.round(v.reduce((a, b) => a + b, 0) / v.length)) };
}

/* ---------------- 合规度 ---------------- */
/**
 * 道具/适配对象本体自带标识 → 豁免清单（v7 放宽项，不扣分，仅在报告「已豁免项」中说明）
 */
export function complianceExemptions(v = {}) {
  const list = [];
  for (const m of v.borrowedEndorsement || []) {
    if (isPropExempt(m)) list.push({ kind: '道具本体自带的第三方背书/奖项徽章', msg: m.msg });
  }
  for (const m of v.thirdPartyUnrelated || []) {
    if (isPropExempt(m)) list.push({ kind: '第三方品牌出现在道具/适配对象本体上', msg: `「${m.brand}」— ${m.where || ''}` });
  }
  for (const m of v.mainImageThirdPartyLogo || []) {
    if (isPropExempt(m)) list.push({ kind: '主图道具/适配对象本体上的第三方品牌', msg: `「${m.brand}」— ${m.where || ''}` });
  }
  for (const m of v.sensitive || []) {
    if (isPropExempt(m)) list.push({ kind: '道具本体自带的敏感画面元素', msg: m.msg });
  }
  for (const m of v.propDrugNameRisk || []) {
    if (isPropExempt(m)) list.push({ kind: '道具本体自带的药品字样', msg: m.msg });
  }
  for (const m of v.absoluteClaims || []) {
    if (isPropExempt(m)) list.push({ kind: '道具本体自带的绝对化表述', msg: m.msg });
  }
  return list;
}

export function complianceDeductions(v = {}, store = '') {
  const d = [];
  const add = (deduct, msg, level = 'P1', rule = '') => d.push({ deduct, msg, level, rule });

  for (const m of v.mainImageThirdPartyLogo || []) {
    if (isOwnBrand(m.brand) && isBrandOfStore(m.brand, store)) continue;
    if (isOwnBrand(m.brand)) { add(20, `主图出现本公司其他店铺品牌「${m.brand}」，与本店铺（${store}）品牌不一致，会触发亚马逊品牌不一致绩效警告`, 'P0', '跨店铺品牌混用'); continue; }
    if (isPropExempt(m)) { add(0, `主图出现第三方品牌「${m.brand}」（${m.where || '主图'}），该物件为展示用道具，可保留`, '提示', '道具上的第三方品牌'); continue; }
    add(25, `主图商品主体上出现第三方品牌 logo「${m.brand}」（${m.where || '主图'}）`, 'P0', '主图第三方品牌');
  }
  for (const m of v.thirdPartyUnrelated || []) {
    if (isOwnBrand(m.brand) && isBrandOfStore(m.brand, store)) continue;
    if (isOwnBrand(m.brand)) { add(20, `图片出现本公司其他店铺品牌「${m.brand}」，与本店铺（${store}）品牌不一致`, 'P0', '跨店铺品牌混用'); continue; }
    // 第三方品牌印在道具/适配对象本体上 → 不作为问题，仅提示（可裁切做成零风险画面）
    if (isPropExempt(m)) { add(0, `第三方品牌「${m.brand}」出现在${m.where || '画面道具'}上；该物件为展示用道具，可保留，如追求零风险可裁切`, '提示', '道具上的第三方品牌'); continue; }
    add(20, `图片未抹第三方品牌名：「${m.brand}」出现在${m.where || '无关画面'}`, 'P0', '图片未抹品牌名');
  }
  // 敏感画面 / 处方药名 / 背书 / 贬损对比：印在道具本体上的，作为「可保留」提示列出（不扣分）
  for (const m of v.sensitive || []) { if (isPropExempt(m)) { add(0, m.msg, '提示', '道具上的敏感元素'); continue; } add(15, m.msg, 'P0', '敏感画面'); }
  for (const m of v.propDrugNameRisk || []) { if (isPropExempt(m)) { add(0, m.msg, '提示', '道具上的药品字样'); continue; } add(5, m.msg, 'P1', '处方药名示意'); }
  for (const m of v.borrowedEndorsement || []) { if (isPropExempt(m)) { add(0, m.msg, '提示', '道具上的第三方背书'); continue; } add(15, m.msg, 'P1', '借用第三方背书'); }
  for (const m of v.disparagementAbnormal || []) { if (isPropExempt(m)) { add(0, m.msg, '提示', '道具上的对比文案'); continue; } add(15, m.msg, 'P1', '贬损性对比文案异常'); }
  for (const m of v.spellingInImage || []) {
    const where = m.where ? `（${m.where}）` : '（未标注图片，需复核）';
    add(10, `图片内英文拼写错误${where}："${m.text}"${m.should ? ` 应为 "${m.should}"` : ''}`, 'P0', '图片拼写错误');
  }
  // 绝对化表述：只有真含绝对化措辞的才计分；同一 listing 合并计一次 −5（规则表未写「/处」）
  {
    const genuine = (v.absoluteClaims || []).filter((m) => !isPropExempt(m) && ABSOLUTE_RE.test(String(m.msg || '')));
    const soft = (v.absoluteClaims || []).filter((m) => !isPropExempt(m) && !ABSOLUTE_RE.test(String(m.msg || '')));
    if (genuine.length) add(5, genuine.map((m) => m.msg).join(' ｜ '), 'P2', '绝对化表述');
    for (const m of soft) add(0, m.msg, '提示', '表述提醒');
    for (const m of (v.absoluteClaims || []).filter(isPropExempt)) add(0, m.msg, '提示', '道具上的表述');
  }
  // 材质宣称缺证据：多条合并为一条陈述
  {
    const ms = (v.materialClaims || []).filter((m) => !isPropExempt(m));
    if (ms.length) add(3, ms.map((m) => m.msg).join(' ｜ '), 'P2', '材质宣称缺证据');
  }
  for (const m of v.brandVariants || []) { if (isPropExempt(m)) { add(0, m.msg, '提示', '道具上的品牌写法'); continue; } add(2, m.msg, 'P3', '品牌写法不一致'); }
  // 展示数量/颜色与标题不一致 → 保留描述，仅提醒
  for (const m of v.countColorTension || []) {
    if (isPropExempt(m)) continue;
    add(0, m.msg, '提示', '展示差异');
  }
  // 无法辨认的道具 → 保留描述，仅提醒
  for (const m of v.unreadableProps || []) {
    if (isPropExempt(m)) continue;
    add(0, m.msg, '提示', '道具文字不可辨');
  }

  return d;
}

const TPP_BRANDS = ['La Fermiere', 'La Fermière', 'Bar Keepers Friend', 'Comet', 'Ajax', 'Bon Ami', 'Oui', 'Hydrapeak', 'Spectra', 'BKF'];

/** 真正的绝对化措辞（v10：去掉 never/always —— "never leaks" 这类是正常属性描述，不是违禁绝对化） */
const ABSOLUTE_RE = /(\b100\s?%|guarantee[ds]?\b|\bbest[\s-]?seller\b|#\s?1\b|\bno\.?\s?1\b|\bsafest\b|\bperfect(?:ly)?\b|\bunlimited\b|\bunbreakable\b|\bforever\b|\blifetime\b|\bmost\s+(?:durable|effective|powerful|advanced|reliable)\b|\bworld'?s\s+best\b|\bnumber\s+one\b|\bflawless\b)/i;
export function complianceTextRisk(title) {
  const d = [];
  const first = String(title || '').trim().split(/\s+/)[0] || '';
  if (first && TPP_BRANDS.some((b) => b.toLowerCase() === first.toLowerCase())) {
    d.push({ deduct: 30, msg: `标题首词直接使用第三方品牌「${first}」`, level: 'P0', rule: '文案第三方品牌' });
  }
  return d;
}

/* ---------------- 文案准确度 ---------------- */
export function copyDeductions(t, opts = {}) {
  const { titleStartsWithBrand = null, isSplitTitle = false } = opts;
  const d = [];
  const push = (cond, deduct, msg, level = 'P2', rule = '') => { if (cond) d.push({ deduct, msg, level, rule }); };
  const ti = t.title_issues || [], hi = t.highlights_issues || [], bi = t.bullets_issues || [];
  const mech = t.mechanics || [], sp = t.spelling || [];

  for (const s of sp) d.push({ deduct: 10, msg: s.msg, level: 'P0', rule: '拼写错误' });

  const titleLen = t.titleLen || 0;
  if (titleLen > 75 && isSplitTitle) {
    d.push({ deduct: titleLen > 175 ? 12 : 8, level: 'P1', rule: '标题超长',
      msg: `标题 ${titleLen} 字符，超出 75 字符上限 ${titleLen - 75} 字符（已拆分两段式，需按新规调整）` });
  } else if (titleLen > 75) {
    d.push({ deduct: 0, level: '提示', rule: '标题超长',
      msg: `标题 ${titleLen} 字符。属「未拆分标题+亮点」旧版格式，不扣分；建议按 2026-07-27 新规拆分（见下方建议）` });
  }
  push(hi.some((i) => i.code === 'B0'), 0, '商品亮点（Item Highlights）字段缺失；不扣分，建议按新规补建（见「建议标题与亮点」）', '提示', '亮点缺失');
  push(bi.some((i) => i.code === 'C1' && i.level === 'P1'), 2, '五点描述超过亚马逊 5 条上限', 'P3', '五点超条');
  if (titleStartsWithBrand === false) d.push({ deduct: 3, msg: '标题未以自有品牌开头', level: 'P2', rule: '标题结构' });
  push(ti.some((i) => i.code === 'A5'), 2, '标题存在重复词 / 关键词堆砌', 'P3', '关键词堆砌');

  const seen = new Set();
  for (const m of mech) {
    if (m.code === 'E6' || m.code === 'E6b') continue;
    let kind = '格式';
    if (['E1', 'E2', 'E3', 'E5'].includes(m.code)) kind = '标点异常';
    if (kind === '标点异常' && /中文标点|、|，|。/.test(m.msg)) kind = '中文标点';
    if (seen.has(kind)) continue;
    seen.add(kind);
    d.push({ deduct: 1, msg: m.msg, level: 'P3', rule: kind });
  }
  push(ti.some((i) => i.code === 'A4'), 1, '标题含非常规全大写词', 'P3', '全大写');
  push(ti.some((i) => i.code === 'A6'), 3, '标题含亚马逊禁用字符', 'P2', '禁用字符');
  return d;
}

/* ---------------- 视觉准确度 ---------------- */
/** 归一化文本，用于判断「视觉」与「合规」两处是否在说同一件事 */
const norm = (s) => String(s ?? '').replace(/[\s"'“”‘’]+/g, '').toLowerCase();

export function visualDeductions(v = {}) {
  const d = [];
  const add = (deduct, msg, level = 'P2', rule = '') => d.push({ deduct, msg, level, rule });
  if (v.aiToolWatermark?.found) add(30, v.aiToolWatermark.msg, 'P0', 'AI 工具水印残留');
  if (v.mainImageWhiteBackground === false) add(10, v.mainImageNotWhiteMsg || '主图非纯白底', 'P1', '主图非白底');
  for (const m of v.misleadingContradiction || []) add(10, m.msg, 'P1', '图文矛盾（误导性）');

  // v9：同一处拼写错误「合规度」已扣分 → 视觉维度**整条不再列出**，避免同一问题在两个维度重复出现
  // 匹配方式：把两条文案里的英文串都抽出来做规范化包含比对
  const englishTokens = (s) => (String(s ?? '').match(/[A-Za-z][A-Za-z'’\- ]{2,}/g) || []).map(norm).filter((x) => x.length >= 4);
  const already = [
    ...(v.spellingInImage || []).flatMap((x) => [norm(x.text), ...englishTokens(x.text)]),
  ].filter(Boolean);
  const dupSkipped = [];
  for (const m of v.imageSpelling || []) {
    const cand = [norm(m.msg), ...englishTokens(m.msg)];
    const isDup = cand.some((c) => c && already.some((t) => t && (t.includes(c) || c.includes(t))));
    if (isDup) { dupSkipped.push(m.msg); continue; }
    add(5, m.msg, 'P1', '图片拼写错误');
  }
  if (dupSkipped.length) d.dupSkipped = dupSkipped;   // 供报告页脚说明用，不参与扣分
  return d;
}

/* ---------------- 数据健康度 ---------------- */
export function healthDeductions(h) {
  const d = [];
  for (const i of h.issues || []) {
    if (i.code === 'H3' && i.level === 'P0') d.push({ deduct: 30, msg: i.msg });
    else if (i.code === 'H3b') d.push({ deduct: 5, msg: i.msg });
    else if (i.code === 'H1' && i.level === 'P1') d.push({ deduct: 10, msg: i.msg });
    else if (i.code === 'H1' && i.level === 'P0') d.push({ deduct: 30, msg: i.msg });
    else if (i.code === 'H2' && i.level === 'P0') d.push({ deduct: 30, msg: i.msg });
    else if (i.code === 'H4' && i.level === 'P1') d.push({ deduct: 20, msg: i.msg });
    else if (i.code === 'H5' && i.level === 'P0') d.push({ deduct: 30, msg: i.msg });
  }
  return d;
}

/* ---------------- 新规「标题 + 亮点」建议 ---------------- */
export function suggestTitleHighlights({ brand, coreNoun, spec, compat, sellingPoints }) {
  const parts = [brand, coreNoun, spec].filter(Boolean);
  let title = parts.join(' ');
  if (compat && (title + ' ' + compat).length <= 75) title = title + ' ' + compat;
  if (title.length > 75) title = title.slice(0, 75).replace(/[\s,]+$/, '');
  let hl = (sellingPoints || []).filter(Boolean).join(', ');
  if (hl.length > 125) {
    const cut = hl.slice(0, 125);
    hl = cut.slice(0, Math.max(cut.lastIndexOf(','), 0)) || cut;
  }
  return { title, titleLen: title.length, highlights: hl, highlightsLen: hl.length };
}
