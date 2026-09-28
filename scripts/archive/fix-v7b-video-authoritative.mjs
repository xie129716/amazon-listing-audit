import { readFileSync, writeFileSync } from 'node:fs';

const P = 'E:/listing_exam/data/derived/visual-findings.json';
const v = JSON.parse(readFileSync(P, 'utf8'));

/* ============================================================================
   视频统计口径（已与运营核对确认）
   · creatorType 字段是权威依据：Seller / Influencer / Customer 三类
   · 红人视频数 = creatorType=Influencer 的条目，**按创作者名去重**
     （同一创作者多条视频只计 1；例：She Reviews Things 2 条 → 计 1）
   · 用户视频数 = creatorType=Customer 的条目
   · 品牌视频数 = creatorType=Seller 的条目
   ========================================================================== */
const VIDEO = {
  B0DJQS14DS: {
    brandCount: 1, brandNames: ['Luvcosy'],
    creatorEntries: 5, creatorUnique: 5, authoritative: 4,
    creatorNames: ['Chasity Robinson', 'Mona Ko', 'Amy Lynn', 'Whitley', '⭐ Authentic Insights with Karen⭐'],
    customerCount: 1, customerNames: ['Nancy M.'],
    verified: true, note: '运营核定为 4（本工具按 creatorType=Influencer 去重得 5，差 1 条待运营按后台核对剔除）',
  },
  B0GF1Z3CFH: {
    brandCount: 1, brandNames: ['FANTOVO'],
    creatorEntries: 3, creatorUnique: 3, authoritative: 3,
    creatorNames: ['Cara Jess', 'Musclemilkdaddy', 'DisorderlyReviews'],
    customerCount: 0, customerNames: [],
    verified: true, note: '',
  },
  B0FL6X3HRW: {
    brandCount: 1, brandNames: ['Kiicii'],
    creatorEntries: 4, creatorUnique: 3, authoritative: 3,
    creatorNames: ['She Reviews Things', 'Allison Kate', 'Sarah'],
    customerCount: 1, customerNames: ['Yorkie Mama'],
    verified: true, note: '其中 She Reviews Things 有 2 条视频，按创作者去重后计 1',
  },
  B0FF8YBX8P: {
    brandCount: 1, brandNames: ['Kiicii'],
    creatorEntries: 6, creatorUnique: 5, authoritative: null,
    creatorNames: ['Zac & Kori Jones', 'Byron Harter', 'Amy Lynn', 'DisorderlyReviews', 'The Sandro Show'],
    customerCount: 0, customerNames: [],
    verified: false, note: '其中 Byron Harter 有 2 条视频，按创作者去重后计 1；数值待运营核对',
  },
  B0GGNM98LD: {
    brandCount: 1, brandNames: ['FANTOVO'],
    creatorEntries: 0, creatorUnique: 0, authoritative: null,
    creatorNames: [],
    customerCount: 0, customerNames: [],
    verified: false, note: '主图区仅标注 "VIDEO"（1 条），Related videos 模块未渲染出 Influencer 条目，红人视频数暂记 0，需人工复核',
  },
  B0FDQMCKRM: {
    brandCount: 1, brandNames: ['Viotiin'],
    creatorEntries: 8, creatorUnique: 8, authoritative: null,
    creatorNames: ['R Alison', "Kassi Pike - Tried & True Reviews", "⭐️IlaMarie's Must Haves⭐️", 'Christina’s Awesome Reviews', 'KPLikedIt', 'Paige McConkey', 'Stephanie Miller', '⭐️ Simply Unland'],
    customerCount: 1, customerNames: ['Jennifer Du Mond'],
    verified: false, note: '数值待运营核对',
  },
};

for (const [asin, c] of Object.entries(VIDEO)) {
  if (!v[asin]) continue;
  v[asin].creatorVideo = {
    brandCount: c.brandCount,
    brandNames: c.brandNames,
    creatorEntries: c.creatorEntries,
    creatorCount: c.creatorUnique,                      // 按创作者去重
    creatorAuthoritative: c.authoritative,              // 运营核定值（如有）
    creatorNames: c.creatorNames,
    customerCount: c.customerCount,
    customerNames: c.customerNames,
    verifiedByOps: c.verified,
    note: c.note,
  };
}

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('视频统计（红人=按创作者去重）：\n');
for (const [a, e] of Object.entries(v)) {
  if (a.startsWith('_')) continue;
  const c = e.creatorVideo;
  const used = c.creatorAuthoritative ?? c.creatorCount;
  console.log(`${a}: 品牌 ${c.brandCount} | 红人 ${used}${c.creatorAuthoritative != null ? '（运营核定）' : '（本工具去重）'} | 用户 ${c.customerCount}`);
  if (c.note) console.log(`   ${c.note}`);
}
