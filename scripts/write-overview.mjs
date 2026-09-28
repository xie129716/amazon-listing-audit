import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const CLI = 'C:\\Users\\admin\\.workbuddy\\binaries\\node\\cli-connector-packages\\node_modules\\@larksuite\\cli\\bin\\lark-cli.exe';
const URL = 'https://c7lhitw5pz.feishu.cn/sheets/KsxxsyWQFhlxmet2nIycYU3DnAh';
process.chdir('E:/listing_exam');

const scores = JSON.parse(readFileSync('data/derived/scores.json', 'utf8'));
const docs = JSON.parse(readFileSync('data/derived/doc-urls.json', 'utf8'));
const vis = JSON.parse(readFileSync('data/derived/visual-findings.json', 'utf8'));
const health = JSON.parse(readFileSync('data/derived/health-analysis.json', 'utf8'));
const sheet = JSON.parse(readFileSync('data/derived/sheet-all-records.json', 'utf8'));
const recByAsin = {};
for (const r of sheet.records) recByAsin[r.ASIN] = r;

const OVERVIEW_ASINS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['B0DJQS14DS', 'B0GF1Z3CFH', 'B0FL6X3HRW', 'B0FF8YBX8P', 'B0GGNM98LD', 'B0FDQMCKRM'];

const SHEET_NAME = '检查总览';

/** 摘要同样只讲诊断，去掉规则机制类表述 */
const RULE_META = [
  /（仅提示[^）]*）/g, /（[^）]*不扣分[^）]*）/g, /（按\s*v?\d*[^）]*）/g,
  /（[^）]*豁免[^）]*）/g, /（[^）]*v\d+[^）]*）/g, /（[^）]*重复计[^）]*）/g,
  /[，,、；;]?\s*按\s*v?\d+(\.\d+)?\s*「[^」]*」[^，。；]*/g,
  /[，,、；;]?\s*按\s*v?\d+(\.\d+)?\s*[^，。；]*/g,
  /[，,、；;]?\s*仅提示/g, /[，,、；;]?\s*无需整改/g, /[，,、；;]?\s*从宽处理/g,
  /（\s*）/g,
];
const clean = (s) => {
  let t = String(s ?? '');
  for (const re of RULE_META) t = t.replace(re, '');
  t = t.replace(/不扣分/g, '无需整改');
  t = t.replace(/[，,、]\s*(?=[。；;，,、])/g, '').replace(/；\s*；/g, '；');
  return t.replace(/^[，,、；;。\s]+/, '').replace(/[，,、；;\s]+$/, '').trim();
};

