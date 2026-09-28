import { readFileSync } from 'node:fs';
import { parseGallery } from './parse-gallery.mjs';

const asin = process.argv[2];
const j = JSON.parse(readFileSync(`E:/listing_exam/data/raw/${asin}.json`, 'utf8'));
console.log('mainImage:', JSON.stringify(j.mainImage).slice(0, 300));
console.log('hiResCount:', j.hiResCount, '| galleryImageCount:', j.galleryImageCount);
const html = readFileSync(`E:/listing_exam/data/raw/${asin}.html`, 'utf8');
const g = parseGallery(html);
console.log('parseGallery 条目 ' + g.length + '：');
g.forEach((e) => console.log('  ', e.idx, String(e.variant), e.hiRes ? e.hiRes.slice(-50) : 'NULL'));
