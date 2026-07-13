---
title: "事件應變:大事故真正的敵人是混亂"
date: 2026-07-13
category: tech
description: "大事故爆發時,最大的敵人往往不是技術問題本身,而是混亂——五個人搶著改、資訊亂飛、沒人掌握全局。技術問題會修好,但混亂會把十分鐘的問題拖成兩小時、甚至改出新災難。這篇講怎麼用一套借鏡消防的事件指揮體系(IC / Ops / Comms / Scribe)馴服混亂,以及為什麼指揮官最反直覺的一點是『他不動手』。"
tags:
  - sre
  - incident
series: "Google SRE 讀書筆記"
seriesOrder: 8
comments: true
draft: false
---
第二批開始。前面你學會了 [[sre-alerting-oncall|on-call 止血]]、也學會了[[sre-troubleshooting|系統化除錯]]——但那是「一個人對付一個問題」。當一場**大事故**爆發(多人捲入、影響大、時間壓力高),你會發現最大的敵人往往不是技術問題本身,而是**混亂**。

## 大事故真正的敵人是「混亂」

技術問題總會被修好;但「五個人同時在改、沒人知道別人在做什麼」造成的混亂,會把一個十分鐘的問題拖成兩小時,甚至改出新的災難:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 218" role="img" aria-label="左邊沒有指揮:四個工程師同時對故障中的系統動手,箭頭交叉、互相踩,資訊亂飛,修得更慢。右邊有指揮:IC 統籌,底下 Ops 動手、Comms 對外、Scribe 記錄各司其職,只有 Ops 對系統動手,乾淨有序,修得更快。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="ir" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="16" x2="290" y2="182" stroke="#3a4154" stroke-width="1" stroke-dasharray="4 4"/>
    <text x="150" y="26" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">沒有指揮:混亂</text>
    <rect x="108" y="92" width="86" height="34" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.5"/><text x="151" y="113" fill="#e6e6e6" font-size="8.5" text-anchor="middle">系統故障中</text>
    <circle cx="46" cy="58" r="13" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="46" y="61" fill="#9aa4b2" font-size="7" text-anchor="middle">工程</text>
    <circle cx="256" cy="58" r="13" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="256" y="61" fill="#9aa4b2" font-size="7" text-anchor="middle">工程</text>
    <circle cx="46" cy="150" r="13" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="46" y="153" fill="#9aa4b2" font-size="7" text-anchor="middle">工程</text>
    <circle cx="256" cy="150" r="13" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.2"/><text x="256" y="153" fill="#9aa4b2" font-size="7" text-anchor="middle">工程</text>
    <line x1="58" y1="66" x2="108" y2="98" stroke="#e0733a" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="244" y1="66" x2="194" y2="98" stroke="#e0733a" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="58" y1="142" x2="108" y2="118" stroke="#e0733a" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="244" y1="142" x2="194" y2="118" stroke="#e0733a" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="59" y1="58" x2="243" y2="150" stroke="#9aa4b2" stroke-width="0.8" stroke-dasharray="2 2"/>
    <line x1="59" y1="150" x2="243" y2="58" stroke="#9aa4b2" stroke-width="0.8" stroke-dasharray="2 2"/>
    <text x="150" y="200" fill="#9aa4b2" font-size="8.3" text-anchor="middle">搶著改、互相踩、資訊亂飛 → 修更慢</text>
    <text x="430" y="26" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">有指揮:有序</text>
    <rect x="378" y="38" width="104" height="26" rx="5" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/><text x="430" y="55" fill="#4f6df5" font-size="9" text-anchor="middle">IC(統籌)</text>
    <rect x="312" y="88" width="60" height="24" rx="4" fill="#223528" stroke="#54b890" stroke-width="1.2"/><text x="342" y="104" fill="#e6e6e6" font-size="8" text-anchor="middle">Ops 修</text>
    <rect x="400" y="88" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="430" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">Comms 報</text>
    <rect x="488" y="88" width="60" height="24" rx="4" fill="#262b3a" stroke="#3a4154" stroke-width="1.1"/><text x="518" y="104" fill="#9aa4b2" font-size="8" text-anchor="middle">Scribe 記</text>
    <line x1="418" y1="64" x2="352" y2="86" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="430" y1="64" x2="430" y2="86" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ir)"/>
    <line x1="442" y1="64" x2="508" y2="86" stroke="#9aa4b2" stroke-width="1" marker-end="url(#ir)"/>
    <rect x="352" y="148" width="120" height="26" rx="5" fill="#3a2626" stroke="#e0733a" stroke-width="1.3"/><text x="412" y="165" fill="#e6e6e6" font-size="8.5" text-anchor="middle">系統故障中</text>
    <line x1="342" y1="112" x2="400" y2="146" stroke="#54b890" stroke-width="1.2" marker-end="url(#ir)"/>
    <text x="430" y="200" fill="#9aa4b2" font-size="8.3" text-anchor="middle">一人一角、資訊集中 → 修更快</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一個故障,左邊沒人統籌、大家對系統亂射一通、還互相踩;右邊有指揮官分工,只有一個人動手改。混亂本身就是一種故障——而且是人造的、可以用流程避免的</figcaption>
</figure>

## 事件指揮體系:一人一角

