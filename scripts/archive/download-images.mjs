import { ROOT } from './paths.mjs';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0';
const pass1 = JSON.parse(readFileSync(`${ROOT}/data/derived/extract-pass1.json`, 'utf8'));

mkdirSync(`${ROOT}/data/images`, { recursive: true });

async function dl(url, path) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, 'Referer': 'https://www.amazon.com/' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 1000) throw new Error('too small ' + buf.length);
      writeFileSync(path, buf);
      return buf.length;
    } catch (e) {
      if (attempt === 3) return 'ERR ' + e.message;
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
}

const report = {};
for (const [asin, d] of Object.entries(pass1)) {
  report[asin] = { main: [], aplus: [] };
  const mainUrls = (d.imageUrls || []).slice(0, 12);
  for (let i = 0; i < mainUrls.length; i++) {
    const p = `${ROOT}/data/images/${asin}-main-${String(i + 1).padStart(2, '0')}.jpg`;
    const size = await dl(mainUrls[i], p);
    report[asin].main.push({ i: i + 1, url: mainUrls[i], size });
  }
  const aplusUrls = (d.aplusImageUrls || []).slice(0, 12);
  for (let i = 0; i < aplusUrls.length; i++) {
    const p = `${ROOT}/data/images/${asin}-aplus-${String(i + 1).padStart(2, '0')}.jpg`;
    const size = await dl(aplusUrls[i], p);
    report[asin].aplus.push({ i: i + 1, url: aplusUrls[i], size });
  }
  console.log(asin, 'main:', report[asin].main.map((x) => x.size).join(','), '| aplus:', report[asin].aplus.map((x) => x.size).join(','));
}

writeFileSync(`${ROOT}/data/derived/download-report.json`, JSON.stringify(report, null, 2), 'utf8');
console.log('done');
