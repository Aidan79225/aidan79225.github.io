---
title: "身分與帳號:留言的那個人,到底是誰"
date: 2026-07-26
category: tech
description: "直播代購最容易被低估的一章:下單的人可能根本沒有帳號。identity 與 account 分層、庫存卡給身分、ASID/PSID 的隱私牆、三層綁定漏斗,以及用家人帳號結帳的真實案例。"
tags:
  - war-story
  - live-commerce
  - identity
series: "Re:從零開始做直播代購電商平台"
seriesOrder: 4
comments: true
draft: false
---
[[rezero-comment-order|上一章]]的 FSM 解出了「誰買了什麼」——但那個「誰」,其實只是 FB 給的一串數字。他可能從來沒註冊過我們的平台,可能明天才會登入,可能永遠不會。而庫存**現在**就要卡給他。這章講[[rezero-overview|全景]]裡我說「全系列最容易被低估」的問題:**留言的那個人,到底是誰。**

## 先有單,才有帳號

一般電商的順序是:註冊 → 登入 → 下單。直播代購把它整個倒過來:**下單的當下,對方可能什麼都不是**——不是會員、沒裝 app、沒登入過。你只知道 FB 說有個 user id 留了 `2601+1`。

當年的解法,現在回看就是教科書的分層:**identity 與 account 是兩回事**。

- **identity(身分)是事實**:fb user、ig user、自建 user——平台說「這串 id 留了言」,這件事不需要任何人註冊就成立。FSM batch 命中 key 的當下,fb user 實體就地建立,單直接掛上去。
- **account(帳號)是聚合**:客人哪天登入了 app,account 才出現;它不擁有訂單,它**認領**訂單——把名下綁定的 identity 的單收進同一個視野。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 274" role="img" aria-label="identity 與 account 的分層模型。左側三個身分實體:fb user 帶 PSID、ig user、自建 user——身分是事實,留言當下就成立。右側是 account:帳號是聚合,登入後才出現,以一對多的綁定關係認領多個身分。左下角 cart item 佔庫存的購物車項目,掛在 fb user 身分上而非帳號上,中間經過 fbmsgtocartitem 關聯表,帶著 msg id 與 bidding key id 的溯源。account 到 cart item 之間是虛線的聚合視圖:認領即聚合,訂單不用搬家。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rif" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#4f6df5"/></marker><marker id="rig" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#54b890"/></marker></defs>
    <text x="103" y="22" fill="#9b6ff0" font-size="9" text-anchor="middle" font-weight="bold">identity:身分是事實</text>
    <rect x="28" y="32" width="150" height="36" rx="6" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.4"/>
    <text x="103" y="47" fill="#9b6ff0" font-size="8.4" text-anchor="middle" font-weight="bold">fb user(PSID)</text>
    <text x="103" y="60" fill="#9aa4b2" font-size="6.6" text-anchor="middle">留言當下就地建立</text>
    <rect x="28" y="78" width="150" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="103" y="97" fill="#e6e6e6" font-size="8" text-anchor="middle">ig user</text>
    <rect x="28" y="118" width="150" height="30" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1"/>
    <text x="103" y="137" fill="#e6e6e6" font-size="8" text-anchor="middle">自建 user</text>
    <text x="486" y="22" fill="#54b890" font-size="9" text-anchor="middle" font-weight="bold">account:帳號是聚合</text>
    <rect x="406" y="52" width="160" height="66" rx="8" fill="#233528" stroke="#54b890" stroke-width="1.6"/>
    <text x="486" y="76" fill="#54b890" font-size="9.4" text-anchor="middle" font-weight="bold">account</text>
    <text x="486" y="92" fill="#9aa4b2" font-size="6.8" text-anchor="middle">登入後才出現</text>
    <text x="486" y="105" fill="#9aa4b2" font-size="6.8" text-anchor="middle">認領 identity 的單,1:N</text>
    <line x1="178" y1="50" x2="404" y2="72" stroke="#54b890" stroke-width="1.2" marker-end="url(#rig)"/>
    <line x1="178" y1="93" x2="404" y2="86" stroke="#54b890" stroke-width="1.2" marker-end="url(#rig)"/>
    <line x1="178" y1="133" x2="404" y2="102" stroke="#54b890" stroke-width="1.2" marker-end="url(#rig)"/>
    <text x="290" y="60" fill="#54b890" font-size="6.8" text-anchor="middle">綁定(可多重)</text>
    <rect x="28" y="196" width="230" height="52" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.4"/>
    <text x="143" y="216" fill="#d6a45c" font-size="8.8" text-anchor="middle" font-weight="bold">cart item(佔庫存)</text>
    <text x="143" y="232" fill="#9aa4b2" font-size="6.8" text-anchor="middle">掛在 fb user 上,不是 account 上</text>
    <path d="M 28 62 C 4 95, 4 165, 26 210" fill="none" stroke="#4f6df5" stroke-width="1.3" marker-end="url(#rif)"/>
    <text x="66" y="172" fill="#4f6df5" font-size="6.6" text-anchor="middle">fbmsgtocartitem</text>
    <text x="66" y="183" fill="#9aa4b2" font-size="6.2" text-anchor="middle">msg id・bidding key id</text>
    <path d="M 486 118 Q 460 210 260 224" fill="none" stroke="#54b890" stroke-width="1.1" stroke-dasharray="4 3" marker-end="url(#rig)"/>
    <text x="420" y="196" fill="#9aa4b2" font-size="6.8" text-anchor="middle">聚合視圖:認領即收編,訂單不用搬家</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">身分是事實、帳號是聚合:訂單永遠掛在 identity 上,account 只是把綁定的身分收進同一個視野。</figcaption>
