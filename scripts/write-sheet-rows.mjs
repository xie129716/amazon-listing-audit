import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const CLI = 'C:\\Users\\admin\\.workbuddy\\binaries\\node\\cli-connector-packages\\node_modules\\@larksuite\\cli\\bin\\lark-cli.exe';
const URL = 'https://c7lhitw5pz.feishu.cn/sheets/KsxxsyWQFhlxmet2nIycYU3DnAh';
process.chdir('E:/listing_exam');

const text = JSON.parse(readFileSync('data/derived/text-analysis.json', 'utf8'));
const scores = JSON.parse(readFileSync('data/derived/scores.json', 'utf8'));
const docs = JSON.parse(readFileSync('data/derived/doc-urls.json', 'utf8'));
const vis = JSON.parse(readFileSync('data/derived/visual-findings.json', 'utf8'));

const ROWS = {
  B0DJQS14DS: 2, B0GF1Z3CFH: 3, B0FL6X3HRW: 4, B0FF8YBX8P: 5, B0GGNM98LD: 6, B0FDQMCKRM: 7,
  B0FZKG6V1K: 8, B0FJXZ25GY: 9, B0FDW97HZZ: 10, B0DB7J5C47: 11, B0G42HD23D: 12,
  B0DF7K87B1: 13, B0F1SNXQZS: 14, B0FKTM3BYG: 15,
  B0FC6D38FZ: 16, B0FDQ2VVJW: 17, B0DB5Y8273: 18, B0DB79R95T: 19, B0FQ5SGFYM: 20,
  B0FJ21QDD7: 21, B0DB615DKB: 22, B0FPFHW1RJ: 23, B0G41529PP: 24, B0DB74GYKD: 25,
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
