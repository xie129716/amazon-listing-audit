# Amazon Listing 图片合规视觉审计（纯客观观察）

审计对象：ASIN **B0DJQS14DS**（2-pack silicone lids for powder cleanser cans）与 **B0FL6X3HRW**（8-pack silicone lids for La Fermiere yogurt jars）
审计方式：对每张图调用 `read_image` 逐张查看；小字/暗纹区域用 `System.Drawing` 裁剪放大 + 灰度对比拉伸复核；背景白度、主体占比、尺寸标注线、产品配色均以像素测量为准。
审计者自有品牌：**LUVCOSY**（B0DJQS14DS）、**KIICII / PUREKRA**（B0FL6X3HRW）。

## 0. 文件可得性说明（重要）

- 任务清单中的 `B0DJQS14DS-APLUS-01.jpg` 在我第一次读取时返回 **not found**；当时目录内 B0DJQS14DS 的 A+ 文件只有 APLUS-05、APLUS-06。
- 随后复查发现 `B0DJQS14DS-APLUS-01/02/03/04.jpg` 四个文件的写入时间为本次会话期间（19:35），即它们是在我审计过程中才落盘/补下的。**最终我读取了任务指定的全部 15 张图**（APLUS-01/02/03 已补读），并额外读取了 APLUS-04/05/06 与 B0FL6X3HRW-PT05/06/07。
- 清单外但实际存在的图片（未在任务清单中）：`B0DJQS14DS-APLUS-04/05/06`、`B0FL6X3HRW-PT05/06/07`。清单中的 B0DJQS14DS 副图还有 `main-03..main-10`（与 PT 图重复）未纳入本次审计。

---

# 一、ASIN B0DJQS14DS（2-pack 硅胶盖，适配粉状清洁剂罐）

## 图 1 — B0DJQS14DS-MAIN.jpg（主图）

- **all_text_verbatim**：罐体标签（部分被裁切、随罐体旋转）：`BAR` / `KEEPERS` / `…IEND`（Bar Keepers Friend 标签被遮挡）、`STAINLESS STEEL SINKS`、`1882`（画面内可见为“882”）。画面无任何叠加文案、无水印、无角标。
- **third_party_brands**：**BAR KEEPERS FRIEND**（第三方品牌）—— 出现在右下角粉状清洁剂罐的罐身标签上（“BAR KEEPERS FRIEND”“STAINLESS STEEL SINKS”“1882”）。
- **brand_risk_level**：`P1-适配对象本体`（该罐正是本配件所适配的粉状清洁剂罐，且 listing 标题直接点名 Bar Keepers Friend）。
- **main_image_rules**：
  - 纯白背景：**是**（全图众数像素值恰为 255,255,255；42.9% 像素为精确纯白，无灰白偏色）。
  - 产品约占画面 85%+：**部分成立**。非白像素包围盒 x[0..1488]、y[0..1498]，占画幅 99.9%（物件触到四边）；但实际物件像素只占画幅约 **55%**，件与件之间有白缝。
  - 文字/logo/水印/角标/边框：**有** —— 第三方品牌文字与 logo 出现在罐体上（`BAR KEEPERS FRIEND`、`STAINLESS STEEL SINKS`、`1882`）；无卖家角标、无边框、无水印。
  - 道具/手/生活场景：**有道具** —— 一只 Bar Keepers Friend 粉状清洁剂罐（第三方产品本体，兼作说明该盖用途的道具）；无手、无生活场景。
  - 额外测量：顶边 y=0 有 50 个非白像素（x 1025–1135）→ 橙色盖被上边缘裁切；底边 y=1497–1499 有 560 个非白像素（x 929–1488）→ 罐体被下边缘裁断；右边 x=1487–1488 有 222 个非白像素（y 1278–1499）→ 罐体在右下角被右边缘裁断。
- **ai_generation_signals**：`clear_photo`。蓝盖与橙盖表面在 6× 灰度对比拉伸后无任何幽灵文字/水印；罐体文字拼写正确、字形正常；罐身细小印刷因分辨率不可读（不是乱码形状）。全图未见任何 AI 工具水印（无 “Made with Google AI”、Gemini 星标、SynthID、Midjourney、DALL·E、即梦、豆包等）。
- **before_after**：`n/a`（无 Before/After 标注）。
- **image_text_vs_visual_match**：图内无叠加文字，无可对照文案。但**数量存在误导风险**：标题称 “2 Pack”，本图可见 **3 个硅胶盖**（左上蓝色单盖、右上橙色单盖、右下角已套在罐上的蓝色盖）。若第三个盖是“同一只盖的装配示意”，则非硬性矛盾，但主图内确实出现 3 只盖子。
- **one_line_summary**：纯白背景上放着两只硅胶盖（浅蓝、橙色），右下角一只浅蓝盖已套在 Bar Keepers Friend 粉状清洁剂罐上。

## 图 2 — B0DJQS14DS-PT01.jpg

- **all_text_verbatim**：`2 Pack Silicone Lids for Powder` / `Cleanser(12 oz and 21oz)`（双色标题）；`outer diameter` / `7.7 cm`（顶部尺寸标注，虚线+双箭头）；`inner diameter` / `7.3 cm`（右下尺寸标注）。**另在橙盖表面有极淡的幽灵文字**：上行部分可辨（形似 “Powder”，不确定），下行经对比拉伸后辨读为 `Item - 2.88`，其上方还有两个淡淡的圆角方框图标轮廓（非产品内容）。
- **third_party_brands**：`none`（本图未出现任何第三方品牌实物或文字）。
- **brand_risk_level**：`none`
- **main_image_rules**：`n/a`（非主图）
- **ai_generation_signals**：`suspect_ai`。证据：(a) 橙盖表面存在**半透明幽灵字形 “Item - 2.88” 及两个圆角方框图标轮廓**（平视不可见，6× 灰度对比拉伸后显现），这是典型的生成式图像/模板水印渗入，绝非该产品应有的印字；(b) 两只盖子呈纯平面渲染，无投影、无表面纹理；(c) 尺寸标注线与图形自身比例不符（见下条）。未见 AI 工具水印文字。
- **before_after**：`n/a`
- **image_text_vs_visual_match**：**矛盾（已实测）**。图为 7.7 cm 外径 / 7.3 cm 内径。实测：顶部“outer diameter”标注线长 **≈738 px**（与蓝盖外径 738 px 一致）；底部“inner diameter”标注线仅 **≈609 px**。若按 7.3/7.7=0.948 的比例，应约 **700 px**。两只盖同比例绘制（橙盖外径实测 728 px，与蓝盖同尺度），即该内径标注线按图内比例只对应 **≈6.4 cm**，与标注的 7.3 cm 相差约 13%。文字“2 Pack”与图中 2 只盖子一致。
- **one_line_summary**：尺寸示意图——蓝盖标注“outer diameter 7.7 cm”、橙盖标注“inner diameter 7.3 cm”，标题为“2 Pack Silicone Lids for Powder Cleanser(12 oz and 21oz)”。

