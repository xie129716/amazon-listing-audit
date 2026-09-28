# 执行流程与数据文件

## 环境与工具

| 用途 | 工具/路径 |
| --- | --- |
| 飞书读写 | `<LARK_CLI>`（需 `--as user`） |
| 抓 Amazon 页面 | Edge 真实窗口 + CDP 9333 端口（**不能用 headless Chrome，会被反爬**） |
| 启动 Edge | `node scripts/launch-edge.mjs` |
| 抓 listing 数据 | `node scripts/fetch-asins.mjs <ASIN...>` |
| 抓图片清单 | `node scripts/build-image-manifest.mjs [ASIN...]`（不传参=全部已抓的） |
| 文案规则检查 | `node scripts/text-analysis.mjs` |
| 数据健康度 | `node scripts/health-analysis.mjs` |
| 生成报告 | `node scripts/build-reports.mjs <ASIN...>`（出 `.xml` 飞书格式 + `.md` 本地版） |
| 建/更新云文档 | `node scripts/refresh-docs.mjs <ASIN...>`（XML 上传，含表格内嵌原图） |
| 回写表格 | `node scripts/write-sheet-rows.mjs` |
| 写总览表 | `node scripts/write-overview.mjs <ASIN...>` |
| 校验文档图片 | `node scripts/verify-docs.mjs <ASIN...>` |
| **裁剪放大取证** | `node scripts/crop.mjs <原图> <out.png> <x> <y> <w> <h> [放大倍数]` |
| 视频统计 | `node scripts/probe-videos-v9.mjs <ASIN...>`（**唯一正确口径**，含角标校验）<br>`node scripts/apply-video-counts-v9.mjs` 写回 |

**关键环境坑**
1. **PowerShell 5.1**：中文参数传到原生 exe 会变 GBK 乱码 → **一律用 Node 的 `spawnSync` 调用 lark-cli**
2. `Get-ChildItem | Where-Object { $_.Name -match ... }` 在 PS 里**忽略大小写**，曾误删文件 → 文件操作用 Node 校验
3. **禁止批量删除大量文件**（曾连续 3 次把会话搞崩）→ 用 Node 精确删除，或改清单驱动
4. Edge 会话重启后会失效 → 跑任务前先 `launch-edge.mjs`
5. Node 22 全局 `fetch` 可用；`m.media-amazon.com` 图片可直接下载

---


## 逐条 ASIN 的执行流程

```
0. node scripts/probe-buybox-us.mjs 10001            # ★ 先把浏览器配送地址改成美国 ZIP（见 §七.18）
1. node scripts/launch-edge.mjs                     # 确保 CDP 可用
2. node scripts/fetch-asins.mjs <ASIN...>           # 抓 listing 全文 + 存 raw html/json
3. node scripts/build-image-manifest.mjs <ASIN...>  # 解析图集清单并下载全图
   ★ 若本批是「重新抓取」，先删掉这些 ASIN 的 A+ 图再跑（见 §七.20）
4. node scripts/probe-videos-v9.mjs <ASIN...>      # ★ v9 视频三类计数（角标校验）
   node scripts/apply-video-counts-v9.mjs           # 写回 visual-findings.json
5. 视觉审查：每个 ASIN 起一个 subagent，逐张 read_image
   （把 manifest 里的图片路径整批给子代理；让它写 data/derived/vf-<ASIN>.json）
   ★★ 子代理给出的**任何图像类结论，父代理必须自己用 crop.mjs 放大复看后再采信**
      （拼写 / 品牌字样 / 获奖徽章 / 敏感画面 / 图文矛盾 / 道具数量）。见 §七.11。
      ⚠️ 反例：子代理在拼接尺度下把 PT01 读成 YOGURT，3× 放大后其实是 YOUGURT ——
        **父代理的快速目视同样会错，必须真的裁剪放大**。
6. node scripts/normalize-vf.mjs <ASIN...>          # 统一 entry 形状 + 同因合并 + 政策校准
7. node scripts/merge-visual-findings.mjs <ASIN...> # 合并进 visual-findings.json（保留 v9 视频数据）
8. node scripts/text-analysis.mjs <ASIN...>         # 文案规则检查（会与已有结果合并）
   node scripts/add-copy-extra-v10.mjs              # 正则覆盖不到的语义类文案问题（按需手写）
9. node scripts/health-analysis.mjs                 # 数据健康度（覆盖全表）
10. node scripts/build-reports.mjs <全部 ASIN...>   # ★ 必须传全部 ASIN！见 §七.15
    node scripts/refresh-docs.mjs <全部 ASIN...>    # 建/覆盖云文档（XML，含内嵌原图）
11. node scripts/write-sheet-rows.mjs               # 回写 R、S–AA 列（行号在 ROWS 里维护）
12. node scripts/write-overview.mjs <全部 ASIN...>  # 更新总览表
13. node scripts/verify-docs.mjs <全部 ASIN...>     # 抽查文档内图片是否入表
```

