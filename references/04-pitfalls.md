# 踩坑清单（避免重犯）

> 全部来自真实执行过程。**每一条都对应一次实际出错**，不是假想。


1. **数据错位**：早期读表漏一行，导致"第N行=N-1条记录"。→ 必须用 `[row=N]` 前缀。
2. **品牌列误读**：表格 G 列是内部统计编码（<内部编码>/<内部编码>…），不是品牌名。
3. **拼写误报**：子代理报的 `Alian`（实为 `Align`）、`Protoble`（实为 `Protable`）都错了。
   → **采信任何"拼写错误"结论前必须自己放大复核**。
4. **定位冲突误判**：B0EX0003 卖的是肽类小瓶收纳盒，用 Insulin 与 peptide 两种场景示意**不是矛盾**。
   → **判定图文矛盾前先理清"卖的是什么、为什么这样展示"**。
5. **图文矛盾过严**：已放宽为仅"直接相反/放反"型。
6. **视频统计四错**：①用"总数−品牌数"反推（混入用户）
   ②按去重计数（应不去重）③用固定窗口匹配 `creatorType`（跨条目串味）
   ④**数 widget carousel 的 "Videos for this product" 小节**（混入同变体家族/相关商品视频，
   把 B0EX0001 算成 8 条红人，实际 5 条）。
   → 已固化 v9 口径（主图角标 → 沉浸式面板 → 按 aci 判类型），**并以角标做交叉校验**。
7. **中文编码**：PS 传中文给 exe 会乱码 → 用 Node spawnSync。
8. **批量删除**：会崩会话 → 用 Node 精确操作。
9. **报告改 XML 后路径受限**：`@file` 与 `<img path>` 只能用 **cwd 下的相对路径**，
   所以上传时必须 `cwd = <PROJECT_ROOT>`，内容写 `@./reports/xxx.xml`，
   图片写 `@./data/images/xxx.jpg`；写绝对路径会报 `unsafe file path`。
   > 验证过：Markdown 表格单元格**放不了图**，必须用 DocxXML 的 `<td><img/></td>`。
   > 本地图片写法 `![alt](@./x.png)` 在 markdown 里可以，但表格内不行。
10. **飞书文档看不了渲染时**：本机 Edge（`.edge-profile`）**未登录飞书**，
    直接开 docx 会跳登录页；校验改用 `docs +fetch` 回读，确认 `<td ...><img src="..."/></td>` 即可。
11. **★ 子代理会"脑补"出不存在的图内文字（最严重的一次）**：
    行 2 曾报「A+ 图 06 图内拼写错误 `HEALTHCARE PROFESSINAL`」+「同图借用第三方获奖徽章」，
    运营一眼就看出**图上根本没有这行字**；全图 4× 放大复核后确认两条都是幻觉，已作废。
    同批另外 4 条拼写（`freshn` / `Compacity` / `Protable`）与「logo 的 S 镜像（Ƨ）」
    经同样方法复核**都属实**。
    → **强制取证流程见 `docs/评分规则.md`「视觉结论取证规范（v7 强制 · 反幻觉）」**：
    先用 `node scripts/crop.mjs <原图> <out.png> <x> <y> <w> <h> [放大倍数]` 裁剪放大，
    **在放大图上逐字读出来**才能写进 `spellingInImage` / `borrowedEndorsement` 等扣分字段；
    不确定就写"疑似"或只放 `notes`。**宁可漏报，不可错报。**
12. **本机 harness 跑的是 Windows PowerShell 5.1，不是 pwsh 7**：
    `pwsh` 不在 PATH（`spawnSync('pwsh',…)` 会 ENOENT）。
    需要从 Node 里调 PS 时用 `C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe`，
    并且 `.ps1` **被执行策略拦截**（`running scripts is disabled`）→ 一律用 `-Command` 内联，别写 .ps1。
13. **同一问题在两个维度重复扣分/重复展示**：`spellingInImage`（合规 −10）与
    `imageSpelling`（视觉 −5）曾被同一条拼写错误各计一次，报告里也出现两遍。
    → 已在 `visualDeductions()` 内做规范化包含比对去重，**视觉维度整条不再列出**，
    只在表下加一行「拼写错误统一在合规维度扣分」的说明。
    ⚠️ 判重不能只比完整字符串：合规侧记的是图面全文（`Protable and easy access`），
    视觉侧只引用片段（`"Protable" 应为 "Portable"`），必须**抽英文串做包含比对**。
14. **核查记录（notes）会滞后于规则**：早期写的 P0/P1 标签、已废除的判据（如「主图规范不合」）、
    以及**已作废的错误结论**（`Alian`/`Protoble`）曾在 notes 里躺了很久，报告里照样展示。
    → 每轮改规则后必须回头校订 notes；**已作废结论一律删除，不留痕在正文**（要留痕就写进
    「复核记录」并明确标注"已作废"）。
15. **★ 只给部分 ASIN 跑 `build-reports.mjs` 会清空 `scores.json`**：
    该脚本把结果 `writeFileSync` 覆盖写入，传 5 个 ASIN 就只剩 5 条，
    于是 `write-sheet-rows.mjs` 会把前几行的 S–X 列写成 `undefined`（本轮真踩到了，行 2–7 被清空）。
    → **`build-reports.mjs` 与 `write-overview.mjs` 必须传「已跑过的全部 ASIN」**。
