---
title: "責任的保費:AI 不收,也不賠"
date: 2026-08-13
category: tech
tags:
  - ai
  - leadership
series: "帶 AI 的手藝(2026)"
seriesOrder: 4
---
## 前言

這篇的起點是一個樸素到近乎廢話的觀察:**僱一個員工,他會負責,所以責任不(全)在你身上;用一個 AI,責任百分之百在你身上。**[[responsibility-funnel|第一篇]]把它叫做分流與全反射。但往下多想一步,它會裂開成一個更大的問題——**雇用,到底買了什麼?**

這篇的答案:買了兩樣東西。一半是勞動力,另一半平常隱形、出事才現形——**責任分擔**。而理解了這一半,你就會用完全不同的眼光看「Your next 10 hires won't be human」這句話。

## 薪水裡的保費

「責任費」不是修辭,它在市場上有實價,而且到處都是:

- **簽證費是純責任費。**會計師的查帳簽證、建築師與技師的結構簽證——計算可以是助理做的,簽證費買的是那個簽名:**出事時,執照掛在這裡**。市場為「純粹的承擔」開出了明碼標價。
- **On-call 津貼是責任費的裸價。**輪值那週你多做的勞動可能是零——沒事故就沒事。組織付的是「出事時是你」的待命承擔,跟勞動量完全脫鉤。
- **主管加給大部分是責任費。**主管的邊際勞動產出常常很低(會越開越多,code 越寫越少),組織加的錢買的是:這個團隊出的任何事,有一個名字先接住。

把這些攤開,薪資的結構就現形了:**薪水 = 勞動費 + 責任費**。過去二十年我們只討論前者(產能、效率、10x 工程師),因為後者太理所當然——每個領薪水的人天然附帶承保功能,沒人想過要單獨定價。直到 AI 出現:**它只賣勞動,不賣承保**,這兩樣東西第一次被拆開來,我們才看見第二項的價格。

## 組織是一張再保險網

有了保險的語言,組織圖可以重新讀一遍:它不(只)是指揮鏈,是**再保險網**——每一層承保自己的額度,超額的往上送。

這張網長什麼樣,我用前一份工作的真實地圖說明(就是 [[rezero-overview|直播電商系列]]那個戰場):**選標系統整個是另一位同仁負責的**——那塊出事,他處理、他被問、他改進,我可以整年不知道它怎麼運作;**前端有前端的同仁**;**需求與範圍是 PM 承保的**——需求理解錯了,那是他的理賠範圍;而**對外溝通是 CTO 的**——包括 [[rezero-flash-crowd|毒藥訊息事故]]那次:我們在裡面修 parser,**CTO 在外面面對主播和客戶,扛下整場事故的臉**。同一場事故,技術的理賠在工程師這層自留,商譽的理賠往上送到 CTO——**分層自留,超額再保**,教科書等級的保險結構,只是當年身在其中覺得理所當然。

這個框架還順手解開一個舊疙瘩:SRE 的 blameless postmortem 跟「有人要負責」怎麼相容?用保險語言一句話:**blameless 是無過失保險**——不追究個人過失(歸因給系統),但理賠照常發生(改進項有人認領、[[sre-postmortem|action item]] 有人執行)。取消的是究責,不是承保。

要說精確的話,還得補一筆:「僱了人所以責任不在我身上」是**分層**,不是**消失**——你對你的上級,仍然承保著整個團隊的總和。真正的差別在下一節。

## 合約稽核:法律怎麼寫這兩種交易

實例時間。這次稽核的對象是合約——人類接案的合約,和 AI 工具的服務條款(稽核日 2026-08-13;原本想多查幾家,受網路環境限制,本篇僅引用能逐字查證的 GitHub——好在它是最大的 AI coding 廠商,條款模式在業界也有代表性)。

**找人類外包,責任是法律預設。**台灣民法承攬那一章(第 492 條起)寫得清楚:承攬人對完成的工作負**瑕疵擔保責任**——工作有瑕疵,定作人可以要求修補、減少報酬、解除契約、請求賠償。注意:這是**預設值**,合約沒寫也適用。你付錢給一個人,法律自動把一張保單綁在交易上。

**找 AI,條款明文把責任全數綁回你身上。**GitHub Copilot 的產品條款(2024-10 版)白紙黑字:

> You retain all responsibility for Your Code, **including Suggestions you include in Your Code** or reference to develop Your Code.

更有意思的是演化。2026 年 3 月,GitHub 把 AI 產品條款換成新版《Generative AI Services Terms》,那句話升級成:

> you are **solely responsible for any application or agent you create** using (or for use with) Generative AI Services…

看到差別了嗎?2024 年你要負責的是「你採用的建議」,2026 年是「你創造的整個應用或 agent」。**產品越 agent 化、越自主,合約上你的責任反而綁得越全面**——廠商比誰都清楚責任守恆,而且用法務語言把它寫成了鐵律。

