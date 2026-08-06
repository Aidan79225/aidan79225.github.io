---
title: "持續測試與交付:品質來自快回饋,不是守關卡"
date: 2026-08-06
category: tech
description: "第二個核心實踐把測試的位置整個搬家:不是做完再驗,是每個小步驟都有自動化回饋跟著。基礎設施的測試金字塔——底層秒級的靜態檢查擋掉最多蠢事,上層才起真的 stack;宣告式程式碼還有個獨特陷阱:別寫那種只是把定義檔再講一遍的測試。最後由一條 pipeline 讓每個變更用同一條路徑晉級到正式環境。"
tags:
  - iac
  - devops
  - book-notes
series: "Infrastructure as Code 讀書筆記"
seriesOrder: 5
comments: true
draft: false
---
三個核心實踐的第二個。[[iac-everything-as-code|上一篇]]把一切變成程式碼之後,下一個問題自然是:程式碼會錯,怎麼知道這次變更是安全的?書的答案跟傳統直覺相反——**不是在上線前設一道更嚴的關卡,而是把驗證拆碎、塞進工作的每一步**。品質是快回饋餵出來的,不是關卡守出來的;這跟[[iac-intro|第一篇]]「大批次才是風險來源」是同一件事的執行版。

## 為什麼強調「持續」:堆著沒驗證的工作,就是堆風險

「持續」兩個字各有所指:**持續測試**是指邊做邊測——寫一小段就得到回饋,而不是整包寫完才送測;**持續交付**是指每個變更都保持在「隨時可上線」的狀態,而不是攢一批一起衝。反面教材大家都熟:基礎設施改動累積兩週,一次 apply 上去,炸了之後沒人知道是十七個變更裡的哪一個。變更批次越小、驗證越早,出錯的定位成本越低——這是全書從頭貫穿到尾的等式。

## 基礎設施的測試金字塔

軟體測試金字塔搬到基礎設施上一樣成立:**越下層越快、越便宜、量越多;越上層越慢、越貴、越少**——而且大部分的蠢事,在最下層就該被擋下來:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 520 268" role="img" aria-label="基礎設施測試金字塔:底層是秒級的靜態分析(lint、validate、policy as code),往上是單元測試與 plan 檢查、起真的測試 stack,頂層是端到端整合測試;越下層越快越便宜量越多" style="width:100%;max-width:560px;height:auto;margin:0 auto;">
    <defs><marker id="tdArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <polygon points="230,24 420,240 40,240" fill="none" stroke="#3a4154" stroke-width="1.6"/>
    <polygon points="87.5,186 372.5,186 420,240 40,240" fill="#4f6df5" fill-opacity="0.16"/>
    <line x1="182.5" y1="78" x2="277.5" y2="78" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="135" y1="132" x2="325" y2="132" stroke="#3a4154" stroke-width="1.2"/>
    <line x1="87.5" y1="186" x2="372.5" y2="186" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="230" y="60" fill="#9aa4b2" font-size="10.5" text-anchor="middle">端到端・整合</text>
    <text x="230" y="110" fill="#9aa4b2" font-size="10.5" text-anchor="middle">起一個真的測試 stack</text>
    <text x="230" y="164" fill="#e6e6e6" font-size="10.5" text-anchor="middle">單元測試・plan 預覽</text>
    <text x="230" y="218" fill="#e6e6e6" font-size="10.5" text-anchor="middle">靜態分析:lint・validate・policy as code</text>
    <line x1="460" y1="240" x2="460" y2="40" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#tdArr)"/>
    <text x="472" y="236" fill="#e6e6e6" font-size="9.5" text-anchor="start" transform="rotate(-90 472 236)">回饋:秒 → 分 → 十分鐘</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">底層(藍色)是性價比之王:秒級回饋、不用花錢起環境,卻能擋掉語法錯誤、危險設定、違反規範的資源——大多數的錯根本輪不到上層才被抓</figcaption>
</figure>

各層對應的實體大概是:最底層跑 `terraform validate`、lint、policy as code(「不准開 0.0.0.0/0 的 security group」這種規則寫成自動檢查);第二層做模組的單元測試、看 plan 的 diff;第三層真的把 stack 起在測試用的專案裡,驗證「建得起來、連得上」;頂層才是跨系統的整合驗證。

## 宣告式程式碼的測試陷阱:別測「code 說了什麼」

這章有個很誠實的提醒,省掉很多白工:**宣告式程式碼的「單元測試」很容易寫成廢話**——定義檔寫「開一台 t3.medium」,測試驗證「有開一台 t3.medium」,這只是把宣告再講一遍,永遠不會紅,紅了也只代表你忘了同步改測試。宣告式的低層驗證該花在**會變的部分**:吃了不同的變數、不同的組合後輸出對不對、模組的條件邏輯走對邊沒有;至於「宣告的東西真的建得起來、建起來真的能用」,交給上層拿真環境驗——**測結果,不是測宣告**。

## 一條 pipeline,一路晉級到正式環境

