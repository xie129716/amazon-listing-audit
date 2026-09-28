import { ROOT } from './paths.mjs';
import { setTimeout as sleep } from 'node:timers/promises';
import { writeFileSync } from 'node:fs';
import { connect, getPageSession, makeEval } from './amz-lib.mjs';

const ASINS = process.argv.slice(2);
const cdp = await connect();
const sessionId = await getPageSession(cdp);
const ev = makeEval(cdp, sessionId);
const out = {};

for (const asin of ASINS) {
  await cdp.send('Page.navigate', { url: `https://www.amazon.com/dp/${asin}` }, sessionId);
  for (let i = 0; i < 45; i++) {
    await sleep(1000);
    if (await ev(`!!document.querySelector('#productTitle')`).catch(() => false)) break;
  }
  await sleep(3000);

  // 在页面上下文里请求 VSE 视频列表接口（同源，带 cookie）
  const d = await ev(`(async () => {
    const out = { asin: '${asin}' };
    const urls = [
      '/vse/ajax/getVideoList?asin=${asin}&clientId=VSE-US&pageType=Detail&marketplaceId=ATVPDKIKX0DER',
      '/vse/api/v1/videos?asin=${asin}&marketplaceId=ATVPDKIKX0DER',
      '/hz/vse/ajax/getVideoList?asin=${asin}&marketplaceId=ATVPDKIKX0DER',
    ];
    out.attempts = [];
    for (const u of urls) {
      try {
        const r = await fetch(u, { credentials: 'include', headers: { 'accept': 'application/json' } });
        const t = await r.text();
        out.attempts.push({ url: u, status: r.status, len: t.length, body: t.slice(0, 900) });
      } catch (e) { out.attempts.push({ url: u, error: String(e).slice(0, 120) }); }
    }
    // 同时抓 videoCount 文案与 #vvp 相关节点文本
    const txt = (s) => (s || '').replace(/\\s+/g, ' ').trim();
    out.videoCountText = txt(document.querySelector('#videoCount')?.innerText || '');
    out.vvpText = txt(document.querySelector('#vvp-videos, [id*="vvp"]')?.innerText || '').slice(0, 500);
    return out;
  })()`);
  out[asin] = d;
  console.log(`===== ${asin} | 主图区: ${d.videoCountText}`);
  for (const a of d.attempts) console.log('  ', a.url, '->', a.status ?? a.error, a.len ? `len=${a.len}` : '');
  const good = d.attempts.find((a) => a.body && a.body.length > 50 && !/error|not found/i.test(a.body.slice(0, 60)));
  if (good) console.log('   BODY:', good.body.slice(0, 500));
  await sleep(2000);
}
writeFileSync(`${ROOT}/data/derived/video-api.json`, JSON.stringify(out, null, 2), 'utf8');
cdp.ws.close();
