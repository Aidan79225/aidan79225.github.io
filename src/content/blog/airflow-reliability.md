---
title: "Airflow 可靠性實戰:冪等、重試、SLA 與告警"
date: 2026-07-21
category: tech
tags:
  - airflow
  - data-engineering
  - reliability
series: "Airflow 學習筆記"
seriesOrder: 7
comments: true
draft: false
---
前面幾篇教你把 DAG 寫出來、排對區間。但 Production 的 DAG 是會在半夜出事的——來源系統延遲、網路抖一下、下游資料庫重啟。這篇講怎麼讓 DAG **扛得住失敗、能自己救、真救不了會大聲叫**。我把可靠性拆成三層防線:**冪等**(重跑安全的地基)→ **retries**(自動自癒)→ **SLA / 告警**(兜底叫人)。三層缺一不可,而且順序不能顛倒——因為上面兩層,全都踩在「冪等」這塊地基上。

## 地基:冪等——沒有它,retry 只會放大災難

[[airflow-scheduling|排程那篇]]說過:catchup、backfill、手動重跑,全都在「**重跑同一段區間**」。而 retries 也是重跑。這代表你的 task **注定會被跑不只一次**,所以第一個問題從來不是「它會不會失敗」,而是「**它失敗重跑,會不會出事**」:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 200" role="img" aria-label="冪等與非冪等的 task 被重試時的差別。左邊非冪等:第一次對目標表 INSERT 附加 6/18 的資料,跑到一半失敗,重試時又 INSERT 一次,結果 6/18 的資料變成重複兩份。右邊冪等:第一次覆寫 6/18 這個分區,失敗後重試再覆寫一次,結果還是同一份、一致。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <line x1="280" y1="24" x2="280" y2="180" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="140" y="40" fill="#e05a7d" font-size="11" text-anchor="middle" font-weight="bold">非冪等:INSERT 附加</text>
    <rect x="30" y="54" width="220" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="140" y="71" fill="#e6e6e6" font-size="9" text-anchor="middle">第 1 次:INSERT 6/18 → 中途失敗</text>
    <rect x="30" y="88" width="220" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="140" y="105" fill="#e6e6e6" font-size="9" text-anchor="middle">重試:又 INSERT 6/18 一次</text>
    <rect x="30" y="128" width="220" height="34" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="140" y="143" fill="#e05a7d" font-size="9.4" text-anchor="middle" font-weight="bold">6/18 資料重複兩份 ✗</text><text x="140" y="156" fill="#9aa4b2" font-size="7.6" text-anchor="middle">重試把一次故障放大成資料污染</text>
    <text x="420" y="40" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">冪等:覆寫分區</text>
    <rect x="310" y="54" width="220" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="420" y="71" fill="#e6e6e6" font-size="9" text-anchor="middle">第 1 次:覆寫 6/18 分區 → 失敗</text>
    <rect x="310" y="88" width="220" height="26" rx="5" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="420" y="105" fill="#e6e6e6" font-size="9" text-anchor="middle">重試:再覆寫 6/18 分區一次</text>
    <rect x="310" y="128" width="220" height="34" rx="6" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="420" y="143" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">6/18 分區一致 ✓</text><text x="420" y="156" fill="#9aa4b2" font-size="7.6" text-anchor="middle">跑幾次結果都一樣,重試安全</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一個 task 被重試,冪等與否結果天差地遠。<b style="color:#e05a7d">非冪等</b>(對表 INSERT 附加)重試一次,資料就多一份——retry 反而把一次小故障放大成資料污染。<b style="color:#54b890">冪等</b>(覆寫「這段區間」的分區)不管跑幾次,結果都是同一份。冪等不是進階技巧,是 retries / backfill 能安全成立的<b>前提</b></figcaption>
</figure>

實作冪等的核心心法,就是[[airflow-scheduling|排程那篇]]說的「**run 只吃自己那段區間、並覆寫它**」,而不是無腦附加:

```python
@task
def load(**context):
    ds = context["data_interval_start"].strftime("%Y-%m-%d")
    # ✓ 冪等:先清掉這段區間、再寫入(或直接覆寫分區 / MERGE upsert)
    conn.execute(f"DELETE FROM sales WHERE dt = '{ds}'")
    conn.execute(f"INSERT INTO sales SELECT * FROM staging WHERE dt = '{ds}'")
    # ✗ 非冪等寫法:INSERT INTO sales ...(沒先清,重跑就疊加)
```

