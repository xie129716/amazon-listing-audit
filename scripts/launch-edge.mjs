import { ROOT } from './paths.mjs';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
const PROFILE = `${ROOT}/.edge-profile`;
const PORT = 9333;

mkdirSync(PROFILE, { recursive: true });

// already up?
try {
  const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
  if (r.ok) { console.log('CDP already up:', (await r.json()).Browser); process.exit(0); }
} catch {}

const args = [
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${PROFILE}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--disable-features=Translate,msEdgeIdentityFeature',
  '--lang=en-US',
  '--window-size=1440,1000',
  '--window-position=40,40',
  'about:blank',
];

const child = spawn(EDGE, args, { detached: true, stdio: 'ignore' });
child.unref();

for (let i = 0; i < 80; i++) {
  await sleep(500);
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
    if (r.ok) {
      const v = await r.json();
      console.log('CDP READY:', v.Browser);
      process.exit(0);
    }
  } catch {}
}
console.log('FAILED: no CDP');
process.exit(1);
