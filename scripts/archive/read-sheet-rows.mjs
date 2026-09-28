import { ROOT, LARK_CLI } from './paths.mjs';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const CLI = LARK_CLI;
const URL = 'https://<TENANT>.feishu.cn/sheets/<SHEET_TOKEN>';

// A..Q = 17 fields, header on row 1
const res = spawnSync(CLI, ['sheets', '+csv-get', '--url', URL, '--sheet-id', 'a81751', '--range', 'A1:Q654', '--as', 'user'],
  { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
const j = JSON.parse(res.stdout);

function parseLine(line) {
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

const rows = j.data.annotated_csv.split('\n').map(parseLine).filter(Boolean);
const header = rows[0].cells;
console.log('表头字段数:', header.length);
console.log(header.join(' | '));

const records = rows.slice(1).map((r) => {
  const o = {};
  header.forEach((h, i) => { o[h] = r.cells[i] ?? ''; });
  o.__row = r.row;
  return o;
}).filter((r) => r.ASIN);

console.log('\n有效数据行数:', records.length);
console.log('\n=== 前 8 条（行号严格对齐）===');
for (const r of records.slice(0, 8)) {
  console.log(`第 ${r.__row} 行 | ${r.ASIN} | 店铺=${r['店铺']} | 品名=${r['品名']} | MSKU=${r['MSKU']} | 30天销量=${r['30天销量']} | 评分=${r['评分']}`);
}

writeFileSync(`${ROOT}/data/derived/sheet-records-1-5.json`, JSON.stringify({ header, records: records.slice(0, 12) }, null, 2), 'utf8');
writeFileSync(`${ROOT}/data/derived/sheet-all-records.json`, JSON.stringify({ header, records }, null, 2), 'utf8');
const rowMap = {};
for (const r of records) rowMap[r.__row] = r.ASIN;
writeFileSync(`${ROOT}/data/derived/row-asin-map.json`, JSON.stringify(rowMap, null, 2), 'utf8');
console.log('\n已写入 sheet-records-1-5.json / sheet-all-records.json / row-asin-map.json');