寫物件儲存也一樣:寫到 `s3://.../dt={{ ds }}/` 這種**由區間決定的確定性路徑**、整個覆蓋,而不是每次 append 一個新檔。**把「重跑」設計成安全的,後面的 retries 才敢放手讓它自動跑。**

## 第一層自癒:retries

地基穩了,就能讓 Airflow 自動處理**暫時性故障**——來源慢一秒、連線被重置這種,重試一下多半就過了。設在 `default_args` 讓整個 DAG 的 task 共用:

```python
from datetime import timedelta

default_args = {
    "retries": 3,                                  # 失敗自動重試 3 次
    "retry_delay": timedelta(minutes=5),           # 每次間隔 5 分鐘
    "retry_exponential_backoff": True,             # 改成指數退避:5、10、20 分…
    "max_retry_delay": timedelta(hours=1),         # 退避上限
    "execution_timeout": timedelta(minutes=30),    # 跑超過 30 分就砍掉(防卡死)
}
```

兩個重點:一是 **`execution_timeout`**——一個 task 卡死(連線 hang、等一個永遠不來的檔案)比它失敗更可怕,因為它會一直佔著 slot、無聲無息,設個上限讓它「該死就死、然後進重試」。二是要認清 **retries 只救得了暫時性故障**;如果是程式邏輯錯、SQL 打錯,重試三次只是把同一個錯誤演三遍,白費五分鐘還延誤告警。**分清「暫時 vs 永久」,別指望 retry 修永久的錯。**

## 慢,也是一種故障:SLA

有個常被忽略的狀況:task **沒失敗,但太慢**。一個每天早上八點該好的報表,今天拖到中午才出——對下游來說,跟壞了沒兩樣。Airflow 用 **SLA** 捕捉這種「準時性」故障:

```python
@task(sla=timedelta(hours=2))       # 排程後 2 小時內沒跑完 = SLA miss
def daily_report():
    ...
```

SLA miss 是獨立於「失敗」的一條線:task 最後可能還是成功了,但它**遲到**了,Airflow 會記一筆 SLA miss、觸發 `sla_miss_callback`。**把「太慢」也當成要被告警的可靠性事件**,是成熟資料平台跟堪用平台的分界——可用性從來不只是「有沒有成功」,還有「有沒有及時」。

## 真的救不了:告警要大聲

當 retries 用完、task 真的 `failed`,或發生 SLA miss,**這一刻必須有人知道**。Airflow 用 callback 把這些時刻接出去(通常接到 Slack / PagerDuty):

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 196" role="img" aria-label="一個 task 失敗的生命週期與告警。task 進入 running,失敗後變成 up_for_retry、等 retry_delay,再回到 running,如此重複到重試次數用完,才真正變成 failed，這時觸發 on_failure_callback 發告警到 Slack 或 PagerDuty。另一條獨立的線:排程之後如果超過 SLA 還沒完成,就是 SLA miss，觸發 sla_miss_callback。重點:告警只在重試都用完後才響，暫時性故障被 retry 默默吸收，不吵人。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="16" y="40" width="86" height="30" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.3"/><text x="59" y="59" fill="#e6e6e6" font-size="8.6" text-anchor="middle">running</text>
    <rect x="132" y="40" width="110" height="30" rx="6" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="187" y="55" fill="#d6a45c" font-size="8.4" text-anchor="middle">up_for_retry</text><text x="187" y="65" fill="#9aa4b2" font-size="6.6" text-anchor="middle">等 retry_delay</text>
    <line x1="102" y1="55" x2="130" y2="55" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ar)"/><text x="116" y="35" fill="#e0733a" font-size="6.8" text-anchor="middle">失敗</text>
    <path d="M187 40 C 187 20, 59 20, 59 38" fill="none" stroke="#9aa4b2" stroke-width="1.1" stroke-dasharray="3 2" marker-end="url(#ar)"/><text x="123" y="16" fill="#9aa4b2" font-size="6.8" text-anchor="middle">重試(還有次數)</text>
    <line x1="242" y1="55" x2="272" y2="55" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ar)"/><text x="257" y="35" fill="#9aa4b2" font-size="6.6" text-anchor="middle">次數用完</text>
    <rect x="274" y="40" width="76" height="30" rx="6" fill="#3a2626" stroke="#e05a7d" stroke-width="1.4"/><text x="312" y="59" fill="#e05a7d" font-size="8.6" text-anchor="middle" font-weight="bold">failed</text>
    <line x1="350" y1="55" x2="380" y2="55" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ar)"/>
    <rect x="382" y="38" width="164" height="34" rx="6" fill="#262b3a" stroke="#e05a7d" stroke-width="1.3"/><text x="464" y="53" fill="#e6e6e6" font-size="8.2" text-anchor="middle">🔔 on_failure_callback</text><text x="464" y="65" fill="#9aa4b2" font-size="7" text-anchor="middle">→ Slack / PagerDuty</text>
    <rect x="16" y="112" width="330" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/><text x="181" y="131" fill="#e6e6e6" font-size="8.4" text-anchor="middle">排程後超過 SLA 還沒完成 → SLA miss(獨立於失敗)</text>
    <line x1="346" y1="127" x2="380" y2="127" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ar)"/>
    <rect x="382" y="110" width="164" height="34" rx="6" fill="#262b3a" stroke="#d6a45c" stroke-width="1.3"/><text x="464" y="125" fill="#e6e6e6" font-size="8.2" text-anchor="middle">🔔 sla_miss_callback</text><text x="464" y="137" fill="#9aa4b2" font-size="7" text-anchor="middle">「太慢」也要叫</text>
    <text x="280" y="176" fill="#54b890" font-size="8.4" text-anchor="middle" font-weight="bold">告警只在重試都用完後才響 → 暫時性故障被 retry 默默吸收,不吵人</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">一個 task 失敗後先進 <b style="color:#d6a45c">up_for_retry</b>、等 <code>retry_delay</code> 再重跑,重複到次數用完才真正 <b style="color:#e05a7d">failed</b>,這時才觸發 <code>on_failure_callback</code> 發告警。這個設計的精妙在:<b>暫時性故障被 retry 默默吸收,人只會被「真的救不了」的事叫醒</b>。SLA miss 則是另一條獨立的線——沒失敗、但遲到了,一樣要叫。太吵的告警等於沒告警,好的可靠性讓警報「該響才響」</figcaption>