## 图 3 — B0DJQS14DS-PT02.jpg

- **all_text_verbatim**：叠加文案 `Airtight Seal Design for easy Storage!`（深灰圆角面板上的白字）。罐体上：`BAR KEEPERS FRIEND`（手持罐与台面罐各一处）、`CLEANSER`、`since 1882` / `SINCE 1882`、`STAINLESS STEEL SINKS`（手持罐黄色横条）、`NET WT 12 OZ (340g)`（台面罐小字）、其余罐身细小印刷不可读。
- **third_party_brands**：**BAR KEEPERS FRIEND** —— (1) 手持的罐（罐身标签 + “STAINLESS STEEL SINKS”）；(2) 台面上立着的罐（标签 + “CLEANSER” + 圆形产品小图 + “NET WT 12 OZ (340g)”）。
- **brand_risk_level**：`P1-适配对象本体`
- **ai_generation_signals**：`clear_photo`。厨房水槽真实场景，文字拼写正确、字符连贯；手部为 4 指+拇指的合理抓握，未见多指/融合；无 AI 水印。注意：台面罐标签细小印刷因分辨率不可读（不确定项）。
- **before_after**：`n/a`
- **image_text_vs_visual_match**：**部分不符/歧义**。叠加文字宣称“Airtight Seal Design（密封设计）”，但画面呈现的状态**不是密封状态**：橙色盖明显被弯折/掀起，盖内凹面外露，仅部分搭在罐口端面，同时罐体被倒置（标签旋转约 90°）置于湿水槽上方。即画面展示的是“掀盖/未密封”的一瞬，而非文案所宣传的密封盖合状态。数量：可见 2 只盖（橙色在用 + 蓝色在台面罐上），与 2-pack 一致。
- **one_line_summary**：一只手把 Bar Keepers Friend 罐倒置在水槽上方、橙盖被弯折掀起，台面上另有一只套着浅蓝盖的同款罐，配文“Airtight Seal Design for easy Storage!”。

## 图 4 — B0DJQS14DS-PT03.jpg

- **all_text_verbatim**：叠加文案 `Effectively Seals After Each Use to Keep Cleaning Powder Fresh, Moisture-Free, and Leak-Proof.`。罐体上：`BAR KEEPERS FRIEND`（两只罐各一处）、`CLEANSER`、`since 1882` / `SINCE 1882`、`STAINLESS STEEL + PORCELAIN + CERAMIC`（左罐顶部横条）、`STAINLESS STEEL`（右罐红色细条）、`COOKWARE + OUTDOOR` / `+ BATHROOM + KITCHEN + COOKWARE + OUTDOOR`（下部横条）、`BKF`（左罐被掀起的铝箔封口上的蓝红 logo）、右罐侧面成列的细小印刷（形似成分/警示文字块，不可读）。
- **third_party_brands**：**BAR KEEPERS FRIEND**（两只罐），以及同一品牌在铝箔封口上的 `BKF` 字母组合标识。
- **brand_risk_level**：`P1-适配对象本体`
- **ai_generation_signals**：`clear_photo`。`BAR KEEPERS FRIEND`、`STAINLESS STEEL`、`PORCELAIN`、`CERAMIC` 等文字拼写与字形均正确；木质桌面、两只罐、被掀起的封口在物理上自洽；无 AI 水印。右罐细小印刷不可读（不确定项）。
- **before_after**：**隐式（无标注）前后对比** —— 左侧罐“开口（铝箔封口被掀起、撒粉孔外露，无盖）”＝未加盖状态；右侧罐“已被浅蓝盖覆盖”＝加盖状态。左右状态与其配文逻辑一致，且因没有 Before/After 标签，不存在标反问题。
- **image_text_vs_visual_match**：可核对处一致。`Leak-Proof`（防漏）无法自图中验证（图中无液体、罐体不透明），属“未展示的宣称”，非可见矛盾。数量：本图仅 1 只盖（右罐），左罐无盖。
- **one_line_summary**：木质桌面上两只 Bar Keepers Friend 清洁粉罐——左边开口（铝箔封口被掀起），右边套着浅蓝硅胶盖，配文“Effectively Seals After Each Use to Keep Cleaning Powder Fresh, Moisture-Free, and Leak-Proof.”。

## 图 5 — B0DJQS14DS-PT04.jpg

- **all_text_verbatim**：叠加文案 `Designed to Keep Your Cleaning Powder Dry and Safe with a Waterproof Seal`（深灰四分之一圆面板上的白字）；图标：两滴水珠被红色 ✕ 划掉。罐体：`BAR KEEPERS FRIEND`、`SINCE 1882`，罐身右侧标签板有成列细小印刷与红黑小色块（不可读）。
- **third_party_brands**：**BAR KEEPERS FRIEND** —— 罐身标签（`BAR KEEPERS FRIEND`、`SINCE 1882`）。
- **brand_risk_level**：`P1-适配对象本体`
- **ai_generation_signals**：`clear_photo`。水流自上而下撞在盖面并四溅、罐身与水槽周围水珠的物理表现合理；浅蓝盖表面对比拉伸（拉伸前 lo=166/hi=234）后仍均匀，**未见幽灵文字**；无 AI 水印。罐身细小印刷不可读（不确定项）。
- **before_after**：`n/a`
- **image_text_vs_visual_match**：一致（划掉水滴的图标与 “waterproof” 文字，与“水浇在已加盖的罐上”的画面相符）。但“粉保持干燥”无法自图中证明（罐体不透明），属宣称而非展示。数量：1 只盖。
- **one_line_summary**：水从上方浇在直立 Bar Keepers Friend 罐的浅蓝硅胶盖上，配红叉水滴图标与“Designed to Keep Your Cleaning Powder Dry and Safe with a Waterproof Seal”。

