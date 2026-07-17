---
title: "Airflow 複雜流程控制:branching、trigger rules、TaskGroup、動態任務"
date: 2026-06-28
category: tech
tags:
  - airflow
  - data-engineering
  - dag-design
series: "Airflow 學習筆記"
seriesOrder: 6
comments: true
draft: false
---
到目前為止,我們的 DAG 都是「固定的幾個 task、照線跑完」。但真實流程沒這麼乖:有時要**依條件走不同分支**、某個 task 失敗了**清理工作還是得跑**、幾十個相似 task 要**收整齊**、甚至**執行期才知道要跑幾個 task**。這篇講 Airflow 的四個流程控制工具,把 DAG 從玩具推向 Production 級。

## 一、Branching:依條件走不同分支

用 `@task.branch`(或 `BranchPythonOperator`)回傳「接下來要走哪個 task 的 id」,**沒被選到的分支會被標成 skipped**。

```python
from airflow.decorators import task

@task.branch
def choose_strategy(row_count: int) -> str:
    # 回傳要執行的 task_id;其餘分支自動 skip
    return "full_reload" if row_count > 1_000_000 else "incremental_load"
```

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 176" role="img" aria-label="branch 依條件選一條路,另一條被 skip,最後在 join 匯合" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="cf1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="10" y="68" width="92" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="56" y="92" fill="#e6e6e6" font-size="11.5" text-anchor="middle">branch</text>
    <line x1="102" y1="80" x2="150" y2="44" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#cf1)"/>
    <line x1="102" y1="96" x2="150" y2="132" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#cf1)"/>
    <rect x="152" y="24" width="150" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="227" y="48" fill="#e6e6e6" font-size="11.5" text-anchor="middle">full_reload ✓</text>
    <rect x="152" y="112" width="150" height="40" rx="8" fill="#1f2330" stroke="#3a4154" stroke-width="1.4" stroke-dasharray="4 3"/>
    <text x="227" y="136" fill="#9aa4b2" font-size="11.5" text-anchor="middle">incremental ⊘ skip</text>
    <line x1="302" y1="44" x2="452" y2="80" stroke="#9aa4b2" stroke-width="1.4" marker-end="url(#cf1)"/>
    <line x1="302" y1="132" x2="452" y2="96" stroke="#3a4154" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#cf1)"/>
    <rect x="454" y="68" width="96" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="502" y="88" fill="#e6e6e6" font-size="11" text-anchor="middle">join</text>
    <text x="502" y="101" fill="#9aa4b2" font-size="8" text-anchor="middle">none_failed_…</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">branch 選中的路往下跑,沒選中的整條被 skip;匯合的 join 需要特別的 trigger rule(見下節)</figcaption>
</figure>

## 二、Trigger Rules:下游「什麼時候」該跑

每個 task 都有個 trigger rule,決定它**在上游處於什麼狀態時才啟動**。預設是 `all_success` —— 所有上游都成功才跑。多數情況很合理,但兩個場景會踩雷:

| Trigger rule | 何時觸發 | 典型用途 |
|---|---|---|
| `all_success`(預設) | 所有上游都成功 | 一般串接 |
| `all_done` | 所有上游都跑完(不管成敗) | **清理 / 通知**,成敗都要做 |
| `none_failed_min_one_success` | 沒有上游失敗,且至少一個成功 | **branch 後的 join** |
| `none_failed` | 沒有上游失敗(允許 skipped) | 允許部分分支被跳過 |
| `one_success` | 任一上游成功就跑 | 多來源擇一 |
| `all_failed` | 所有上游都失敗 | 失敗時的補救流程 |

最經典的坑就是上一節那個 join:branch 之後,有一條上游必然是 **skipped**,而 `all_success` 會把 skipped 當成「不滿足」,於是 join 莫名其妙也被 skip、整條下游連坐。解法是把 join 的 trigger rule 改成 `none_failed_min_one_success`:

```python
from airflow.operators.empty import EmptyOperator

join = EmptyOperator(task_id="join", trigger_rule="none_failed_min_one_success")
```

另一個常用的是 `all_done` —— 不管前面成功失敗都要執行的「收尾」task(關連線、刪暫存、發通知)就靠它。

## 三、TaskGroup:把相關 task 收成一組

當 DAG 長到三、四十個 task,UI 上會糊成一團。**TaskGroup 把一組相關 task 在介面上收合成一個方塊**,還順便給它們一個命名空間(`extract.read_orders`)。

```python
from airflow.decorators import task_group

@task_group(group_id="extract")
def extract():
    read_orders()
    read_customers()
```

關鍵認知:**TaskGroup 是「給人看的」,不是「給排程的」** —— 它純粹是視覺與命名上的整理,**不改變任何執行語意**。(它取代了早年那個會拖累排程、又難維護的 SubDAG;如果你還在用 SubDAG,該換了。)

## 四、Dynamic Task Mapping:執行期才決定要跑幾個

前面三個都還是「DAG 長相在寫的時候就固定」。但常有這種需求:上游列出今天有 N 個檔案要處理,而 **N 要到執行期才知道**。Airflow 2.3+ 的 `.expand()` 就是為此而生 —— 它在 runtime 依上游回傳的 list,**動態展開成 N 個平行的 task instance**。

