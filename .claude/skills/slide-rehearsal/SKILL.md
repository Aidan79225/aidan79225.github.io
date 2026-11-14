---
name: slide-rehearsal
description: Use when asked to rehearse, stress-test or mock-Q&A a slide deck or talk — a presenter agent presents every slide to three audience agents (Engineering Manager, Staff Engineer, Junior Engineer); each audience asks 3+ rounds per slide and scores every answer 0-10, and a score below 8 forces the presenter to re-answer or revise the slide. Also for "簡報演練", "模擬問答", "逐頁壓力測試", "觀眾 agent".
---

# 簡報演練:一個簡報 agent × 三個觀眾 agent

## 它做什麼
簡報 agent 逐頁對三位觀眾簡報。每位觀眾對每一頁**至少問三輪**、對每個回答打 **0–10 分**;**低於 8 分,簡報 agent 就要重答或修正該頁**,再被打一次分。最後給一份報告:哪幾頁最弱、每種聽眾會問什麼、該怎麼改頁、回答裡哪些說法沒有依據。

用在上台之前:把每種聽眾一定會問的問題先找出來,補進簡報或備忘。**它不改簡報檔**,只產出建議,改不改由講者決定。

## 角色
| 角色 | 設定 | 看到什麼 |
|---|---|---|
| 簡報 agent | 講者的替身。只靠投影片、講者備忘、事實清單回答;不知道就要承認,硬掰會被扣分 | 全部 |
| Engineering Manager | 帶約 8 人的工程經理。問成本、責任歸屬、導入路徑、證據、對招募與流程的影響 | 投影片、簡報者口述、前面的問答 |
| Staff Engineer | 14 年資歷。問因果與樣本、規模與邊界、替代方案、前後矛盾、長期維護 | 同上 |
| Junior Engineer | 1.5 年資歷。問術語、為什麼、怎麼開始、會不會學不到東西 | 同上 |
| 事實查核員 | 不參與問答。事後對照事實清單,標出回答裡沒有依據的數字、事件、習慣 | 全部 |

觀眾**看不到**講者備忘和事實清單,和真實聽眾一樣。三位觀眾的人設寫在 `rehearse.js` 的 `PERSONAS`,可用 `--personas` 換成別的觀眾。

## 每一頁的流程
1. **簡報**:簡報 agent 口述這一頁(4–7 句)。
2. **問答**(三位觀眾各自獨立、平行):第 1 輪觀眾提問 → 簡報 agent 回答 → 觀眾打分(0–10),同時提出下一輪的問題。**至少 3 輪**(`--max-rounds` 可放寬;滿意可以提前停,但不會少於 3 輪)。
3. **低於 8 分**:簡報 agent 必須擇一:`reanswer`(換更好的答案)、`revise_slide`(改這一頁)、`both`。改完同一位觀眾**重新打分**,最多 2 次;還是低於 8 就記為「未解決」。
4. **合併與複核**:若有觀眾觸發修頁,簡報 agent 把各人的修訂合併成**一份**(字數增加不超過約 25%,細節挪進備忘);觸發修訂的觀眾**只看修訂後的頁**(不給新答案)再打分;不及格就精修一次再複核。
5. **事實查核**:查核員對照事實清單,標出最終回答裡沒有依據的說法。

## 評分標準(觀眾都用同一把尺)
| 分數 | 意思 |
|---|---|
| 10 | 完整解決疑慮,有具體證據或清楚且有界線的論證 |
| 8–9 | 好:直接回答、據我所知正確、對我的程度清楚、誠實交代限制,只剩小缺口 |
| 6–7 | 部分:切題但含糊、沒抓到重點、說過頭,或用了聽不懂的術語 |
| 3–5 | 閃躲、空話、沒有依據 |
| 0–2 | 錯的、自相矛盾或根本沒回答 |

首答通常落在 6–7,8 分要靠證據和誠實爭取。扣分:沒有依據的數字、拿一個專案推廣到所有情況、閃躲。加分:誠實說「我不知道」並說明怎麼查。重打分時**不看努力,只看這次的答案**:核心缺口還在,就維持低於 8。

## 怎麼跑
在 repo 根目錄,`S=.claude/skills/slide-rehearsal`。

1. **投影片轉 JSON**(Slides artifact 的資料夾,內有 `project/deck.json` 和 `project/slides/*.html`):
   ```bash
   python3 -I $S/extract_slides.py <deck-root> --visuals visuals.json > deck.json
   ```
   每頁變成 `{id, n, title, body, notes, visual?}`。文字說不出的圖表、圖片、版面,在 `visuals.json`(`{"頁 id": "描述"}`)寫成文字,觀眾才「看得到」。其他來源(PPTX、Markdown)請自己整理成同樣的 JSON。