## 图 6 — B0DJQS14DS-PT05.jpg

- **all_text_verbatim**：叠加文案 `Flexible silicone design makes opening and closing a breeze`（黑色）。橙盖表面另有极淡幽灵文字，经对比拉伸后可辨 `Item` 及随后一个模糊字符，盖面左上另有一处淡色圆角方框图标轮廓。
- **third_party_brands**：`none`
- **brand_risk_level**：`none`
- **ai_generation_signals**：`suspect_ai`。证据：(a) 与 PT01 同源的**非产品幽灵文字 “Item …” 及淡色图标轮廓**出现在橙色硅胶盖上（平视几乎不可见，6× 灰度对比拉伸后显现）；(b) 手指抓握形态合理（拇指+1 指，未见多指/融合）；(c) 拉伸形变渲染平滑。未见 AI 工具水印文字。
- **before_after**：`n/a`
- **image_text_vs_visual_match**：一致（盖子呈明显弯折/柔软状态，与 “Flexible silicone design” 相符）。数量：1 只盖。
- **one_line_summary**：一只手捏着一只弯折的橙色硅胶盖展示柔软度，配文“Flexible silicone design makes opening and closing a breeze”。

## 图 7 — B0DJQS14DS-PT06.jpg

- **all_text_verbatim**：叠加文案 `Compatible with 12oz & 21oz Powder Cleanser`、`Dishwasher Safe`。产品上：`Comet`（logo）、`50% MORE CLEANING POWER†`、`WITH BLEACH`、`CON BLANQUEADOR`、`REMOVES TOUGH STAINS`、`SCRATCH FREE`、`NET WT…`（小字，部分不可读）；`BAR KEEPERS FRIEND`（两只罐）、`since 1882` / `SINCE 1882`、`SUPERIOR COOKWARE CLEANSER & POLISH`、`STAINLESS STEEL`（黄条）、`NET WT 12 OZ (340g)`、`WARNING: EYE IRRITANT`、`MADE IN USA`（小字）、`CLEANSER`（倒地罐上部分可见）。
- **third_party_brands**：(1) **COMET** —— 居中绿色罐（Comet 红色方块星标 logo、“WITH BLEACH CON BLANQUEADOR”），罐上套浅蓝盖；(2) **BAR KEEPERS FRIEND** —— 侧倒撒粉的罐，以及右侧深色罐（`SUPERIOR COOKWARE CLEANSER & POLISH`，套黄色盖）。
- **brand_risk_level**：两者均为 `P1-适配对象本体`（都是本盖所适配的粉状清洁剂罐；图内文字亦自述 “Compatible with 12oz & 21oz Powder Cleanser”）。附注：Comet 是竞品清洁剂品牌，但本 listing 标题本身即写明兼容 “Bar Keepers Friend, Comet, Ajax Powder Cleanser”，故此处属“兼容/适配对象展示”，而非无关道具。
- **main_image_rules**：`n/a`
- **ai_generation_signals**：`clear_photo`。所有大字拼写与字形正确；罐体、海绵、撒出的粉末、木纹桌面与光照自洽；无 AI 水印。罐身细小印刷不可读（不确定项）。
- **before_after**：`n/a`
- **image_text_vs_visual_match**：数量/宣称核对——图中出现 3 只粉状清洁剂罐（2 个品牌），文字称兼容 “12oz & 21oz”，但画面未标注任何罐的容量，故无法自图中验证 12/21 oz。可见 2 只盖（Comet 罐浅蓝盖、BKF 厨具罐黄盖），与 2-pack 相符。
- **one_line_summary**：木质桌面上三只清洁粉罐（侧倒撒粉的 Bar Keepers Friend、套浅蓝盖的绿色 Comet、套黄盖的 Bar Keepers Friend Cookware），标题“Compatible with 12oz & 21oz Powder Cleanser”。

## 图 8 — B0DJQS14DS-APLUS-01.jpg（A+ 图 1）

