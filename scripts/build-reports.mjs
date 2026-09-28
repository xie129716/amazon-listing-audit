/* ============================================================================
   诊断报告生成器 v7

   产物：
     reports/<ASIN>-诊断报告.xml   飞书 DocxXML（含「对照图」单元格内嵌原图）→ 上传飞书
     reports/<ASIN>-诊断报告.md    本地纯文本版（便于 diff / 阅读，不含图）

    v7 变化：
     1. 合规度放宽 —— 第三方道具本体自带标识豁免（见 scoring.mjs）
     2. 三、五、六 三张问题表新增「对照图」列，把定位到的原图直接嵌入单元格
   ========================================================================== */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import {
  scoreCompleteness, scoreDeduct, finalise,
  copyDeductions, visualDeductions, healthDeductions,
  complianceDeductions, complianceTextRisk, complianceExemptions, RUBRIC_VERSION, OWN_BRANDS,
  MIN_GALLERY_IMAGES, MIN_BULLETS,
} from './scoring.mjs';

const ROOT = 'E:/listing_exam';
const ASINS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['B0DJQS14DS', 'B0GF1Z3CFH', 'B0FL6X3HRW', 'B0FF8YBX8P', 'B0GGNM98LD', 'B0FDQMCKRM'];

const text = JSON.parse(readFileSync(`${ROOT}/data/derived/text-analysis.json`, 'utf8'));
const health = JSON.parse(readFileSync(`${ROOT}/data/derived/health-analysis.json`, 'utf8'));
const sheet = JSON.parse(readFileSync(`${ROOT}/data/derived/sheet-all-records.json`, 'utf8'));
const manifest = JSON.parse(readFileSync(`${ROOT}/data/derived/image-manifest.json`, 'utf8'));

let visual = {};
try { visual = JSON.parse(readFileSync(`${ROOT}/data/derived/visual-findings.json`, 'utf8')); } catch {}
let copyExtra = {};
try { copyExtra = JSON.parse(readFileSync(`${ROOT}/data/derived/copy-extra.json`, 'utf8')); } catch {}
let compExtra = {};
try { compExtra = JSON.parse(readFileSync(`${ROOT}/data/derived/compliance-extra.json`, 'utf8')); } catch {}

const recByAsin = {};
for (const r of sheet.records) recByAsin[r.ASIN] = r;

const TITLE_BRAND_CHECK = {
  B0DJQS14DS: false, B0GF1Z3CFH: false, B0FL6X3HRW: false,
  B0FF8YBX8P: false, B0GGNM98LD: false, B0FDQMCKRM: null,
};

const verdict = (s) => s >= 90 ? '合格' : s >= 80 ? '基本合格' : s >= 70 ? '需整改' : s >= 60 ? '不合格' : '严重不合格';

/* ---------------- 图片定位 ---------------- */

/** 展开 "A+ 图 01/02/03" 这类简写 */
function expandImageRefs(s) {
  return String(s || '').replace(
    /(A\+\s*图\s*)(\d{1,2}(?:\s*[/、,，]\s*\d{1,2})+)/g,
    (_m, pre, nums) => nums.split(/[/、,，]/).map((x) => `${pre.trim()} ${x.trim()}`).join(' / '),
  );
}

/** 从一段文字里解析出涉及哪些图，返回 [{label, path, url}] */
function resolveImages(src, mf) {
  const out = []; const seen = new Set();
  const push = (label, path, url) => {
    if (!path || seen.has(label)) return;
    seen.add(label); out.push({ label, path, url });
  };
  const s = expandImageRefs(src);
  if (/主图|MAIN/.test(s)) push('主图 MAIN', mf.main?.path, mf.main?.url);

  for (const m of s.matchAll(/\bPT\s*0*(\d{1,2})\b/gi)) {
    const n = Number(m[1]);
    const g = (mf.galleryImages || []).find((x) => Number(String(x.label).replace(/\D+/g, '')) === n);
    if (g) push(g.label, g.path, g.url);
  }
  const aplusHit = (n) => (mf.aplus || []).find((x) => Number(String(x.label).replace(/\D+/g, '')) === n);
  for (const m of s.matchAll(/A\+\s*图\s*(\d{1,2})/gi)) { const g = aplusHit(Number(m[1])); if (g) push(g.label, g.path, g.url); }
  for (const m of s.matchAll(/A\+\s*0*(\d{1,2})\b/gi)) { const g = aplusHit(Number(m[1])); if (g) push(g.label, g.path, g.url); }
  for (const m of s.matchAll(/APLUS-(\d{1,2})/gi)) { const g = aplusHit(Number(m[1])); if (g) push(g.label, g.path, g.url); }
  return out.slice(0, 3);
}