馴服混亂的辦法,SRE 直接借鏡了消防與災害應變的 **Incident Command System(ICS,事件指揮體系)**:明確的角色分工,一個人只扛一件事:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="事件指揮體系四個角色。最上層 Incident Commander 總協調、做決策、不親自動手。底下三個角色:Ops 操作組實際止血與修復;Comms 溝通對外更新狀態給主管客服使用者;Scribe 記錄記時間軸與決策給 postmortem 用。" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="ic" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="200" y="22" width="180" height="46" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.7"/>
    <text x="290" y="42" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">Incident Commander(IC)</text>
    <text x="290" y="58" fill="#9aa4b2" font-size="8" text-anchor="middle">總協調 · 做決策 · 不親自動手</text>
    <line x1="290" y1="68" x2="104" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ic)"/>
    <line x1="290" y1="68" x2="290" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ic)"/>
    <line x1="290" y1="68" x2="476" y2="116" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#ic)"/>
    <rect x="24" y="118" width="160" height="60" rx="7" fill="#223528" stroke="#54b890" stroke-width="1.5"/>
    <text x="104" y="138" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">Ops 操作組</text>
    <text x="104" y="154" fill="#9aa4b2" font-size="8" text-anchor="middle">實際止血 / 修復</text>
    <text x="104" y="167" fill="#9aa4b2" font-size="8" text-anchor="middle">唯一動手改系統的人</text>
    <rect x="210" y="118" width="160" height="60" rx="7" fill="#26324a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="290" y="138" fill="#4f6df5" font-size="10" text-anchor="middle" font-weight="bold">Comms 溝通</text>
    <text x="290" y="154" fill="#9aa4b2" font-size="8" text-anchor="middle">對外更新狀態</text>
    <text x="290" y="167" fill="#9aa4b2" font-size="8" text-anchor="middle">(主管 / 客服 / 使用者)</text>
    <rect x="396" y="118" width="160" height="60" rx="7" fill="#33291a" stroke="#d6a45c" stroke-width="1.5"/>
    <text x="476" y="138" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">Scribe 記錄</text>
    <text x="476" y="154" fill="#9aa4b2" font-size="8" text-anchor="middle">記時間軸、決策</text>
    <text x="476" y="167" fill="#9aa4b2" font-size="8" text-anchor="middle">(給 postmortem 用)</text>
    <text x="290" y="200" fill="#9aa4b2" font-size="8.5" text-anchor="middle">IC 只協調不 debug;一人一角,別讓指揮官又指揮又親自修</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">分工的精髓:IC 掌握全局、做決策、分派任務,但<b>不親自動手</b>;Ops 是唯一動系統的人;Comms 擋掉「現在怎樣了?」的追問讓 IC 專心;Scribe 的時間軸就是之後 postmortem 的原料</figcaption>
</figure>

## 幾個關鍵動作

有了角色,還有幾個讓事件應變順的關鍵:

- **早點宣告「這是一個 incident」**。太多團隊拖著不肯承認出事(想說再等等、應該快好了),結果錯過啟動協調的時機。宣告事故不是認輸,是**啟動一套幫你更快解決的機制**。
- **一個共同的溝通管道**(戰情室 / chat channel):所有人在同一個地方對齊,別讓資訊散在私訊。
- **明確的交接(handoff)**:IC 要下班/撐不住時,大聲把指揮權移交給誰,不能無聲消失。
- **平時演練**:別讓真正的大事故,是你第一次用這套流程。
- **事後追蹤 outage**(Ch16):把每次事件記錄、分類、看趨勢(哪類最常發生、MTTR 有沒有變好)——**資料化,才談得上改善。**

## 反思

### 大事故的瓶頸,常常不是技術,是協調

我看過不少事故,技術上的修法其實很簡單(回滾、重啟、切流量),真正把時間拖長的,是「五個人各自在動、沒人掌握全局」的混亂——重複的操作、互相衝突的改動、甚至有人把別人剛修好的又弄壞。這讓我體會:**混亂本身就是一種故障,而且是人造的、可以用流程避免的。** 救火時,一個清楚的指揮結構,往往比多找兩個厲害的工程師更能加速——因為它解的不是技術問題,是「人多手雜」這個更難纏的問題。

### IC 最反直覺的一點:他不動手

新手當 IC 最容易犯的錯,是自己跳下去 debug——結果全局沒人看、其他人失去協調中心,反而更亂。IC 的價值,恰恰在於「**不動手、只協調**」:掌握全貌、分派任務、做決策、幫大家擋掉干擾。讓最會修的人專心修,讓最會統籌的人專心統籌。這跟我帶團隊的體會一模一樣:**當 leader 忍不住跳進去當那個最強的個人貢獻者,團隊就失去了大腦。** 忍住不動手、把自己升到協調層,是當指揮官(和當主管)最難、也最該練的一課。

### 早點承認「這是 incident」

拖延宣告事故,是我看過最常見、也最貴的錯。大家想省事、想不小題大作、賭它自己會好——結果等到不得不承認時,已經一團亂、還錯過了最該協調的黃金時間。我現在的原則是:**寧可宣告了發現是小事,也別拖到大事才手忙腳亂。** 而這件事能不能做到,其實回到 [[sre-postmortem|上一篇]]的 blameless 文化——只有當「宣告事故」是安全的、被鼓勵的、不會被秋後算帳,人才敢及早拉起警報。**技術流程和文化,在這裡是綁在一起的。**
