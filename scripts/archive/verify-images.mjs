import { readFileSync, existsSync } from 'node:fs';

const manifest = JSON.parse(readFileSync('E:/listing_exam/data/derived/image-manifest.json', 'utf8'));
let missing = 0, present = 0;
for (const [asin, e] of Object.entries(manifest)) {
  const files = [];
  if (e.main) files.push(e.main);
  files.push(...e.galleryImages, ...e.aplus);
  const miss = files.filter((f) => !existsSync('E:/listing_exam/' + f.path));
  const ok = files.length - miss.length;
  present += ok; missing += miss.length;
  console.log(`${asin}: ${ok}/${files.length} 存在` + (miss.length ? `  缺失 -> ${miss.map((m) => m.label + '(' + m.path.split('/').pop() + ')').join(', ')}` : ''));
}
console.log(`\n合计: 存在 ${present}, 缺失 ${missing}`);
