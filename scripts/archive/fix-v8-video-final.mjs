import { readFileSync, writeFileSync } from 'node:fs';

const P = 'E:/listing_exam/data/derived/visual-findings.json';
const v = JSON.parse(readFileSync(P, 'utf8'));

/* ============================================================================
   视频统计口径 v8（运营已固化）
   · 品牌视频 = 条目署名 **恰好等于自有品牌** 的那一条（Videos for this product）
   · 红人视频 = 其余非 Customer Review 的条目（Product Videos - <创作者>），
                **按条目计数，同一红人多条视频不去重**
   · 用户视频 = 条目名以 "Customer Review:" 开头的条目
   · 桌/移动两套重复卡片按内容去重（同一时长+同一标题+同一署名只计 1）
   · 权威来源：模块可见条目原文；不用固定字符窗口匹配 creatorType
   ========================================================================== */
const VIDEO = {
  B0DJQS14DS: {
    brand: [{ dur: '0:45', text: 'Silicone Powder Cleanser Lids', creator: 'Luvcosy' }],
    creators: [
      { dur: '1:20', text: 'Honest Review of these Silicone Powder Cleaner Lids', creator: 'Whitley' },
      { dur: '2:33', text: 'Great Solution! Finally! Lids For my Bar keepers cleaner', creator: '⭐ Authentic Insights with Karen⭐' },
      { dur: '0:14', text: 'Check out these powder lids! They keep powder dry.', creator: 'Chasity Robinson' },
      { dur: '0:55', text: 'Silicone lids cover are a great solution to cover cleaning', creator: 'Amy Lynn' },
      { dur: '1:01', text: 'Silicone lid for powder cleaner bottle', creator: 'Mona Ko' },
    ],
    customers: [{ dur: '0:12', text: 'Works GREAT for damp locations!', creator: 'Nancy M.' }],
  },
  B0GF1Z3CFH: {
    brand: [{ dur: '0:33', text: '3ml Vial Peptide Storage Case', creator: 'FANTOVO' }],
    creators: [
      { dur: '3:08', text: 'A must if you use peptides!', creator: 'Cara Jess' },
      { dur: '2:13', text: 'Peptides Always Falling Around!? (Safe Keeping)', creator: 'Musclemilkdaddy' },
      { dur: '2:24', text: '3ml Vial Storage Container HONEST REVIEW', creator: 'DisorderlyReviews' },
    ],
    customers: [],
  },
  B0FL6X3HRW: {
    brand: [{ dur: '0:36', text: '8PCs La Fermiere Yogurt Jar Lids', creator: 'Kiicii' }],
    creators: [
      { dur: '1:04', text: 'Reusable lids that fit La Fermiere Yogurt Jars', creator: 'Sarah' },
      { dur: '1:04', text: 'Worth it? Watch this to find about these La Fermiere lids', creator: 'She Reviews Things' },
      { dur: '2:09', text: 'Things to know before you buy these La Fermiere yogurt lids', creator: 'She Reviews Things' },
      { dur: '1:25', text: 'Perfect Way to Reuse Old Yogurt Jars!', creator: 'Allison Kate' },
    ],
    customers: [{ dur: '0:59', text: 'Saved my ultimate yogurt jars (and my sanity)! Fits Oui jars too', creator: 'Yorkie Mama' }],
  },
  B0FF8YBX8P: {
    brand: [{ dur: '0:50', text: 'Silicone 3ml Vial Insert Compatible with Hydrapeak Food Jars', creator: 'Kiicii' }],
    creators: [
      { dur: '1:08', text: 'Features of the 3ml Silicone Vial Holders', creator: 'Zac & Kori Jones' },
      { dur: '1:00', text: 'KiiCii Silicone 3ml Vial Insert (1 short +2 tall) Review', creator: 'Byron Harter' },
      { dur: '3:01', text: 'Purekra Silicone 3ml Vial Insert Set Review', creator: 'Byron Harter' },
      { dur: '0:57', text: 'Peptide or Medical Vial Storage Cooler for Fridge or Travel', creator: 'Amy Lynn' },
      { dur: '3:45', text: '3ml Vial Case and Organizer HONEST REVIEW', creator: 'DisorderlyReviews' },
      { dur: '1:39', text: '3ml vial storage unboxing - take a look!', creator: 'The Sandro Show' },
    ],
    customers: [],
  },
  B0GGNM98LD: {
    brand: [{ dur: '', text: 'bottle and hose holder', creator: 'FANTOVO' }],
    creators: [],
    customers: [],
    note: '运营已确认：仅 1 条品牌方视频，无红人视频、无用户视频',
  },
  B0FDQMCKRM: {
    brand: [{ dur: '0:00', text: 'Reusable Plastic Card Holder for Yoto Cards', creator: 'Viotiin' }],
    creators: [
      { dur: '0:30', text: 'Great for yoto cards and more!', creator: 'R Alison' },
      { dur: '1:43', text: "Do they hold the cards securely? Mom's Opinion!", creator: 'Kassi Pike - Tried & True Reviews' },
      { dur: '1:40', text: 'We love these Yoto Card Holders!', creator: "⭐️IlaMarie's Must Haves⭐️" },
      { dur: '0:45', text: 'Surprised at how well these seem to hold Yoto cards.', creator: "Christina's Awesome Reviews" },
      { dur: '1:12', text: 'Organize Your Yoto Cards', creator: 'Paige McConkey' },
      { dur: '3:52', text: 'YOTO Demonstration and review as well as tips and tricks!', creator: 'Stephanie Kelly' },
      { dur: '0:44', text: 'Do these actually keep a Yoto card without falling out?', creator: "Christina's Awesome Reviews" },
      { dur: '0:42', text: 'Never lose a Yoto Card Again! Buy this Holder!', creator: 'Stellina' },
    ],
    customers: [{ dur: '0:57', text: 'Easy organization and sturdy materials', creator: 'Jennifer Du Mond' }],
  },
};

for (const [asin, c] of Object.entries(VIDEO)) {
  if (!v[asin]) continue;
  v[asin].creatorVideo = {
    brandCount: c.brand.length,
    brandNames: c.brand.map(b => b.creator),
    brandVideos: c.brand,
    creatorCount: c.creators.length,          // 不去重
    creatorNames: c.creators.map(x => x.creator),
    creatorVideos: c.creators,
    customerCount: c.customers.length,
    customerNames: c.customers.map(x => x.creator),
    customerVideos: c.customers,
    dedup: false,
    note: c.note || '',
  };
}

writeFileSync(P, JSON.stringify(v, null, 2), 'utf8');
console.log('视频最终统计（红人按条目、不去重）：\n');
for (const [a, e] of Object.entries(v)) {
  if (a.startsWith('_')) continue;
  const c = e.creatorVideo;
  console.log(`${a}: 品牌 ${c.brandCount} | 红人 ${c.creatorCount} | 用户 ${c.customerCount}`);
  if (c.creatorCount) console.log(`   红人：${c.creatorNames.join('、')}`);
}
