---
title: "Blameless Postmortem:把故障變成組織的學習"
date: 2026-07-12
category: tech
description: "故障很貴——熬夜、道歉、掉信任。這麼貴的學費,不換成一份能防止再犯的 postmortem 就是純虧。而 postmortem 的靈魂是 blameless:對事不對人。因為究責會嚇跑真相,而人幾乎從來不是 root cause——如果一個人手滑就能搞垮系統,那是系統的問題,不是人的問題。"
tags:
  - sre
  - culture
series: "Google SRE 讀書筆記"
seriesOrder: 7
comments: true
draft: false
---
第一批地基的最後一篇。[[sre-troubleshooting|上一篇]]講怎麼找到 root cause——但找到之後呢?**Postmortem(事後檢討)** 就是把一次昂貴的故障,轉化成整個組織的學習:記錄發生什麼、影響多大、時間軸、真因、怎麼修的、怎麼防止再發生。而它的靈魂,是一個看似簡單卻極難做到的詞:**blameless(對事不對人)。**

## 靈魂是 blameless:對事不對人

同一場故障,「究責」和「blameless」會把團隊帶向兩個完全相反的循環:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="兩種文化的循環對比。究責文化的惡性循環:出事、找戰犯問誰的錯、大家隱藏錯誤不敢說真話、學不到於是重蹈覆轍,循環回到出事。Blameless 的良性循環:出事、問系統為何允許、大家坦白說出全貌、改系統於是越來越穩。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pm" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="216" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="26" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">究責文化 · 惡性循環</text>
    <rect x="66" y="36" width="168" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="53" fill="#e6e6e6" font-size="8.5" text-anchor="middle">出事</text>
    <rect x="66" y="76" width="168" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="93" fill="#e6e6e6" font-size="8.5" text-anchor="middle">「誰的錯?」找戰犯</text>
    <rect x="66" y="116" width="168" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="133" fill="#e6e6e6" font-size="8.5" text-anchor="middle">大家隱藏錯誤、不敢說真話</text>
    <rect x="66" y="156" width="168" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="150" y="173" fill="#e6e6e6" font-size="8.5" text-anchor="middle">學不到 → 重蹈覆轍</text>
    <line x1="150" y1="62" x2="150" y2="74" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <line x1="150" y1="102" x2="150" y2="114" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <line x1="150" y1="142" x2="150" y2="154" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <path d="M66,169 C34,169 34,49 64,49" fill="none" stroke="#e0733a" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#pm)"/>
    <text x="430" y="26" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">Blameless · 良性循環</text>
    <rect x="346" y="36" width="168" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="53" fill="#e6e6e6" font-size="8.5" text-anchor="middle">出事</text>
    <rect x="346" y="76" width="168" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="93" fill="#e6e6e6" font-size="8.5" text-anchor="middle">「系統為何允許?」</text>
    <rect x="346" y="116" width="168" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="133" fill="#e6e6e6" font-size="8.5" text-anchor="middle">大家坦白說出全貌</text>
    <rect x="346" y="156" width="168" height="26" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="430" y="173" fill="#e6e6e6" font-size="8.5" text-anchor="middle">改系統 → 越來越穩</text>
    <line x1="430" y1="62" x2="430" y2="74" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <line x1="430" y1="102" x2="430" y2="114" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <line x1="430" y1="142" x2="430" y2="154" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pm)"/>
    <path d="M514,169 C546,169 546,49 516,49" fill="none" stroke="#54b890" stroke-width="1.2" stroke-dasharray="4 3" marker-end="url(#pm)"/>
    <text x="290" y="212" fill="#9aa4b2" font-size="8.5" text-anchor="middle">同一場故障,問「誰」還是問「系統」,把團隊帶向相反的兩個循環</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">究責讓人隱藏錯誤、不敢說真話,於是你永遠拿不到完整真相、學不到教訓;blameless 問「系統為何允許這件事發生」,人才敢坦白,你才修得到真正的問題。差別不在態度好壞,在<b>你拿不拿得到真相</b></figcaption>
</figure>

為什麼究責這麼致命?因為它**嚇跑了真相**。當犯錯要被懲罰,人就會本能地隱藏錯誤、修飾時間軸、不敢說「其實我當時看到 X 但沒在意」——而你要學到教訓,偏偏就需要那個完整、誠實的真相。blameless 不是「當爛好人、沒人負責」,是**為了拿到真相而刻意設計的安全感**。

## 人幾乎從來不是 root cause

