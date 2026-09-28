import { spawnSync } from 'node:child_process';

const CLI = 'C:\\Users\\admin\\.workbuddy\\binaries\\node\\cli-connector-packages\\node_modules\\@larksuite\\cli\\bin\\lark-cli.exe';
const URL = 'https://c7lhitw5pz.feishu.cn/sheets/KsxxsyWQFhlxmet2nIycYU3DnAh';

function csv(sheetId, range) {
  const res = spawnSync(CLI, ['sheets', '+csv-get', '--url', URL, '--sheet-id', sheetId, '--range', range, '--as', 'user'],
    { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const j = JSON.parse(res.stdout);
  if (!j?.ok) return `FAILED ${(j?.error?.message || res.stdout || '').slice(0, 300)}`;
  return j.data.annotated_csv;
}

console.log('=== 主表 R1:AA7（报告链接 + 五维分 + 总分 + 新标题 + 红人/用户视频数）===');
console.log(csv('a81751', 'R1:AA7'));

console.log('\n=== 主表 A1:G7（核对行号对应 ASIN）===');
console.log(csv('a81751', 'A1:G7'));

console.log('\n=== 检查总览 ===');
console.log(csv('t7Ih3i', 'A1:N7'));
