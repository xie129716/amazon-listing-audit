import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

/* 用 DocxXML 上传/覆盖飞书诊断报告（v7：报告内含「对照图」单元格内嵌原图）。
   cwd 必须是 E:/listing_exam —— @file 与 <img path="@./..."> 都只接受 cwd 下的相对路径。 */

const CLI = 'C:\\Users\\admin\\.workbuddy\\binaries\\node\\cli-connector-packages\\node_modules\\@larksuite\\cli\\bin\\lark-cli.exe';
const ROOT = 'E:/listing_exam';
const REPORTS = `${ROOT}/reports`;
const MAP = `${ROOT}/data/derived/doc-urls.json`;

const ASINS = process.argv.slice(2);
if (!ASINS.length) { console.error('usage: node refresh-docs.mjs ASIN...'); process.exit(1); }

let map = {};
if (existsSync(MAP)) map = JSON.parse(readFileSync(MAP, 'utf8'));

function run(args) {
  const res = spawnSync(CLI, args, { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let j = null; try { j = JSON.parse(res.stdout); } catch {}
  return { j, raw: `${res.stdout || ''}${res.stderr || ''}` };
}

for (const asin of ASINS) {
  const rel = `reports/${asin}-诊断报告.xml`;
  if (!existsSync(`${ROOT}/${rel}`)) { console.log(`${asin}: 报告文件不存在 ${rel}`); continue; }

  const existing = map[asin];
  if (existing?.documentId) {
    const { j, raw } = run([
      'docs', '+update', '--doc', existing.documentId,
      '--command', 'overwrite', '--doc-format', 'xml',
      '--content', `@./${rel}`, '--as', 'user',
    ]);
    if (j?.ok) { console.log(`${asin}: 已覆盖更新 -> ${existing.url}`); continue; }
    console.log(`${asin}: 覆盖失败，改为新建 -> ${(j?.error?.message || raw).slice(0, 300)}`);
  }

  const { j, raw } = run([
    'docs', '+create', '--doc-format', 'xml', '--as', 'user', '--content', `@./${rel}`,
  ]);
  if (j?.ok && j.data?.document?.url) {
    map[asin] = { url: j.data.document.url, documentId: j.data.document.document_id, createdAt: new Date().toISOString() };
    writeFileSync(MAP, JSON.stringify(map, null, 2), 'utf8');
    console.log(`${asin}: 新建 -> ${j.data.document.url}`);
  } else {
    console.log(`${asin}: 新建失败 -> ${(j?.error?.message || raw).slice(0, 400)}`);
  }
}
writeFileSync(MAP, JSON.stringify(map, null, 2), 'utf8');
console.log('\ndoc-urls.json updated');
