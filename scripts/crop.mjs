/* 裁剪 + 放大导出图片，用于「视觉结论取证」（见 docs/评分规则.md 反幻觉规范）。
 *
 * 用法：
 *   node scripts/crop.mjs <原图> <输出png> <x> <y> <宽> <高> [放大倍数=3]
 *   node scripts/crop.mjs <原图> <输出png> full 0 0 0 [放大倍数]   # full=整图放大
 *
 * 为什么要这么做：1464x600 的 A+ 图上，一个单词只有十几像素高，
 * 直接看缩略图极易读错甚至脑补出根本不存在的文字（曾因此误报 "PROFESSINAL"）。
 */
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const [inPath, outPath, X = '0', Y = '0', W = '0', H = '0', S = '3'] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('usage: node scripts/crop.mjs <in> <out.png> <x> <y> <w> <h> [scale]');
  process.exit(1);
}
if (!existsSync(inPath)) { console.error('no such file:', inPath); process.exit(1); }

const ps = `
Add-Type -AssemblyName System.Drawing
$src = [System.Drawing.Image]::FromFile("${inPath.replace(/\\/g, '\\\\')}")
$X = [int]${X}; $Y = [int]${Y}; $W = [int]${W}; $H = [int]${H}; $S = [double]${S}
if ($W -le 0) { $W = $src.Width }
if ($H -le 0) { $H = $src.Height }
if ($X -lt 0) { $X = 0 }
if ($Y -lt 0) { $Y = 0 }
if ($X + $W -gt $src.Width)  { $W = $src.Width - $X }
if ($Y + $H -gt $src.Height) { $H = $src.Height - $Y }
$dw = [int]($W * $S); $dh = [int]($H * $S)
$dst = New-Object System.Drawing.Bitmap($dw, $dh)
$g = [System.Drawing.Graphics]::FromImage($dst)
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.DrawImage($src, (New-Object System.Drawing.Rectangle(0,0,$dw,$dh)), (New-Object System.Drawing.Rectangle($X,$Y,$W,$H)), [System.Drawing.GraphicsUnit]::Pixel)
$g.Dispose(); $dst.Save("${outPath.replace(/\\/g, '\\\\')}", [System.Drawing.Imaging.ImageFormat]::Png); $dst.Dispose(); $src.Dispose()
Write-Output "SAVED ${outPath} crop=($X,$Y,$W,$H) scale=$S -> \${dw}x\${dh}"
`;

/* 注意：本机 harness 跑的是 Windows PowerShell 5.1（C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe），
   不是 pwsh 7 —— `pwsh` 不在 PATH 上。 */
const PS = 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe';

const r = spawnSync(PS, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', ps], { encoding: 'utf8' });
process.stdout.write(r.stdout || '');
process.stderr.write(r.stderr || '');
if (r.error) process.stderr.write(`spawn error: ${r.error.message}\n`);
if (r.status !== 0) process.exit(r.status || 1);
