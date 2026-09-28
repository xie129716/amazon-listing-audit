---
name: amazon-listing-audit
description: Audit Amazon (US) listings across five dimensions — completeness, Amazon compliance, copy accuracy, visual accuracy, and data health — and emit a per-ASIN diagnostic report as a Lark/Feishu doc with the offending images embedded inline. Use this skill when the user asks to check, review or audit Amazon listings/ASINs; mentions listing completeness, main/secondary images, A+ content, bullet points, cart button, category node; asks about trademark or brand misuse, prohibited words, exaggerated claims, medical/sensitive imagery, AI watermarks, image-text mismatch, spelling errors inside images; or wants the result written back to a Feishu spreadsheet with per-dimension scores.
license: MIT
---

# Amazon Listing Audit

把「人工逐条看 listing」变成**可复算、可追溯、能批量跑**的流水线：
抓亚马逊前台 → 解析图集/视频 → AI 逐图视觉审查 → 五维打分 → 生成**带对照原图**的飞书诊断报告 → 回写表格。

## 什么时候用这个技能

用户提出以下任何一类需求时启用：

- 「检查 / 复核 / 审查某个 ASIN 或一批 listing」
- 「listing 完整度怎么样、缺不缺 A+ / 视频 / 副图」
- 「有没有侵权风险、有没有违禁词、有没有绝对化表述」
- 「图文是否对得上、AB 图有没有放反、有没有 AI 水印」
- 「标题超没超 75 字符、五点是不是 5 条」
- 「按 ERP 数据看转化/库存/星级/类目对不对」
- 「把检查结果写回表格、生成每个 ASIN 一份报告」

## 五个维度

| 维度 | 检查什么 |
| --- | --- |
| **Listing 完整度** | 主图 / 副图（≥3 张）/ 视频 / A+ / 标题 / 五点（5 条）/ 购物车按钮 / 类目节点，8 项各 12.5 分 |
| **AMZ 合规度** | 第三方品牌侵权、跨店铺自有品牌混用、敏感画面、处方药名、违禁背书、绝对化表述、材质宣称、**图内拼写错误** |
| **文案准确度** | 标题 ≤75 字符、亮点 ≤125 字符、语法/拼写/标点/大小写、关键词堆砌、重复信息 |
| **视觉准确度** | 主图白底、图文矛盾（放反 / 货不对板）、AI 工具水印 |
| **数据健康度** | 转化动销、库存（可售+在途）、星级评论、近七天销量、类目节点正确性 |

总分 = 五维等权平均；单维度扣分上限为该维度的 85%。

**完整规则见 [`references/01-scoring-rules.md`](references/01-scoring-rules.md)**（含逐层演进记录与豁免口径）。

## 怎么用

### 0. 读齐参考文档（动手前必做）

- [`references/02-pipeline.md`](references/02-pipeline.md) — 环境要求、逐条 ASIN 执行流程、数据文件说明
- [`references/01-scoring-rules.md`](references/01-scoring-rules.md) — 完整评分规则与豁免口径
- [`references/03-visual-review-guide.md`](references/03-visual-review-guide.md) — **给 AI 审查员的统一口径**（起 subagent 时让它们先读这份）
- [`references/04-pitfalls.md`](references/04-pitfalls.md) — **28 条真实踩坑**，动手前扫一遍能省掉大半返工

### 1. 每批开始前

```bash
# 把探测浏览器的配送地址设成美国 ZIP，否则购物车按钮会被误判
node scripts/probe-buybox-us.mjs 10001 <ASIN...>
```

### 2. 跑流水线

按 `references/02-pipeline.md` 的 14 步走。核心命令：

