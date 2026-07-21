---
title: "Airflow 測試與部署:別讓一個 typo 弄垮整包 DAG"
date: 2026-07-21
category: tech
tags:
  - airflow
  - data-engineering
  - testing
series: "Airflow 學習筆記"
seriesOrder: 8
comments: true
draft: false
---
DAG 寫好了、也[[airflow-reliability|可靠了]],最後一哩是工程紀律:**怎麼確定我的改動不會弄壞它,又怎麼把它安全送上 Production。** 這篇講測試(把壞 DAG 擋在 merge 前)、部署(DAG 檔怎麼上環境、self-host vs managed),以及一個最要命、幾乎每個新手都踩過的 Production 陷阱——**DAG 檔案不是「執行一次」,是「一直被解析」的。**

## 最要命的陷阱:DAG 檔案一直被 scheduler 解析

新手常把 DAG 檔當普通腳本寫,在檔案最上層(top-level)直接連資料庫、打 API、跑一段重運算。這在本機跑一次沒事,上了 Production 卻會**悄悄拖垮整個 scheduler**——因為:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 208" role="img" aria-label="Airflow scheduler 每隔幾秒就重新解析所有 DAG 檔案。左邊錯誤寫法:在檔案最上層 top-level 直接 query 資料庫、打 API,每一次 parse 都會執行這些重活,scheduler 被反覆拖垮。右邊正確寫法:top-level 只放輕量的 DAG 結構定義,真正的重活放進 task 函數裡,只在 task 執行時才跑一次,parse 很快。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <rect x="180" y="16" width="200" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/><text x="280" y="31" fill="#4f6df5" font-size="9.4" text-anchor="middle" font-weight="bold">Scheduler</text><text x="280" y="43" fill="#9aa4b2" font-size="7.6" text-anchor="middle">每隔幾秒 parse 一次所有 DAG 檔</text>
    <defs><marker id="td" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="150" y1="50" x2="120" y2="72" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#td)"/><line x1="410" y1="50" x2="440" y2="72" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#td)"/>
    <text x="140" y="60" fill="#9aa4b2" font-size="7" text-anchor="middle">parse</text><text x="420" y="60" fill="#9aa4b2" font-size="7" text-anchor="middle">parse</text>
    <rect x="20" y="74" width="230" height="118" rx="8" fill="none" stroke="#e05a7d" stroke-width="1.4"/>
    <text x="135" y="90" fill="#e05a7d" font-size="9" text-anchor="middle" font-weight="bold">✗ top-level 放重活</text>
    <rect x="34" y="98" width="202" height="20" rx="3" fill="#3a2626" stroke="#e05a7d" stroke-width="1"/><text x="135" y="112" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">df = query_db()  # 模組層</text>
    <rect x="34" y="122" width="202" height="20" rx="3" fill="#3a2626" stroke="#e05a7d" stroke-width="1"/><text x="135" y="136" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">cfg = requests.get(url)</text>
    <text x="135" y="160" fill="#e05a7d" font-size="7.8" text-anchor="middle" font-weight="bold">每次 parse 都跑這些</text>
    <text x="135" y="176" fill="#9aa4b2" font-size="7.4" text-anchor="middle">→ scheduler 被反覆拖垮、DAG 變慢</text>
    <rect x="310" y="74" width="230" height="118" rx="8" fill="none" stroke="#54b890" stroke-width="1.4"/>
    <text x="425" y="90" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">✓ 檔案輕,重活進 task</text>
    <rect x="324" y="98" width="202" height="20" rx="3" fill="#223528" stroke="#54b890" stroke-width="1"/><text x="425" y="112" fill="#e6e6e6" font-size="7.6" text-anchor="middle" font-family="monospace">@task def load(): query_db()</text>
    <rect x="324" y="122" width="202" height="20" rx="3" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/><text x="425" y="136" fill="#9aa4b2" font-size="7.6" text-anchor="middle">top-level 只有 DAG 結構</text>
    <text x="425" y="160" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">parse 秒過</text>
    <text x="425" y="176" fill="#9aa4b2" font-size="7.4" text-anchor="middle">重活只在 task 執行時跑一次</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">關鍵事實:<b style="color:#4f6df5">scheduler 每隔幾秒就重新解析(import)一次所有 DAG 檔</b>,好知道有沒有新 DAG、排程有沒有變。所以檔案<b>最上層</b>的任何程式碼,都會<b>被反覆執行</b>。<b style="color:#e05a7d">在 top-level 連 DB、打 API</b>,等於叫 scheduler 每幾秒幫你 query 一次,整個排程被你自己拖垮。正解是<b style="color:#54b890">讓 DAG 檔很輕</b>——top-level 只放結構定義,真正的重活一律放進 <code>@task</code> 裡,只在執行時跑。這也解釋了 <a href="/blog/infra-airflow/">infra 那篇</a>說的「scheduler 猛查 DB」,你的 top-level 常是幫兇</figcaption>