</figure>

callback 接出去長這樣:

```python
def alert_to_slack(context):
    ti = context["task_instance"]
    send_slack(f"🔥 {ti.dag_id}.{ti.task_id} 失敗於 {context['ds']}")

default_args = {
    "retries": 3,
    "on_failure_callback": alert_to_slack,   # 重試全用完、真 failed 才呼叫
    # "on_retry_callback": ...               # 想連每次重試都知會也可以(通常不必)
}
```

## 反思

### 冪等是可靠性的地基,不是進階選項

我對 Airflow 可靠性最深的體會,是**它的一切都建立在「重跑安全」上**。retries、catchup、backfill、災難重跑——這些便利功能,全都預設你的 task 冪等;一旦不冪等,retries 反而是最危險的東西,它會忠實地把一次小故障,自動放大成三份重複的髒資料。所以我寫每個 task 的第一個念頭,已經不是「怎麼讓它成功」,而是「**它被跑第二次、第三次,會不會壞事**」。這跟 [[airflow-scheduling|把 now() 趕出 task]]、跟 [[sre-cron|SRE 那篇講的 exactly-once]] 是同一條紀律的不同臉:**在一個什麼都會重跑的系統裡,冪等不是加分項,是入場券。**

### 好的自癒,是把暫時性故障變成「非事件」

retries 教我一件關於告警的事:**不是每個失敗都該叫醒人**。網路抖一下、來源晚幾秒,這種暫時性故障,系統自己 retry 兩次就過去了,根本不該驚動任何人。真正該把人從床上挖起來的,是「retry 都用完了還救不回來」的事。所以我很在意告警的**時機**——讓它只在重試耗盡後才響,而不是每次小失敗都轟炸。這背後是一個更大的原則:**告警的價值跟它的準確度成正比,跟它的數量成反比。** 一個每天誤報十次的頻道,真出事時沒人會看;好的可靠性設計,是讓警報「該響才響」,這樣它一響,大家才會當真。這也是 [[sre-monitoring|SRE 監控]]那套的核心。

### 「慢」也是故障——可用性不只是「有沒有成功」

SLA 這個機制,把我對「可靠」的定義撐大了。以前我只盯著「有沒有跑成功」,直到理解:一個每天準時的報表,今天拖到中午才好,對等著它做決策的下游,傷害跟直接失敗沒兩樣。**及時,本身就是一種正確。** 從此我看資料管線的健康,不只看成功率,也看「準時率」——有沒有在下游需要它之前完成。把時效也納進監控與告警,是我認為「堪用的資料平台」跟「可信任的資料平台」之間,那條最關鍵的線。可靠性 = 冪等的地基 + retries 的自癒 + SLA 與告警的兜底,三層一起,你的 DAG 才真的扛得住 Production 的半夜。
