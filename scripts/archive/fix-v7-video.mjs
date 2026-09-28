import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const v = JSON.parse(readFileSync(P, 'utf8'));

/* ============================================================================
   视频构成（实测：从 Related videos 模块逐条解析，含时长与创作者名）
   · 品牌视频   = 「Videos for this product」段，卖家自建（创作者名为自有品牌）
   · 红人视频   = 「Product Videos - <创作者名>」段（Related videos for this product）
   · 用户视频   = 「Customer Review: <标题>」段
   ========================================================================== */
const VIDEO = {
  B0EX0001: {
    brand: ['BRAND_A'],
    creators: ['Chasity Robinson', 'Mona Ko', 'Authentic Insights with Karen', 'Whitley', 'Amy Lynn'],
    users: ['Nancy M.'],
  },
  B0EX0005: {
    brand: ['BRAND_B'],
    creators: ['Cara Jess', 'Musclemilkdaddy', 'DisorderlyReviews'],
    users: [],
  },
  B0EX0004: {
    brand: ['BRAND_C'],
    creators: ['She Reviews Things', 'She Reviews Things', 'Allison Kate', 'Sarah'],
    users: ['Yorkie Mama'],
  },
  B0EX0003: {
    brand: ['BRAND_C'],
    creators: ['Zac & Kori Jones', 'Byron Harter', 'Byron Harter', 'Amy Lynn', 'DisorderlyReviews', 'The Sandro Show'],
    users: [],
  },
  B0EX0006: {
    brand: ['（卖家自建）'],
    creators: [],
    users: [],
    note: '该 listing 主图区仅标注 "VIDEO"（1 条），Related videos 模块未渲染出可解析条目，红人视频数暂记为 0，建议人工复核',
  },
  B0EX0002: {
    brand: [],
    creators: ['R Alison', "Kassi Pike - Tried & True Reviews", "⭐️IlaMarie's Must Haves⭐️", 'Christina’s Awesome Reviews', 'KPLikedIt', 'Paige McConkey', 'Stephanie Kelly', 'Stellina'],
    users: ['Jennifer Du Mond'],
  },
};

for (const [asin, c] of Object.entries(VIDEO)) {
  if (!v[asin]) continue;
  const uniqCreators = [...new Set(c.creators)];
  v[asin].creatorVideo = {
    heroText: '',
    brandCount: c.brand.length,
    creatorCount: c.creators.length,
    creatorUniqueCount: uniqCreators.length,
    customerCount: c.users.length,
    brandNames: c.brand,
    creatorNames: c.creators,
    creatorNamesUnique: uniqCreators,
    userNames: c.users,
    note: c.note || '',
  };
}

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('视频构成（红人 / 用户 分开）：\n');
for (const [a, e] of Object.entries(v)) {
  if (a.startsWith('_')) continue;
  const c = e.creatorVideo;
  console.log(`${a}`);
  console.log(`   品牌视频 ${c.brandCount} 条 | 红人视频 ${c.creatorCount} 条（去重 ${c.creatorUniqueCount}）| 用户视频 ${c.customerCount} 条`);
  if (c.creatorNames.length) console.log(`   红人：${c.creatorNames.join('、')}`);
  if (c.note) console.log(`   备注：${c.note}`);
}