</figure>

一句話記住:**DAG 檔案描述「要做什麼」,不「現在就做」。** 重活放進 task。

## 怎麼測 DAG:三個層次,由便宜到貴

DAG 也是程式碼,一樣要測——而且投報率最高的,是那個最無聊的:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 210" role="img" aria-label="測 DAG 的三個層次與 CI 流程。第一層 import 驗證:用 pytest 把所有 DAG 都 import 一遍,斷言沒有 import error、沒有循環,最便宜、擋掉最多事故。第二層 task 邏輯單元測試:把商業邏輯抽成純函數,直接對函數測。第三層 dag.test 本地整跑一個 DAG,不碰 metadata DB。這三層在 CI 於每個 PR 上跑,綠燈才能 merge,merge 後才 deploy DAG 到環境。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="t2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="16" y="24" width="250" height="34" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.5"/><text x="141" y="39" fill="#54b890" font-size="8.8" text-anchor="middle" font-weight="bold">① import 驗證(最便宜、擋最多)</text><text x="141" y="51" fill="#9aa4b2" font-size="7.4" text-anchor="middle">所有 DAG import 無錯、無 cycle</text>
    <rect x="40" y="66" width="226" height="32" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="153" y="81" fill="#e6e6e6" font-size="8.6" text-anchor="middle">② task 邏輯單元測試</text><text x="153" y="92" fill="#9aa4b2" font-size="7.4" text-anchor="middle">邏輯抽成純函數,直接測</text>
    <rect x="64" y="106" width="202" height="32" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="165" y="121" fill="#e6e6e6" font-size="8.6" text-anchor="middle">③ dag.test() 本地整跑</text><text x="165" y="132" fill="#9aa4b2" font-size="7.4" text-anchor="middle">不碰 metadata DB</text>
    <line x1="286" y1="80" x2="322" y2="80" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#t2)"/>
    <rect x="324" y="60" width="220" height="40" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.5"/><text x="434" y="78" fill="#d6a45c" font-size="9" text-anchor="middle" font-weight="bold">CI:每個 PR 都跑這三層</text><text x="434" y="91" fill="#9aa4b2" font-size="7.6" text-anchor="middle">+ lint,綠燈才能 merge</text>
    <line x1="434" y1="100" x2="434" y2="130" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#t2)"/>
    <rect x="324" y="134" width="220" height="40" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/><text x="434" y="152" fill="#4f6df5" font-size="9" text-anchor="middle" font-weight="bold">merge → deploy DAG 到環境</text><text x="434" y="165" fill="#9aa4b2" font-size="7.6" text-anchor="middle">git-sync / S3 / 烤進 image</text>
    <text x="141" y="164" fill="#9aa4b2" font-size="7.6" text-anchor="middle" font-weight="bold">越下面越貴、越少</text>
    <text x="141" y="180" fill="#9aa4b2" font-size="7.6" text-anchor="middle">越上面越便宜、越該先做</text>
    <text x="141" y="196" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">光是「所有 DAG 都 import 得起來」就擋掉最多事故</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">測 DAG 分三層,投報率由高到低:<b style="color:#54b890">①import 驗證</b>最無聊也最值——一個 pytest 把所有 DAG import 一遍、斷言無語法錯無循環,就能擋掉 Production 最常見的事故(一個 typo 讓整包 DAG 從 UI 上消失);<b style="color:#4f6df5">②單元測試</b>要先把商業邏輯<b>抽成純函數</b>(別埋在 operator 裡)才好測;<b>③<code>dag.test()</code></b> 本地把整個 DAG 跑一遍、不碰 metadata DB。這三層擺進 <b style="color:#d6a45c">CI</b>,綠燈才 merge,壞 DAG 就進不了 Production</figcaption>
</figure>

那個最該先寫的 import 測試,其實非常短:

```python
# 擋掉最多事故的一個測試:所有 DAG 都 import 得起來、沒循環
from airflow.models import DagBag

def test_dags_load_without_errors():
    dag_bag = DagBag(include_examples=False)
    assert dag_bag.import_errors == {}, f"DAG 匯入失敗:{dag_bag.import_errors}"
```