function run(args, label) {
  const res = spawnSync(CLI, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  let j = null; try { j = JSON.parse(res.stdout); } catch {}
  console.log(`${label}: ok=${j?.ok}`, j?.error?.message?.slice(0, 200) || '');
  return j;
}

const info = run(['sheets', '+workbook-info', '--url', URL, '--as', 'user'], 'workbook-info');
const sheets = info?.data?.sheets || [];
if (!sheets.find((s) => s.sheet_name === SHEET_NAME)) {
  run(['sheets', '+sheet-create', '--url', URL, '--title', SHEET_NAME, '--as', 'user'], 'sheet-create');
} else console.log('overview sheet exists');

const header = [
  '表格行号', 'ASIN', '店铺', '品名', '父ASIN',
  'listing完整度评分', 'AMZ合规度评分', '文案准确度评分', '视觉准确度评分', '数据健康度评分', '总分', '风险等级',
  '检查报告', '主要问题摘要（P0/P1，无则列提示项）',
];

const rows = [header];
for (const asin of OVERVIEW_ASINS) {
  const s = scores[asin]?.score || {};
  const rec = recByAsin[asin] || {};
  const h = health[asin] || {};
  const v = vis[asin] || {};

  // 摘要只列「需要运营动手」的项；道具本体上的第三方标识不算问题
  const onProp = (x) => x && x.onProp === true;
  const issues = [
    ...(v.mainImageThirdPartyLogo || []).filter((x) => !onProp(x)).map((x) => `[P0]主图第三方品牌logo：${x.brand}`),
    ...(v.thirdPartyUnrelated || []).filter((x) => !onProp(x)).map((x) => `[P0]图片未抹品牌名：${x.brand}`),
    ...(v.sensitive || []).filter((x) => !onProp(x)).map((x) => `[P0]敏感画面：${x.msg}`),
    ...(v.propDrugNameRisk || []).filter((x) => !onProp(x)).map((x) => `[P1]处方药名示意：${x.msg}`),
    ...(v.borrowedEndorsement || []).filter((x) => !onProp(x)).map((x) => `[P1]借用第三方背书：${x.msg}`),
    ...(v.disparagementAbnormal || []).filter((x) => !onProp(x)).map((x) => `[P1]贬损性对比文案异常：${x.msg}`),
    ...(v.spellingInImage || []).map((x) => `[P0]图片拼写错误：${x.text}`),
    ...(v.misleadingContradiction || []).map((x) => `[P1]图文矛盾：${x.msg}`),
    ...(h.issues || []).filter((i) => i.level === 'P0').map((i) => `[P0]${i.msg}`),
  ];
  let top = [...new Set(issues)].slice(0, 3).join(' ｜ ');
  // 若已无 P0/P1，则退化为提示级问题，避免摘要列空白
  if (!top) {
    const reminders = [
      ...(v.remainingIssues || []).filter((r) => r.level === '提示').map((r) => `[提示]${r.where || ''}：${r.msg}`),
      ...(h.issues || []).filter((i) => i.level !== 'P0' && i.level !== 'OK').map((i) => `[提示]${i.msg}`),
      ...(v.countColorTension || []).map((x) => `[提示]展示差异：${x.msg}`),
      ...(v.unreadableProps || []).map((x) => `[提示]道具文字不可辨：${x.msg}`),
      ...(v.thirdPartyUnrelated || []).filter(onProp).map((x) => `[提示]道具上的第三方品牌：${x.brand}`),
    ];
    top = [...new Set(reminders)].slice(0, 2).join(' ｜ ') || '无 P0/P1 问题，仅少量提示项';
  }
  top = clean(top);

  rows.push([
    String(h.row ?? ''),
    asin,
    rec['店铺'] || '',
    rec['品名'] || '',
    rec['父ASIN'] || '',
    Number(s.completeness ?? 0),
    Number(s.compliance ?? 0),
    Number(s.copy ?? 0),
    Number(s.visual ?? 0),
    Number(s.health ?? 0),
    Number(s.total ?? 0),
    s.risk || '',
    docs[asin]?.url || '',
    top.slice(0, 900),
  ]);
}
const payload = {
  sheets: [{
    name: SHEET_NAME,
    columns: header,
    data: rows.slice(1),
    dtypes: { '表格行号': 'object' },
    formats: {},
  }],
};
writeFileSync('data/derived/overview-payload.json', JSON.stringify(payload), 'utf8');

// 先清掉历史列（列数变动时避免旧内容残留）
run(['sheets', '+cells-clear', '--url', URL, '--sheet-id',
  (info?.data?.sheets || []).find((s) => s.sheet_name === SHEET_NAME)?.sheet_id || 't7Ih3i',
  '--range', 'A1:T200', '--scope', 'content', '--yes', '--as', 'user'], 'cells-clear');

const res = spawnSync(CLI, ['sheets', '+table-put', '--url', URL, '--as', 'user', '--sheets', '@./data/derived/overview-payload.json'],
  { encoding: 'utf8', cwd: 'E:/listing_exam', maxBuffer: 32 * 1024 * 1024 });
let j = null; try { j = JSON.parse(res.stdout); } catch {}
console.log('table-put ok=', j?.ok, j?.error?.message?.slice(0, 300) || '');
if (!j?.ok) console.log((res.stdout || res.stderr || '').slice(0, 800));
