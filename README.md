# amazon-listing-audit · 亚马逊 Listing 五维大检查流水线

把「人工逐条看 listing」变成**可复算、可追溯、能批量跑**的流水线：
抓亚马逊前台 → 解析图集/视频 → AI 逐图视觉审查 → 五维打分 → 生成带**对照原图**的飞书诊断报告 → 回写表格。

> 当前规则版本 **v10**，已在 **25 条**真实 listing 上跑通，产出 25 份诊断报告（内嵌对照图 700+ 张）。

---

## 一、检查什么

| 维度 | 权重 | 检查内容 |
| --- | --- | --- |
| **Listing 完整度** | 各 20% | 主图 / 副图（≥3 张）/ 视频 / A+ / 标题 / 五点（5 条）/ 购物车按钮 / 类目节点 |
| **AMZ 合规度** | | 第三方品牌侵权、跨店铺自有品牌混用、敏感画面、处方药名、违禁背书、绝对化表述、材质宣称、图片拼写错误 |
| **文案准确度** | | 标题 ≤75 字符、亮点 ≤125 字符、语法/拼写/标点/大小写、关键词堆砌、重复信息 |
| **视觉准确度** | | 主图白底、图文矛盾（放反/货不对板）、AI 工具水印、图内拼写 |
| **数据健康度** | | 转化动销、库存（可售+在途）、星级评论、近七天销量、类目节点正确性 |

总分 = 五维等权平均；单维度扣分上限为该维度的 85%。

完整规则见 [`docs/评分规则.md`](docs/评分规则.md)。

---

## 二、流水线

```
0. probe-buybox-us.mjs     先把浏览器配送地址设成美国 ZIP（否则购物车按钮会被误判）
1. launch-edge.mjs         起一个真实 Edge + CDP（不能用 headless，会被反爬）
2. fetch-asins.mjs         抓 listing 全文，落 data/raw/<ASIN>.json|html
3. build-image-manifest.mjs 解析图集（colorImages）+ A+ 图，下载全尺寸图
4. probe-videos-v9.mjs     视频三类计数（主图角标 + 沉浸式面板 + 视频 ID 分类）
5. 视觉审查                 每个 ASIN 一个 subagent，逐张 read_image，写 vf-<ASIN>.json
6. normalize-vf.mjs        统一 entry 形状 + 同因合并 + 政策校准
7. merge-visual-findings.mjs 合并进 visual-findings.json
8. text-analysis.mjs       文案规则检查（正则规则集，对照亚马逊官方要求）
9. health-analysis.mjs     数据健康度（读 ERP 导出）
10. build-reports.mjs      生成报告 XML（含表格内嵌对照原图）
11. refresh-docs.mjs       上传/覆盖飞书云文档
12. write-sheet-rows.mjs   回写表格评分列
13. write-overview.mjs     更新「检查总览」子表
14. verify-docs.mjs        回读校验文档内容
```

`scripts/archive/` 里保留了一路走来的 81 个一次性诊断脚本（视频计数试错、数据迁移等），
不作为流水线的一部分，但保留了完整的排查痕迹。

---

## 三、环境要求

- **Node.js ≥ 20**（用到全局 `fetch`、`--input-type=module`）
- **Windows**（脚本里的路径、Edge 启动、PowerShell 调用都是 Windows 形态；核心逻辑跨平台）
- **Microsoft Edge**（Amazon 反爬严格，必须真实浏览器 + CDP）
- **lark-cli**（飞书文档/表格读写，需以**用户身份**授权）
- 只读依赖：无需任何 npm 包，全部用 Node 内置模块

配置项见 [`config.example.json`](config.example.json)：复制为 `config.json` 填自己的飞书表格链接、
lark-cli 路径、Edge 路径与 CDP 端口。`config.json` 已在 `.gitignore` 中。

> ⚠️ 目前 `scripts/*.mjs` 里的根路径、飞书表格 URL、lark-cli 路径是**内联常量**（`E:/listing_exam/...`）。
> 换机器跑需要全局替换这几处。**外置到 `config.json` 是下一步待办**（见「路线图」）。

---

## 四、目录结构

```
.
├── scripts/                 主流程脚本（25 个）
│   ├── amz-lib.mjs          CDP 连接、页面导航、listing 字段提取
│   ├── parse-gallery.mjs    从 colorImages JSON 还原完整有序图集
│   ├── scoring.mjs          评分器：五维扣分、豁免判定、报告消息生成
│   ├── build-reports.mjs    报告生成（飞书 DocxXML，表格内嵌对照原图）
│   ├── crop.mjs             图片裁剪放大（**反幻觉取证核心工具**）
│   └── archive/             81 个一次性诊断脚本（历史痕迹）
├── docs/
│   ├── 评分规则.md           v10 完整规则 + 逐层演进记录
│   ├── 全量执行交接说明.md    跨会话唯一权威交接文档（含 28 条踩坑记录）
│   └── 子代理视觉审查指引.md   给 AI 审查员读的统一口径说明
├── reports/                 诊断报告产物（.xml 飞书格式 + .md 本地版）
└── data/                    （默认不入库）
    ├── raw/                 前台原始抓取 html/json
    ├── images/              下载的商品图
    └── derived/             中间与最终数据（见下）
```

### `data/derived/` 数据文件