2. **三份文字**(放在 scratchpad,不要進 repo):
   - `facts.md`:**事實清單**,簡報 agent 除了投影片之外唯一能依賴的東西。只放已驗證的事實(附日期、數字、算法)、講者的立場與口述(標明是口述)、**已知限制**(被問到要誠實承認的弱點)。沒寫進來的,簡報 agent 就只能說不知道。
   - `forbidden.txt`:絕對不能說、不能寫進投影片的內容(私人路徑、不公開的題材、未公開的事故)。
   - `brief` / `abstract` / `principles`(放進 `deck.json`,或用旗標):給簡報 agent 的主旨、聽眾事前被告知的摘要、改頁時要守的設計原則(例如「字最少、細節放備忘」)。
3. **產生可執行的腳本**(把設定內嵌進 `rehearse.js`,大份簡報不必貼進工具呼叫):
   ```bash
   python3 -I $S/prepare_run.py --deck deck.json --facts facts.md --forbidden forbidden.txt \
       --only crl-rules,pr-result,positions --out pilot.js
   ```
   **先用 `--only` 試 2–3 頁**,確認問題品質和評分鬆緊,再跑全部。
4. **執行**:`Workflow({scriptPath: "<pilot.js 的絕對路徑>"})`,完成時會收到通知。
5. **報告**:`python3 -I $S/report.py <結果 JSON> --out report.md --transcript transcript.md`。結果 JSON 是工作流程的 output 檔。多個 part 的結果可以一次丟進去合併。
6. **逐頁讀修正建議給講者看**。同意的再改簡報、重新發布;不要自動套用。

### 大份簡報:切成多個 workflow 並行
每個 workflow 同時執行的 agent 數 = CPU 數 − 2 上限,生命週期上限 1000 次呼叫。一頁約 30–35 次呼叫(含重答、合併、複核、查核),所以約 25 頁以內一個 workflow 夠用;更大就用 `--part i/N`(例如 `--part 1/3`)切成連續的幾段,各產生一個 `run.partN.js`,同時啟動,最後用 `report.py` 合併。

### 參數
| 旗標 | 預設 | 意思 |
|---|---|---|
| `--only a,b` | 全部 | 只演練這些頁 |
| `--part i/N` | | 只跑第 i 段(共 N 段) |
| `--min-rounds` | 3 | 每位觀眾每頁最少幾輪 |
| `--max-rounds` | = min | 觀眾仍有疑慮時最多幾輪 |
| `--threshold` | 8 | 低於這個分數就必須重答或修頁 |
| `--max-retries` | 2 | 每個問題重答或修頁的次數上限 |
| `--call-cap` | 900 | 呼叫次數保險,超過就跳過後續重試並在日誌警告 |
| `--agent-type` | Plan | 所有角色的子代理類型;`default` = 預設子代理 |
| `--personas` | 三位預設觀眾 | JSON `[{key, label, brief}]` 換掉觀眾 |

## 為什麼這樣設計
- **全部角色用 `Plan` 子代理**:預設子代理會把整個 repo 群的 CLAUDE.md 載進來(實測連不對外的題材名都看得到),觀眾會因此「知道」講者的私人專案。`Plan` 乾淨、唯讀。
- **觀眾只拿到投影片、口述與前面的問答**;簡報 agent 只拿到事實清單、投影片與備忘。聽眾答不出的就是真的缺資料,會被標出來,而不是被腦補掩蓋。
- **評分要嚴**:LLM 當觀眾傾向客氣,所以評分標準寫死、首答預期 6–7、重打分不看努力。
- **修頁走「合併 → 單看新頁複核」**:三位觀眾平行時各改各的,必須合併成一份,而且新頁要靠自己站得住,不能靠口頭補充。
- **事實查核**:簡報 agent 為了得高分會自圓其說,常見的是編出講者的做法或數字。查核員把這些挑出來,講者上台才不會照講。
- **不自動改簡報**:修訂只是文字層建議,版面與設計要人看過。

## 限制
- LLM 觀眾不是真人。分數是**相對訊號**(哪頁、哪類問題最弱),不是絕對品質。
- 全部角色同一個模型家族,可能共享盲點;重要的場合仍要找真人試講。
- 事實清單決定回答的上限:清單有錯,回答會跟著錯。
- 逐字稿會引用事實清單,只留給講者自己看。

## 檔案
- `rehearse.js`:Workflow 腳本(角色、流程、評分、重答、修頁、複核、查核都在這裡)。
- `extract_slides.py`:Slides artifact 資料夾 → 投影片 JSON。
- `prepare_run.py`:把設定內嵌進 `rehearse.js`,輸出可執行的 `run.js`。
- `report.py`:結果 JSON → Markdown 報告與逐字稿。
