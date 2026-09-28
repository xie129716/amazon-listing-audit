/* 把 v9 权威视频统计写入 visual-findings.json（替换 v7/v8 的错误计数）。 */
import { ROOT } from './paths.mjs';
import { readFileSync, writeFileSync } from 'node:fs';

const P = `${ROOT}/data/derived/visual-findings.json`;
const vf = JSON.parse(readFileSync(P, 'utf8'));
const v9 = JSON.parse(readFileSync(`${ROOT}/data/derived/video-counts-v9.json`, 'utf8'));

const nameOf = (text, creator) => {
  // 卡片文本 = "时长 标题 创作者"，创作者取链接 tag 兜底
  let t = String(text || '').trim();
  return t;
};

for (const [asin, d] of Object.entries(v9)) {
  if (asin === '_note') continue;
  const e = vf[asin];
  if (!e) continue;
  const mk = (arr) => arr.map((x) => ({ dur: x.dur, text: x.text, creator: x.creator || '', seg: x.seg }));
  e.creatorVideo = {
    source: 'immersive-viewer-v9',
    videoCountBadge: d.videoCountBadge,
    badgeMatch: d.badgeMatch,
    segments: d.segments,
    brandCount: d.brandCount,
    brandNames: [...new Set(d.brandVideos.map((x) => x.creator).filter(Boolean))],
    brandVideos: mk(d.brandVideos),
    creatorCount: d.creatorCount,
    creatorNames: [...new Set(d.creatorVideos.map((x) => x.creator).filter(Boolean))],
    creatorVideos: mk(d.creatorVideos),
    customerCount: d.customerCount,
    customerNames: [...new Set(d.customerVideos.map((x) => x.creator).filter(Boolean))],
    customerVideos: mk(d.customerVideos),
    unknown: d.unknown || [],
    dedup: false,
    note: '类型取自条目链接中的亚马逊视频 ID（amzn1.ive.seller.video＝卖家 / amzn1.vse.video＝达人 / amzn1.productreview＝买家）。'
      + '红人名单会随亚马逊轮播变化，但三类数量稳定；同一红人的多条视频不去重，按条目计数。',
  };

  // 清理 v7 遗留的、已被证伪的「无红人合作视频」提示
  const before = (e.remainingIssues || []).length;
  e.remainingIssues = (e.remainingIssues || []).filter((r) => !/红人合作视频|视频模块/.test(String(r.msg || '')));
  if (e.remainingIssues.length !== before) console.log(`   ${asin}: 清除 ${before - e.remainingIssues.length} 条过期的视频结论`);

  console.log(`${asin}: 角标 ${d.videoCountBadge} | 品牌 ${d.brandCount} / 红人 ${d.creatorCount} / 用户 ${d.customerCount} | ${d.badgeMatch ? '✅' : (d.badgeMatch === null ? 'n/a' : '❌')}`);
}

writeFileSync(P, JSON.stringify(vf, null, 2), 'utf8');
console.log('\nvisual-findings.json updated');