| 文件 | 说明 |
| --- | --- |
| `sheet-all-records.json` | 表格全量记录（行号已对齐，`__row` 字段） |
| `image-manifest.json` | 各 ASIN 图片清单：主图 / 副图 / A+ / 视频位 + 本地路径 |
| `visual-findings.json` | **视觉审查总库**（合规/视觉/视频/建议标题/实质问题清单） |
| `vf-<ASIN>.json` | 单个 ASIN 的视觉审查原始产出（子代理写、父代理校） |
| `text-analysis.json` | 文案规则检查结果 |
| `health-analysis.json` | 数据健康度结果 |
| `copy-extra.json` | 正则覆盖不到的语义类文案问题（人工维护） |
| `compliance-extra.json` | 人工判定类合规问题（如受管制品类关联） |
| `scores.json` | 各 ASIN 五维分与总分 |
| `doc-urls.json` | ASIN → 飞书文档 URL / document_id |

---

## 五、几个关键设计

### 1. 视频三类计数（v9 权威口径）

数 widget carousel 会把「同变体家族/相关商品」的视频算进来（实测把 5 条红人算成 8 条）。正确做法：

1. 读主图角标 `#videoCount` = 该 listing 视频总数
   （⚠️ 只有 1 条时亚马逊显示 `VIDEO` 而非 `1 VIDEO`）
2. 点开主图「N VIDEOS」缩略图 → **沉浸式视频面板**，条目总和必须等于角标
3. 按条目链接的 `aci` 参数判类型，**不依赖易变的 JSON 字段**：
   - `amzn1.ive.seller.video.*` → 品牌视频
   - `amzn1.vse.video.*` → 红人视频
   - `amzn1.productreview.*` → 用户视频

红人名单会随亚马逊轮播变化，但三类数量稳定 —— 所以**角标校验是必要护栏**。

### 2. 报告只讲诊断，不讲规则

运营要的是「改哪张图的什么内容」，不关心内部怎么算分。三道防线保证规则用语不进报告：

1. `scoring.mjs` 生成消息时**不拼接**规则说明
2. `sanitize-findings*.mjs` 清洗已有数据里的规则用语
3. `build-reports.mjs` 渲染期 `cleanText()` **兜底过滤**

### 3. 反幻觉：图像结论必须放大自证

AI 审查员会「脑补」出不存在的图内文字。历史误报 4 次：
`Align`→误报 `Alian`、`Protable`→误报 `Protoble`、凭空编出 `HEALTHCARE PROFESSINAL`、
以及把 `YOUGURT` 看成 `YOGURT`（这次是**人**看漏，AI 是对的）。

因此任何图像类结论（拼写/品牌字样/徽章/敏感画面/图文矛盾）都必须：

```bash
node scripts/crop.mjs "data/images/xxx.jpg" ".tmp/c1.png" <x> <y> <宽> <高> 4
```

**在放大图上逐字读出原文**才能写进扣分字段；不确定就写「疑似」或只放备注。
**宁可漏报，不可错报** —— 错报会让运营去改一张本来没问题的图。

### 4. 同因合并，避免一处问题扣多次

同一处拼写错误跨多图、同一根因的图文矛盾跨多图、同一第三方品牌跨多图 —— 都要合并成一条并列出全部位置。
判重不能只比完整字符串：合规侧记的是图面全文（`Protable and easy access`），
视觉侧只引用片段（`"Protable" 应为 "Portable"`），必须**抽英文串做包含比对**。

### 5. 道具豁免

我们卖的是配件，罐体/瓶子/包装盒这些**道具只用于展示适配场景**，不是售卖商品。
道具**本体上出厂自带**的品牌名、标签、奖项徽章一律豁免（数据字段 `onProp: true`）。
只有卖家**自己叠加/冒用**第三方背书才扣分。

---

## 六、已知坑（完整 28 条见交接文档）

| 坑 | 现象 | 对策 |
| --- | --- | --- |
| **配送地址** | 非美国地址会让部分 ASIN 显示「cannot be shipped」且不渲染 Add to Cart，完整度凭空掉 12.5 分 | 先跑 `probe-buybox-us.mjs 10001` |
| **headless 被反爬** | 无头浏览器抓 Amazon 会跳验证码 | 必须真实 Edge + CDP |
| **PS 中文乱码** | PowerShell 5.1 传中文给原生 exe 会变 GBK 乱码 | 一律用 Node `spawnSync` 调 lark-cli |
| **本机是 PS 5.1** | `pwsh` 不在 PATH，`.ps1` 被执行策略拦截 | 用 `powershell.exe` + `-Command` 内联 |
| **飞书 `@file` 路径** | 只接受 cwd 下的相对路径 | 上传时 `cwd = 项目根`，图片写 `@./data/images/...` |
| **Markdown 表格放不了图** | 必须用 DocxXML 的 `<td><img/></td>` | 报告产物是 XML，不是 Markdown |
| **只传部分 ASIN 建报告** | `scores.json` 被覆盖，表格评分列写成 `undefined` | `build-reports` 必须传**全部**已跑 ASIN |
| **子代理 entry 形状不一** | 有人写 `{msg}`、有人写 `{text,where,note}` | 必须先跑 `normalize-vf.mjs` |
| **重抓后图片标签错位** | A+ 图数量变了但旧文件还在，`dl()` 见文件存在就跳过 | 重抓后删掉该 ASIN 的图重下 |

---

## 七、路线图

- [ ] **把内联常量外置到 `config.json`**（根路径、飞书表格 URL、lark-cli 路径、CDP 端口）
- [ ] 把「逐条 ASIN 流程」串成一个 `run-batch.mjs`，一条命令跑一批
- [ ] 视觉审查环节并行度控制（当前靠手工起 subagent）
- [ ] 增加「历史对比」：同一条 ASIN 两次检查的分数与问题差异
- [ ] 报告支持导出 PDF

---

## 八、许可

内部工具，未授权不得外传。`data/` 与 `reports/` 默认不入库（含公司经营数据）。
