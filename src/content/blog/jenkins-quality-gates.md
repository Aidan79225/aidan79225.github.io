---
title: "品質關卡:從「有跑測試」到「擋得住」"
date: 2026-08-25
category: tech
description: "一條 pipeline 有幾個關卡不是重點,紅燈還有沒有人信才是。這篇談晉級制怎麼排(越前面越便宜、越後面越貴,順序是成本排序不是隨便排的)、覆蓋率為什麼一當成目標就會被作弊(以及改用 diff coverage 的作法)、靜態分析導入舊專案時的 baseline 技巧,還有結果比對這種「行為不變」的守門方式。最後談 flaky test——它不只是煩,它會讓整道門在沒有人宣布的情況下消失。"
tags:
  - jenkins
  - ci-cd
  - testing
series: "Jenkins 學習筆記"
seriesOrder: 10
comments: true
draft: false
---
前面九篇把 pipeline 跑起來了:知道在哪跑、東西放哪、機密怎麼進、每個分支都有自己的 pipeline。這篇問一個更尖銳的問題:**它憑什麼擋得住東西?**

[[jenkins-multibranch|第 8 篇]]最後我寫過一句話:「每個 required check 都要能回答『它擋掉過什麼』」。這一篇就是那句話的展開。

## 晉級制:關卡的順序是成本排序

品質關卡不是越多越好,而是**越前面越便宜**。同一個 bug,在 lint 抓到跟在 e2e 抓到,成本差一個數量級;在 Production 抓到又再差一個。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 272" role="img" aria-label="品質關卡的晉級制階梯。由上到下五層,每一層的橫條長度代表耗時:第一層格式檢查、lint 與型別檢查約十秒,擋掉語法與風格問題;第二層單元測試約兩分鐘,擋掉邏輯錯誤;第三層整合測試約八分鐘,擋掉接線錯誤與契約不符;第四層端對端測試與效能測試約二十五分鐘,擋掉跨系統的行為問題;第五層是人工驗收或金絲雀部署,以小時到天計,擋掉真實世界才會出現的問題。左側箭頭標示越往下越貴、回饋越慢。底部說明:同一個問題越晚被抓到,修它就越貴,所以關卡的順序不是隨便排的,是依照成本排序;實務上 PR 只跑前面幾關求快,主幹才跑完整的關卡。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <defs><marker id="qg1" markerWidth="8" markerHeight="8" refX="4" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
    <line x1="40" y1="34" x2="40" y2="208" stroke="#e0733a" stroke-width="1.4" marker-end="url(#qg1)"/>
    <text x="28" y="120" fill="#e0733a" font-size="8" text-anchor="middle" transform="rotate(-90 28 120)">越往下:越貴 · 回饋越慢</text>
    <rect x="54" y="30" width="70" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="89" y="47" fill="#54b890" font-size="7.6" text-anchor="middle">~10 秒</text>
    <text x="136" y="41" fill="#e6e6e6" font-size="8.6" text-anchor="start" font-weight="bold">格式 · lint · 型別檢查</text><text x="136" y="53" fill="#9aa4b2" font-size="7.6" text-anchor="start">擋:語法、風格、一眼看得出的錯</text>
    <rect x="54" y="64" width="104" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="106" y="81" fill="#54b890" font-size="7.6" text-anchor="middle">~2 分</text>
    <text x="172" y="75" fill="#e6e6e6" font-size="8.6" text-anchor="start" font-weight="bold">單元測試</text><text x="172" y="87" fill="#9aa4b2" font-size="7.6" text-anchor="start">擋:邏輯錯誤</text>
    <rect x="54" y="98" width="176" height="26" rx="4" fill="#26324a" stroke="#4f6df5" stroke-width="1.3"/><text x="142" y="115" fill="#4f6df5" font-size="7.6" text-anchor="middle">~8 分</text>
    <text x="244" y="109" fill="#e6e6e6" font-size="8.6" text-anchor="start" font-weight="bold">整合測試</text><text x="244" y="121" fill="#9aa4b2" font-size="7.6" text-anchor="start">擋:接線錯誤、契約不符</text>
    <rect x="54" y="132" width="320" height="26" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.3"/><text x="214" y="149" fill="#d6a45c" font-size="7.6" text-anchor="middle">~25 分</text>
    <text x="388" y="143" fill="#e6e6e6" font-size="8.6" text-anchor="start" font-weight="bold">E2E · 效能</text><text x="388" y="155" fill="#9aa4b2" font-size="7.6" text-anchor="start">擋:跨系統的行為</text>
    <rect x="54" y="166" width="500" height="26" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="304" y="183" fill="#e0733a" font-size="7.6" text-anchor="middle">數小時 ~ 數天</text>
    <text x="54" y="206" fill="#9aa4b2" font-size="7.8" text-anchor="start">↑ 人工驗收 / canary —— 擋:只有真實流量才會出現的問題</text>
    <text x="310" y="234" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">同一個問題,越晚抓到修得越貴——所以關卡順序是成本排序,不是隨便排的</text>
    <text x="310" y="252" fill="#9aa4b2" font-size="8.4" text-anchor="middle">能往前挪的就往前挪:型別、契約檢查、靜態分析,常常可以把整合測試才會抓到的問題提前十分鐘</text>
    <text x="310" y="268" fill="#9aa4b2" font-size="8.4" text-anchor="middle">實務排法:PR 只跑前面幾關求快,主幹跑完整的——這就是第 8 篇那些 when 條件在做的事</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">這張圖的用途不是「照抄這五層」,而是提供一個問句:<b>我這一關擋掉的東西,有沒有辦法用更便宜的關卡提前擋掉?</b>把一個 e2e 才發現的欄位型別錯誤,變成 lint 就能抓,省下的是每一次 build 的二十五分鐘</figcaption>
