# amazon-listing-audit

**An agent skill that audits Amazon listings across five dimensions and hands operations a report they can actually act on — with the offending image embedded right next to each finding.**

> 中文说明见下方 [中文](#中文说明)。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## Why

Reviewing Amazon listings by hand does not scale: a single ASIN means 15–40 images, a title, five bullets,
A+ modules, videos, plus ERP data — and the failure modes are subtle (a mirrored logo letter, a missing space,
a rectangular lid shown for a round one, an unsourced "100% airtight" claim).

This skill turns that into a **reproducible, auditable pipeline**:

```
scrape → parse gallery & videos → AI visual review (image by image)
   → 5-dimension scoring → per-ASIN Lark doc with reference images embedded → write scores back to the sheet
```

## What it checks

| Dimension | Scope |
| --- | --- |
| **Completeness** | main image / secondary images (≥3) / video / A+ / title / bullets (5) / cart button / category node — 8 items × 12.5 pts |
| **Amazon compliance** | third-party trademarks, cross-store own-brand misuse, sensitive imagery, Rx drug names, borrowed endorsements, absolute claims, unsourced material claims, **in-image spelling errors** |
| **Copy accuracy** | title ≤75 chars, highlights ≤125 chars, grammar/spelling/punctuation/casing, keyword stuffing |
| **Visual accuracy** | main-image white background, image-text contradiction (reversed before/after, wrong product shown), AI-tool watermarks |
| **Data health** | sell-through, stock (sellable + inbound), rating & review count, recent sales, category correctness |

Total = equal-weighted mean of the five; each dimension caps deductions at 85% of its max.

Full rubric: [`references/01-scoring-rules.md`](references/01-scoring-rules.md).

## Install as a skill

Drop this repository into your agent's skills directory (any folder that holds `SKILL.md`):

```bash
git clone https://github.com/xie129716/amazon-listing-audit.git
# then point your agent's skills path at it, or symlink it in
```

Then configure:

```bash
cp config.example.json config.json     # fill in your sheet URL, lark-cli path, Edge path
export LISTING_EXAM_ROOT=/path/to/checkout
export LARK_CLI=/path/to/lark-cli
```

Finally set your own brands and store→brand mapping in `scripts/scoring.mjs`
(`OWN_BRANDS`, `STORE_BRAND`).

## Three non-negotiable rules

**1. Prove every image claim by zooming in.**
AI reviewers hallucinate text that is not there. We hit this four times: `Align` reported as `Alian`,
`Protable` as `Protoble`, an entirely invented `HEALTHCARE PROFESSINAL`, and once a *human* missed
`YOUGURT` while the AI got it right. So every image-level claim must be re-read on a magnified crop:

```bash
node scripts/crop.mjs "data/images/xxx.jpg" ".tmp/c1.png" <x> <y> <w> <h> 4
```

Miss a real issue rather than report a fake one — a false positive sends ops to "fix" a fine image.

**2. The report talks about the listing, never about the rubric.**
Ops want to know *which image, what, and how to fix it* — not how the score was computed.
Three layers enforce this: generation, data sanitization, and a render-time safety net.

**3. Merge same-root-cause findings.**
One misspelling across three images, or one root cause spanning four images, is **one** issue with
several locations — not three deductions.

## Requirements

- Node.js ≥ 20 (uses global `fetch`; no npm dependencies)
- **A real browser** — Microsoft Edge driven over CDP. Headless gets captcha-flagged by Amazon.
- `lark-cli` for Lark/Feishu doc & sheet I/O, authorized as a **user**
- Windows-friendly (paths, Edge launch, PowerShell helpers). Core logic is cross-platform.

## Repository layout

```
SKILL.md                     skill entry point
references/
  01-scoring-rules.md        full rubric
  02-pipeline.md             environment, step-by-step flow, data files
  03-visual-review-guide.md  shared brief handed to AI reviewers
  04-pitfalls.md             28 real pitfalls
scripts/                     the 25-step pipeline
scripts/archive/             81 historical one-off diagnostic scripts
examples/example-report.md   redacted sample report
```

## Notable design decisions

- **Video counting** uses the gallery badge `#videoCount` as ground truth, opens the immersive viewer,
  and classifies each entry by the Amazon video ID in its link
  (`amzn1.ive.seller.video` / `amzn1.vse.video` / `amzn1.productreview`).
  Counting the widget carousel instead inflates the number with videos belonging to *sibling variants*.
- **Reports are Feishu DocxXML, not Markdown** — Markdown cannot place images inside table cells,
  and "reference image next to the finding" is the whole point.
- **Prop exemption** — accessories are sold *for* other people's products, so brands printed on the
  adapted object itself are not a violation (`onProp: true`).
- **Carrier-address trap** — non-US delivery addresses hide the Add to Cart button on some ASINs.
  Always set a US ZIP (`scripts/probe-buybox-us.mjs 10001`) before judging the cart button.

## License

MIT — see [LICENSE](LICENSE).

---

## 中文说明

一句话：**把「人工逐条看 listing」变成可复算、可追溯、能批量跑的流水线**，
产出的是运营能直接照着改的诊断报告（每个问题旁边就贴着对应原图）。

**五维检查**：Listing 完整度 / AMZ 合规度 / 文案准确度 / 视觉准确度 / 数据健康度。

**安装**：把本仓库放进 agent 的 skills 目录（有 `SKILL.md` 即可），
复制 `config.example.json` 为 `config.json` 填好配置，
并在 `scripts/scoring.mjs` 里配置自有品牌与店铺映射。

**三条硬规矩**：

1. **图像结论必须裁剪放大逐字自证** —— AI 会脑补出不存在的图内文字（我们真实误报过 4 次）。
2. **报告只讲诊断不讲规则** —— 运营关心的是改哪张图，不是分怎么算的。
3. **同因合并** —— 同一根因跨多张图只算一条问题，不能重复扣分。

**依赖**：Node ≥ 20（零 npm 依赖）、真实 Edge + CDP（headless 会被反爬）、`lark-cli`（需用户身份授权）。

详细流程见 [`references/02-pipeline.md`](references/02-pipeline.md)，
踩坑清单见 [`references/04-pitfalls.md`](references/04-pitfalls.md)。

## 许可

MIT。
