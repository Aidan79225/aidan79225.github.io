---
title: "雲時代基礎設施的原則:壞了就重建,可靠性來自軟體"
date: 2026-08-05
category: tech
description: "鐵器時代的可靠性是用錢買的——更貴的硬體、更嚴的管制;雲跑在便宜的 commodity 硬體上,前提直接翻轉:假設任何元件隨時會壞。第二章給出應對的原則鏈:流程可重複、變異最小化,才有一切可重現;可重現,東西才敢拋棄;能拋棄,故障就從災難降級成例行重建。伺服器要當牛養,不是當寵物疼。"
tags:
  - iac
  - devops
  - book-notes
series: "Infrastructure as Code 讀書筆記"
seriesOrder: 2
comments: true
draft: false
---
[[iac-intro|第一章]]說雲時代該擁抱變更,這章回答「憑什麼敢」。前提先翻轉:鐵器時代的可靠性是**用錢買硬體**——更貴的機器、雙電源、RAID、原廠保固;雲跑在海量便宜的 commodity 硬體上,供應商直白告訴你:**任何一台機器、任何一個磁碟,隨時可能消失。** 在這個前提下還想要可靠,只剩一條路——可靠性不再來自「元件不會壞」,而來自「壞了能多快變回好的」。整章的原則,全是為了把這條路鋪起來。

## 原則是一條因果鏈,不是一張清單

書裡的原則(假設系統不可靠、一切可重現、建立可拋棄的東西、最小化變異、任何流程都可重複)常被當成並列的口號背,但我讀完的體會是:**它們是一條有方向的因果鏈**——

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 216" role="img" aria-label="雲時代原則因果鏈:前提是任何元件隨時會壞;流程可重複加變異最小化,推出一切可重現,推出一切可拋棄,最後故障降級為例行重建;可靠性從硬體搬到軟體" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="prArr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="70" y="12" width="420" height="30" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="280" y="31" fill="#9aa4b2" font-size="10.5" text-anchor="middle">前提:任何元件隨時會壞(便宜的 commodity 硬體)</text>
    <line x1="280" y1="42" x2="280" y2="66" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#prArr)"/>
    <rect x="12" y="72" width="124" height="44" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="74" y="90" fill="#e6e6e6" font-size="10.5" text-anchor="middle">流程可重複</text>
    <text x="74" y="105" fill="#9aa4b2" font-size="9" text-anchor="middle">+ 變異最小化</text>
    <line x1="136" y1="94" x2="154" y2="94" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#prArr)"/>
    <rect x="156" y="72" width="124" height="44" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="218" y="90" fill="#e6e6e6" font-size="10.5" text-anchor="middle">一切可重現</text>
    <text x="218" y="105" fill="#9aa4b2" font-size="9" text-anchor="middle">從定義檔重建任何東西</text>
    <line x1="280" y1="94" x2="298" y2="94" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#prArr)"/>
    <rect x="300" y="72" width="124" height="44" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="362" y="90" fill="#e6e6e6" font-size="10.5" text-anchor="middle">一切可拋棄</text>
    <text x="362" y="105" fill="#9aa4b2" font-size="9" text-anchor="middle">牛,不是寵物</text>
    <line x1="424" y1="94" x2="442" y2="94" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#prArr)"/>
    <rect x="444" y="72" width="108" height="44" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="498" y="90" fill="#e6e6e6" font-size="10.5" text-anchor="middle">故障=例行重建</text>
    <text x="498" y="105" fill="#9aa4b2" font-size="9" text-anchor="middle">不再是災難</text>
    <line x1="498" y1="116" x2="498" y2="146" stroke="#4f6df5" stroke-width="1.3" stroke-dasharray="5 4" marker-end="url(#prArr)"/>
    <rect x="120" y="150" width="420" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="330" y="171" fill="#e6e6e6" font-size="10.5" text-anchor="middle">可靠性從「硬體不會壞」搬到「軟體重建得快」</text>
    <text x="280" y="206" fill="#9aa4b2" font-size="9.5" text-anchor="middle">鏈條由左往右:上游做不到,下游全是空談</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">五個原則其實是一條因果鏈:可重複與低變異是可重現的地基,可重現撐起可拋棄,可拋棄才讓故障降級成例行公事</figcaption>
</figure>

這條鏈的讀法是由左往右的「依賴關係」:

1. **任何流程都可重複**:做過一次的事,要能用同樣的方式再做一次——這是最底層的紀律。手動修一次機器,就是在鏈條的源頭埋下一顆做不到重複的種子。
2. **最小化變異**:同一種需求只留一種解法。變異每多一種,上面每一層的成本不是加法,是乘法——十種 OS 版本配三種部署方式,你要維護的是三十條路徑。
3. **一切可重現**:前兩者到位,才可能「系統的任何部分都能從定義檔輕鬆重建」。這是消滅恐懼的原則——不敢動,本質上是因為弄壞了回不來。
4. **建立可拋棄的東西**:可重現之後,「修」就不再是唯一選項——直接砍掉,換一個新的上來。
5. **於是「假設系統不可靠」不再可怕**:元件會壞是常態,但壞了只是觸發一次例行重建。