</figure>

寫成 Jenkinsfile 大概是這樣——快的先跑、而且平行;貴的往後,只有主幹才跑:

```groovy
stages {
  stage('Fast checks') {                       // ① 秒級,所有 PR 都跑
    parallel {
      stage('Lint')  { steps { sh './scripts/lint.sh' } }
      stage('Types') { steps { sh './scripts/typecheck.sh' } }
    }
  }
  stage('Unit') {                              // ② 分鐘級
    steps { sh './scripts/unit.sh' }
    post { always { junit 'build/test-results/**/*.xml' } }
  }
  stage('Coverage gate') {                     // ③ 擋:這次改動有沒有被測到
    steps { sh './scripts/diff-coverage.sh --min 80' }
  }
  stage('E2E') {                               // ④ 貴,只有主幹跑
    when { beforeAgent true; branch 'main' }
    steps { sh './scripts/e2e.sh' }
  }
}
```

## 測試報告:紅燈要看得出「哪一個」壞了

`junit` 這個 step 做的事看起來很小——收集測試報告——但它換到的東西很關鍵:**build 頁面直接告訴你哪幾個測試失敗、失敗多久了、是不是新出現的**。沒有它,你只有一坨 console log,每次都要自己捲。

順帶一個很多人沒想清楚的設計題:**測試失敗,build 該紅還是該黃(UNSTABLE)?**

我的立場很硬:**該紅。** `unstable` 這個狀態的存在,讓「測試有失敗但 build 還是綠的」變成可能,而那正是[[jenkins-multibranch|required check]] 最容易被繞過的破口。黃色留給真正「非關鍵步驟失敗」的情況(例如上傳報告失敗,用 [[jenkins-pipeline-advanced|`catchError`]] 標記),不要留給測試。

## 覆蓋率:當成指標很好,當成目標就會被作弊

覆蓋率是我看過最容易被玩壞的數字。一旦你宣布「全公司要達到 80%」,接下來會發生的事非常可預測:大量測 getter/setter 的測試、沒有任何 `assert` 的測試、把難測的檔案加進排除清單。數字達標了,而**你對程式碼的信心一點都沒有增加**。

我的用法有兩個調整:

1. **看 diff coverage,不看全域數字。** 問題不是「這個十年老專案覆蓋率只有 45%」,而是「**你這次改的 200 行,有沒有被測到**」。前者是歷史,改不動也不該擋人;後者是當下,而且完全合理。
2. **門檻拿來擋「沒測」,不是拿來衝分數。** 我設的規則通常是「新增/修改的程式碼覆蓋率低於 80% 就擋下來」,而不是「全專案要到 80%」。

還有一個我會在 review 問的問題,比任何數字都有用:**「這個測試如果壞了,你會知道什麼?」** 答不出來的測試,寫了只是讓數字好看,而且以後每次重構都要陪著改。