賠償呢?GitHub 通用條款(2025-03 版)的責任上限:「**不超過事故前 12 個月你為該產品支付的金額**」。算一下:月付 20 美金的訂閱,你的 AI「同事」捅出一場 production 事故,廠商的理賠天花板是 **240 美金**。這不是 GitHub 特別壞——這是全行業的標準條款。翻譯成保險語言:**你僱了一個不繳保費的員工,而它的雇主明文告訴你保額是一杯手搖飲的年費。**

這裡要誠實切開兩層:廠商並非什麼都不賠——例如有些提供版權侵權的 indemnification。但那是**財務責任(liability)**,可以用資產負債表轉移;**問責性(accountability)**——誰改進、誰道歉、誰的職涯掛在上面——一分都轉移不了。賠錢可以外包,擔當不行。

## AI 為什麼不能承保:三個條件,它一個都沒有

把「能承保責任」拆開,需要三樣東西,缺一不可:

1. **Skin in the game**(Taleb 的老話):承保人要有東西可輸——職涯、執照、獎金、名聲。AI 沒有任何可以被扣的東西,「懲罰一個模型」這句話沒有語義。
2. **持續身分**:信任額度要累積在一個穩定的主體上。人的承保額度靠年資與紀錄成長;模型會換版本、session 會蒸發,你無法對一個下週就升級的東西累積信任。
3. **社會承認**:事故後的 closure 需要一個能站出來的主體——道歉要有臉,承諾要有名字。「模型深感抱歉」不成立,主播不會接受,客戶不會接受,法院更不會。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 640 320" role="img" aria-label="兩種組織的責任結構對照。左邊帶人的組織是再保險網:底層三位同仁各自承保自己的領域(選標、前端、後端),往上 PM 承保需求與範圍,再往上 CTO 承保對外溝通,事故的責任分層自留、超額往上送。右邊一人加 agent fleet 是垂直瀑布:四個 agent 的所有責任以紅色箭頭全數反射回頂端唯一的人,中間沒有任何一層吸收,責任密度數倍於帶人的組織。" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <text x="165" y="26" fill="#e6e6e6" font-size="13" text-anchor="middle" font-weight="bold">帶人的組織:再保險網</text>
    <rect x="95" y="44" width="140" height="44" rx="8" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="165" y="62" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">CTO:對外承保</text>
    <text x="165" y="79" fill="#9aa4b2" font-size="9" text-anchor="middle">事故的臉、商譽的理賠</text>
    <rect x="95" y="116" width="140" height="44" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="165" y="134" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">PM:需求承保</text>
    <text x="165" y="151" fill="#9aa4b2" font-size="9" text-anchor="middle">範圍錯了算他的理賠</text>
    <rect x="20" y="192" width="90" height="46" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="65" y="211" fill="#e6e6e6" font-size="10" text-anchor="middle">同仁:選標</text>
    <text x="65" y="227" fill="#9aa4b2" font-size="9" text-anchor="middle">整塊自留</text>
    <rect x="120" y="192" width="90" height="46" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="165" y="211" fill="#e6e6e6" font-size="10" text-anchor="middle">同仁:前端</text>
    <text x="165" y="227" fill="#9aa4b2" font-size="9" text-anchor="middle">整塊自留</text>
    <rect x="220" y="192" width="90" height="46" rx="8" fill="#262b3a" stroke="#3a4154"/>
    <text x="265" y="211" fill="#e6e6e6" font-size="10" text-anchor="middle">我:後端</text>
    <text x="265" y="227" fill="#9aa4b2" font-size="9" text-anchor="middle">毒藥的 parser</text>
    <line x1="65" y1="192" x2="140" y2="160" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="165" y1="192" x2="165" y2="160" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="265" y1="192" x2="190" y2="160" stroke="#9aa4b2" stroke-width="1.2"/>
    <line x1="165" y1="116" x2="165" y2="88" stroke="#9aa4b2" stroke-width="1.2"/>
    <text x="165" y="264" fill="#9aa4b2" font-size="10" text-anchor="middle">分層自留,超額往上送——</text>
    <text x="165" y="280" fill="#9aa4b2" font-size="10" text-anchor="middle">沒有人獨自面對全部</text>
    <line x1="330" y1="36" x2="330" y2="290" stroke="#3a4154" stroke-width="1"/>
    <text x="490" y="26" fill="#e6e6e6" font-size="13" text-anchor="middle" font-weight="bold">一人 + agent fleet:垂直瀑布</text>
    <rect x="420" y="44" width="140" height="44" rx="8" fill="#223528" stroke="#54b890" stroke-width="2"/>
    <text x="490" y="62" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">一個人</text>
    <text x="490" y="79" fill="#9aa4b2" font-size="9" text-anchor="middle">全部保單的唯一承保人</text>
    <rect x="355" y="192" width="60" height="46" rx="8" fill="#262b3a" stroke="#4f6df5"/>
    <text x="385" y="219" fill="#4f6df5" font-size="10" text-anchor="middle">agent</text>
    <rect x="425" y="192" width="60" height="46" rx="8" fill="#262b3a" stroke="#4f6df5"/>
    <text x="455" y="219" fill="#4f6df5" font-size="10" text-anchor="middle">agent</text>
    <rect x="495" y="192" width="60" height="46" rx="8" fill="#262b3a" stroke="#4f6df5"/>
    <text x="525" y="219" fill="#4f6df5" font-size="10" text-anchor="middle">agent</text>
    <rect x="565" y="192" width="55" height="46" rx="8" fill="#262b3a" stroke="#4f6df5"/>
    <text x="592" y="219" fill="#4f6df5" font-size="10" text-anchor="middle">agent</text>
    <path d="M 385 192 C 400 130 440 100 470 88" fill="none" stroke="#e05a7d" stroke-width="1.5"/>
    <path d="M 455 192 C 465 140 475 110 483 88" fill="none" stroke="#e05a7d" stroke-width="1.5"/>
    <path d="M 525 192 C 515 140 505 110 497 88" fill="none" stroke="#e05a7d" stroke-width="1.5"/>
    <path d="M 592 192 C 580 130 540 100 510 88" fill="none" stroke="#e05a7d" stroke-width="1.5"/>
    <text x="490" y="264" fill="#e05a7d" font-size="10" text-anchor="middle">責任 100% 全反射,中間無人吸收——</text>
    <text x="490" y="280" fill="#e05a7d" font-size="10" text-anchor="middle">產出像一隊,承保只有一人</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同樣的產能,兩種責任結構。左邊的每個箭頭都有一層吸收;右邊的每個箭頭都直達同一個人。</figcaption>