/* ---------------- XML / Markdown 内联渲染 ---------------- */

/* 报告只讲诊断，不讲评分规则机制。此处是**渲染期兜底清洗**：
   任何数据里残留的「按 v10 规则豁免 /（仅提示，不扣分）/ 统计口径…」都会被去掉，
   即使某个子代理或历史数据又写进去了，报告也不会漏出来。 */
const RULE_META = [
  /（仅提示[^）]*）/g, /（[^）]*不重复计[^）]*）/g, /（[^）]*不扣分[^）]*）/g,
  /（[^）]*已扣分[^）]*）/g, /（[^）]*已计入[^）]*扣分[^）]*）/g,
  /（按\s*v?\d*[^）]*）/g, /（[^）]*v\d+\s*(标准|起|第\s*\d+\s*条)[^）]*）/g,
  /（[^）]*合并计一次[^）]*）/g, /（[^）]*与「AMZ 合规度」[^）]*）/g,
  /[，,、；;]?\s*按\s*v?\d+(\.\d+)?\s*「[^」]*」[^，。；]*/g,
  /[，,、；;]?\s*按\s*v?\d+(\.\d+)?\s*(第\s*\d+\s*条)?[^，。；]*/g,
  /[，,、；;]?\s*仅提示无需整改/g, /[，,、；;]?\s*仅提示/g, /[，,、；;]?\s*无需整改/g,
  /[，,、；;]?\s*从宽处理/g, /[，,、；;]?\s*口径豁免/g, /[，,、；;]?\s*豁免不扣分/g,
  /，?扣分统一见「[^」]*」[，,]?\s*本维度不重复计/g,
  /（\s*）/g,
];
const cleanText = (s) => {
  let t = String(s ?? '');
  for (const re of RULE_META) t = t.replace(re, '');
  t = t.replace(/不扣分|无需扣分/g, '无需整改');
  t = t.replace(/[，,、]\s*(?=[。；;，,、])/g, '').replace(/[；;]\s*(?=[。；;])/g, '');
  return t.replace(/^[，,、；;。\s]+/, '').replace(/[，,、；;\s]+$/, '').trim();
};

