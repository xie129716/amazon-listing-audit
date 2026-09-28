/* 打开一个飞书文档并截图，用于人工核对排版（尤其是表格「对照图」单元格）。 */
import { ROOT } from './paths.mjs';
import { writeFileSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 9333;
const url = process.argv[2];
const out = process.argv[3] || `${ROOT}/.tmp/shot.png`;
const waitMs = Number(process.argv[4] || 6000);

const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
let target = list.find((t) => t.type === 'page' && t.url.includes('feishu.cn/docx'));
let created = false;
if (!target) {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
  target = await r.json();
  created = true;
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res) => { ws.onopen = res; });

let id = 0;
const pending = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
};
function send(method, params = {}) {
  const i = ++id;
  return new Promise((res) => { pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
}

await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url });
await sleep(waitMs);
const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
if (!shot.result?.data) { console.log('shot failed', JSON.stringify(shot).slice(0, 400)); process.exit(1); }
writeFileSync(out, Buffer.from(shot.result.data, 'base64'));

const title = await send('Runtime.evaluate', { expression: 'document.title + " || " + location.href', returnByValue: true });
console.log('URL:', title.result?.result?.value);
console.log('SAVED:', out);
ws.close();