## 靜態分析:導入舊專案的關鍵是 baseline

lint、型別檢查、SAST(安全掃描)這類工具的價值很直接:**讓機器講機器的事**,人專心看設計。

但把它導入一個五年的專案,第一次跑會吐出一萬個警告——然後所有人都會學會忽略它,等於沒導入。解法是 **baseline**:

> 把現有的一萬個問題記錄成基準線,關卡**只擋新增的問題**。舊帳另外排時間還,或永遠不還都行——但至少從今天起不會變多。

```groovy
stage('Static analysis') {
  steps {
    sh './scripts/scan.sh --baseline .quality-baseline.json --fail-on-new'
  }
}
```

這招的心理效果比技術效果更大:團隊從「這工具只會叫,沒用」變成「它只在我弄髒東西的時候叫」。信任回來了,關卡才活著。

## 結果比對:當你的承諾是「行為不變」

有一類改動的驗收標準很特別:**輸出必須跟改之前一模一樣。** 重構、查詢改寫、序列化格式調整都是——[[jenkins-multibranch|上一篇談的那個「優化既有 SQL」]]的情境尤其典型。

這種時候最有力的關卡不是測試,是**結果比對**:同一批輸入,跑新舊兩版,逐列比對輸出。

```groovy
stage('Golden diff') {
  steps {
    sh '''
      ./scripts/run.sh --version=old --input fixtures/ --out /tmp/old.jsonl
      ./scripts/run.sh --version=new --input fixtures/ --out /tmp/new.jsonl
      diff <(sort /tmp/old.jsonl) <(sort /tmp/new.jsonl)   # 有差異就非零退出 → 擋下來
    '''
  }
}
```

SQL 改寫特別值得這樣做,因為「行為不變」這個假設比想像中脆弱:join 造成的重複列、`NULL` 語意、沒有 `ORDER BY` 時的隱含順序、`DISTINCT` 與 `GROUP BY` 改寫後的邊界——每一項都足以讓「只是優化」變成一次資料事故。

## Flaky test:讓整道門在沒人宣布的情況下消失

最後這件事,是所有品質關卡最大的敵人。而它的可怕之處在於**它不會發出警報,它只是慢慢地讓紅燈失去意義**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 620 244" role="img" aria-label="Flaky test 如何讓紅燈失去意義。上半部是健康的情況:一百次紅燈裡有九十五次是真的問題,只有五次是不穩定造成的,所以人的反應是停下來查,紅燈的資訊量接近百分之百。下半部是失控的情況:一百次紅燈裡只有二十次是真問題,八十次是不穩定造成的,於是人的反應變成先重跑一次看看,而重跑會把那二十次真問題一起蓋掉,紅燈的資訊量趨近於零。底部結論:這道門是否存在,不看設了幾個關卡,看紅燈還有沒有人相信。" style="width:100%;max-width:680px;height:auto;margin:0 auto;">
    <text x="16" y="28" fill="#54b890" font-size="9.4" text-anchor="start" font-weight="bold">健康:flaky 很少</text>
    <rect x="16" y="38" width="437" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.4"/><text x="234" y="55" fill="#54b890" font-size="8.4" text-anchor="middle">95 次是真的問題</text>
    <rect x="453" y="38" width="23" height="26" rx="4" fill="#3a2d1f" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="486" y="55" fill="#9aa4b2" font-size="7.6" text-anchor="start">5 次是雜訊</text>
    <text x="16" y="84" fill="#e6e6e6" font-size="8.6" text-anchor="start">人的反應:<tspan fill="#54b890" font-weight="bold">停下來查</tspan> → 紅燈的資訊量 ≈ 100%</text>
    <line x1="16" y1="100" x2="604" y2="100" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="16" y="126" fill="#e0733a" font-size="9.4" text-anchor="start" font-weight="bold">失控:flaky 佔多數</text>
    <rect x="16" y="136" width="92" height="26" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.3"/><text x="62" y="153" fill="#54b890" font-size="8" text-anchor="middle">20 次真的</text>
    <rect x="108" y="136" width="368" height="26" rx="4" fill="#3a2626" stroke="#e0733a" stroke-width="1.4"/><text x="292" y="153" fill="#e0733a" font-size="8.4" text-anchor="middle">80 次是 flaky 造成的雜訊</text>
    <text x="486" y="153" fill="#9aa4b2" font-size="7.6" text-anchor="start">訊噪比崩壞</text>
    <text x="16" y="182" fill="#e6e6e6" font-size="8.6" text-anchor="start">人的反應:<tspan fill="#e0733a" font-weight="bold">先重跑一次看看</tspan> → 而重跑會把那 20 次真的一起蓋掉</text>
    <text x="16" y="200" fill="#9aa4b2" font-size="8.2" text-anchor="start">紅燈的資訊量 ≈ 0,但沒有人宣布過「我們不做品質關卡了」</text>
    <text x="310" y="228" fill="#d6a45c" font-size="9.4" text-anchor="middle" font-weight="bold">這道門存不存在,不看你設了幾關,看紅燈還有沒有人信</text>
    <text x="310" y="242" fill="#9aa4b2" font-size="8.4" text-anchor="middle">所以 flaky 不是「有點煩」的品質問題,它是關卡的存亡問題</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">關卡的效力等於<b>紅燈的可信度</b>。flaky 侵蝕的不是某個測試,而是整條 pipeline 在團隊心中的地位——而且它是漸進的,等你察覺時,「重跑一次」早就變成大家的反射動作</figcaption>
