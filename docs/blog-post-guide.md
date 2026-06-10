# 部落格發文準則 / 模板

> 內部寫作參考(不發佈到站上)。這個部落格的定位是 **個人品牌 / 專業形象** —— 展示一個 Backend Lead 的思考與深度。

## 1. 定位與讀者

- **目的:** 個人品牌、專業形象。讀者是同行 / 雇主 / 社群,不是泛泛流量。
- **價值公式:** 一篇好文 = 「**比原書/原始資料更清楚的摘要**」 + 「**真正用過、有觀點的個人反思**」。
  - 摘要不是 commodity:原書常寫得繞、而且現代人不太讀書。能讓人 5 分鐘抓到精華的提煉,本身就是服務,也展示「讀透並濃縮」的能力。
  - 反思是賣點:證明你真的拿去用、有自己的判斷,別人複製不走。

## 2. 文章結構(摘要 + 反思)

1. **摘要段**(`##` / `###`):把來源提煉成清楚的**模型、條列、對照**。目標是「比原書更醒目、更好懂」,不是逐段轉述。
2. **`## 反思`**:個人經驗 + 觀點,證明真的用過。可再分 `###` 子題(如 `btl-4` 的「心態」「技術能力」)。
3. **圖(選用)**:只在「能幫助理解」時加 —— 例如成長曲線、大腦 vs 節點這類概念對比。沒幫助就別硬塞。

## 3. 品質準則(發佈前自我檢查)

- **摘要**
  - [ ] 有沒有點出書中埋得不明顯、但其實重要的重點?
  - [ ] 沒讀過原書的人,能不能靠這段在 5 分鐘內抓到精華?
  - [ ] 是「提煉成結構」還是只是「照抄/逐段轉述」?
- **反思**
  - [ ] 夠不夠具體?有沒有真實例子、數據、情境(而非泛論)?
  - [ ] 有沒有自己的觀點 / 判斷,而不是中立複述?
- **整體**
  - [ ] 摘要與反思有呼應嗎?
  - [ ] 反思有沒有被草草帶過?(反思是賣點,別讓它兩句話收掉。)

## 4. Front matter 慣例

對齊 `src/content.config.ts` 的 blog schema:

| 欄位 | 說明 |
|---|---|
| `title` | 系列文用「**領導力 - XXX**」格式;單篇自由命名。 |
| `date` | `YYYY-MM-DD`。 |
| `category` | 目前只有 `tech` / `food`(粗分類,驅動 topbar)。 |
| `tags` | 交叉主題,**ASCII slug**(如 `leadership`、`system-design`),網址才乾淨。 |
| `series` | 系列標題,**完全相同字串**作為分組鍵(typo 會把系列拆開)。 |
| `seriesOrder` | 系列內序號(1, 2, 3…)。 |
| `comments` | 預設 `true`;設 `false` 可關閉留言。 |
| `commentsIssue` | 只在要沿用「既有 GitHub issue 討論串」時設(如 `lottery` → 1)。一般新文不用設。 |

## 5. 技術注意事項

- **內嵌 SVG / 原始 HTML 內不可有空行。** 空行會讓 markdown 結束 raw-HTML 區塊,後面縮排的內容會被當成 code block,圖就半截壞掉(`btl-4` 踩過)。整個 `<svg>` 要連續。
- **數學:** 用 `$...$`(行內)/ `$$...$$`(獨立),KaTeX 已設定好。
- **圖配色:** 沿用站台深色 token 的字面值 —— accent `#4f6df5`、muted `#9aa4b2`、line `#3a4154`、surface `#262b3a`、ink `#e6e6e6`。
- **外部圖片:** 直接用 markdown `![](url)` 即可(remote 圖會原樣 render)。
- 系列盒、tag chip、上/下一篇由 `src/layouts/PostLayout.astro` 自動產生 —— 只要 front matter 填對,不用在內文手動做。

## 6. 可複製的骨架

開新文章時複製這段到 `src/content/blog/<slug>.md`:

```markdown
---
title: "領導力 - XXX"
date: 2026-01-01
category: tech
tags:
  - leadership
series: "成為 Tech Leader 讀書筆記"
seriesOrder: 5
comments: true
---
## 〈主題〉

（一句話帶出這篇要講什麼。）

### 〈子概念一〉
（把概念提煉成清楚的說明 / 條列 / 對照,比原書更好懂。）

### 〈子概念二〉
（同上。需要時放一張圖 —— 注意 SVG 內不可有空行。）

## 反思

### 〈面向一〉
（具體的個人經驗 + 你的觀點,證明你真的用過。）

### 〈面向二〉
（同上。）
```

選用的內嵌圖範例(整段不可有空行):

```html
<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 360 170" role="img" aria-label="〈描述〉" style="width:100%;max-width:420px;height:auto;">
    <line x1="40" y1="150" x2="350" y2="150" stroke="#3a4154" stroke-width="1.5"/>
    <!-- …其餘 svg 元素,中間都不要留空行… -->
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">〈圖說〉</figcaption>
</figure>
```

---

**現有範例:** `src/content/blog/btl-1.md` ~ `btl-4.md`(成為 Tech Leader 讀書筆記系列)即依此格式。
