import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);

await cdp.send('Page.navigate', { url: 'https://www.amazon.com/dp/B0EX0001' }, sessionId);
for (let i = 0; i < 45; i++) {
  await sleep(1000);
  if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
}
await ev(`(async () => { const h = document.body.scrollHeight; for (let y = 0; y < h; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 200)); } return 1; })()`);
await sleep(4000);

// 打开图片/视频查看器
await ev(`(() => { const t = document.querySelector('#altImages li.videoThumbnail input, #altImages li.videoThumbnail'); if (t) { try { t.click(); } catch(e){} } return 1; })()`);
await sleep(6000);
await ev(`(() => { for (const a of document.querySelectorAll('a,button')) { if (/^videos$/i.test((a.innerText||'').trim())) { try { a.click(); return 1; } catch(e){} } } return 0; })()`);
await sleep(8000);

// 枚举视频查看器里的所有卡片与分组标题
const dump = await ev(`(() => {
  const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
  const out = { url: location.href, groups: [], cards: [] };

  // 1) 找所有可能是分组标题的节点（含 product / related / review / video 字样）
  const heads = [];
  for (const el of document.querySelectorAll('h1,h2,h3,h4,h5,span,div,p')) {
    const t = txt(el.innerText);
    if (!t || t.length > 80) continue;
    if (/videos?\\s+(for|of|related)/i.test(t) || /related videos/i.test(t) || /^videos for this product/i.test(t) || /customer review videos?/i.test(t) || /^product videos/i.test(t)) {
      heads.push({ tag: el.tagName, cls: String(el.className).slice(0, 60), text: t });
    }
  }
  out.groups = heads.slice(0, 20);

  // 2) 枚举查看器内的视频卡片
  const sels = ['#vvp-videos li', '#vvp-videos .vse-video-item', '.vse-video-item', '#ivVideosTab li', '[id*="vvp"] li', '[class*="vvp"] li'];
  for (const s of sels) {
    for (const n of document.querySelectorAll(s)) {
      const t = txt(n.innerText);
      if (!t) continue;
      const img = n.querySelector('img');
      out.cards.push({ sel: s, text: t.slice(0, 180), alt: txt(img?.getAttribute('alt') || '').slice(0, 100) });
    }
    if (out.cards.length) break;
  }
  // 3) 查看器容器整体文本（含分组与卡片顺序）
  const container = document.querySelector('#vvp-videos, #vvp, #ivVideosTab, [class*="vvp"]');
  out.containerText = txt(container?.innerText || '').slice(0, 2500);
  out.videoCountText = txt(document.querySelector('#videoCount')?.innerText || '');
  return out;
})()`);

console.log('URL:', dump.url);
console.log('videoCount:', dump.videoCountText);
console.log('\n=== 分组标题候选 ===');
dump.groups.forEach(g => console.log(`  [${g.tag}.${g.cls}] ${g.text}`));
console.log('\n=== 容器文本（前 2500 字符）===');
console.log(dump.containerText);
console.log('\n=== 卡片 ===');
dump.cards.slice(0, 20).forEach((c, i) => console.log(`  [${i + 1}] (${c.sel}) alt="${c.alt}" text="${c.text.slice(0, 150)}"`));

writeFileSync(`${ROOT}/data/derived/video-dom-dump.json`, JSON.stringify(dump, null, 2), 'utf8');
cdp.ws.close();