- **all_text_verbatim**：右上角卖家 logo 面板：`LUVCOSY`（艺术字，字母 **S 呈镜向/反向**、字首上方为两个镜像叶片/W 形 monogram）。叠加文案：`LUVCOSY Silicone Lids For Powder Cleanser`（青绿圆形上黑字）、`✔ No Moisture ✔ No Leakage`（两个黑色对勾项）。产品上：`AJAX`（红色 logo）/`SCRATCH FREE`/`STRONGER THAN DIRT`/`WITH BLEACH`/`NET WT 14 OZ (396 g)`/`MADE IN USA`（小字）；`Comet`（logo）/`50% MORE CLEANING POWER`/`BLEACH`/`CON BLANQUEADOR`/`REMOVES TOUGH STAINS`/`SCRATCH FREE`；`BAR KEEPERS FRIEND`（两只）/`since 1882`·`SINCE 1882`/`CLEANSER`/`SUPERIOR COOKWARE CLEANSER & POLISH`/`NET WT 12 OZ (340g)`/`BATHROOM + KITCHEN + COOKWARE + OUTDOOR`/`STAINLESS STEEL`/`MADE IN USA`；`BON AMI`（红底白字 + 绿叶）/`KITCHEN & FAMILY-SAFE`（绿）/`POWDER CLEANSER`（绿）；左侧黄色喷壶标签上可见 `A7`（其余文字不可读，品牌不确定）。
- **third_party_brands**：**AJAX**（台上 Ajax Bleach 粉罐）、**COMET**（绿罐）、**BAR KEEPERS FRIEND**（两只罐）、**BON AMI**（右侧 Bon Ami 粉状清洁剂罐，浅蓝盖斜靠其上），以及左侧黄色喷壶标签上的 `A7`（品牌不确定）。
- **brand_risk_level**：`AJAX`/`COMET`/`BAR KEEPERS FRIEND`/`BON AMI` = `P1-适配对象本体`（均为本盖适配的粉状清洁剂罐；listing 标题亦点名 Bar Keepers Friend, Comet, Ajax, Bonami）；`A7` 喷壶 = `P0-无关展示/装饰/背景`（与硅胶盖无关的清洁喷剂，纯背景道具）。
- **main_image_rules**：`n/a`（A+ 图不受主图规则约束）
- **ai_generation_signals**：`clear_photo`。真实厨房场景，所有品牌 logo 与大字拼写/字形正确；水龙头、窗外绿植、剪刀、瓷砖图案合理；无 AI 水印。`A7` 瓶身标签正文因景深虚化不可读（符合实拍虚化，但 “A7” 本身文字清晰，无法对应已知品牌，标记为不确定）。
- **before_after**：`n/a`
- **image_text_vs_visual_match**：标题 “LUVCOSY Silicone Lids For Powder Cleanser” 与画面相符（硅胶盖套在多种清洁粉罐上）。数量：本图可见 **5 只盖**（Ajax 罐、Comet 罐、BKF Cleanser 罐、BKF Cookware 罐各 1 + 斜靠 Bon Ami 罐的 1 只散盖），远多于 2-pack；因本图属“使用演示”而非“包装内容”，图内无 “2 Pack” 字样，故不构成图内自相矛盾，但与包装数量宣称存在认知冲突。`No Moisture`/`No Leakage` 在本图中无对应演示（画面既无泄漏也无受潮场景），属未展示的宣称。
- **one_line_summary**：厨房台面生活场景，LUVCOSY 硅胶盖分别套在 Ajax Bleach、Comet、两只 Bar Keepers Friend、Bon Ami 五种清洁粉罐上，配文“LUVCOSY Silicone Lids For Powder Cleanser / No Moisture / No Leakage”。

## 图 9 — B0DJQS14DS-APLUS-02.jpg（A+ 图 2：Before/After）

- **all_text_verbatim**：`Before`（灰底胶囊标签）、`Easily get wet and caked`（其下）；`VS`（青绿爆炸星形）；`After`（右上青绿胶囊标签）、`Effectively keep cleaning powder dry`（其下）；底部通栏 `Say goodbye to moisture, clumping, and spills!`。产品上：`BAR KEEPERS FRIEND`（右下照片中、套浅蓝盖的被浇水罐）。宏观特写圆图内无文字。
- **third_party_brands**：**BAR KEEPERS FRIEND** —— 右下角照片中罐身标签（`BAR KEEPERS FRIEND`）。
- **brand_risk_level**：`P1-适配对象本体`
- **ai_generation_signals**：`clear_photo`。两个粉末特写圆图分别呈现结块/湿粉与干燥松散粉，质感合理；文字拼写正确；箭头与曲线为干净矢量；无 AI 水印。
- **before_after**：**是，且未标反**。左侧 “Before” + 俯拍**未加盖（撒粉孔外露）**的罐，孔周粉末湿润结块，配文 “Easily get wet and caked” → Before 侧确实是较差/问题状态（受潮结块、无盖）。右侧 “After” + 干燥松散粉末圆图，并有箭头指向“套浅蓝盖、被水浇淋的 Bar Keepers Friend 罐”照片，配文 “Effectively keep cleaning powder dry” → After 侧确实是改善状态（加盖、粉末干燥）。标签与画面状态一致。
- **image_text_vs_visual_match**：一致。细节提示：“After” 侧的干燥粉末圆图是独立特写，并非拍自该密封罐内部，因果关系由排版暗示而非实证；但两侧状态本身与其标签相符。
- **one_line_summary**：标注清晰的 Before/After 对比图——左“Before（受潮结块，开口无盖）”对右“After（干燥粉末 + 套盖并浇水测试的 Bar Keepers Friend 罐）”，底栏“Say goodbye to moisture, clumping, and spills!”。

## 图 10 — B0DJQS14DS-APLUS-03.jpg（A+ 图 3）

- **all_text_verbatim**：`Say goodbye to the hassle of stickers that won't seal — enjoy fresh cleaning with ease!`（黑色叠加文案）。三个图标+文字：`Airtight seal`（碗/盖图标）、`Waterproof & Moisture-proof`（水滴图标）、`Food grade silicone`（餐罩图标）。罐体上：`BAR KEEPERS FRIEND`（两只罐）、`SINCE 1882`·`since 1882`、`STAINLESS STEEL + PORCELAIN + CERAMIC`（左罐顶条）、`STAINLESS STEEL`（左罐红条，部分）、`BKF`（左罐被掀起的铝箔封口上）、`CLEANSER`（两罐下部部分可见）、右罐侧面板细小印刷（不可读）。左罐上方红色圆圈内黑色 ✕、右罐上方红色圆圈内黑色 ✓。
- **third_party_brands**：**BAR KEEPERS FRIEND**（两只罐）及铝箔封口上的 `BKF` 标识。
- **brand_risk_level**：`P1-适配对象本体`
- **ai_generation_signals**：`clear_photo`。全部文字清晰、拼写正确；✕/✓ 角标为干净矢量；无 AI 水印。
- **before_after**：隐式 X/✓ 对比（无 Before/After 字样）：左罐＝原厂铝箔“贴纸”封口、被掀起，标 ✕（差）；右罐＝硅胶盖正常套合，标 ✓（好）。画面状态与意图一致，未标反。
- **image_text_vs_visual_match**：标题“stickers that won't seal（贴纸封不住）”与左罐铝箔封口被掀起的画面相符；`Airtight seal`/`Waterproof & Moisture-proof` 在本图只是宣称（画面只显示盖子套在罐上，无防水演示），属未展示而非可见矛盾。
- **one_line_summary**：✕/✓ 对比图——Bar Keepers Friend 罐的铝箔封口被掀起（✕）对上同一罐套着浅蓝硅胶盖（✓），配文“Say goodbye to the hassle of stickers that won't seal”，并附“Airtight seal / Waterproof & Moisture-proof / Food grade silicone”图标。