</figure>

所以「兩個工程師加一隊 agent,可以像二十個人一樣移動」(agent 工具圈的共同願景)有一個隱形上限:**產出像二十人,承保能力還是兩人**。平常看不出來,事故一來就現形——這是 Amdahl 定律的組織版,不可平行化的那段叫承保。一人加十個 agent 的團隊,產能是十倍,**責任密度也是十倍**,而後者沒有出現在任何一張效率簡報上。很多人帶 AI 產線的隱性疲勞,我認為源頭在這:不是工時,是**無處分流的責任**。

## 黑暗版:職業蓋章人

這個論述有一個必須標注的懸崖。當「人類承保」變成稀缺資源、而法規開始要求 AI 系統有 human oversight,市場會發明一種新職位:**職業蓋章人**——存在的目的就是讓稽核報告上有個人名,有 accountable 之名,無判斷之權。這是[[ai-responsibility-design|上一篇]]假頸的制度化、背鍋的合法化,而且它會優先吃掉議價能力最弱的人。

分界線只有一條,值得寫成鐵律:**責任必須跟著判斷權走**。給一個人 A,就要給他說不的權力、給他頸寬對應的資源;責任沒有配判斷權,那不是授權,是預購替罪羊。反過來檢驗自己的組織也一樣:如果有人替 AI 產線承保,他有沒有權力對 AI 的產出喊停?沒有的話,你養的不是承保人,是保險詐欺。

## 反思

### 離開之後,才看懂那張網

前職那張承保地圖——選標的同仁、前端的同仁、管需求的 PM、對外的 CTO——在職的時候,我只覺得那是「分工」。寫這個系列寫到第四篇才看懂:那是一張**保險網**,而且我當年受的保護比我以為的多得多。毒藥訊息那晚,我以為壓力都在工程這邊;現在回想,真正高壓的位置在外面——CTO 對著暴怒的主播承保整場事故的時候,我們在裡面「只」需要修好一個 parser。**你要離開一張網,才會看見它一直在接住你。**而一人帶著 agent fleet 工作的人,從第一天起就沒有這張網——這件事應該被明說,而不是被「效率」蓋過去。

### EM 的工作說明書,悄悄改版了

帶人的年代,管理的核心是安排產出:誰做什麼、何時交付。帶 AI 的年代,產出的安排越來越自動,**管理的核心遷移到安排責任**:這個 agent fleet 掛在誰名下?他的承保額度夠嗎?額度是隨信任紀錄成長的,誰在幫 junior 累積他的第一張保單?[[responsibility-funnel|第一篇]]說 junior 要「先當小漏斗的頸」——用這篇的語言重講一次:**僱 junior 不是買他現在的產出(那 AI 便宜得多),是投資一個未來的承保人**。這筆帳,只看產能的組織算不出來,但出過一次大事故的組織都會算。

### 給一人隊的話:畫好你的自留額

最後說給跟我一樣晚上一人帶著 fleet 的人。保險學有個詞叫**自留額**——你自己吸收的損失上限。沒有再保網的一人隊,唯一的風控就是把自留額畫清楚:**只讓 AI 產線承擔你賠得起的東西**。我的畫法很土:部落格文章錯了,改掉、加一行更新紀錄,賠得起;[[travel-split|分帳工具]]壞了,朋友罵一頓,賠得起;要是有一天它要碰別人的錢或別人的資料,那就不是加測試的問題,是**這張保單超出我的承保能力**的問題。工具的能力會一直長,你的自留額不會自動跟著長——每次讓 fleet 接新東西之前,先問一句:這單,我保得起嗎?

系列前情:[[responsibility-funnel|#1 責任漏斗]] · [[ai-incident-clock|#2 頸上有時鐘]] · [[ai-responsibility-design|#3 看板上的頸]]
