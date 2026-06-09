# 文章分類:三層模型設計(category / tags / series)

- 日期:2026-06-10
- 範圍:在 Astro blog 內容模型上,於既有 `category` 之外加入「主題標籤(tags)」與「有序系列(series)」兩層,並提供對應瀏覽 / 串接 UI
- 站台:Astro(已 cutover 上線於 master)

## 背景

目前 blog collection 每篇有單一 `category`(`tech` / `food`,驅動 topbar 的 Tech/Food 列表)與一個選用的 `tags` 陣列(僅 BTL 系列標了 `leadership`,但尚無任何 tag 瀏覽頁,等於未啟用)。`btl-1/2/3`(成為 Tech Leader 讀書筆記)實質上是有順序的系列,但沒有任何串接或目錄。

使用者希望同時:串起「系列」、用主題標籤交叉瀏覽、並保持頂層分類精簡。

## 已確認決策

- 採**三層模型**,三者並存、各司其職。
- 頂層 `category` **保持精簡不動**(維持 `tech` / `food`);細分交給 tags / series。
- Series **只在文章內串接**(系列盒 + 上/下一篇),先不做獨立 `/series/` 路由。
- Tags **不上 topbar**,僅從文章頁的 tag chip 進入。
- Tag 使用 **ASCII slug**(如 `leadership`、`system-design`、`kotlin`),網址乾淨。

## 三層模型

| 層 | 欄位 | 每篇 | 角色 |
|---|---|---|---|
| Category 分類 | `category`(現有 enum) | 1 個 | 粗分類 + topbar(tech/food,不變) |
| Tags 主題標籤 | `tags`(現有,陣列) | 0~多 | 交叉主題,有瀏覽頁 |
| Series 系列 | 新增 `series` + `seriesOrder` | 0~1 | 有序系列,文章內串接 |

一篇可同時:`category=tech`、`tags=[leadership]`、`series="成為 Tech Leader 讀書筆記"` / `seriesOrder=4`。

## 設計內容

### 1. Schema 調整(`src/content.config.ts`)
blog schema 新增兩個選用欄位(category、tags 不動):
- `series: z.string().optional()` — 系列標題(同系列以此字串相等為分組鍵)。
- `seriesOrder: z.number().optional()` — 系列內排序序號。

### 2. Tags 主題標籤
- **文章頁(`PostLayout.astro`)**:將 `tags` 由純文字改為可點的 chip,連到 `/tags/<tag>/`。
- 新增 **`src/pages/tags/[tag].astro`**:`getStaticPaths` 蒐集所有文章出現過的 tag,逐一產生頁面;列出含該 tag 的文章(日期倒序,連 `/blog/<slug>/`)。param 以 `encodeURIComponent` 安全處理。
- 新增 **`src/pages/tags/index.astro`**:列出所有 tag 及各自篇數,連到 `/tags/<tag>/`。
- **不加入 topbar**;tag 僅由文章頁 chip 或 `/tags/` 進入。
- Tag 值採 ASCII slug(小寫、連字號);顯示即為該值。

### 3. Series 系列
- frontmatter 範例:`series: "成為 Tech Leader 讀書筆記"`、`seriesOrder: 4`。
- **文章頁(`PostLayout.astro`)新增「系列盒」**,當 `series` 有值時顯示:
  - 系列名稱。
  - 該系列**依 `seriesOrder` 排序的全部文章清單**,目前這篇高亮(非連結),其餘為連結。
  - 上一篇 / 下一篇(依序;首/尾則該方向省略)。
- 同系列分組鍵 = `series` 字串相等。
- **不另建 `/series/` 路由**(文章內串接即足夠;未來要系列總覽頁再加)。

### 4. 既有文章回填
- `btl-1` / `btl-2` / `btl-3`:加 `series: "成為 Tech Leader 讀書筆記"`,`seriesOrder` 分別 1 / 2 / 3(tags 已有 `leadership`,不動)。
- 其餘文章的 tags 暫不新增(交由使用者日後自行標註)。

## 不變
- topbar(Home / About / Tech / Food / Guides / Tools)。
- `category` 維持 `tech` / `food` enum。
- 既有文章 / 列表 / RSS / 工具頁行為。

## 風險 / 注意
- Tag 若使用 CJK 會造成 URL 編碼較醜;故約定使用 ASCII slug。
- 系列盒以 `series` 字串完全相等分組,標題需一致(typo 會分裂系列)。
- `getStaticPaths` 蒐集 tag 時需去重;空 tags 文章不產生標籤頁。

## 驗證方式
- `npm run build` 成功。
- `/tags/leadership/` 產生,列出三篇 BTL;`/tags/` 列出所有 tag 與篇數。
- 三篇 BTL 文章顯示系列盒:順序為 1→2→3、目前篇高亮、上/下一篇正確(btl-1 無上一篇、btl-3 無下一篇)。
- 文章頁 tag 顯示為可點 chip,連到對應 `/tags/<tag>/`。
- 非系列、無 tag 的文章(ramen、braised-pork-rice、lottery)不顯示系列盒、tag 區塊正常(空則不顯示)。
- topbar、category 列表、RSS 不受影響。