## 附加读取（清单外，实际存在）

- **APLUS-04.jpg**：`Vibrant colors for easy spotting!`（青绿圆形上黑字）。柜内可见：套橙黄盖的 `BAR KEEPERS FRIEND` Cookware 罐（含 `50% MORE CLEANING POWER … BKF` 促销贴、`ACERO INOXIDABLE`）、套浅蓝盖的 `BAR KEEPERS FRIEND` Cleanser 罐（`STAINLESS STEEL SINKS`、`BATHROOM + KITCHEN`、`CLEANSER`）、套橙盖的 `BON AMI` 罐（`KITCHEN & FAMILY-SAFE`、绿色圆形徽标），左侧另有一只部分可见的 `AJAX` 罐（仅“AX”可辨）也套着浅蓝盖。第三方品牌：BKF×2、Bon Ami、Ajax，均为 `P1`。`clear_photo`。
- **APLUS-05.jpg**：`No more spills —enjoy a nice cleaning experience!`。与 PT06 近乎同构图：BKF 罐侧倒撒粉、套浅蓝盖的 Comet 罐、套黄盖的 BKF Cookware 罐、白毛巾、黄海绵。第三方品牌：BKF×2、Comet（`P1`）。`clear_photo`。
- **APLUS-06.jpg**：`Stored together for better results.`。可见套橙盖的 BKF 粉罐、套蓝盖的 BKF Cookware 罐、倒置的 Comet 罐（蓝盖）、不锈钢盆、白毛巾、黄海绵，以及右侧一只透明按压泵瓶（蓝色液体，标贴被毛巾遮住大半，仅能读出花体残字 “…udh” 与斜体 “...i sanitizer”，**品牌不可辨，标记为不确定**）。第三方品牌：BKF×2、Comet（`P1`）；泵瓶（若为品牌物）属背景道具 = `P0`。`clear_photo`。

## ASIN B0DJQS14DS — 汇总

### 第三方品牌汇总

| 品牌 | 出现位置 | 风险等级 | 出现图片 |
|---|---|---|---|
| BAR KEEPERS FRIEND（含 `BKF` 标识） | 清洁粉罐罐身标签/封口 | P1-适配对象本体 | MAIN、PT02、PT03、PT04、PT06、APLUS-01、APLUS-02、APLUS-03、APLUS-04、APLUS-05、APLUS-06 |
| COMET | 绿色清洁粉罐罐身（logo+文字） | P1-适配对象本体 | PT06、APLUS-01、APLUS-05、APLUS-06 |
| AJAX | 清洁粉罐罐身（红字 logo） | P1-适配对象本体 | APLUS-01、APLUS-04（部分可见） |
| BON AMI | Bon Ami 清洁粉罐罐身 | P1-适配对象本体 | APLUS-01、APLUS-04 |
| `A7`（不确定） | 黄色喷壶标签 | P0-无关展示/背景/道具 | APLUS-01 |
| 花体标签按压泵瓶（品牌不可辨，不确定） | 透明泵瓶标贴 | P0-无关展示/背景/道具 | APLUS-06 |

### AI 生成嫌疑汇总

- **suspect_ai：PT01、PT05** —— 唯一且一致的证据是橙色硅胶盖表面存在**非产品幽灵文字 “Item - 2.88”（PT01 可完整辨读、PT05 可辨 “Item…”）及淡化圆角方框图标轮廓**，需 6× 灰度对比拉伸才可显现，属典型的水印/模板渗入或生成式残留。
- 其余图片：`clear_photo`（未发现乱码文字、融化边缘、不可能的反光/阴影、融合手指、无意义背景物或光照不一致）。
- **全部 15+ 张图中均未出现任何 AI 工具水印**（无 “Made with Google AI”、Gemini 星标、SynthID、Midjourney、DALL·E、即梦、豆包等标记）。
- 待注意的“非 AI 但异常”文字：APLUS-01 卖家 logo `LUVCOSY` 的字母 S 呈镜向书写；PT06/APLUS-04 等罐身细小印刷不可读（分辨率/虚化所致，形状非乱码）。

### 图文矛盾汇总

1. **PT01** —— 尺寸标注与图形自身比例不符：“inner diameter 7.3 cm” 标注线实测 ≈609 px，而 “outer diameter 7.7 cm” 标注线 ≈738 px；7.3/7.7 应为 ≈700 px（两盖同比例绘制，橙盖外径 728 px）。按图内比例该内径仅 ≈6.4 cm，偏差约 13%。
2. **MAIN** —— 标题为 “2 Pack”，主图内可见 **3 只盖**（含 1 只套在罐上的示意）。
3. **APLUS-01** —— 可见 **5 只盖**（分别套在 5 只不同品牌罐上），与 “2 Pack” 存在认知冲突（本图属使用演示，图内无 pack 数字）。
4. **PT02** —— 文案 “Airtight Seal Design” 与画面状态不符：橙盖被弯折掀起、罐体倒置，展示的是未密封状态。
5. **主图含第三方品牌标识** —— MAIN 中出现 `BAR KEEPERS FRIEND` / `STAINLESS STEEL SINKS` / `1882` 字样与 logo（主图规则通常要求画面不得出现非本卖家品牌/logo）。
6. **PT01/PT05** —— 产品表面出现非产品幽灵文字 “Item - 2.88”（水印/残留）。
7. **未展示型宣称（非硬矛盾，但无视觉支撑）**：PT03/PT04/APLUS-01/APLUS-03 的 “Leak-Proof / Waterproof / No Leakage / No Moisture”、PT02/PT03 的 “Airtight/Seals”、APLUS-02 的 “After” 干粉特写（独立素材，非取自该罐）。

### 颜色一致性

