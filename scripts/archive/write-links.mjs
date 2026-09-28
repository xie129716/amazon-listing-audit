// Fix column R labels + write via official API paths (encoding-safe)
import { spawnSync } from 'node:child_process';

const CLI = 'C:\\Users\\admin\\.workbuddy\\binaries\\node\\cli-connector-packages\\node_modules\\@larksuite\\cli\\bin\\lark-cli.exe';
const URL = 'https://c7lhitw5pz.feishu.cn/sheets/KsxxsyWQFhlxmet2nIycYU3DnAh';

const rows = [
  { r: 2, doc: 'DqDadjpP0oMX1gxYGwocLmZDnyd', asin: 'B0DJQS14DS' },
  { r: 3, doc: 'NohtdiyltoWOIixDEeLcnyVSnEe', asin: 'B0GF1Z3CFH' },
  { r: 4, doc: 'YpGbdOQNToNiChxzTkZcgL5enEd', asin: 'B0FL6X3HRW' },
];

for (const { r, doc, asin } of rows) {
  const link = `https://c7lhitw5pz.feishu.cn/docx/${doc}`;
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