</figure>

這個分層的關鍵回報:**訂單從頭到尾不用搬家**。綁定、解綁、多綁一個身分,都只動關聯,不動單——所有跟錢和庫存有關的東西,永遠釘在它誕生時的事實上。

## 每個欄位都是 id:當年的資料模型

購物車那張表當年是這樣長的:

- **cart item 一張表,用 content type + object id(泛型外鍵)標記來源**。直播訊息來的單、平台上自己加的單,同一張表、同一套數量調整與結帳邏輯,只有「從哪來」不同。[[rezero-overview|全景]]提過的兩種購物車,資料模型的答案是:**一張表,來源多型**。
- 訊息下單另有一張關聯表 **fbmsgtocartitem:(fb_user_id, fb_msg_id, cart_item_id, bidding_key_id)**——每個欄位都是 id。這代表每筆單都能溯源:哪個人、哪則留言、哪場開賣。客訴「我明明留 +2 怎麼變 +1」,順著 msg id 還原現場;主播重喊清場,順著 bidding key id 一刀切乾淨。
- 眼尖的人會發現 `fb_user_id` 其實查 `fb_msg` 就有——放進關聯表是**刻意違反 3NF**:msg 表太大,而全系統最熱的查詢(LWW 覆蓋要找「此人此 key 的單」)不能穿過它。這是一次教科書等級的安全反正規化,因為拷貝的是**不可變的欄位**——訊息的作者永遠不會變,這份拷貝永遠不會歪。[[ddia-data-models|正規化]]的實戰判準就藏在這:**拷貝不可變的欄位,風險趨近零;拷貝會變的欄位,等於簽下終身同步的合約。**

## FB 不讓你知道他是誰:ASID 與 PSID

真正的大魔王在綁定這一步。FB 的隱私設計是:**同一個人,在不同表面有不同的 id**——留言與 Messenger 給的是 **PSID**(page-scoped id),客人用 FB 登入你的 app 拿到的是 **ASID**(app-scoped id),兩者**無法互推**。這不是 bug,是 FB 立的牆:它不想讓你把「粉專的留言者」和「你 app 的會員」隨意串起來。官方留的窄門是 Business Mapping API(`ids_for_pages` / `ids_for_apps`),要求 app 和粉專掛在同一個 Business Manager、通過商業驗證——而且覆蓋率永遠不是 100%。