blameless 還有一個更硬的底層邏輯:**人一定會犯錯,這是常數;所以「防止人犯錯」是徒勞的,該做的是「讓人犯錯也不會釀成災難」。** 舉個經典例子——有人一行指令誤刪了正式資料庫:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 228" role="img" aria-label="事件是一行指令誤刪正式資料庫。究責路線:怪 Alice 手滑、罰她叫大家小心,結果系統沒變、換人照樣中。Blameless 路線:往下問系統,危險指令為何沒二次確認、為何一個人就能刪正式庫、為何沒有能快速還原的備份,修這些系統缺陷才能根治。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="pd" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="180" y="16" width="220" height="34" rx="6" fill="#262b3a" stroke="#e6e6e6" stroke-width="1.4"/><text x="290" y="37" fill="#e6e6e6" font-size="9.5" text-anchor="middle">事件:一行指令誤刪正式資料庫</text>
    <line x1="250" y1="50" x2="160" y2="80" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pd)"/>
    <line x1="330" y1="50" x2="420" y2="80" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#pd)"/>
    <line x1="290" y1="58" x2="290" y2="214" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <rect x="24" y="82" width="236" height="28" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.2"/><text x="142" y="100" fill="#e6e6e6" font-size="8.5" text-anchor="middle">✗ 究責:怪 Alice 手滑</text>
    <rect x="24" y="120" width="236" height="28" rx="5" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="142" y="138" fill="#9aa4b2" font-size="8.5" text-anchor="middle">罰她、叫大家「以後小心」</text>
    <text x="142" y="176" fill="#e0733a" font-size="8.7" text-anchor="middle">系統沒變,換一個人照樣中</text>
    <text x="142" y="190" fill="#9aa4b2" font-size="8" text-anchor="middle">(root cause 根本沒被碰到)</text>
    <rect x="320" y="82" width="240" height="28" rx="5" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="440" y="100" fill="#54b890" font-size="8.5" text-anchor="middle">✓ blameless:往下問系統</text>
    <rect x="320" y="118" width="240" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="440" y="133" fill="#9aa4b2" font-size="8" text-anchor="middle">危險指令為何沒二次確認?</text>
    <rect x="320" y="144" width="240" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="440" y="159" fill="#9aa4b2" font-size="8" text-anchor="middle">為何一個人就能刪正式庫?</text>
    <rect x="320" y="170" width="240" height="22" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1"/><text x="440" y="185" fill="#9aa4b2" font-size="8" text-anchor="middle">為何沒有能快速還原的備份?</text>
    <text x="440" y="210" fill="#54b890" font-size="8.7" text-anchor="middle">修這些系統缺陷,才不會再發生</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">停在「Alice 手滑」等於什麼都沒修,換個人照樣中。真因從來不是那雙手,而是「系統允許一次手滑就毀掉一切」——沒有二次確認、權限過大、沒有快速還原。把矛頭從人轉向系統,你才會去修真正該修的</figcaption>
</figure>

所以 postmortem 有個重要前提:**假設每個人當下都是根據他手上的資訊,做了合理的決定(assume good intentions)。** 沒有人早上起床想著「今天來搞垮系統」。當你這樣假設,注意力就自然從「這個人怎麼這麼笨」轉向「什麼樣的系統、流程、資訊落差,讓一個合理的人做出了會出事的動作」——而後者才修得動。

## Blameless 不等於不負責

要澄清一個常見誤解:**blameless 不是「沒人負責、大家和稀泥」。** 它一樣要有明確的 **action items**、要有人 own、要追蹤到完成——只是焦點放在**改系統**,不是**罰個人**。而 action item 必須具體、可執行:「幫刪除指令加上二次確認」「把備份還原演練排進每月」是 action item;「大家以後小心一點」不是——那只是把同樣的痛,原封不動留給下一次。

## 反思

### Blame 的代價,是把「學習」嚇跑了

究責最大的傷害,其實不是落在被罵的那個人身上,而是它讓「說真話」變得危險。一旦承認錯誤要付代價,整個團隊就會開始隱藏、修飾、防衛——而你最需要的,偏偏是那個沒被修飾的完整真相。所以我越來越把 blameless 看成一種**很務實的設計**,不是道德姿態:**你放棄追究個人,是為了換取誠實;而誠實,是團隊能從失敗學到東西的唯一前提。** 這跟我在帶人、在 Tech Leader 那條線上一直相信的心理安全感是同一件事——人只有覺得安全,才敢誠實;而不誠實的團隊,再多故障也學不會。

### 如果一個人手滑就能搞垮系統,那是系統的問題

這句話我想放大講,因為它硬到可以當信條。人會犯錯是常數,不是變數;既然你消不掉它,把力氣花在「防止人犯錯」上就是白費。真正該做的是**讓系統對人的錯誤有韌性**——防呆、二次確認、最小權限、能快速還原。誤刪資料庫的 root cause 從來不是「Alice 手滑」,是「系統允許一次手滑就毀掉一切」。這跟 [[sre-intro|第一篇]]講的「容錯不是無錯」根本是同一句話,只是這次容的是**人**的錯:好系統假設人會犯錯,然後讓犯錯也不至於釀成災難。

### 沒寫 postmortem,等於白痛一次

故障的學費非常貴——熬夜、道歉、掉信任、燒掉 error budget。這麼貴的東西,如果不換成一份能讓組織記住、能防止再犯的 postmortem,那就是**純虧**。我現在把寫 postmortem 當成「把痛苦變成資產」的動作:反正都痛了,至少要換到一個更穩的系統、和一群真的學到東西的人。而這筆交易能不能成立,全看 action item 是不是**具體、有 owner、追得到**——這也呼應 [[sre-troubleshooting|上一篇]]說的「記錄你做了什麼」:除錯留下的軌跡,正是 postmortem 最好的原料。痛都痛了,別讓它白白過去。