而要單元測 task 邏輯,關鍵是**把邏輯抽成純函數**——別把運算埋在 operator 裡,那樣得起一整個 Airflow 才測得到:

```python
# 邏輯抽出來,pytest 直接測,不需要 Airflow
def compute_summary(rows: list[dict]) -> dict: ...

@task
def summarize(**ctx):
    return compute_summary(fetch(ctx["ds"]))   # task 只是薄薄一層黏合
```

第三層,`dag.test()`(Airflow 2.5+)能在本機**把整個 DAG 跑一遍**、不需要 scheduler、不寫 metadata DB,拿來在 CI 或本地做端到端驗證很順手。

## 部署:DAG 檔怎麼上環境,以及 self-host vs managed

Airflow 的「部署」,本質就是**把 DAG 檔案送到執行環境**,常見三種:**git-sync**(一個 sidecar 定期把 git repo 拉到 DAG 目錄)、**丟物件儲存**(MWAA 就是把 DAG 放 S3)、**烤進映像檔**(Astronomer / K8s 上,把 DAG 打包成 image 一起部署,最可控)。至於整套 Airflow 要不要自己養,是另一個更大的決策:

| | **Self-host**(Helm on K8s) | **Managed**(MWAA / Astronomer) |
|---|---|---|
| 你要顧 | scheduler、[[infra-airflow|metadata DB]]、升級、擴縮 | 幾乎只顧 DAG 本身 |
| 成本 | 授權免費,但**吃維運人力** | 付費,換掉那座維運的山 |
| 適合 | 有 K8s 底子、要省錢或要深度客製 | 想把心力放在資料、不想養基礎設施 |

這個選擇跟我對所有基礎設施的態度一致:**別只看帳面授權費,要把「維運人力」算進去**。Airflow 背後那顆 [[infra-airflow|metadata DB]]、那個要顧的 scheduler、那些升級,都是真實的人力成本——managed 是付錢把這座山租給別人。團隊小、又沒人想當 Airflow 管理員時,managed 幾乎總是划算的。

## 反思

### 「DAG 檔是被反覆解析的」,是我學 Airflow 最貴的一課

這件事沒人一開始會告訴你,你得親手把 scheduler 拖垮一次才會刻進骨子裡。想通「**這個檔案每幾秒就被 import 一次**」之後,我寫 DAG 的方式徹底變了:檔案最上層只留結構、像一張宣告,所有會連外、會算、會慢的東西一律鎖進 task。這其實是一個更通用的直覺——**先搞清楚你寫的程式碼「多久被執行一次」,再決定把什麼放哪裡。** 放錯層級的重活,是很多系統莫名其妙變慢的根源,而它在 Airflow 上特別致命,因為那個「反覆執行」是隱形的,藏在 scheduler 的解析迴圈裡。

### 可靠性常常不是靠聰明,是靠把最笨的檢查自動化

測 DAG 這件事,最反直覺的收穫是:**投報率最高的測試,是那個最無聊的 import 驗證。** 它不驗證任何業務邏輯,只確認「所有 DAG 都還 import 得起來、沒有 typo、沒有循環」——但就這個最低標,擋掉了我看過最多的 Production 事故:某人改一行、一個 import 打錯,結果整包 DAG 從 UI 上消失,排程默默停擺,沒人發現。這讓我對「可靠性」的理解更務實了:它往往不是來自多精巧的測試策略,而是來自**把那些「顯而易見卻沒人做」的笨檢查,變成 CI 裡自動跑的一關**。聰明的測試是加分,笨的檢查自動化是及格線——而多數團隊連及格線都沒守住。

### 部署要算的是「維運人力」,不是授權費

self-host vs managed 的抉擇,把我對成本的看法擦亮了。Airflow 開源免費,但「免費」只是授權欄那一格——它背後的 metadata DB 要有人備份、scheduler 要有人盯、版本要有人升,這些都是**看不見卻真實的人力帳單**。我看過團隊為了省 managed 的月費,自建 Airflow,結果一個工程師半條命都在修它,那省下的錢遠不夠付這個隱形成本。所以我現在評估任何「要不要自己架」時,第一個問的不是「授權多少錢」,而是「**這座山,我們有沒有人、願不願意養**」。這跟 [[pain-before-power|先確認痛點再上重武器]]是同一種務實:工具的真實成本,從來不在它的價目表上。這也是 Airflow 主線的收尾——會寫、可靠、測得住、部署得起,一個 DAG 才算真的長大成人。