- 全系列仅出现两种颜色：**浅青蓝（cyan）** 与 **橙色（orange）**。标题未提及任何颜色。
- 实测中位色：
  - 橙盖：MAIN `RGB(255,161,43)`、PT01 `(254,155,36)` —— 一致；**但 PT05 `(255,189,66)`、PT06 套在 BKF 厨具罐上的 `(255,214,110)`、APLUS-05 `(255,207,89)`、APLUS-06 `(255,191,81)` 明显更黄**。R 通道同为 255 时 G 通道相差最大 +59，**PT06/APLUS-05/APLUS-06 中的橙盖看起来是“黄色”而非 MAIN/PT01 的橙色**（可能为布光差异，也可能是另一配色/另一批产品）。
  - 蓝盖：MAIN `(128,220,234)`、PT01 `(128,220,234)` 一致；**PT06 的 Comet 罐盖 `(195,245,249)`、APLUS-06 的 Comet 罐盖 `(177,237,245)` 明显更浅**（同样可能为顶光/布光所致）。
- 结论：**存在配色不一致的可测差异（橙→偏黄、青→偏浅）**，建议核对该 ASIN 是否实际销售了黄色/浅蓝配色；若仅为布光差异，建议统一修图。

---

# 二、ASIN B0FL6X3HRW（8-pack 硅胶盖，适配 La Fermière 酸奶罐）

## 图 11 — B0FL6X3HRW-MAIN.jpg（主图）

- **all_text_verbatim**：仅两只罐体上的**压印**文字：`FERMIÈRE`，其上方为花体 monogram（La Fermière 的 “La” 花体记号），整体位于一个圆形轮廓内（两只罐各一处）。画面无叠加文字、无水印、无角标。
- **third_party_brands**：**LA FERMIÈRE** —— `FERMIÈRE` + 花体 monogram 压印在画面右侧两只酸奶罐罐身上。
- **brand_risk_level**：`P1-适配对象本体`
- **main_image_rules**：
  - 纯白背景：**是**（众数像素值恰为 255,255,255；28.8% 像素为精确纯白，无灰白偏色）。
  - 产品约占 85%+：**部分成立**。非白包围盒 x[0..1398]、y[0..1498]（占画幅 99.9%）；实际物件像素约占画幅 **68%**。
  - 文字/logo/水印/角标/边框：**无叠加文字、无水印、无角标、无边框**；但**道具上带有第三方品牌压印 logo（`FERMIÈRE`）**。
  - 道具/手/生活场景：**有道具** —— 两只 La Fermière 酸奶罐（既是第三方产品，也是该盖的适配对象）；无手、无生活场景。
  - 额外测量：顶边 y=0 有 45 个非白像素（x 192–701）→ **顶部两只黄色盖被上边缘裁切**；底边 y=1499 非白＝0；左边 x=0 有 69 个非白像素（y 582–960）→ 浅紫蓝盖被左边缘裁切；右边干净。
- **ai_generation_signals**：`clear_photo`。压印 `FERMIÈRE` 字形与拼写正确；8 只盖上的苹果/桃形压印一致；浅紫蓝盖表面对比拉伸（拉伸前 lo=165/hi=255）后均匀，**未见幽灵文字**；无 AI 水印。
- **before_after**：`n/a`
- **image_text_vs_visual_match**：数量与标题一致 —— 可见 **8 只盖**（黄×2、珊瑚橙×2、青蓝×2、浅紫蓝×2）＝ “8 Packs”。图内无文字可矛盾。提示：本图未说明“Jars NOT Included”，买家仅看主图无法得知两只罐不含在内。
- **one_line_summary**：纯白背景上两列共 8 只硅胶盖（黄、珊瑚橙、青蓝、浅紫蓝各 2），右侧两只带 `FERMIÈRE` 压印的 La Fermière 酸奶罐（一只套青蓝盖、一只套浅紫蓝盖）。

## 图 12 — B0FL6X3HRW-PT01.jpg

- **all_text_verbatim**：`Fit for La Fermiere Yogurt Jars` / `and Oui Yogurt Glass Jars` / `(Jars NOT Included!)`（三行蓝灰叠加标题）；`2.8 Inches`（旋转 90° 的蓝字，旁附带箭头的竖直虚线尺寸标注，跨度＝盖子直径）。
- **third_party_brands**：文字提及 **LA FERMIERE**（`Fit for La Fermiere Yogurt Jars`）与 **OUI**（`Oui Yogurt Glass Jars`）。本图中**没有任何第三方品牌实物**：画面中的罐朝向镜头的一侧看不到 logo/文字。
- **brand_risk_level**：两者均为“文字提及的适配对象本体”：`LA FERMIERE = P1-适配对象本体`（被适配的罐即 La Fermière 罐，且画面中就有该罐）；`OUI = P1-适配对象本体`（同为被点名的适配罐品牌，但本图**仅文字提及，未出现 Oui 产品**）。二者都不属于“无关/背景/对标”，因此不适用 P0。
- **ai_generation_signals**：`clear_photo`。背景为真实室内（粉色百褶花瓶插绿/粉花，虚化）；盖面在放大与对比检查下平滑均匀，未见幽灵文字；无 AI 水印。不确定项：罐体呈浅蓝高光、底部带**橙/铜色环带**，与常见玻璃酸奶罐观感略有出入，但无乱码或几何错误。
- **main_image_rules**：`n/a`
- **before_after**：`n/a`
- **image_text_vs_visual_match**：尺寸标注 `2.8 Inches` 的虚线两端恰好卡在盖子直径两端，**图内自洽**；但画面无任何已知尺寸参照物，无法独立验证 2.8 英寸数值。`Fit for La Fermiere Yogurt Jars and Oui Yogurt Glass Jars` 的适配性在本图**无法验证**（罐身品牌标识不可见）。数量：本图 1 只盖。
- **one_line_summary**：一只带苹果形压印的浅紫蓝盖子倚靠在浅蓝酸奶罐旁，标题“Fit for La Fermiere Yogurt Jars and Oui Yogurt Glass Jars (Jars NOT Included!)”，并标注“2.8 Inches”。

## 图 13 — B0FL6X3HRW-PT02.jpg

