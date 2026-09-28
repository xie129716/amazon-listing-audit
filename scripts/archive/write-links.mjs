// Fix column R labels + write via official API paths (encoding-safe)
import { LARK_CLI } from './paths.mjs';
import { spawnSync } from 'node:child_process';

const CLI = LARK_CLI;
const URL = 'https://<TENANT>.feishu.cn/sheets/<SHEET_TOKEN>';

const rows = [
  { r: 2, doc: 'DqDadjpP0oMX1gxYGwocLmZDnyd', asin: 'B0EX0001' },
  { r: 3, doc: 'NohtdiyltoWOIixDEeLcnyVSnEe', asin: 'B0EX0003' },
  { r: 4, doc: 'YpGbdOQNToNiChxzTkZcgL5enEd', asin: 'B0EX0002' },
];

for (const { r, doc, asin } of rows) {
  const link = `https://<TENANT>.feishu.cn/docx/${doc}`;
  const formula = `=HYPERLINK("${link}","检查报告-${asin}")`;
  const cells = JSON.stringify([[{ formula }]]);
  const res = spawnSync(CLI, [
    'sheets', '+cells-set',
    '--url', URL,
    '--sheet-id', 'a81751',
    '--range', `R${r}`,
    '--cells', cells,
    '--as', 'user',
  ], { encoding: 'utf8' });
  let ok = false;
  try { ok = JSON.parse(res.stdout).ok; } catch {}
  console.log(`row ${r}: ok=${ok}`, res.stdout?.slice(0, 120).replace(/\n/g, ' '));
}
