import { ROOT, LARK_CLI } from './paths.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CLI = LARK_CLI;
const URL = 'https://<TENANT>.feishu.cn/sheets/<SHEET_TOKEN>';
process.chdir(`${ROOT}`);

const text = JSON.parse(readFileSync('data/derived/text-analysis.json', 'utf8'));
const scores = JSON.parse(readFileSync('data/derived/scores.json', 'utf8'));
const docs = JSON.parse(readFileSync('data/derived/doc-urls.json', 'utf8'));
const vis = JSON.parse(readFileSync('data/derived/visual-findings.json', 'utf8'));

const ROWS = {
  B0EX0007: 2, B0EX0023: 3, B0EX0017: 4, B0EX0013: 5, B0EX0024: 6, B0EX0011: 7,
  B0EX0020: 8, B0EX0015: 9, B0EX0012: 10, B0EX0005: 11, B0EX0022: 12,
  B0EX0006: 13, B0EX0008: 14, B0EX0016: 15,
  B0EX0009: 16, B0EX0010: 17, B0EX0001: 18, B0EX0004: 19, B0EX0019: 20,
  B0EX0014: 21, B0EX0002: 22, B0EX0018: 23, B0EX0021: 24, B0EX0003: 25,
};

function call(args, label) {
  const res = spawnSync(CLI, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  let j = null; try { j = JSON.parse(res.stdout); } catch {}
  if (!j?.ok) console.log(`  ${label} FAILED:`, (j?.error?.message || res.stdout || '').slice(0, 250));
  return j;
}

// Y1:AA1 表头
call(['sheets', '+cells-set', '--url', URL, '--sheet-id', 'a81751', '--range', 'Y1:AA1',
  '--cells', JSON.stringify([[{ value: '是否为新标题' }, { value: '红人视频数' }, { value: '用户视频数' }]])], 'Y1:AA1 header');

for (const [asin, row] of Object.entries(ROWS)) {
  const t = text[asin];
  if (!t) { console.log(`${asin}: 无 text-analysis`); continue; }
  const s = scores[asin]?.score;
  const y = t.hasItemHighlights ? '有' : '无';
  const cvz = vis[asin]?.creatorVideo || {};
  const z = cvz.creatorCount ?? 0;   // 红人视频数（按条目，不去重）
  const aa = cvz.customerCount ?? 0; // 用户视频数
  const link = docs[asin]?.url || '';
  const linkCells = JSON.stringify([[{ formula: `=HYPERLINK("${link}","检查报告-${asin}")` }]]);
  call(['sheets', '+cells-set', '--url', URL, '--sheet-id', 'a81751', '--range', `R${row}`, '--cells', linkCells, '--as', 'user'], `${asin} R`);
  const cells = JSON.stringify([[
    { value: s?.completeness ?? 0 }, { value: s?.compliance ?? 0 }, { value: s?.copy ?? 0 },
    { value: s?.visual ?? 0 }, { value: s?.health ?? 0 }, { value: s?.total ?? 0 },
    { value: y }, { value: z }, { value: aa },
  ]]);
  call(['sheets', '+cells-set', '--url', URL, '--sheet-id', 'a81751', '--range', `S${row}:AA${row}`, '--cells', cells, '--as', 'user'], `${asin} S:AA`);
  console.log(`row ${row} ${asin}: 总分=${s?.total} | 新标题=${y} | 红人视频数=${z} | 用户视频数=${aa}`);
}
