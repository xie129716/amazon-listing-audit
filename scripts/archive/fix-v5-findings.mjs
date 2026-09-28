import { readFileSync, writeFileSync } from 'node:fs';
import { suggestTitleHighlights } from './scoring.mjs';

const P = 'E:/listing_exam/data/derived/visual-findings.json';
const v = JSON.parse(readFileSync(P, 'utf8'));

// 复核更正：图上原文是 Protable（既非子代理报的 Protoble，也非 Portable）
v.B0FDQMCKRM.spellingInImage = [
  { text: 'Protable and easy access', should: 'Portable and easy access', where: '副图 PT03 与 A+ 图 02' },
];
v.B0FDQMCKRM.imageSpelling = [
  { msg: '副图 PT03 与 A+ 图 02 图内拼写错误："Protable" 应为 "Portable"' },
];

const SPEC = {
  B0DJQS14DS: {
    brand: 'LUVCOSY', coreNoun: 'Silicone Lids for Powder Cleanser', spec: '2 Pack, 12oz & 21oz',
    sellingPoints: ['Compatible with Bar Keepers Friend, Comet, Ajax and Bon Ami', 'Moisture Resistant', 'Keeps Powder Dry', 'Dishwasher Safe', 'Food-Grade Silicone', '2 Pack'],
  },
  B0GF1Z3CFH: {
    brand: 'FANTOVO', coreNoun: '70-Slot 3ml Vial Storage Case', spec: 'for Peptide & Insulin',
    sellingPoints: ['Hard Shell with Soft Insert', 'Silicone Seal Lid', 'Freezer and Refrigerator Safe', 'Compact for Home and Travel', 'Portable Vial Organizer', 'Case Only'],
  },
  B0FL6X3HRW: {
    brand: 'KIICII', coreNoun: '8 Pack Silicone Lids for La Fermiere Yogurt Jars', spec: '2.8 Inch',
    sellingPoints: ['Compatible with La Fermiere and Oui Yogurt Jars', 'Airtight Seal', 'BPA Free', 'Food-Grade Silicone', 'Dishwasher Safe', 'Reusable Jar Covers', 'Jars Not Included'],
  },
  B0FF8YBX8P: {
    brand: 'FANTOVO', coreNoun: '3ml Vial Insert for Hydrapeak Food Jars', spec: '3 Pieces',
    sellingPoints: ['Compatible with 18oz 25oz 32oz Hydrapeak Food Jars', 'Holds up to 48 Vials', 'Food-Grade Silicone', 'Stackable', 'Reusable', 'Cold Resistant', 'Dishwasher Safe', 'Inserts Only'],
  },
  B0GGNM98LD: {
    brand: 'FANTOVO', coreNoun: 'Bottle and Hose Holder for Spectra S1 S2 Plus', spec: '',
    sellingPoints: ['Compatible with Spectra S1 and S2 Plus Breast Pumps', 'Dual Cup Design', 'Extra Storage Space', 'Hose Management', 'Stable and Anti-Spill', 'Baby-Safe PP Material', 'White'],
  },
  B0FDQMCKRM: {
    brand: 'VIOTIIN', coreNoun: '10 Pack Card Holders for Yoto Cards', spec: 'with 3 Ring Loops',
    sellingPoints: ['Compatible with Yoto Mini Player Audio Cards', '5 Bright Colors', 'Durable Plastic', 'Steel Ring Loops', 'Portable Travel Organizer', 'Easy to Categorize', 'Cards Not Included'],
  },
};

for (const [asin, cfg] of Object.entries(SPEC)) {
  v[asin].titleSuggestion = suggestTitleHighlights(cfg);
}

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
for (const [a, e] of Object.entries(v)) {
  if (a.startsWith('_')) continue;
  const s = e.titleSuggestion;
  if (!s) continue;
  console.log(`${a}: 标题 ${s.titleLen}/75 | 亮点 ${s.highlightsLen}/125`);
  console.log(`   标题：${s.title}`);
  console.log(`   亮点：${s.highlights}`);
}