- **all_text_verbatim**：`Premium Food-grade Silicone` / `Ensure Food Safety for Your Family`（白+灰叠加标题）；右侧弧形色带三个角标：`BPA Free`（叶片图标）、`Lead-Free`（Pb 划除图标）、`More Durable`（盾牌对勾图标）。罐身压印（两只罐）：`FERMIÈRE` + 花体 monogram，位于圆形轮廓内。
- **third_party_brands**：**LA FERMIÈRE** —— `FERMIÈRE` + monogram 压印在画面中央与左侧两只罐身上。
- **brand_risk_level**：`P1-适配对象本体`
- **ai_generation_signals**：`clear_photo`。文字拼写正确；蓝莓、玻璃碗、木托板物理自洽；压印字形正确；无 AI 水印。
- **before_after**：`n/a`
- **image_text_vs_visual_match**：可核对处一致。`BPA Free`/`Lead-Free`/`More Durable`/`Food-grade` 均无视觉对应物，属不可视验证的宣称（未被画面反驳）。数量：2 只盖（浅紫蓝、青蓝）；本图无 pack 数量文字。
- **one_line_summary**：两只套着浅紫蓝与青蓝硅胶盖的 La Fermière 酸奶罐置于蓝莓之间，标题“Premium Food-grade Silicone — Ensure Food Safety for Your Family”，角标“BPA Free / Lead-Free / More Durable”。

## 图 14 — B0FL6X3HRW-PT03.jpg

- **all_text_verbatim**：`100% Airtight Design`（深蓝横幅白字）；`Dust-proof` / `Leak-proof`（灰字）；`Ensure long-lasting food freshn`（灰字，末词写作 **`freshn`**，疑为拼写错误/截断）。罐体压印（因罐体倒置而呈倒转）：`FERMIÈRE` + monogram，位于圆形轮廓内。
- **third_party_brands**：**LA FERMIÈRE** —— `FERMIÈRE` 压印在罐身上（画面中倒置可见）。
- **brand_risk_level**：`P1-适配对象本体`
- **ai_generation_signals**：`clear_photo`。手指解剖结构合理（未见多指/融合）；罐与盖的几何关系自洽；无 AI 水印。文字错误 `freshn` 属排版/拼写问题（不一定由 AI 造成）。
- **before_after**：`n/a`
- **image_text_vs_visual_match**：横幅宣称 `100% Airtight Design` / `Leak-proof`，画面为“手提盖子把罐子倒置”。图中**看不到任何液体或渗漏**，故为未展示的绝对化宣称，而非被画面反驳。**文字错误**：`Ensure long-lasting food freshn` —— 末词不是正确英文单词。
- **one_line_summary**：一只手捏着黄色硅胶盖把 La Fermière 罐倒置提起，配文“100% Airtight Design — Dust-proof — Leak-proof — Ensure long-lasting food freshn”。

## 图 15 — B0FL6X3HRW-PT04.jpg（对比图）

- **all_text_verbatim**：左栏（蓝底标题）`PUREKRA SILICONE LIDS`；三项带“拇指向上”图标：`Durable & Long-lasting`、`Soft & Bendable`、`Small Holes for Hanging`。右栏（灰底标题）`OTHER LIDS`；四项带“拇指向下”图标：`Not Eco-friendly.`、`Easy to Crack & Break.`、`Release harmful substances while heated.`、`Poor Sealing.`。左栏第一个圆形插图内的罐身上可见压印的 `FERMIÈRE`（部分可见）。
- **third_party_brands**：**LA FERMIÈRE** —— `Durable & Long-lasting` 圆形插图照片中罐身压印 logo。右栏 `OTHER LIDS` 只是一只无标识的白色平盖，**无可辨识的竞品品牌 logo**。
- **brand_risk_level**：`P1-适配对象本体`（插图中的 La Fermière 罐）。
- **ai_generation_signals**：`clear_photo`。插图中手部（拇指/食指）结构合理；兰花与粉色叶片图案为干净图形；无 AI 水印。
- **before_after**：本图是**对标/贬他型对比图**，而非标注 Before/After 的前后对比。左＝`PUREKRA SILICONE LIDS`（卖方自有品牌）+3 项正面属性；右＝`OTHER LIDS`+4 项负面指控。**指控与画面是否相符**：右栏只放了一张灰褐底上的普通白色平盖静态照片，**无法在视觉上证明“不环保/易开裂破碎/加热释放有害物质/密封差”中的任何一项**（画面没有开裂、破碎、加热或渗漏的呈现）。左栏三项正面点有画面支撑（盖子在使用中、被弯折、挂在挂钩上）。
- **image_text_vs_visual_match**：右栏对“OTHER LIDS”的四项负面结论**缺少视觉证据**（未获证实的贬他对比）；卖方品牌 `PUREKRA` 在该 ASIN 的图片组中**仅本图出现**（其余图片出现的是 LUVCOSY/无品牌标识）——这不是图内矛盾，但属品牌露出不一致。
- **one_line_summary**：两栏对比图——左“PUREKRA SILICONE LIDS”（三项优点+实拍，含一只 La Fermière 罐），右“OTHER LIDS”（四项缺点+一张无标识白盖照片）。

## 附加读取（清单外，实际存在）

- **PT05.jpg**：`FREEZER & FRIDGE SAFE`、`MICROWAVE SAFE`、`DISHWASHER SAFE`。四格拼图：洗碗机篮中的橙/黄/青/浅紫蓝盖；冰箱内的 La Fermière 罐（青盖、黄盖）；微波炉中的两只 La Fermière 罐（青盖、黄盖，罐身 `FERMIÈRE` 压印清晰可读）。第三方品牌：**La Fermière**（罐身，`P1`）；冰箱格里另有 **M&S（Marks & Spencer）** 品牌的“MIXED BEANS”食品盒（红盖，标签可见 `M&S` 与 `MIXED BEANS`，属背景食材 = `P0-无关展示/背景`），两只白色大桶（蓝字仅能读到 “ani”/“urt” 片段，品牌不可辨，不确定），以及一瓶琥珀色液体。`clear_photo`（虚化为景深所致；细字不可读）。
- **PT06.jpg**：上格 `Easy To Put On & Take Off` / `- Convenient Opening` / `- Fast Storage`（手从浅紫蓝罐上掀下同色盖）；下格 `Soft Silicone Material` / `- More Flexible` / `- Durable & Reusable`（手弯折青蓝盖）。**盖子内侧有一处压印的矩形标记（内含波浪线与三个小方块），不可辨读**（不确定）；上格罐身可见一处极淡的圆形压印轮廓（对比拉伸后可见），但**无可辨读的 `FERMIÈRE` 字样**。`clear_photo`。
- **PT07.jpg**：无叠加文字。一只带 `MIERE`（＝`FERMIÈRE` 的可见部分）压印的 La Fermière 罐、旁边立着一只浅紫蓝盖，白色勺子横在罐口，两颗蓝莓，白餐巾，背景为粉色礼盒与纸托里的可颂。第三方品牌：**La Fermière**（罐身，`P1`）。盖面 6× 对比拉伸后**未见幽灵文字**。`clear_photo`。

