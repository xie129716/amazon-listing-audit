import { ROOT, LARK_CLI } from './paths.mjs';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';

const CLI = LARK_CLI;
const REPORTS = `${ROOT}/reports`;
const MAP = `${ROOT}/data/derived/doc-urls.json`;

const ASINS = process.argv.slice(2);
if (!ASINS.length) { console.error('usage: node create-docs.mjs ASIN...'); process.exit(1); }

let map = {};
if (existsSync(MAP)) map = JSON.parse(readFileSync(MAP, 'utf8'));

for (const asin of ASINS) {
  if (map[asin]?.url) { console.log(`${asin}: 已存在，跳过 -> ${map[asin].url}`); continue; }
  const file = `${asin}-诊断报告.md`;
  const abs = `${REPORTS}/${file}`;
  if (!existsSync(abs)) { console.log(`${asin}: 报告文件不存在 ${abs}`); continue; }

  // lark-cli 的 @file 只接受 cwd 下的相对路径 → 在 reports 目录内执行
  const res = spawnSync(CLI, [
    'docs', '+create', '--doc-format', 'markdown', '--as', 'user',
    '--content', `@./${file}`,
  ], { cwd: REPORTS, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

  let parsed = null;
  try { parsed = JSON.parse(res.stdout); } catch {}
  if (parsed?.ok && parsed.data?.document?.url) {
    map[asin] = { url: parsed.data.document.url, documentId: parsed.data.document.document_id, createdAt: new Date().toISOString() };
    writeFileSync(MAP, JSON.stringify(map, null, 2), 'utf8');
    console.log(`${asin}: 已创建 -> ${parsed.data.document.url}`);
  } else {
    console.log(`${asin}: 创建失败 -> ${(res.stdout || res.stderr || '').slice(0, 300)}`);
  }
}
mkdirSync(`${ROOT}/data/derived`, { recursive: true });
writeFileSync(MAP, JSON.stringify(map, null, 2), 'utf8');
console.log('\ndoc-urls.json updated');
