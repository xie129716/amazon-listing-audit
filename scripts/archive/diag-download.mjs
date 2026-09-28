// Bounded diagnostic: can we still download images, and how fast?
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 Edg/138.0.0.0';
const urls = [
  'https://m.media-amazon.com/images/I/71ZrAiqpNAL._AC_SL1500_.jpg',
  'https://m.media-amazon.com/images/I/71tHrhex+dL._AC_SL1500_.jpg',
  'https://m.media-amazon.com/images/I/71EY69oRkxL._AC_SL1500_.jpg',
];
for (const u of urls) {
  const t0 = Date.now();
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20000);
  try {
    const r = await fetch(u, { headers: { 'User-Agent': UA, Referer: 'https://www.amazon.com/' }, signal: ac.signal });
    const buf = Buffer.from(await r.arrayBuffer());
    console.log(`OK ${r.status} ${buf.length}B in ${Date.now() - t0}ms  ${u.slice(50, 80)}`);
  } catch (e) {
    console.log(`FAIL after ${Date.now() - t0}ms: ${e.name} ${e.message}  ${u.slice(50, 80)}`);
  } finally {
    clearTimeout(timer);
  }
}
console.log('diagnostic complete');
