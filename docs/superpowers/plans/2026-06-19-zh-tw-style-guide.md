# 台灣用詞與個人口吻風格指南 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish a growing Taiwan-terminology + personal-voice style guide, wire its core into the writing-blog-post skill, and audit existing posts for banned terms.

**Architecture:** A living reference doc `docs/zh-tw-style-guide.md` (full term table + voice rules + conventions + corrections log) is the source of truth; the `writing-blog-post` skill embeds the high-frequency core + a pre-finish scan step + a pointer to the doc. No code, no build impact (`docs/` isn't built).

**Tech Stack:** Markdown docs + a project skill (`.claude/skills/writing-blog-post/SKILL.md`). Verification via Grep + `npm run build`.

## Global Constraints
- All content in Traditional Chinese, Taiwan vocabulary.
- The skill must stay lean: high-frequency core inline, full table only in the doc (single source of truth — avoid drift).
- Don't blindly mass-replace context-dependent words (支持 / 通過 / 優化) — judge by context.
- Spec: `docs/superpowers/specs/2026-06-19-zh-tw-style-guide-design.md` (the full A-region term table lives there — copy it verbatim).

---

### Task 1: Create the living style-guide doc

**Files:**
- Create: `docs/zh-tw-style-guide.md`

- [ ] **Step 1: Create the file with four sections**

Create `docs/zh-tw-style-guide.md`. Start with this header + B/C/D sections exactly as below, and for **A 區**, transcribe the full term table verbatim from the spec (`docs/superpowers/specs/2026-06-19-zh-tw-style-guide-design.md`, section "1 … A 區 — 台灣技術用詞對照表").

```markdown
# 台灣用詞與個人口吻 風格指南

內部文件(Astro 不會 build `docs/`)。寫部落格文章時的用詞與口吻基準;`writing-blog-post` skill 指向這裡。
這是**活文件**:每次作者糾正用詞/語氣,就追加到 D 區(必要時補進 A 區表與 skill 的高頻清單)。

## A. 台灣技術用詞對照表

<!-- 從 spec 2026-06-19-zh-tw-style-guide-design.md 的 A 區表整段複製到這裡(避免 | 偏好 | 備註) -->

## B. 口吻準則(以 btl-1~6 的「## 反思」為範本)
- 第一人稱、有主張(「我認為」「我的習慣是」「我會先…」),不中立複述。
- 用具體經驗 / 數字 / 真實情境佐證,不泛論。
- 轉折愛用破折號「——」;常用「其實」「往往」「與其…不如」。
- 段落 / 文章結尾常收一句斬釘截鐵的判斷或原則。
- 句長交錯,長短句搭配,不要每句都長。
- 範本指標:寫新文的「## 反思」前,先讀一兩篇 `src/content/blog/btl-*.md` 的反思抓語感。

## C. 中文寫作慣例
- 引號用「」『』,不用半形 " "。破折號用「——」。
- 避免 AI 腔的連接詞堆疊:首先 / 其次 / 再者 / 最後、綜上所述、總而言之、值得一提的是、值得注意的是、不僅…而且、眾所周知、總的來說。
- 中英、數字與中文之間視情況留空格(沿用現有文章習慣)。

## D. 修正記錄(append-only)
作者每次糾正就追加一列;新詞同步補進 A 區表。

| 日期 | 原(AI 寫的) | 改(偏好) | 類型 |
|---|---|---|---|
| | | | |
```

- [ ] **Step 2: Verify the file**

Run: `Select-String -Path docs/zh-tw-style-guide.md -Pattern '^## (A|B|C|D)\.'`
Expected: 4 matches (A/B/C/D sections present). Confirm the A-region table has the seed rows (e.g. `代碼` and the `文件`→`檔案` trap row).

- [ ] **Step 3: Commit**

```bash
git add docs/zh-tw-style-guide.md
git commit -m "docs: add zh-TW terminology + voice style guide"
```

---

### Task 2: Wire the core into the writing-blog-post skill

**Files:**
- Modify: `.claude/skills/writing-blog-post/SKILL.md`

- [ ] **Step 1: Add the「台灣用詞 & 口吻」section**

In `.claude/skills/writing-blog-post/SKILL.md`, add this section immediately **before** the `## Technical gotchas` heading:

```markdown
## 台灣用詞 & 口吻
寫這個部落格的文章用**繁體中文、台灣用語**,而且要像作者本人(口吻範本:`btl-*` 的「## 反思」)。

**高頻台灣用詞**(完整對照表 + 修正記錄見 `docs/zh-tw-style-guide.md`):
代碼→程式碼、函數→函式、變量→變數、對象→物件、默認→預設、緩存→快取、數據→資料、返回→回傳、運行→執行、實現→實作、調用→呼叫、用戶→使用者、項目→專案、配置→設定、**文件(指 file)→檔案**(陷阱:台灣「文件」=document)。

**口吻**:第一人稱有主張、用真實例子/數字佐證、轉折用破折號「——」、結尾收一句判斷;避免 AI 腔(首先/其次/綜上所述/值得一提的是)。

**收稿前掃描**:完成 draft、回報前,拿上面(及 doc A 區)的「避免詞」grep 一遍內文,抓到就改 —— 但 `支持 / 通過 / 優化` 這類依語境的別無腦替換。
```

- [ ] **Step 2: Verify**

Run: `Select-String -Path .claude/skills/writing-blog-post/SKILL.md -Pattern '台灣用詞 & 口吻','zh-tw-style-guide.md','收稿前掃描'`
Expected: matches for the section heading, the doc pointer, and the scan instruction.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/writing-blog-post/SKILL.md
git commit -m "skill: embed zh-TW terminology + voice core into writing-blog-post"
```

---

### Task 3: Audit existing posts for banned terms

**Files:**
- Modify (only if hits found): any `src/content/blog/*.md`

- [ ] **Step 1: Scan all posts for the banned terms**

Run (PowerShell), using the A-region "avoid" column as the pattern:

```powershell
Select-String -Path src/content/blog/*.md -Pattern '代碼|函數|變量|對象|默認|緩存|數據|數據庫|服務器|優化|返回|組件|接口|字符串|數組|內存|線程|進程|隊列|運行|實現|調用|並發|異步|集成|兼容|性能|依賴|項目|用戶|軟件|視頻|博客|質量|信息|網絡|鏡像|倉庫|註釋|縮進|字段|集群|屏幕|鼠標'
```
Note: this list omits the context-dependent `支持 / 通過 / 文件 / 庫 / 包 / 配置` to avoid false positives — eyeball those separately if needed.

- [ ] **Step 2: Fix any hits**

For each match, replace with the Taiwan term from the table **in context** (e.g. `數據`→`資料`, `返回`→`回傳`, `運行`→`執行`). Skip false positives (e.g. a term inside a code block or a proper noun). If there are zero hits, note "clean" and skip to Step 4.

- [ ] **Step 3: Re-scan to confirm clean**

Run the same `Select-String` from Step 1.
Expected: no matches (or only justified false positives, documented in the report).

- [ ] **Step 4: Build + commit (only if files changed)**

```bash
npm run build   # expect exit 0
git add src/content/blog/*.md
git commit -m "content: align existing posts to Taiwan terminology"
```
If nothing changed in Step 2, skip the commit and report "existing posts already clean".

---

## Self-Review

**Spec coverage:**
- C — living doc with A/B/C/D → Task 1. ✅
- A — core embedded in skill (high-freq terms + voice + pointer) → Task 2. ✅
- B — pre-finish scan instruction → Task 2 Step 1 (scan paragraph). ✅
- Voice anchor = btl reflections → Task 1 (B section) + Task 2. ✅
- Audit existing drafts/posts → Task 3. ✅
- Not in scope: CI lint → not included. ✅
- Risk (誤殺 context-dependent words) → Global Constraints + Task 3 Step 1 note. ✅

**Placeholder scan:** The only deferred content is the A-region table in Task 1, which is an explicit "copy verbatim from the spec" instruction (the table exists in full in the committed spec) — not a vague placeholder. All other content is inline.

**Consistency:** The high-frequency list in Task 2 is a strict subset of the full table in Task 1/spec; the banned-term grep in Task 3 matches the A-region "avoid" column. `docs/zh-tw-style-guide.md` path is identical across tasks.