## 牛,不是寵物

書裡引了那句流傳很廣的比喻:**伺服器要當牛養,不是當寵物疼(cattle, not pets)。** 這是「可拋棄」原則最好記的形狀:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 208" role="img" aria-label="寵物與牛群對比:寵物式伺服器有名字、手動照顧、獨一無二不敢動;牛群式伺服器只有編號、從定義檔生出來、出問題直接汰換重建" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <line x1="280" y1="12" x2="280" y2="198" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="145" y="28" fill="#e6e6e6" font-size="12.5" text-anchor="middle">寵物 · Pets</text>
    <text x="415" y="28" fill="#e6e6e6" font-size="12.5" text-anchor="middle">牛群 · Cattle</text>
    <rect x="40" y="44" width="210" height="34" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="145" y="65" fill="#e6e6e6" font-size="10.5" text-anchor="middle">有名字:zeus、apollo</text>
    <rect x="40" y="94" width="210" height="34" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="145" y="115" fill="#e6e6e6" font-size="10.5" text-anchor="middle">手動照顧,生病要救活</text>
    <rect x="40" y="144" width="210" height="34" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="145" y="165" fill="#9aa4b2" font-size="10.5" text-anchor="middle">獨一無二,沒人敢動</text>
    <rect x="310" y="44" width="210" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="415" y="65" fill="#e6e6e6" font-size="10.5" text-anchor="middle">只有編號:web-047</text>
    <rect x="310" y="94" width="210" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="415" y="115" fill="#e6e6e6" font-size="10.5" text-anchor="middle">從定義檔生出來,長一樣</text>
    <rect x="310" y="144" width="210" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="415" y="165" fill="#e6e6e6" font-size="10.5" text-anchor="middle">出問題直接汰換重建</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">分辨方法很簡單:一台機器如果有「個性」——特別的名字、特別的歷史、特別的照顧方式——它就是寵物,也就是風險</figcaption>
</figure>

判斷標準可以更狠一點:**如果某台機器消失會讓你心痛,它就是寵物。** 心痛的原因不是硬體多貴,是它身上累積了重建不回來的狀態——而那正是[[iac-intro|上一篇]]講的雪花與飄移的棲息地。可拋棄性不只服務故障恢復,也服務規模伸縮(縮容就是拋棄機器)和變更(升級就是換一批新的,而不是在舊的身上動手術)。

## 反思

### 「先恢復、再究因」是可拋棄性送你的禮物

寵物時代的 on-call,恢復時間取決於「多快找到病因」——SSH 進去、翻 log、試各種方法把它救活,壓力全在凌晨三點的腦袋上。可拋棄之後,恢復時間取決於「重建多快」,這兩者常常差一個數量級。這跟 [[sre-incident-response|SRE 事故處理]]的「先止血、再查根因」是同一個心法,但前提是基礎設施先給你這個選項:pod 砍掉重來、機器換新的上,壞的那台留著慢慢驗屍。我現在看一個團隊的維運成熟度,第一個看的就是這個:出事時他們的直覺是「修這台」還是「換一台」——直覺還在「修」,通常代表他們心裡清楚重建是不可靠的。

### 可重現要靠演習維持,不能靠信仰

「我們的機器都能從 playbook 重建」——這句話如果超過三個月沒驗證過,它就只是信仰。組態飄移不會通知你,它安靜地累積,直到你真的需要重建那天才攤牌,而那天通常是最糟的一天。所以我的立場是:**可重現性要當成肌肉練,定期真的把東西砍掉重建一次**——不敢做這個演習,本身就是最誠實的健康檢查結果。這也是打破[[iac-intro|恐懼螺旋]]的具體招式:與其猜自動化還跑不跑得動,不如讓「跑它」變成例行公事。

### 最小化變異是最難賣的原則,因為它擋人的興致

五個原則裡,技術上最簡單、政治上最難的就是最小化變異。工程師天然喜歡新工具——多一種資料庫、多一個語言、多一套部署方式,每一個提案單看都有道理。但維運成本是乘法:種類多一倍,要維護的路徑、要寫的自動化、要踩的坑就多一倍以上。我自己的做法是把「引進新種類」當成一個要付費的決策——**誰引進、誰負責把它納入自動化、監控、備份、值班手冊,一路養到退役**。這個規則一立,九成的「我們要不要試試 X」會自己消失;留下來的那一成,才是真的值得付維運稅的。