16. **子代理的 entry 形状不统一**：同一批里有人写 `{msg}`、有人写 `{text, where, note}`，
    直接喂给评分器会漏扣或字段读不到。
    → 必须先跑 `normalize-vf.mjs` 统一形状，再做**同因合并**：
    · 同一处拼写错误跨多图（`Protable` 在 PT02 + A+ 图 02）→ 合并成一条，位置并列
    · 同一根因的图文矛盾跨多图（A+ 图 07 / 08 都是"保护套+挂绳当主体"）→ 合并成一条
    · 同一第三方品牌跨多图 → 合并成一条
    **否则一处问题会被重复扣 2–3 次。**
17. **v10 的几处口径细化（都在 `scoring.mjs` 里）**
    - `ABSOLUTE_RE` **去掉了 `never` / `always`**：`Never Leaks`、`Never Hardens` 属正常产品属性描述，
      不是违禁绝对化；仍保留 `100%` / `guarantee(d)` / `perfect` / `best seller` / `#1` / `safest` 等。
    - **`materialClaims` 合并计一次 −3**（同一 listing 多条材质宣称不再逐条扣分）。
    - **`thirdPartyUnrelated` / `mainImageThirdPartyLogo` 支持 `onProp: true`**：
      第三方品牌只要印在**道具/适配对象本体**上就豁免（与 v7 的背书徽章口径一致），
      只在报告「已豁免项」列出并建议裁切。**竞品对标物上、或卖家自行叠加的**才继续扣 −20/−25。
    - **仅有标点/空格问题的图内文字不算「拼写错误」**：`manufacturer.Please`（句号后缺空格）
      改列提示，不按 −10 扣（拼写错误指**错字**，标点归标点）。
18. **★★ 判定「购物车按钮」前，必须先把浏览器配送地址设成美国 ZIP**
    本机 Edge 的默认配送地址是 **China**。非美国地址会让部分 ASIN 显示
    「This item cannot be shipped to your selected delivery location」并且**不渲染 Add to Cart 按钮**。
    本轮 B0EX0004 就这样被判成「不可购买」——若照此写入，完整度会凭空掉 12.5 分。
    → 用 `node scripts/probe-buybox-us.mjs 10001 <ASIN...>`：它会把地址改成 New York 10001 再复测；
      确认 `addToCart=true / In Stock` 后再写 `cartOk`。**其它字段不受配送地址影响。**
19. **`build-image-manifest.mjs` 的 PT 条目可能 hiRes 为 null**
    页面的 `colorImages` 里偶有 `variant` 存在但 `hiRes: null` 的占位条目（B0EX0005 的 PT06），
    原来会生成一个指向空文件的条目，导致报告里出现一张打不开的对照图。
    → 已改为**跳过并打印提示**。副图编号本身会跳号（如 PT01–PT05, PT07），这是亚马逊自己的编号，属正常。
20. **重新抓取后 A+ 图数量会变，但 `dl()` 见文件已存在就跳过 → 标签与内容可能错位**
    B0EX0005 第一次抓取解析出 14 张 A+，改完配送地址重抓后变成 32 张。
    此时旧文件仍在磁盘，新标签会指向旧内容。
    → **重抓之后要把该 ASIN 的 A+（甚至全部）图片删掉重下**，再做视觉审查。
21. **A+ 图很多的大 listing 要拆给多个子代理**
    B0EX0005 有 40 张（A+ 32 张）。单代理一次读 40 张上下文吃紧，且中途容易漏。
    → 拆成「MAIN + 副图 + A+ 前段」与「A+ 后段」两个子代理，分别写
      `vf-<ASIN>.json` 与 `vf-<ASIN>-b.json`，再用 `merge-vf-parts.mjs <ASIN>` 合并。
22. **子代理会在 notes 里写「已计入 adaptedObjectBrands」这类内部记账话术**
    报告只讲诊断，这类表述属噪声 → `sanitize-findings*.mjs` 会清掉；
    改规则后记得回扫一遍（本轮清了 6 处）。
23. **`colorImages` 里 MAIN 的 `hiRes` 也可能为 null**（B0EX0006）
    此时不能直接把 `null` 丢给 fetch。→ 已加回退：用 `json.mainImage.src` 把尺寸后缀换成 `_AC_SL1500_`。
24. **`ALLCAPS_OK` 漏了自有品牌名**：A4「标题含非常规全大写词」把 `BRAND_A` 也标成违规，
    而 A4 规则本身写明品牌/型号/缩写是允许的。→ 已把 7 个自有品牌加进白名单。
25. **`absoluteClaims` 也改为「同一 listing 合并计一次 −5」**（规则表没写「/处」，与 `materialClaims` 一致）。
    受影响：行 8 B0EX0007 合规 77 → 82（总分 92 → 93）。
26. **新增 `data/derived/compliance-extra.json` 通道**：正则与 findings 字段都覆盖不到的**人工判定类合规问题**
    走这里（由 `build-reports.mjs` 读入）。本轮用它记了行 20 的「受管制品类关联（ZYN 尼古丁袋）−20」。
27. **★ 有些合规风险只在「卖家自己写的文案」里，不在图片上**
    行 20 的图片里没有任何 ZYN 罐体，风险全在图内叠加文字与标题里。
    → 检查受管制品类关联时，**必须同时扫标题、五点、图内叠加文案**，不能只看品牌露出。
28. **评分规则里「星级 4.0–4.4 −10」与用户标准「4 星以上」冲突**
    → 以**用户标准为准**：≥4 星即通过，不做 4.0–4.4 的额外扣分（`health-analysis.mjs` 本来就是这么实现的）。
    已同步修正 `docs/评分规则.md` 的表述。