```python
@task
def list_files() -> list[str]:
    return ["a.csv", "b.csv", "c.csv"]   # 數量執行期才知道

@task
def process(file: str) -> int:
    return load_one(file)

@task
def summarize(counts: list[int]) -> None:
    print(f"共處理 {sum(counts)} 列")

summarize(process.expand(file=list_files()))   # 動態 map 後再收斂
```

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 540 200" role="img" aria-label="一個 task 依上游回傳的清單,動態展開成多個平行 task,再收斂到一個彙總 task" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="cf2" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="8" y="80" width="104" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="60" y="100" fill="#e6e6e6" font-size="11" text-anchor="middle">list_files</text>
    <text x="60" y="113" fill="#9aa4b2" font-size="8" text-anchor="middle">→ [a,b,c]</text>
    <line x1="112" y1="92" x2="206" y2="40" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#cf2)"/>
    <line x1="112" y1="100" x2="206" y2="100" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#cf2)"/>
    <line x1="112" y1="108" x2="206" y2="160" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#cf2)"/>
    <rect x="208" y="22" width="128" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="272" y="44" fill="#e6e6e6" font-size="10.5" text-anchor="middle">process(a)</text>
    <rect x="208" y="82" width="128" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="272" y="104" fill="#e6e6e6" font-size="10.5" text-anchor="middle">process(b)</text>
    <rect x="208" y="142" width="128" height="36" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="272" y="164" fill="#e6e6e6" font-size="10.5" text-anchor="middle">process(c)</text>
    <line x1="336" y1="40" x2="430" y2="92" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#cf2)"/>
    <line x1="336" y1="100" x2="430" y2="100" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#cf2)"/>
    <line x1="336" y1="160" x2="430" y2="108" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#cf2)"/>
    <rect x="432" y="80" width="100" height="40" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="482" y="104" fill="#e6e6e6" font-size="11" text-anchor="middle">summarize</text>
    <text x="272" y="194" fill="#9aa4b2" font-size="9.5" text-anchor="middle">expand():清單幾筆,就平行展開幾個 process</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">list_files 回傳幾筆,process 就動態展開成幾個平行 instance,最後收斂到 summarize</figcaption>
</figure>

這終結了一個老反模式:以前要「依資料動態決定 task 數」,得在 DAG 檔裡寫迴圈、甚至動態生 DAG —— 既難讀又容易爆。現在 `.expand()` 一行解決,而且每個 mapped instance 在 UI 上都看得到、能個別重跑。

## 反思

### branching 跟 trigger rule 是綁在一起的坑,別拆開記

我看過最常見的 Airflow「鬼故事」,就是加了 branch 之後,下游 task 莫名其妙全被 skip,log 還沒有任何錯誤。十次有九次是 join 沒改 trigger rule —— 預設的 `all_success` 把被跳過的那條分支當成「沒成功」,於是連坐跳過下游。所以我的習慣是:**只要寫了 branch,就反射性地去把匯合點的 trigger rule 設成 `none_failed_min_one_success`**,兩件事一起做,不分開記。這個坑踩過一次就會記一輩子,但最好是別踩。

### TaskGroup 解決的是「人」的問題,不是「機器」的問題

剛接觸時我一度以為 TaskGroup 會影響排程(像是整組一起重試之類),結果完全不會 —— 它純粹是 UI 上的收合與命名。但別因此小看它:一個四十個 task 的 DAG 攤平在畫面上,跟收成五個 group,**維運時的可讀性差非常多**。出事時你能不能在三秒內看懂「卡在哪一段」,往往就靠這層整理。它呼應 [[airflow-intro|第一篇]]說的 workflows as code 精神 —— 程式要給人讀,DAG 的視覺結構也是。

### Dynamic mapping 是我會主動推薦的少數新功能

我對新功能通常保守,但 `.expand()` 是例外。在它出現之前,「資料筆數決定 task 數」這件事的解法都很醜 —— 不是把全部塞進一個 task 裡失去平行與重跑粒度,就是動態生 DAG 這種維運惡夢。dynamic task mapping 把這件事變得既乾淨又可觀測:**每個 mapped instance 都是獨立的、看得到、能單獨重跑**。我的原則很簡單:**能用 `expand()` 表達的,就絕不自己在 DAG 檔裡寫迴圈生 task。**

### 但流程控制每多一層,除錯成本就高一截

最後潑個冷水。這四個工具都很有用,但它們也讓 DAG 變「動態」、變難一眼看穿 —— branch 讓執行路徑不固定、expand 讓 task 數不固定。我的判準是:**這些是用來解決真實複雜度的,不是拿來炫技的。** 能用一條直線串完的流程,就別硬加 branch;真的有「依條件分流」「依資料展開」的需求再上。跟我寫 [[airflow-providers|上一篇]]、寫 [[spark-running|Spark]] 的態度一致 —— 每多一層動態,未來某個半夜的 on-call 就多一分要解的謎。複雜度要花在刀口上。