所以綁定做成了一個漏斗,一層收一批:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 232" role="img" aria-label="三層綁定漏斗。最上層:所有留言下單的 fb user,百分之百。第一層:客人登入 app 時自動嘗試 ASID 對 PSID 的 mapping,大部分在這層綁上。第二層:private reply 私訊得標通知、附一次性 token 連結,客人點進登入即完成綁定——通知本身就是綁定機會,再收一批。第三層:剩下約百分之一由客服人工處理,支援多重綁定。最後殘量趨近零。" style="width:100%;max-width:620px;height:auto;margin:0 auto;">
    <defs><marker id="rfn" markerWidth="7" markerHeight="7" refX="5" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="60" y="16" width="460" height="30" rx="6" fill="#26324a" stroke="#4f6df5" stroke-width="1.4"/>
    <text x="290" y="35" fill="#4f6df5" font-size="8.8" text-anchor="middle" font-weight="bold">所有留言下單的 fb user(100%)</text>
    <line x1="290" y1="46" x2="290" y2="60" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rfn)"/>
    <rect x="100" y="64" width="380" height="34" rx="6" fill="#262b3a" stroke="#9aa4b2" stroke-width="1.1"/>
    <text x="290" y="78" fill="#e6e6e6" font-size="8.2" text-anchor="middle" font-weight="bold">第一層:登入 app → 自動嘗試 ASID↔PSID mapping</text>
    <text x="290" y="92" fill="#9aa4b2" font-size="6.8" text-anchor="middle">Business Mapping API・大部分在這層綁上</text>
    <line x1="290" y1="98" x2="290" y2="112" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rfn)"/>
    <rect x="140" y="116" width="300" height="34" rx="6" fill="#2a2440" stroke="#9b6ff0" stroke-width="1.2"/>
    <text x="290" y="130" fill="#9b6ff0" font-size="8.2" text-anchor="middle" font-weight="bold">第二層:private reply 得標通知 + 一次性 token</text>
    <text x="290" y="144" fill="#9aa4b2" font-size="6.8" text-anchor="middle">通知本身就是綁定機會・點連結登入即綁定</text>
    <line x1="290" y1="150" x2="290" y2="164" stroke="#9aa4b2" stroke-width="1.1" marker-end="url(#rfn)"/>
    <rect x="185" y="168" width="210" height="34" rx="6" fill="#2e2a20" stroke="#d6a45c" stroke-width="1.2"/>
    <text x="290" y="182" fill="#d6a45c" font-size="8.2" text-anchor="middle" font-weight="bold">第三層:客服人工(~1%)</text>
    <text x="290" y="196" fill="#9aa4b2" font-size="6.8" text-anchor="middle">支援多重綁定・處理疑難雜症</text>
    <text x="290" y="222" fill="#54b890" font-size="7.8" text-anchor="middle" font-weight="bold">殘量趨近 0——但永遠不是 0</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">綁定漏斗:自動 mapping 收大宗、得標通知的 token 再收一批、客服人工收尾。</figcaption>
</figure>

第二層值得特別停一下。得標通知本來就要發(private reply 私訊客人「你買到了」),在通知裡附一條帶一次性 token 的連結,客人點進去登入的那一刻,你同時握有 PSID(私訊通道)和 ASID(登入)——**綁定是確定性的,不用猜**。把「配對問題」轉化成「流程問題」,跟上一章把「下單意圖判斷」轉化成 DB lookup 是同一招:**難題不硬解,把它變成另一個好解的問題。** 每一筆成交都在自動收斂未綁定的尾巴,剩下的才輪到人工。

## 綁定的現實:家人的帳號

一個真實案例:有位客人用**自己的 FB** 喊單,結帳時用電腦登入的卻一直是**家人的帳號**。單掛在他的 fb user 上,帳號卻是另一個人的——最後靠客服做**多重綁定**收場:把兩個身分都掛到同一個 account 下,單就全齊了。

這個案例是 identity 模型最好的證詞:

- **identity ≠ person。** 一個人會頂著多個身分出現:自己的 FB、家人的帳號、換了平台的新 id。系統裡沒有「人」這個實體,只有身分和聚合。
- **account 對 identity 必須是 1:N,而且 N 會成長。** 多重綁定不是 workaround,是模型本來就該長這樣。
- 最妙的是:**「帳號合併」這個惡名昭彰的難題,被 1:N 模型整個繞開了。** 兩個身分各自累積了訂單、後來發現是同一人——傳統做法要把兩個 account 合併,那是一次不可逆的資料遷移,衝突處理跟[[ddia-replication|多主複寫的衝突解決]]一樣讓人頭皮發麻。而在「訂單掛 identity、account 只聚合」的模型裡,答案是**多綁一條關聯**,一行 insert,隨時可撤。合併是搬家,聚合是加名牌——能用加名牌解決的,永遠不要搬家。

