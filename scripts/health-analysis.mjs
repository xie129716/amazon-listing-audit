import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

/* ============================================================================
   Amazon 数据健康度检查 — 全部对照用户给定标准，不自行加码
   参考数据源：ERP 导出（飞书表格 H..Q 列），亚马逊前台实时数据辅助校验

   标准：
     H1 转化率      —— 以库存周转/动销口径提示，< 10% 预警
     H2 库存(可售+在途) —— 有货才可售（购物车按钮）
     H3 评论&星级   —— 星级 >= 4
     H4 销量        —— 近七天出单情况
     H5 类目节点    —— 大类/小类是否被错放到不相关节点
   ========================================================================== */

const num = (v) => {
  const n = Number(String(v ?? '').replace(/[,\s$]/g, ''));
  return Number.isFinite(n) ? n : 0;
};
const parseRank = (s) => {
  const m = String(s || '').match(/[：:]\s*([\d,]+)/);
  return m ? num(m[1]) : null;
};

/** Map a listing's actual breadcrumb/product type to the ERP big-category, to detect mis-filing. */
const CATEGORY_KEYWORDS = {
  'Home & Kitchen': ['home & kitchen', 'home', 'kitchen', 'storage', 'organization', 'cookware', 'canning', 'lids', 'dining'],
  'Health & Household': ['health & household', 'health care', 'diabetes', 'organizers', 'travel kits', 'medical'],
  'Baby': ['baby', 'breastfeeding', 'feeding', 'nursery'],
  'Clothing, Shoes & Jewelry': ['clothing', 'shoes', 'jewelry', 'keyrings', 'keychains', 'apparel'],
  'Patio, Lawn & Garden': ['patio', 'lawn', 'garden', 'soil'],
  'Tools & Home Improvement': ['tools', 'home improvement', 'hardware'],
  'Beauty & Personal Care': ['beauty', 'personal care'],
  'Electronics': ['electronics', 'computers', 'accessories'],
  'Sports & Outdoors': ['sports', 'outdoors', 'fitness'],
  'Pet Supplies': ['pet supplies', 'pet'],
  'Office Products': ['office'],
  'Toys & Games': ['toys', 'games'],
};