const xEsc = (s) => String(cleanText(s) ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

/** 支持 **粗体** 与 `代码` 的极简内联 */
const xInline = (s) => xEsc(s)
  .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  .replace(/`([^`]+)`/g, '<code>$1</code>');

const mEsc = (s) => String(cleanText(s) ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');

/* ---------------- 块模型 ---------------- */

const cell = (text, images = []) => ({ text: text ?? '', images });
const plain = (text) => ({ text: text ?? '', images: [] });

function renderXml(blocks) {
  const X = [];
  for (const b of blocks) {
    switch (b.t) {
      case 'title': X.push(`<title>${xEsc(b.text)}</title>`); break;
      case 'h1': X.push(`<h1>${xInline(b.text)}</h1>`); break;
      case 'h2': X.push(`<h2>${xInline(b.text)}</h2>`); break;
      case 'p': X.push(`<p>${xInline(b.text)}</p>`); break;
      case 'quote': X.push(`<blockquote><p>${xInline(b.text)}</p></blockquote>`); break;
      case 'hr': X.push('<hr/>'); break;
      case 'code': X.push(`<pre><code>${xEsc(b.text)}</code></pre>`); break;
      case 'ul': X.push(`<ul>${b.items.map((i) => `<li>${xInline(i)}</li>`).join('')}</ul>`); break;
      case 'table': {
        const w = b.imgW || 300;
        const th = b.head.map((h) => `<th vertical-align="top"><p>${xInline(h)}</p></th>`).join('');
        const trs = b.rows.map((row) => {
          const tds = row.map((c) => {
            const o = typeof c === 'string' ? plain(c) : c;
            const imgs = (o.images || [])
              .map((im) => `<img path="@./${im.path}" width="${w}"/>`)
              .join('');
            const txt = o.text ? `<p>${xInline(o.text)}</p>` : '';
            return `<td vertical-align="top">${txt}${imgs || (txt ? '' : '<p>—</p>')}</td>`;
          }).join('');
          return `<tr>${tds}</tr>`;
        }).join('');
        X.push(`<table><thead><tr>${th}</tr></thead><tbody>${trs}</tbody></table>`);
        break;
      }
    }
  }
  return X.join('\n');
}

function renderMd(blocks) {
  const M = [];
  for (const b of blocks) {
    switch (b.t) {
      case 'title': M.push(`# ${b.text}`); break;
      case 'h1': M.push(`## ${b.text}`); break;
      case 'h2': M.push(`### ${b.text}`); break;
      case 'p': M.push(b.text); break;
      case 'quote': M.push(`> ${b.text}`); break;
      case 'hr': M.push('---'); break;
      case 'code': M.push('```', b.text, '```'); break;
      case 'ul': for (const i of b.items) M.push(`- ${i}`); break;
      case 'table': {
        M.push(`| ${b.head.join(' | ')} |`);
        M.push(`| ${b.head.map(() => '---').join(' | ')} |`);
        for (const row of b.rows) {
          const cs = row.map((c) => {
            const o = typeof c === 'string' ? plain(c) : c;
            const imgs = (o.images || []).map((im) => `![${im.label}](${im.path})`).join(' ');
            return mEsc(o.text) + (imgs ? (o.text ? ' ' : '') + imgs : '');
          });
          M.push(`| ${cs.join(' | ')} |`);
        }
        break;
      }
    }
    M.push('');
  }
  return M.join('\n');
}

/* ---------------- 主流程 ---------------- */