> ⚠️ **报告格式是飞书 DocxXML，不是 Markdown**。
> `refresh-docs.mjs` 的工作目录必须是 `<PROJECT_ROOT>`，内容用 `@./reports/<ASIN>-诊断报告.xml`，
> 图片用 `<img path="@./data/images/xxx.jpg" width="320"/>` 写在 `<td>` 里。
> `@file` 与 `<img path>` 都只接受 **cwd 下的相对路径**，写绝对路径会报 `unsafe file path`。

**建议节奏**：20 条/批，每批完成后回写表格并抽查。

---


## 数据文件说明

| 文件 | 说明 |
| --- | --- |
| `sheet-all-records.json` | 全表 653 条 ERP 数据（行号已对齐） |
| `row-asin-map.json` | 行号 → ASIN 映射 |
| `text-analysis.json` | 文案规则检查结果 |
| `health-analysis.json` | 数据健康度结果 |
| `image-manifest.json` | 各 ASIN 图片清单（main/副图/A+/视频位） |
| `visual-findings.json` | **视觉审查结论**（合规/视觉/视频/建议标题/实质问题清单） |
| `copy-extra.json` | 正则覆盖不到的语义类文案问题 |
| `doc-urls.json` | ASIN → 云文档 URL 映射 |
| `scores.json` | 各 ASIN 五维分与总分 |

`data/raw/<ASIN>.html|json` 为前台原始抓取结果，`data/images/` 为下载的图片。

---


## 关键口径速查（视频 / 完整度 / 豁免）


### 完整度 8 项合格线（每项 12.5 分，**v10 收紧两条**）
| 项 | v10 标准 |
| --- | --- |
| 主图 | 存在唯一 MAIN 图（**只检查是否白底**） |
| **副图** | **不少于 3 张** ← v10 由「≥1 张」收紧 |
| 视频 | 存在视频（红人视频另作提升项标注） |
| A+ 页面 | 存在 A+ 模块 |
| 标题 | 标题字段非空 |
| **五点描述** | **5 条** ← v10 由「≥3 条」收紧（少于 5 不通过；超过 5 另在文案维度 −2） |
| 购物车按钮 | 前台 Add to cart 且 In Stock |
| 类目节点 | 类目路径存在且与 ERP 大类有归属 |

> 常量：`scoring.mjs` 的 `MIN_GALLERY_IMAGES = 3`、`MIN_BULLETS = 5`。

### 自有品牌白名单（豁免）
`BRAND_A / BRAND_B / BRAND_C / BRAND_D / LAWNFUL / BRAND_F / BRAND_G`

**加严规则**：本 listing **只能出现本店铺自有品牌**（店铺→品牌映射见 `scoring.mjs` 的 `STORE_BRAND`）。
在 KC 店铺出现 FT 等其他店铺品牌 → **品牌不一致，−20**（会触发亚马逊绩效警告）。

### 豁免项（不扣分）
- 主图/副图中出现**第三方产品本体**（我们卖配件，适配对象展示是必要的）——仅当其上**无第三方品牌 logo**
- 适配对象本体上的第三方品牌标识
- **v7 新增｜第三方道具 / 适配对象本体上「出厂自带」的一切标识**：品牌名、标签、**奖项徽章**、
  认证/评级标识（例：Bar Keepers Friend 罐体自带的 `VOTED PRODUCT OF THE YEAR / HEALTHCARE PROFESSIONAL`）。
  **道具只是用来展示适配场景，不是我们卖的商品** → 一律豁免，只在报告「已豁免项」里说明。
  数据字段用 `onProp: true` 标记；`borrowedEndorsement / sensitive / propDrugNameRisk / absoluteClaims / materialClaims` 均支持。
  > 仍要扣分的反例：卖家**自己在图上另加**一枚获奖徽章；在自家文案里声称第三方认证。
