/* 校验已上线的飞书文档：确认「对照图」单元格内确实嵌了原图，并统计各章节图片数。 */
import { spawnSync } from 'node:child_process';

const CLI = 'C:\\Users\\admin\\.workbuddy\\binaries\\node\\cli-connector-packages\\node_modules\\@larksuite\\cli\\bin\\lark-cli.exe';
const docs = JSON.parse((await import('node:fs')).readFileSync('E:/listing_exam/data/derived/doc-urls.json', 'utf8'));
const ASINS = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(docs).filter((k) => docs[k]?.documentId);

for (const asin of ASINS) {
  const d = docs[asin];
  if (!d?.documentId) { console.log(`${asin}: 无文档`); continue; }
  const res = spawnSync(CLI, ['docs', '+fetch', '--as', 'user', '--doc', d.documentId, '--doc-format', 'markdown'],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  let j = null; try { j = JSON.parse(res.stdout); } catch {}
  if (!j?.ok) { console.log(`${asin}: fetch 失败 ${(res.stdout || '').slice(0, 200)}`); continue; }
  const c = j.data.document.content;
  const total = (c.match(/<img /g) || []).length;
  // 统计关键章节
  const seg = (a, b) => { const i = c.indexOf(a); const k = b ? c.indexOf(b) : c.length; return i < 0 ? '' : c.slice(i, k > i ? k : c.length); };
  const sec3 = seg('三、AMZ 合规度', '四、文案准确度');
  const sec5 = seg('五、视觉准确度', '六、实质问题清单');
  const sec6 = seg('六、实质问题清单', '七、数据健康度');
  const inTable = (s) => (s.match(/<td[^>]*><img /g) || []).length;
  console.log(`${asin}: 文档内图片 ${total} 张 | 三合规表内 ${inTable(sec3)} | 五视觉表内 ${inTable(sec5)} | 六问题表内 ${inTable(sec6)} | len=${c.length}`);
}