把上面的層次串起來的就是 delivery pipeline:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 168" role="img" aria-label="交付 pipeline:commit 之後依序通過秒級靜態檢查、分鐘級測試 stack、test 與 staging 環境,最後到 production;任何一關失敗就停下,快速回饋給開發者" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="plArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="plArr2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#4f6df5"/></marker></defs>
    <rect x="10" y="46" width="88" height="46" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="54" y="66" fill="#e6e6e6" font-size="10.5" text-anchor="middle">commit</text>
    <text x="54" y="81" fill="#9aa4b2" font-size="8.5" text-anchor="middle">一個小變更</text>
    <line x1="98" y1="69" x2="118" y2="69" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#plArr)"/>
    <rect x="120" y="46" width="96" height="46" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="168" y="66" fill="#e6e6e6" font-size="10.5" text-anchor="middle">靜態檢查</text>
    <text x="168" y="81" fill="#9aa4b2" font-size="8.5" text-anchor="middle">秒級</text>
    <line x1="216" y1="69" x2="236" y2="69" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#plArr)"/>
    <rect x="238" y="46" width="96" height="46" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="286" y="66" fill="#e6e6e6" font-size="10.5" text-anchor="middle">測試 stack</text>
    <text x="286" y="81" fill="#9aa4b2" font-size="8.5" text-anchor="middle">分鐘級</text>
    <line x1="334" y1="69" x2="354" y2="69" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#plArr)"/>
    <rect x="356" y="46" width="96" height="46" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="404" y="66" fill="#e6e6e6" font-size="10.5" text-anchor="middle">test / staging</text>
    <text x="404" y="81" fill="#9aa4b2" font-size="8.5" text-anchor="middle">同一份定義</text>
    <line x1="452" y1="69" x2="472" y2="69" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#plArr)"/>
    <rect x="474" y="46" width="80" height="46" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="514" y="66" fill="#e6e6e6" font-size="10.5" text-anchor="middle">production</text>
    <text x="514" y="81" fill="#9aa4b2" font-size="8.5" text-anchor="middle">同一條路徑</text>
    <path d="M 286 92 Q 240 132 62 96" fill="none" stroke="#4f6df5" stroke-width="1.2" stroke-dasharray="5 4" marker-end="url(#plArr2)"/>
    <text x="196" y="128" fill="#4f6df5" font-size="9.5" text-anchor="middle">任何一關失敗 → 立刻回饋,不再往前</text>
    <text x="280" y="158" fill="#9aa4b2" font-size="9.5" text-anchor="middle">正式環境的變更,永遠是「已經在前面每一關活下來」的那一份</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">pipeline 的本質是晉級制:便宜的關卡在前、昂貴的在後,掛掉就地攔截;到 production 的永遠是同一份定義、走同一條路徑</figcaption>
</figure>

兩個設計原則值得畫重點:**便宜的檢查放前面**(大多數錯誤秒級陣亡,省下起環境的錢和等待);**每個環境用同一份定義、同一條路徑部署**——test 環境驗過的東西之所以可信,是因為 staging 和 production 拿到的是一模一樣的流程,而不是「概念上類似」的另一套。

## 反思

### 環境失真,是 infra 事故最常見的溫床

「staging 驗過了,上 prod 還是炸」——每次追下去,原因幾乎都是同一種:**兩個環境根本不是同一份定義生出來的**。staging 被人手動調過、版本落後三個月、某個資源是當年手刻的,於是它驗證的其實是另一個平行世界。這章給了我一個更好的說法:測試環境的價值不在「它長得像 prod」,在**「它跟 prod 走同一條 pipeline、吃同一份 code」**——像不像是結果,同不同源才是因。所以我現在把「staging 可以手動改」視為跟「prod 可以手動改」同罪:改的那一刻,它的驗證能力就歸零了。

### 先鋪最底層:policy as code 是性價比之王

想到測試很多人直接衝去做最上層的 e2e——貴、慢、flaky,然後放棄。金字塔給的順序剛好相反:**先把秒級那層鋪滿**。lint、validate、幾條 policy 規則,一個下午就能上線,從此「security group 開全世界」「資源忘了打 tag」「機器規格手滑選到 8xlarge」這類蠢事再也進不了 main——而回顧起來,真正燒錢的事故大多是這種等級的錯,不是什麼深奧的架構問題。用最便宜的一層擋掉最大宗的錯,剩下的預算再去買上層的信心,這個順序跟 [[sre-testing|SRE 講測試]]的結論殊途同歸。

### 長壽 branch 對 infra code 加倍致命

「持續」的反面是囤積。應用程式的 feature branch 放兩週,merge 時痛的是 code conflict;**infra code 的 branch 放兩週,痛的是世界已經變了**——你 branch 上的 plan 是對兩週前的現況算的,期間別人改過的網路、升過的版本、加過的資源,全都不在你的視野裡,merge 後第一次 apply 就是開獎。所以 trunk-based 對 infra 不是風格偏好,是止痛藥:變更小到當天能進 main、進了 main 就被 pipeline 帶著走完全程,「我的 branch 跟現實的差距」這個風險才會趨近於零。