- 主图占比、道具、对比度（**主图只检查是否白底**）
- AI 生成痕迹（**只看有无 AI 工具水印**）
- 灰度化的伪前后对比（视为已完成对比）
- 五点描述的非 ASCII 字符与 emoji
- 商品亮点（Item Highlights）字段缺失（仅提醒，并给出建议标题+亮点）
- 标题 >75 字符但属旧版未拆分两段式（仅提醒，Y 列标 `无`）

### 扣分速查
| 等级 | 项目 | 扣分 |
| --- | --- | --- |
| P0 | 主图商品主体上的第三方品牌 logo | −25 |
| P0 | 副图/A+ 中无关展示/背景/对标物上的第三方品牌 | −20 |
| P0 | 跨店铺自有品牌混用 | −20 |
| P0 | 文案把第三方品牌当本商品品牌（标题首词位） | −30 |
| P0 | 违禁词：诱导评价 / 站外引流 / 联系方式 | −30 |
| P0 | 医疗疗效声明 | −20 |
| P0 | 敏感画面（真人注射/针剂） | **−15** |
| P0 | 图片内英文拼写错误（**必须注明哪张图**） | −10/处（**只在这里扣，视觉维度不重复**） |
| P1 | 处方药名示意 | **−5** |
| P1 | 借用第三方背书（**仅卖家自行叠加/冒用**；道具本体自带 → 豁免） | −15 |
| P1 | 贬损性对比**文案颠倒/异常**（只看文案，不看被贬损物实际缺陷） | −15 |
| P1 | 主图非白底 | −10 |
| P1 | 图文矛盾（**仅"直接相反/放反"型**；"宣称多于演示"只提醒） | −10 |
| P1 | 标题超 75 字符（**仅当已拆分两段式**） | −8，超175字符 −12 |
| P2 | 绝对化表述 / 材质宣称缺证据 | −5 / −3 |
| P3 | 标题未以品牌开头 −3、关键词堆砌 −2、五点超5条 −2、标点异常 −1、全大写 −1、禁用字符 −3 |
| 完整度 | **副图 <3 张**、**五点 <5 条** → 该项 12.5 分归零（v10）；主图缺失 / 无视频 / 无 A+ / 标题空 / 无购物车 同样归零 |
| 数据 | 星级<4 星 −30；4.0–4.4 −10；动销>180天 −10；可售=0 −30；30天销量0 −20；类目错放 −30；评论<50 −5 |

**总分 = 五维等权平均**；单维度扣分上限为该维度 85%。
等级：≥90 良好 / 80–89 合格需优化 / 70–79 需整改 / 60–69 高风险 / <60 严重风险。

### 视频统计口径（v9，已与运营核对通过 · 极其重要）

**旧口径（v7/v8）错在哪**：数 `#va-related-videos-widget` 里 "Videos for this product" 小节的条目。
那是**轮播混合池**，会把「同变体家族 / 相关商品」的视频也算进来 →
B0EX0001 被算成 8 条红人，**实际 5 条**。

**v9 正确做法**
1. **读主图角标 `#videoCount`** = 该 listing 视频总数。
   ⚠️ 只有 1 条时显示 `VIDEO`（无数字），不能只 `parseInt`。
2. **点开主图「N VIDEOS」缩略图**（`#altImages li.videoThumbnail`）→ **沉浸式视频面板**；
   面板条目总数**必须等于角标**（不等就复查）。
3. **按条目链接的 `aci` 参数判定类型**：
   - `amzn1.ive.seller.video.*` → **品牌视频**
   - `amzn1.vse.video.*` → **红人视频**
   - `amzn1.productreview.*`（或 href 含 `/gp/customer-reviews/`）→ **用户视频**

**计数规则**
1. **红人按条目计数，同一红人多条不去重**（Christina's 2 条 → 计 2）
2. 红人与用户**分开计数**；写 **Z 列 / AA 列**
3. **禁止"总数 − 品牌数"反推**；**禁止数 widget carousel 条目**
4. 报告须给出**角标数 + 角标校验结果 + 红人视频明细表**
5. 红人**名单会轮换**（每次打开成员可能不同），但**三类数量稳定**

**一行命令**：`node scripts/probe-videos-v9.mjs [ASIN...]` → `data/derived/video-counts-v9.json`
→ `node scripts/apply-video-counts-v9.mjs` 写回 `visual-findings.json`

---
