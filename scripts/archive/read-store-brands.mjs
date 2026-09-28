import { ROOT, LARK_CLI } from './paths.mjs';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CLI = LARK_CLI;
const URL = 'https://<TENANT>.feishu.cn/sheets/<SHEET_TOKEN>';

const res = spawnSync(CLI, ['sheets', '+csv-get', '--url', URL, '--sheet-id', 'a81751', '--range', 'A1:G654', '--as', 'user'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
writeFileSync(`${ROOT}/data/raw/sheet-cols-A-G.json`, res.stdout, 'utf8');
const j = JSON.parse(res.stdout);

function parse(line) {
  const m = line.match(/^\[row=(\d+)\] (.*)$/);
  if (!m) return null;
  const out = []; let cur = '', inQ = false;
  for (const c of m[2]) {
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { out.push(cur); cur = ''; continue; }
    cur += c;
  }
  out.push(cur);
  return { row: Number(m[1]), cells: out.map((s) => s.trim()) };
}
const rows = j.data.annotated_csv.split('\n').map(parse).filter(Boolean);
const header = rows[0].cells;
const recs = rows.slice(1).map((r) => { const o = {}; header.forEach((h, i) => o[h] = r.cells[i] ?? ''); o.__row = r.row; return o; });

// store -> brands, and the 品牌 column values
const byStore = {};
const brandCol = {};
for (const r of recs) {
  const store = r['店铺'] || '(空)';
  byStore[store] = byStore[store] || new Set();
  if (r['品牌']) byStore[store].add(r['品牌']);
  brandCol[r['品牌'] || '(空)'] = (brandCol[r['品牌'] || '(空)'] || 0) + 1;
}

console.log('=== 全表记录数:', recs.length, '===');
console.log('\n=== 店铺 -> 该店铺出现的「品牌」列取值 ===');
for (const [store, brands] of Object.entries(byStore).sort()) {
  console.log(`${store}  (${recs.filter(r => (r['店铺'] || '(空)') === store).length} 条)`);
  console.log('   品牌列取值:', [...brands].join(' / ') || '(空)');
}

console.log('\n=== 「品牌」列全部取值及出现次数 ===');
for (const [b, n] of Object.entries(brandCol).sort((a, c) => c[1] - a[1])) console.log(`  ${b}  ×${n}`);

console.log('\n=== 第 1-8 行明细（店铺/品名/品牌/MSKU）===');
for (const r of recs.filter((x) => x.__row <= 8)) {
  console.log(`row ${r.__row} | ${r['ASIN']} | 店铺=${r['店铺']} | 品名=${r['品名']} | 品牌列=${r['品牌']} | MSKU=${r['MSKU']}`);
}

writeFileSync(`${ROOT}/data/derived/store-brand-map.json`, JSON.stringify({
  stores: Object.fromEntries(Object.entries(byStore).map(([k, v]) => [k, [...v]])),
  brandColumnCounts: brandCol,
}, null, 2), 'utf8');