</figure>

對策我只有三條,但每一條都要做到底:

1. **量化它。** flaky 率要有數字(同一個 commit 重跑的失敗率、最常失敗的前十個測試)。沒有數字,這件事永遠停在「大家都覺得有點不穩」。
2. **隔離,但要帶著到期日與負責人。** quarantine 是止血,不是解決;沒有負責人與期限的隔離清單,三個月後會變成一份沒人看的墓園。
3. **絕不用 `retry` 包住測試。** [[jenkins-pipeline-advanced|第 5 篇]]講過我為此付過的代價——`retry` 用在網路,不用在測試。

## 反思

### 把覆蓋率從 45% 拉到 80% 的那半年,我們幾乎什麼都沒得到

那是我做過投報率最差的一次「品質改善」。定了目標、排了時程、每週追進度,數字確實漂亮地爬上去了。但半年後回頭看,線上事故的數量**一件都沒少**。

原因很清楚:被補上的測試,大多是最好寫的那些——getter、setter、簡單的轉換函式。真正複雜、真正會出事的地方(併發、邊界、外部服務失敗)一個都沒被碰,因為它們難寫、耗時間、而且對覆蓋率數字的貢獻跟一個 getter 的測試一模一樣。**我們用一個指標,精準地引導大家去做價值最低的那部分工作。**

後來我改成兩件事:只看 diff coverage(這次改的東西有沒有被測),以及在 review 問那句「這個測試如果壞了,你會知道什麼?」。第二個問題沒有任何工具能自動化,但它比任何門檻都有效。

### 一導入就一萬個警告,等於沒導入

靜態分析我踩過一次很典型的坑:興沖沖導入一套規則、跑完全專案、產出一份九千多個問題的報告,發到群組裡。結果是**沒有人打開它**——因為那份報告等於在說「你們整個專案都是錯的」,而那句話沒有任何行動可以承接。

改用 baseline 之後,同一套工具的命運完全不同:它每週只講三五件事,而且每一件都跟你剛剛寫的程式碼有關。**工具的價值不是找出多少問題,而是它講的話有多少會被聽進去。** 這件事在導入任何「檢查類」工具時都成立——一次講一萬件事,跟什麼都沒說是一樣的。

### 關卡的數量不重要,紅燈的可信度才重要

如果只能留一句話:**一條有三個可信關卡的 pipeline,勝過六個大家都在重跑的關卡。**

我現在評估一個團隊的 CI 品質,不看它設了幾個 check,只看兩件事:紅燈出現時,第一反應是「去看發生什麼事」還是「先重跑」;以及,**有沒有人說得出上一次某個關卡擋下真問題是什麼時候**。第二個問題答不出來,那些關卡就只是儀式——它們消耗每個人的時間,換來一種「我們有在把關」的錯覺。

門的價值不在它立在那裡,在於**大家相信它會擋**。

下一篇談部署:一顆產物怎麼走完所有環境而不重 build、push 式 CD 與 GitOps 的界線,以及為什麼回滾必須跟部署一樣一鍵、一樣常演練。