export function analyseHealth(rec, live = {}) {
  const issues = [];
  const sell30 = num(rec['30天销量']);
  const daily = num(rec['30天日均销量']) || (sell30 / 30);
  const sellable = num(rec['FBA-可售']);
  const inTransit = num(rec['FBA-在途']);
  const fbaStock = num(rec['FBA库存']);
  const rating = num(rec['评分']);
  const reviews = num(rec['评论数']);
  const avgPrice = num(rec['销售均价']);
  const stockAvail = sellable + inTransit;

  // ---- H1 转化率 / 动销 ----
  const coverDays = daily > 0 ? Math.round(sellable / daily) : null;
  if (daily <= 0) {
    issues.push({ code: 'H1', level: 'P0', msg: '30 天日均销量为 0，无转化数据，需确认是否在售/断货' });
  } else if (coverDays !== null && coverDays > 180) {
    issues.push({ code: 'H1', level: 'P1', msg: `动销偏慢：可售 ${sellable} / 日均 ${daily} ≈ 可支撑 ${coverDays} 天（>180 天）` });
  } else {
    issues.push({ code: 'H1', level: 'OK', msg: `动销正常：日均 ${daily} 件，可售库存可支撑约 ${coverDays} 天` });
  }
  if (sell30 === 0) issues.push({ code: 'H4', level: 'P1', msg: '30 天销量为 0，近七天无出单记录' });
  else issues.push({ code: 'H4', level: 'OK', msg: `近 30 天出单 ${sell30} 件，近 7 天约 ${Math.round(daily * 7)} 件` });

  // ---- H2 库存 ----
  if (stockAvail <= 0) issues.push({ code: 'H2', level: 'P0', msg: `可售+在途 = 0，购物车按钮将失效（不可售）` });
  else if (sellable <= 0) issues.push({ code: 'H2', level: 'P0', msg: `可售为 0（在途 ${inTransit}），当前不可售，购物车按钮异常` });
  else issues.push({ code: 'H2', level: 'OK', msg: `可售 ${sellable} + 在途 ${inTransit} = ${stockAvail}，库存充足` });

  // ---- H3 评论 & 星级 ----
  if (rating < 4) issues.push({ code: 'H3', level: 'P0', msg: `星级 ${rating}，低于 4 星标准，影响转化与广告表现` });
  else issues.push({ code: 'H3', level: 'OK', msg: `星级 ${rating}，满足 ≥4 星标准` });
  if (reviews < 50) issues.push({ code: 'H3b', level: 'P2', msg: `评论数仅 ${reviews} 条，基数偏小，星级稳定性弱` });

  // ---- H5 类目节点 ----
  const erpBigCat = String(rec['大类排名'] || '').split(/[：:]/)[0].trim();
  const erpSubCat = String(rec['小类排名'] || '').split(/[：:]/)[0].trim();
  const bigRank = parseRank(rec['大类排名']);
  const subRank = parseRank(rec['小类排名']);
  const liveCrumb = (live.breadcrumbs || []).join(' > ');
  const liveRoot = (live.breadcrumbs || [])[0] || '';

  issues.push({ code: 'H5', level: 'INFO', msg: `ERP 大类排名：${erpBigCat || '缺失'} #${bigRank ?? 'n/a'}；ERP 小类排名：${erpSubCat || '缺失'} #${subRank ?? 'n/a'}` });
  if (liveCrumb) issues.push({ code: 'H5', level: 'INFO', msg: `前台实际类目路径：${liveCrumb}` });

  // ERP sometimes exports a mid-level node (e.g. "Kitchen & Dining") where the front end
  // shows the root ("Home & Kitchen"). Treat any ancestor/descendant relationship as consistent.
  const norm = (s) => String(s || '').toLowerCase().replace(/\s*&\s*/g, ' & ').trim();
  const erpN = norm(erpBigCat), liveN = norm(liveRoot), pathN = norm(liveCrumb);
  const related = !!(
    (erpN && liveN && (pathN.includes(erpN) || erpN.includes(liveN) || liveN.includes(erpN))) ||
    (erpN && liveN && CATEGORY_KEYWORDS[liveRoot] && CATEGORY_KEYWORDS[liveRoot].some((k) => erpN.includes(k)))
  );
  if (erpBigCat && liveRoot && !related) {
    issues.push({ code: 'H5', level: 'P0', msg: `类目错放风险：ERP 大类「${erpBigCat}」与前台实际类目路径「${liveCrumb}」无归属关系，疑似错放节点` });
  } else if (erpBigCat && liveRoot) {
    issues.push({ code: 'H5', level: 'OK', msg: `类目归属一致：ERP 记录「${erpBigCat}」落在前台类目路径「${liveCrumb}」之内` });
  }
  if (!bigRank) issues.push({ code: 'H5b', level: 'P2', msg: 'ERP 大类排名为空（新品或未收录），建议核实' });
  if (!subRank) issues.push({ code: 'H5b', level: 'P2', msg: 'ERP 小类排名为空（新品或未收录），建议核实' });

  // ---- live cross-check ----
  if (live.rating) {
    const liveR = parseFloat(String(live.rating).match(/([\d.]+)/)?.[1] || '0');
    if (liveR && Math.abs(liveR - rating) >= 0.3) {
      issues.push({ code: 'H3c', level: 'P2', msg: `星级数据不一致：ERP ${rating} vs 前台实时 ${liveR}（数据更新时间差）` });
    }
  }

  return {
    metrics: { sell30, daily, sellable, inTransit, fbaStock, stockAvail, coverDays, rating, reviews, avgPrice, erpBigCat, erpSubCat, bigRank, subRank, liveCrumb },
    issues,
  };
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}`) {
  const sheet = JSON.parse(readFileSync(`${ROOT}/data/derived/sheet-all-records.json`, 'utf8'));
  const out = {};
  for (const rec of sheet.records) {
    let live = {};
    try { live = JSON.parse(readFileSync(`${ROOT}/data/raw/${rec.ASIN}.json`, 'utf8')); } catch {}
    const h = analyseHealth(rec, live);
    out[rec.ASIN] = { row: rec.__row, ...h };
    console.log(`\n===== row ${rec.__row} ${rec.ASIN} =====`);
    console.log(`  指标: 30天销量=${h.metrics.sell30} 日均=${h.metrics.daily} 可售+在途=${h.metrics.stockAvail} 星级=${h.metrics.rating} 评论=${h.metrics.reviews} 可支撑=${h.metrics.coverDays}天`);
    for (const i of h.issues) console.log(`  [${i.code}] ${i.level.padEnd(4)} ${i.msg}`);
  }
  mkdirSync(`${ROOT}/data/derived`, { recursive: true });
  writeFileSync(`${ROOT}/data/derived/health-analysis.json`, JSON.stringify(out, null, 2), 'utf8');
  console.log('\nwritten data/derived/health-analysis.json');
}
