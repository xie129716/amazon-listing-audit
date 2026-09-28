import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'node:fs';
import { parseGallery } from './parse-gallery.mjs';

const ASINS = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['B0DJQS14DS', 'B0GF1Z3CFH', 'B0FL6X3HRW', 'B0FF8YBX8P', 'B0GGNM98LD'];
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0';
const IMG_DIR = 'E:/listing_exam/data/images';
const MANIFEST = 'E:/listing_exam/data/derived/image-manifest.json';
mkdirSync(IMG_DIR, { recursive: true });

function parseAplus(html) {
  const i = html.indexOf('id="aplus"');
  const region = i >= 0 ? html.slice(i, i + 400000) : '';
  const src = region || html;
  const urls = []; const seen = new Set();
  for (const m of src.matchAll(/(?:data-src|data-a-hires|src)="(https:\/\/m\.media-amazon\.com\/images\/S\/aplus-media[^"]+)"/g)) {
    const u = m[1].replace(/&amp;/g, '&');
    if (!seen.has(u)) { seen.add(u); urls.push(u); }
  }
  return urls.filter((u) => /\.(jpg|jpeg|png|webp)/i.test(u));
}

async function dlOnce(url, path) {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 25000);
  try {
    const r = await fetch(url, { headers: { 'User-Agent': UA, Referer: 'https://www.amazon.com/' }, signal: ac.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 800) throw new Error('too small ' + buf.length);
    writeFileSync(path, buf);
    return buf.length;
  } finally {
    clearTimeout(timer);
  }
}

async function dl(url, path) {
  if (existsSync(path)) return 'cached';
  let last = '';
  for (let a = 1; a <= 3; a++) {
    try { return await dlOnce(url, path); }
    catch (e) { last = e.name + ':' + e.message; await new Promise((r) => setTimeout(r, 1000 * a)); }
  }
  return 'ERR:' + last;
}

const manifest = {};
if (existsSync(MANIFEST)) { try { Object.assign(manifest, JSON.parse(readFileSync(MANIFEST, 'utf8'))); } catch {} }
for (const asin of ASINS) {
  const html = readFileSync(`E:/listing_exam/data/raw/${asin}.html`, 'utf8');
  const json = JSON.parse(readFileSync(`E:/listing_exam/data/raw/${asin}.json`, 'utf8'));
  const gallery = parseGallery(html);
  const aplusUrls = parseAplus(html);

  const entry = {
    asin, title: json.title, titleLen: json.titleLen,
    main: null, galleryImages: [], videoSlots: [], aplus: [],
  };

  // 主图：colorImages 里 MAIN 的 hiRes 偶为 null → 回退到 json.mainImage 并把尺寸后缀升级为 _AC_SL1500_
  const mainEntry = gallery.find((g) => g.variant === 'MAIN' && g.hiRes) || gallery.find((g) => g.variant === 'MAIN') || gallery[0];
  let mainUrl = mainEntry?.hiRes || null;
  if (!mainUrl) {
    const src = json.mainImage?.src || json.mainImage?.dynamicImage || '';
    mainUrl = src ? src.replace(/\._[^.]*_\.jpg$/, '._AC_SL1500_.jpg') : null;
    if (mainUrl) console.log(`  · ${asin} MAIN hiRes 为空，回退到 mainImage：${mainUrl.slice(-40)}`);
  }
  if (mainUrl) {
    const p = `${IMG_DIR}/${asin}-MAIN.jpg`;
    const size = await dl(mainUrl, p);
    if (typeof size === 'string' && size.startsWith('ERR')) console.log(`  ! ${asin} 主图下载失败：${size}`);
    entry.main = { label: '主图 MAIN', path: p.replace('E:/listing_exam/', ''), url: mainUrl, size };
  } else {
    console.log(`  ! ${asin} 无法确定主图地址`);
  }

  for (const g of gallery.filter((x) => x.variant && x.variant !== 'MAIN')) {
    // 有些条目 variant 存在但 hiRes 为 null（页面占位/视频位），跳过并提示，避免生成指向空文件的条目
    if (!g.hiRes) { console.log(`  ! ${asin} ${g.variant} 无 hiRes，跳过`); continue; }
    const p = `${IMG_DIR}/${asin}-${g.variant}.jpg`;
    const size = await dl(g.hiRes, p);
    if (typeof size === 'string' && size.startsWith('ERR')) console.log(`  ! ${asin} ${g.variant} 下载失败：${size}`);
    entry.galleryImages.push({ label: `副图 ${g.variant}`, path: p.replace('E:/listing_exam/', ''), url: g.hiRes, size });
  }

  entry.videoSlots = (json.gallery || []).filter((g) => g.kind === 'video').map((g, i) => ({ label: `视频位 ${i + 1}`, thumb: g.thumb }));

  for (let i = 0; i < aplusUrls.length; i++) {
    const p = `${IMG_DIR}/${asin}-APLUS-${String(i + 1).padStart(2, '0')}.jpg`;
    const size = await dl(aplusUrls[i], p);
    entry.aplus.push({ label: `A+ 图 ${i + 1}`, path: p.replace('E:/listing_exam/', ''), url: aplusUrls[i], size });
  }

  manifest[asin] = entry;
  writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`${asin}: MAIN=1, 副图=${entry.galleryImages.length}, 视频位=${entry.videoSlots.length}, A+图=${entry.aplus.length}`);
}

console.log('=== manifest complete ===');