當然,綁定就是授權——把一個身分掛進 account,等於把那個身分名下的單交給這個帳號。綁錯人,就是把別人的訂單搬走。這條風險線留給風控那章。

## 重來,身分層會怎麼改

老實說,這章的當年設計我幾乎全數保留:分層是對的、訂單掛身分是對的、漏斗是對的、1:N 是對的。重來只補三件事:

1. **把 identity 正名成一層。** 當年 fb user 是具體的表,IG 的對應問題由別的同仁處理、自建又是另一套——重來會先立一個統一的 identity 介面(source + external id + 各源 metadata),fb/ig/自建都是它的實例。命名這件事看似務虛,實際上決定了下一個平台接進來時,是「加一種 identity」還是「再蓋一套」。
2. **綁定關聯要帶出身:`bound_via`(auto / token / manual)、時間、操作者。** 客服人工綁定尤其要留 audit——綁定就是授權,人工通道是最容易出錯也最難追責的一條。這同時是權限章和風控章的接點。
3. **把漏斗做成儀表板。** 每一層的綁定率是產品指標,不是工程內幕:自動層掉了是 API 出問題、token 層掉了是通知沒送到、人工層積壓是客服要加人。殘量進工單系統排隊,而不是散在客服的訊息裡。1% 的人工不是設計失敗,是漏斗的自然殘留——但它必須**可見、可排隊、可追蹤**。

## 反思

### 系統裡沒有「人」,只有身分

這章最深的一課,是承認**「人」不是一個 id**。設計者最自然的傲慢,是假設一人一帳號、帳號即本人——然後現實給你看:用家人帳號結帳的客人、一人三個 FB 的客人、永遠不註冊但月月下單的客人。當年的模型能撐住,是因為它從第一天就沒有假裝認識「人」:它只記錄「哪個身分做了什麼」,把「這些身分是不是同一個人」留給綁定去表達,而且允許答案隨時追加。**謙遜的資料模型,比聰明的資料模型活得久。**

### 平台的牆,決定你的下限;流程設計,決定你的上限

ASID/PSID 那堵牆我們翻不過去——FB 不給的配對,拿不到就是拿不到。但「得標通知附 token」讓大多數的綁定根本不需要那堵牆開門:使用者自己走過來,把兩個身分接在一起。做跨平台產品久了會明白:**你的身分模型的下限,由平台願意給你什麼決定;上限,由你的流程替使用者鋪了什麼路決定。** 抱怨 API 限制沒有生產力,把每個必經的觸點(通知、結帳、客服)都變成綁定機會,才有。

### 那 1% 的人工,值得被當成正式功能對待

漏斗收不乾淨的殘量,最後是客服一筆一筆人工綁掉的——包括家人帳號那種機器永遠猜不對的案子。這裡要幫當年記上一筆做對的事:**我們的客服工具是當正式功能做的,而且好用**。這個團隊的起源,本來就是老闆受夠了難用的第三方工具、決定自己做一套更好的;團隊裡不少 Grindr 出身的工程師,工程品質之外極度在意 UX——內部工具從第一天就是一級公民,多重綁定、調整購物車都有順手的介面。所以客服的累,累在案件本身難(家人帳號要不要綁,是判斷題,不是操作題),而不是工具在扯後腿。這件事影響了我後來的判斷:多數公司把內部工具當次等公民、「能動就好」,但**客服的操作效率就是客訴的回應速度,內部工具的 UX 是外部體驗的一部分**。工程師的本能是把 1% 自動化成 0.1%,但永遠會有系統接不住的最後一哩,預先為「由人來做」設計好介面,是成熟系統的標誌——這也是我後來帶 SRE 團隊時反覆講的:自動化的終點不是取代人,是讓人只處理值得人處理的事。