function buildBlocks(asin) {
  const t = text[asin] || {};
  const h = health[asin] || { issues: [], metrics: {} };
  const v = visual[asin] || {};
  const rec = recByAsin[asin] || {};
  const mf = manifest[asin] || {};

  const checks = {
    mainImage: { ok: !!mf.main, note: mf.main ? `主图 MAIN 存在（白底：${v.mainImageWhiteBackground === false ? '否' : '是'}）` : '主图缺失' },
    galleryImages: {
      ok: (mf.galleryImages || []).length >= MIN_GALLERY_IMAGES,
      note: `副图 ${(mf.galleryImages || []).length} 张${(mf.galleryImages || []).length >= MIN_GALLERY_IMAGES ? '' : `（不足 ${MIN_GALLERY_IMAGES} 张）`}`,
    },
    video: {
      ok: (mf.videoSlots || []).length > 0,
      note: (mf.videoSlots || []).length
        ? `主图角标 ${v.creatorVideo?.videoCountBadge ?? '—'} VIDEOS｜品牌 ${v.creatorVideo?.brandCount ?? 0} · 红人 ${v.creatorVideo?.creatorCount ?? 0} · 用户 ${v.creatorVideo?.customerCount ?? 0}`
        : '未发现视频',
      extra: v.creatorVideo?.creatorCount
        ? `红人视频 ${v.creatorVideo.creatorCount} 条`
        : '无红人合作视频，建议补充达人合作视频',
    },
    aplus: { ok: (mf.aplus || []).length > 0, note: `A+ 图 ${(mf.aplus || []).length} 张` },
    title: { ok: !!t.title, note: `标题 ${t.titleLen} 字符；是否为新标题（两段式）：${t.hasItemHighlights ? '有' : '无'}` },
    bullets: {
      ok: (t.bullets || []).length >= MIN_BULLETS,
      note: `五点 ${(t.bullets || []).length} 条${(t.bullets || []).length < MIN_BULLETS ? `（不足 ${MIN_BULLETS} 条）` : ''}`,
    },
    cart: { ok: v.cartOk !== false, note: 'Add to cart 正常 / In Stock' },
    category: { ok: true, note: (h.metrics && h.metrics.liveCrumb) || '' },
  };
  const comp = scoreCompleteness(checks);

  const exempt = complianceExemptions(v);
  // compliance-extra：正则与 findings 字段都覆盖不到的**人工判定类合规问题**
  // （如受管制品类关联、商品主体上的第三方 logo 等），按 ASIN 手工维护
  const compIssues = [
    ...complianceDeductions(v, rec['店铺'] || ''),
    ...complianceTextRisk(t.title),
    ...(compExtra[asin]?.issues || []),
  ];
  const isSplitTitle = !!t.hasItemHighlights;
  const copyIssues = [...copyDeductions(t, { titleStartsWithBrand: TITLE_BRAND_CHECK[asin] ?? null, isSplitTitle }), ...(copyExtra[asin]?.copy || [])];
  const visIssues = visualDeductions(v);
  const healthIssues = healthDeductions(h);

  const dims = finalise({
    completeness: comp.score,
    compliance: scoreDeduct(100, compIssues),
    copy: scoreDeduct(100, copyIssues),
    visual: scoreDeduct(100, visIssues),
    health: scoreDeduct(100, healthIssues),
  });

  const M = h.metrics || {};
  const R = rec;
  const B = [];
  const imgOf = (src) => resolveImages(src, mf);

  B.push({ t: 'title', text: `Amazon Listing 诊断报告 — ${asin}` });
  B.push({ t: 'p', text: `**检查时间**：${new Date().toISOString().slice(0, 10)}　|　**店铺**：${R['店铺'] || ''}　|　**站点**：${R['国家'] || '美国'}　|　**表格行号**：第 ${h.row ?? '—'} 行` });
  B.push({ t: 'p', text: `**品名**：${R['品名'] || ''}　|　**父ASIN**：${R['父ASIN'] || ''}　|　**MSKU**：${R['MSKU'] || ''}` });
  B.push({ t: 'p', text: `**Listing 链接**：https://www.amazon.com/dp/${asin}` });
  B.push({ t: 'hr' });

  /* 一、综合评分 */
  B.push({ t: 'h1', text: '一、综合评分' });
  B.push({
    t: 'table', head: ['维度', '得分', '结论'],
    rows: [
      ['Listing 完整度', `**${dims.completeness} / 100**`, verdict(dims.completeness)],
      ['AMZ 合规度', `**${dims.compliance} / 100**`, verdict(dims.compliance)],
      ['文案准确度', `**${dims.copy} / 100**`, verdict(dims.copy)],
      ['视觉准确度', `**${dims.visual} / 100**`, verdict(dims.visual)],
      ['数据健康度', `**${dims.health} / 100**`, verdict(dims.health)],
      ['**总分（五维等权平均）**', `**${dims.total} / 100**`, dims.risk],
    ],
  });
  B.push({ t: 'hr' });

  /* 二、完整度 */
  B.push({ t: 'h1', text: `二、Listing 完整度（${dims.completeness}/100）` });
  B.push({
    t: 'table', head: ['检查项', '结果', '说明'],
    rows: comp.detail.map((i) => [i.label, i.ok ? '通过' : '**不通过**', i.note]),
  });
  if (v.creatorVideo) {
    const cv = v.creatorVideo;
    B.push({ t: 'p', text: `**视频构成明细**（主图角标 ${cv.videoCountBadge ?? '—'} VIDEOS，共 ${(cv.brandCount ?? 0) + (cv.creatorCount ?? 0) + (cv.customerCount ?? 0)} 条）：` });
    B.push({
      t: 'table', head: ['视频类型', '数量', '说明'],
      rows: [
        ['品牌视频（卖家自建）', String(cv.brandCount ?? 0), cv.brandNames?.length ? '品牌：' + cv.brandNames.join('、') : '—'],
        ['**红人视频**（达人合作视频）', `**${cv.creatorCount ?? 0}**`, cv.creatorNames?.length ? '创作者：' + cv.creatorNames.join('、') : '未检出红人合作视频'],
        ['用户视频（买家测评视频）', String(cv.customerCount ?? 0), cv.customerNames?.length ? '用户：' + cv.customerNames.join('、') : '—'],
      ],
    });
    if ((cv.creatorVideos || []).length) {
      B.push({ t: 'p', text: '**红人视频明细**：' });
      B.push({
        t: 'table', head: ['#', '时长', '视频标题', '创作者'],
        rows: cv.creatorVideos.map((x, i) => [String(i + 1), x.dur || '—', x.text, x.creator]),
      });
    }
    if ((cv.brandVideos || []).length) {
      B.push({ t: 'p', text: '**品牌视频明细**：' });
      B.push({
        t: 'table', head: ['#', '时长', '视频标题'],
        rows: cv.brandVideos.map((x, i) => [String(i + 1), x.dur || '—', x.text]),
      });
    }
    if ((cv.customerVideos || []).length) {
      B.push({ t: 'p', text: '**用户视频明细**：' });
      B.push({
        t: 'table', head: ['#', '时长', '视频标题'],
        rows: cv.customerVideos.map((x, i) => [String(i + 1), x.dur || '—', x.text]),
      });
    }
  }
  B.push({ t: 'hr' });

  /* 三、合规度 */
  B.push({ t: 'h1', text: `三、AMZ 合规度（${dims.compliance}/100）` });
  if (!compIssues.length) B.push({ t: 'p', text: '未发现合规问题。' });
  else {
    B.push({
      t: 'table', head: ['等级', '问题类型', '问题', '扣分', '对照图'], imgW: 260,
      rows: compIssues.map((i) => [i.level || '', i.rule || '', i.msg, i.deduct ? `−${i.deduct}` : '—', cell('', imgOf(i.msg))]),
    });
  }
  B.push({ t: 'p', text: `**以下内容已确认无需整改（避免误改）**：` });
  const exLines = [];
  for (const a of v.adaptedObjectBrands || []) {
    exLines.push(`「${a.brand}」— 出现在${a.where}，属**适配对象/道具本体**，不是我方商品，无需抹除`);
  }
  if (!exLines.length) exLines.push('无');
  B.push({ t: 'ul', items: exLines });
  B.push({ t: 'hr' });

  /* 四、文案 */
  B.push({ t: 'h1', text: `四、文案准确度（${dims.copy}/100）` });
  B.push({ t: 'p', text: `**完整标题（${t.titleLen} 字符，亚马逊上限 75）**：` });
  B.push({ t: 'quote', text: t.title || '' });
  B.push({ t: 'p', text: `**商品亮点（Item Highlights，上限 125 字符）**：${t.hasItemHighlights ? `已设置，${t.itemHighlightsLen} 字符` : '**未设置（缺失）**'}` });
  if (t.hasItemHighlights) B.push({ t: 'quote', text: t.itemHighlights || '' });
  if (!copyIssues.length) B.push({ t: 'p', text: '未发现文案问题。' });
  else {
    B.push({
      t: 'table', head: ['等级', '问题', '扣分'],
      rows: copyIssues.map((i) => [i.level || '', i.msg, i.deduct ? `−${i.deduct}` : '—']),
    });
  }
  const sug = v.titleSuggestion;
  if (sug) {
    B.push({ t: 'h2', text: '建议标题与亮点' });
    B.push({ t: 'p', text: `**建议标题（${sug.titleLen} / 75 字符）**：` });
    B.push({ t: 'code', text: sug.title });
    B.push({ t: 'p', text: `**建议亮点（${sug.highlightsLen} / 125 字符）**：` });
    B.push({ t: 'code', text: sug.highlights });
  }
  B.push({ t: 'hr' });

  /* 五、视觉 */
  B.push({ t: 'h1', text: `五、视觉准确度（${dims.visual}/100）` });
  if (!visIssues.length) B.push({ t: 'p', text: '未发现视觉问题。' });
  else {
    B.push({
      t: 'table', head: ['等级', '问题类型', '问题', '扣分', '对照图'], imgW: 260,
      rows: visIssues.map((i) => [i.level || '', i.rule || '', i.msg, i.deduct ? `−${i.deduct}` : '—', cell('', imgOf(i.msg))]),
    });
  }
  if ((v.notes || []).length) {
    // 「逐图核查记录」拆出图片位置，并把原图放进对照列
    const noteRows = (v.notes || []).map((n) => {
      const s = String(n);
      const i = s.indexOf('：');
      const where = i > 0 && i <= 24 ? s.slice(0, i) : '—';
      const body = i > 0 && i <= 24 ? s.slice(i + 1) : s;
      return [where, body, cell('', resolveImages(where, mf))];
    });
    B.push({ t: 'p', text: '**逐图核查记录（含对照图）**：' });
    B.push({ t: 'table', head: ['图片位置', '核查记录', '对照图'], rows: noteRows, imgW: 300 });
  }
  B.push({ t: 'hr' });

  /* 六、实质问题清单（含对照图） */
  const rem = v.remainingIssues || [];
  if (rem.length) {
    B.push({ t: 'h1', text: '六、实质问题清单（按优先级，可直接执行）' });
    if (v.productPositioningNote) B.push({ t: 'quote', text: `**产品定位说明**：${v.productPositioningNote}` });
    B.push({
      t: 'table', imgW: 320,
      head: ['等级', '图片位置', '问题', '建议动作', '对照图'],
      rows: rem.map((r) => {
        const action = r.level === 'P0' ? '**立即整改**' : r.level === 'P1' ? '优先整改' : r.level === 'P2' ? '排期整改' : '建议优化';
        const imgs = imgOf(`${r.where || ''} ${r.msg || ''}`);
        return [r.level, r.where || '', r.msg, action, cell('', imgs)];
      }),
    });
    const p0 = rem.filter((r) => r.level === 'P0').length;
    const p1 = rem.filter((r) => r.level === 'P1').length;
    B.push({ t: 'p', text: `**汇总**：P0 级 ${p0} 项（需立即整改）、P1 级 ${p1} 项（优先整改）、其余为提示优化项。` });
    B.push({ t: 'hr' });
  }

  /* 七、数据健康度 */
  B.push({ t: 'h1', text: `七、数据健康度（${dims.health}/100）` });
  B.push({
    t: 'table', head: ['指标', '实测值', '标准', '判定'],
    rows: [
      ['转化率/动销', `30 天销量 ${M.sell30}，日均 ${M.daily}，可售库存可支撑约 ${M.coverDays} 天`, '—', (h.issues || []).some((i) => i.code === 'H1' && i.level !== 'OK') ? '预警' : '通过'],
      ['库存（可售+在途）', `${M.sellable} + ${M.inTransit} = **${M.stockAvail}**`, '> 0', M.stockAvail > 0 ? '通过' : '不通过'],
      ['评论 & 星级', `**${M.rating} 星 / ${M.reviews} 条评论**`, '≥ 4 星', M.rating >= 4 ? '通过' : '不通过'],
      ['销量（近七天）', `日均 ${M.daily}，近 7 天约 **${Math.round((M.daily || 0) * 7)} 件**`, '有出单', M.sell30 > 0 ? '通过' : '不通过'],
      ['类目节点', `大类 ${M.erpBigCat || ''} #${M.bigRank ?? '—'}；小类 ${M.erpSubCat || ''} #${M.subRank ?? '—'}；前台路径 ${M.liveCrumb || ''}`, '归类相关', (h.issues || []).some((i) => i.code === 'H5' && i.level === 'P0') ? '不通过' : '通过'],
    ],
  });
  if (healthIssues.length) {
    B.push({ t: 'table', head: ['问题', '扣分'], rows: healthIssues.map((i) => [i.msg, `−${i.deduct}`]) });
  }

  return { asin, row: h.row, score: dims, blocks: B };
}

mkdirSync(`${ROOT}/reports`, { recursive: true });
const results = {};
for (const a of ASINS) {
  try {
    const r = buildBlocks(a);
    results[a] = { asin: r.asin, row: r.row, score: r.score };
    writeFileSync(`${ROOT}/reports/${a}-诊断报告.xml`, renderXml(r.blocks), 'utf8');
    writeFileSync(`${ROOT}/reports/${a}-诊断报告.md`, renderMd(r.blocks), 'utf8');
    console.log(`${a} (row ${r.row ?? '—'}): 完整度=${r.score.completeness} 合规度=${r.score.compliance} 文案=${r.score.copy} 视觉=${r.score.visual} 健康=${r.score.health} 总分=${r.score.total} ${r.score.risk}`);
  } catch (e) {
    console.log(`${a}: FAILED ${String(e && e.stack || e).slice(0, 400)}`);
  }
}
writeFileSync(`${ROOT}/data/derived/scores.json`, JSON.stringify(results, null, 2), 'utf8');
console.log('\nreports written to reports/  (rubric ' + RUBRIC_VERSION + ')');