## ASIN B0FL6X3HRW — 汇总

### 第三方品牌汇总

| 品牌 | 出现位置 | 风险等级 | 出现图片 |
|---|---|---|---|
| LA FERMIÈRE / `FERMIÈRE`（含花体 monogram） | 酸奶罐罐身压印 | P1-适配对象本体 | MAIN、PT02、PT03、PT04（插图）、PT05、PT07（共 6 张可见实物压印） |
| LA FERMIERE（文字，无重音） | 叠加标题文字 | P1-适配对象本体（文字提及） | PT01 |
| OUI | 叠加标题文字（`Oui Yogurt Glass Jars`），**无 Oui 产品出现** | P1-适配对象本体（仅文字提及，无实物） | PT01 |
| M&S（Marks & Spencer） | 冰箱内食品盒标签（`M&S` + `MIXED BEANS`） | P0-无关展示/背景/道具 | PT05 |
| 白色大桶（蓝字 “ani”/“urt” 片段，品牌不可辨） | 冰箱内食品桶标签 | 不确定（倾向 P0 背景道具） | PT05 |

### 每张图中 “FERMIERE / LA FERMIÈRE” 出现位置

| 图片 | 形式 | 具体位置 |
|---|---|---|
| MAIN | 实物压印 | 右侧**两只**罐身上，`FERMIÈRE` 位于圆形轮廓内、花体 monogram 正下方 |
| PT01 | 仅叠加文字 | 标题第 1 行 `Fit for La Fermiere Yogurt Jars`（罐身朝向镜头一侧**看不到**任何品牌字样） |
| PT02 | 实物压印 | 中央与左侧**两只**罐身，圆形轮廓内 `FERMIÈRE` + monogram |
| PT03 | 实物压印 | 被倒置提起的罐罐身（文字倒转可见） |
| PT04 | 实物压印 | “Durable & Long-lasting” 圆形插图照片中的罐身（部分可见） |
| PT05 | 实物压印 | 微波炉格内两只罐（清晰可读 `FERMIÈRE`）；冰箱格内的罐（轮廓可见） |
| PT06 | 不可辨 | 上格罐身仅见极淡圆形压印轮廓，**无可辨读字样** |
| PT07 | 实物压印 | 罐身（可见 `MIERE`，即 `FERMIÈRE` 被遮挡后的部分） |

### AI 生成嫌疑汇总

- 本 ASIN **未发现任何 `suspect_ai` 或 AI 水印**：8 张图（含清单外 PT05/06/07）中，`FERMIÈRE` 压印、罐盖苹果形压印、冰箱标签、微波炉/洗碗机场景文字均拼写正确、字形正常；对浅紫蓝盖（MAIN）、PT07 盖面做 6× 灰度对比拉伸后均**未见幽灵文字**（不同于 B0DJQS14DS 的 PT01/PT05）。
- 唯一“异常文字”是 PT03 的 `freshn`（拼写/截断错误）与 PT06 盖内不可辨读的矩形压印标记，二者都不构成 AI 生成证据。

### 图文矛盾汇总

1. **PT03** —— 文案错误：`Ensure long-lasting food freshn`（末词非正确英文）。
2. **PT03** —— `100% Airtight Design` / `Leak-proof`：画面为倒置罐，无液体、无渗漏呈现，属未展示的绝对化宣称。
3. **PT04** —— 右栏对 `OTHER LIDS` 的四项负面指控（不环保/易开裂破碎/加热释放有害物质/密封差）**无任何视觉证据**（仅一张普通白盖静态照）。
4. **PT01** —— `Fit for La Fermiere Yogurt Jars and Oui Yogurt Glass Jars` 的适配性无法自图中验证（罐身无可见品牌标识；未出现 Oui 产品）。
5. **PT01** —— `2.8 Inches` 图内自洽（虚线跨度为盖子直径），但画面无参照物可独立核验。
6. **PT05** —— 冰箱格内出现第三方品牌食品（`M&S` “MIXED BEANS”、无品牌大桶），属背景道具，但会削弱“画面仅展示本产品及适配对象”的干净度。
7. **主图含第三方品牌标识** —— MAIN 中两只道具罐上有 `FERMIÈRE` 压印 logo（主图规则通常要求画面不得出现非本卖家品牌/logo），且未注明“Jars NOT Included”。
8. **未展示型宣称**：PT02 的 `BPA Free / Lead-Free / More Durable / Food-grade`、PT05 的 `FREEZER & FRIDGE SAFE / MICROWAVE SAFE / DISHWASHER SAFE` 均无对应演示画面（非矛盾，但无视觉支撑）。

### 颜色一致性

- 全系列出现 **4 种颜色**：**黄色、珊瑚橙（salmon/coral）、青蓝（cyan）、浅紫蓝（periwinkle）**；标题与文案均未提及任何颜色。
- 实测中位色：黄 MAIN `(255,225,93)` vs PT03 `(237,199,87)`（同色，亮度差异）；珊瑚橙 MAIN `(255,138,107)`；青蓝 MAIN `(130,237,250)` vs PT02 `(164,237,246)`；浅紫蓝 MAIN `(170,197,227)`、PT01 `(205,218,237)`、PT02 `(219,227,240)`、PT07 `(190,210,236)` —— **无明显色相跳变，颜色在各图间一致**（差异可由布光/景深解释）。
- 结论：**颜色一致性良好，无“某图独有颜色”**。