```bash
node scripts/launch-edge.mjs                       # 起 Edge + CDP
node scripts/fetch-asins.mjs <ASIN...>             # 抓 listing
node scripts/build-image-manifest.mjs <ASIN...>    # 解析图集并下载原图
node scripts/probe-videos-v9.mjs <ASIN...>         # 视频三类计数（含角标校验）
# —— 起 subagent 逐图审查，产出 data/derived/vf-<ASIN>.json ——
node scripts/normalize-vf.mjs <ASIN...>            # 统一形状 + 同因合并
node scripts/merge-visual-findings.mjs <ASIN...>   # 合并进总库
node scripts/text-analysis.mjs <ASIN...>           # 文案规则检查
node scripts/health-analysis.mjs                   # 数据健康度
node scripts/build-reports.mjs <全部 ASIN...>      # 生成报告（含内嵌对照图）
node scripts/refresh-docs.mjs <ASIN...>            # 上传飞书文档
node scripts/write-sheet-rows.mjs                  # 回写评分列
node scripts/write-overview.mjs <全部 ASIN...>     # 更新总览子表
```

### 3. 配置

复制 `config.example.json` 为 `config.json`，填自己的飞书表格、lark-cli 路径、Edge 路径。
路径与凭据通过 `scripts/paths.mjs` 解析：

```bash
export LISTING_EXAM_ROOT=/path/to/checkout   # 默认取脚本目录的上一级
export LARK_CLI=/path/to/lark-cli            # 飞书 CLI
```

自有品牌与店铺映射同时需要配置在 `scripts/scoring.mjs` 的 `OWN_BRANDS` / `STORE_BRAND`。

## 三条硬规矩（违反会让报告不可用）

### 1. 图像结论必须裁剪放大自证 —— 反 AI 幻觉

AI 审查员会**脑补出不存在的图内文字**。真实误报 4 次：
`Align`→误报 `Alian`、`Protable`→误报 `Protoble`、凭空编出根本不存在的 `HEALTHCARE PROFESSINAL`、
以及一次**人**把 `YOUGURT` 看漏成 `YOGURT`（这次 AI 是对的）。

任何图像类结论（拼写 / 品牌字样 / 徽章 / 敏感画面 / 图文矛盾）都必须：

```bash
node scripts/crop.mjs "data/images/xxx.jpg" ".tmp/c1.png" <x> <y> <宽> <高> 4
```

**在放大图上逐字读出原文**才能写进扣分字段；不确定就写「疑似」或只放备注。
**宁可漏报，不可错报** —— 错报会让运营去改一张本来没问题的图。

### 2. 报告只讲诊断，不讲评分规则

运营要的是「改哪张图的什么内容」，不关心内部怎么算分。报告里**不允许**出现
「按 xx 规则豁免」「（仅提示，不扣分）」「统计口径……」这类话。
三道防线：生成期不拼接 / 清洗已有数据 / 渲染期兜底过滤。

### 3. 同因合并 —— 一处问题只扣一次

同一处拼写错误跨多图、同一根因的图文矛盾跨多图、同一第三方品牌跨多图，
都要**合并成一条并列出全部位置**。判重必须抽英文串做包含比对，
因为合规侧记全文（`Protable and easy access`）、视觉侧只引用片段（`"Protable" 应为 "Portable"`）。

## 产出长什么样

见 [`examples/example-report.md`](examples/example-report.md)：每个 ASIN 一份报告，
含五维评分、逐项检查表、视频构成明细、按优先级排序的**实质问题清单**，
以及每个问题对应的**内嵌对照原图**。

## 结构

```
SKILL.md                    技能入口（本文件）
references/
  01-scoring-rules.md       完整评分规则
  02-pipeline.md            执行流程、环境、数据文件
  03-visual-review-guide.md 给 AI 审查员的统一口径
  04-pitfalls.md            28 条真实踩坑
scripts/                    25 个主流程脚本
scripts/archive/            81 个历史诊断脚本（保留排查痕迹）
examples/example-report.md  脱敏样例报告
```

## 前提与限制

- **需要真实浏览器**（Microsoft Edge + CDP）。headless 会被亚马逊反爬拦掉。
- 飞书读写需要 `lark-cli` 并以**用户身份**授权。
- 亚马逊前台结构会变：页面结构相关的选择器集中在
  `amzn-lib.mjs` / `parse-gallery.mjs` / `probe-videos-v9.mjs`，失效时改这三处。
- 本技能输出的是**诊断建议**，不代替人工终审；扣分口径需按贵司标准校准。
