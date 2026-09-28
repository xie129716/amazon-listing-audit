import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));

// 实测结果：三类视频彻底分开
//   brand  = 「Videos for this product」卖家自建品牌视频
//   creator= 「Product Videos - <创作者名>」红人合作视频（带 Earns Commissions）
//   customer=「Customer Review: <标题>」用户测评视频
const VIDEO = {
  B0EX0001: { heroTotal: 6, brand: 4, creator: 1, customer: 1, creatorNames: ['Chasity Robinson'] },
  B0EX0005: { heroTotal: 4, brand: 2, creator: 1, customer: 1, creatorNames: ['Cara Jess'] },
  B0EX0004: { heroTotal: 5, brand: 3, creator: 1, customer: 1, creatorNames: ['Yorkie Mama'] },
  B0EX0003: { heroTotal: 7, brand: 5, creator: 1, customer: 1, creatorNames: ['Zac & Kori Jones'] },
  B0EX0006: { heroTotal: 1, brand: 1, creator: 0, customer: 1, creatorNames: [], note: '未检出红人合作视频（仅有卖家自建与用户测评）' },
  B0EX0002: { heroTotal: 7, brand: 5, creator: 1, customer: 1, creatorNames: ['Jennifer Du Mond'] },
};

for (const [asin, c] of Object.entries(VIDEO)) {
  if (!v[asin]) continue;
  v[asin].creatorVideo = {
    heroTotal: c.heroTotal,
    brandCount: c.brand,
    creatorCount: c.creator,          // ← 表格 Z 列「红人视频数」用这个
    customerCount: c.customer,        // 用户测评视频，单列不合并
    creatorNames: c.creatorNames,
    note: c.note || `红人合作视频：${c.creatorNames.join('、') || '无'}；用户测评视频 ${c.customer} 条`,
  };
}

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('视频构成（红人与用户分开统计）：');
for (const [a, e] of Object.entries(v)) {
  if (a.startsWith('_')) continue;
  const c = e.creatorVideo;
  console.log(` ${a}: 卖家自建 ${c?.brandCount} | 红人合作 ${c?.creatorCount} | 用户测评 ${c?.customerCount}`);
}
