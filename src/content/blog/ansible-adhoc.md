---
title: "Ansible ad-hoc:一行指令,管一群機器"
date: 2026-08-04
category: tech
description: "學 infra 的第一步不是背指令,是先給自己一個敢玩壞的實驗場——Vagrant 把機器變成一個檔案,砍掉重練只要一行。然後 ad-hoc 指令讓你體會 Ansible 的第一口甜頭:同一行指令平行打向一群機器,模組還幫你保住冪等。膠帶好用,但同一條指令打第三次,就該寫進 playbook 了。"
tags:
  - ansible
  - devops
  - automation
series: "Ansible for DevOps 讀書筆記"
seriesOrder: 2
comments: true
draft: false
---
[[ansible-intro|上一篇]]說 Ansible 第一天就能用——這篇就是「第一天」的實際內容。書的第二、三章其實在回答兩個很務實的問題:**我要在哪裡練習?**(答案:一個可以隨時砍掉重練的本機實驗場)以及**還沒學 playbook 之前,Ansible 能幫我什麼?**(答案:ad-hoc 指令,一行管一群機器)。

## 先給自己一個敢玩壞的實驗場

直接在公司機器上學組態管理,等於在馬路上學開車。書用 Vagrant 解這件事:一個 `Vagrantfile` 描述你要的虛擬機,`vagrant up` 生出來、`vagrant destroy` 砍掉——**機器變成一個檔案**,這本身就是 Infrastructure as Code 的第一課。

```ruby
Vagrant.configure("2") do |config|
  config.vm.box = "geerlingguy/rockylinux8"
  config.vm.network :private_network, ip: "192.168.60.4"
  config.vm.provision "ansible" do |ansible|
    ansible.playbook = "playbook.yml"
  end
end
```

最後那段 `provision` 是 Vagrant 跟 Ansible 的接點:VM 開起來後自動跑一份 playbook,把機器帶到你要的狀態。於是學習的循環變成:**up → 亂玩 → 玩壞 → destroy → up**,每次重來都是乾淨的起點,犯錯完全免費。工具本身不是重點——今天你用 Docker 容器、Multipass 或雲端免費層都行,重點是那個「玩壞了就重開」的底氣。

## 一行指令,平行打向一群機器

書的範例場景是三台機器:兩台 app、一台 db。inventory 用群組把它們組織起來:

```ini
[app]
192.168.60.4
192.168.60.5

[db]
192.168.60.6

[multi:children]
app
db

[multi:vars]
ansible_user=vagrant
```

然後就是 Ansible 的第一口甜頭:

```bash
ansible multi -a "hostname"       # 三台一起回答
ansible multi -a "df -h"          # 一次看所有機器的磁碟
ansible multi -a "free -h"        # 一次看所有機器的記憶體
ansible db -m ping                # 只確認 db 群組連得上
```

第一次執行 `ansible multi -a "hostname"` 有個小驚喜:**回傳順序每次都不一樣**——因為 Ansible 預設開 5 個平行連線(forks)同時打,誰先回來誰先印。`-f 1` 可以退回逐台執行,`-f 20` 可以加大火力。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 252" role="img" aria-label="兩種管一群機器的方式對比:左邊是傳統逐台 SSH,開三個 terminal 依序登入 app1、app2、db,時間是三段相加;右邊是 Ansible ad-hoc,一行指令經過 inventory 的 multi 群組展開,平行 SSH 到三台機器同時執行,時間只有一段,預設 5 個 forks 可以用 -f 調整" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ah1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="ah2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#4f6df5"/></marker></defs>
    <line x1="290" y1="20" x2="290" y2="236" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="146" y="32" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">逐台 SSH</text>
    <text x="146" y="48" fill="#9aa4b2" font-size="9" text-anchor="middle">登入 → 打指令 → 登出,重複三次</text>
    <rect x="96" y="60" width="100" height="30" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="146" y="79" fill="#9aa4b2" font-size="9.5" text-anchor="middle">terminal</text>
    <rect x="36" y="120" width="64" height="28" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="68" y="138" fill="#9aa4b2" font-size="9" text-anchor="middle">app1</text>
    <rect x="114" y="120" width="64" height="28" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="146" y="138" fill="#9aa4b2" font-size="9" text-anchor="middle">app2</text>
    <rect x="192" y="120" width="64" height="28" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="224" y="138" fill="#9aa4b2" font-size="9" text-anchor="middle">db</text>
    <line x1="120" y1="92" x2="76" y2="118" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ah1)"/>
    <line x1="146" y1="92" x2="146" y2="118" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ah1)"/>
    <line x1="172" y1="92" x2="216" y2="118" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ah1)"/>
    <text x="68" y="164" fill="#d6a45c" font-size="8.5" text-anchor="middle">t1</text>
    <text x="146" y="164" fill="#d6a45c" font-size="8.5" text-anchor="middle">t2</text>
    <text x="224" y="164" fill="#d6a45c" font-size="8.5" text-anchor="middle">t3</text>
    <text x="146" y="192" fill="#9aa4b2" font-size="8.7" text-anchor="middle">總時間 = t1 + t2 + t3,而且手會抖</text>
    <text x="146" y="208" fill="#9aa4b2" font-size="8.7" text-anchor="middle">10 台就是 10 次複製貼上</text>
    <text x="434" y="32" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Ansible ad-hoc</text>
    <text x="434" y="48" fill="#9aa4b2" font-size="9" text-anchor="middle">ansible multi -a "hostname"</text>
    <rect x="384" y="60" width="100" height="30" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="434" y="79" fill="#4f6df5" font-size="9.5" text-anchor="middle">一行指令</text>
    <rect x="374" y="102" width="120" height="26" rx="6" fill="#1f2330" stroke="#d6a45c" stroke-width="1.3"/>
    <text x="434" y="119" fill="#d6a45c" font-size="8.5" text-anchor="middle">inventory:[multi] 展開</text>
    <rect x="324" y="164" width="64" height="28" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="356" y="182" fill="#9aa4b2" font-size="9" text-anchor="middle">app1</text>
    <rect x="402" y="164" width="64" height="28" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="434" y="182" fill="#9aa4b2" font-size="9" text-anchor="middle">app2</text>
    <rect x="480" y="164" width="64" height="28" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.2"/>
    <text x="512" y="182" fill="#9aa4b2" font-size="9" text-anchor="middle">db</text>
    <line x1="410" y1="130" x2="362" y2="162" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#ah2)"/>
    <line x1="434" y1="130" x2="434" y2="162" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#ah2)"/>
    <line x1="458" y1="130" x2="506" y2="162" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#ah2)"/>
    <text x="356" y="210" fill="#54b890" font-size="8.5" text-anchor="middle">t1</text>
    <text x="434" y="210" fill="#54b890" font-size="8.5" text-anchor="middle">t1</text>
    <text x="512" y="210" fill="#54b890" font-size="8.5" text-anchor="middle">t1</text>
    <text x="434" y="230" fill="#9aa4b2" font-size="8.7" text-anchor="middle">平行執行,總時間 ≈ 最慢那台;預設 5 forks,-f 調整</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同一件事、兩種成本:逐台 SSH 的時間隨機器數線性長,還要靠手不抖;ad-hoc 靠 inventory 群組展開 + 平行連線,10 台和 3 台一樣是一行</figcaption>
</figure>

## 模組讓 ad-hoc 不只是「群發 shell 指令」

`-a "..."` 預設走 `command` 模組,適合查詢;但 ad-hoc 真正的威力是可以直接掛上任何模組——上一篇講的**冪等**在這裡就用得上:

```bash
ansible multi -b -m package -a "name=chrony state=present"            # 裝套件
ansible multi -b -m service -a "name=chronyd state=started enabled=yes"
ansible app  -b -m user   -a "name=deploy groups=wheel"               # 建帳號
ansible db   -m fetch     -a "src=/etc/my.cnf dest=backups/"          # 抓檔案回來
```

同一行重打一次,回報從 `changed` 變成 `ok`——**用群發 shell 做這些事就沒這個保障**(`useradd` 打第二次直接報錯)。幾個日常會一直用到的開關:

- `-b`(become):用 sudo 執行,需要 root 的操作都要帶。
- `--limit "192.168.60.4"`:群組裡只打特定機器——出事只修一台的時候救命。
- `--check`:dry run,先看會改什麼、不真的動手。
- `-B 3600 -P 0`(async):長時間操作丟到背景跑,不佔著你的 terminal。

## 膠帶什麼時候該變成制度

書對 ad-hoc 的定位很誠實:它是**膠帶**——快、直接、應急神器;但膠帶貼多了,系統就變回沒人知道發生過什麼的雪花機器。判斷的線其實很清楚:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 200" role="img" aria-label="ad-hoc 與 playbook 的分界:左邊 ad-hoc 適合查狀態、一次性急救、實驗試手感;右邊 playbook 適合會重複發生、多步驟有順序、需要留下紀錄給人 review 的工作。分界線是:同一件事第二次出現,就該寫進 playbook" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="up1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#d6a45c"/></marker></defs>
    <rect x="24" y="40" width="240" height="112" rx="10" fill="#262b3a" stroke="#4f6df5" stroke-width="1.6"/>
    <text x="144" y="64" fill="#4f6df5" font-size="11.5" text-anchor="middle" font-weight="bold">ad-hoc(膠帶)</text>
    <text x="144" y="88" fill="#e6e6e6" font-size="9.5" text-anchor="middle">查狀態:df、free、log</text>
    <text x="144" y="108" fill="#e6e6e6" font-size="9.5" text-anchor="middle">一次性急救:重啟服務、清空間</text>
    <text x="144" y="128" fill="#e6e6e6" font-size="9.5" text-anchor="middle">實驗:先試手感再定案</text>
    <rect x="296" y="40" width="240" height="112" rx="10" fill="#262b3a" stroke="#54b890" stroke-width="1.6"/>
    <text x="416" y="64" fill="#54b890" font-size="11.5" text-anchor="middle" font-weight="bold">playbook(制度)</text>
    <text x="416" y="88" fill="#e6e6e6" font-size="9.5" text-anchor="middle">會再發生:第二次就寫下來</text>
    <text x="416" y="108" fill="#e6e6e6" font-size="9.5" text-anchor="middle">多步驟、有順序、有相依</text>
    <text x="416" y="128" fill="#e6e6e6" font-size="9.5" text-anchor="middle">要留紀錄、要給人 review</text>
    <line x1="264" y1="96" x2="292" y2="96" stroke="#d6a45c" stroke-width="1.6" marker-end="url(#up1)"/>
    <text x="280" y="176" fill="#d6a45c" font-size="9.5" text-anchor="middle" font-weight="bold">分界線:同一件事「第二次」出現</text>
    <text x="280" y="192" fill="#9aa4b2" font-size="8.5" text-anchor="middle">升級沒有重寫成本——ad-hoc 用的模組和參數,原封不動搬進 playbook</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">膠帶與制度的分工:查詢、急救、實驗留給 ad-hoc;會重複、多步驟、要 review 的進 playbook。妙的是兩邊用同一套模組——膠帶隨時可以無痛轉正</figcaption>
</figure>

而 Ansible 設計得最聰明的地方是:**ad-hoc 和 playbook 用同一套模組**。你在 ad-hoc 試出來的 `-m package -a "name=chrony state=present"`,原封不動就是 playbook 裡的一個 task——膠帶轉正沒有重寫成本,下一篇就來做這件事。

## 反思

### 「敢玩壞」是學 infra 最大的槓桿

回頭看我自己學後端和 infra 的歷程,進步最快的時刻都不是讀文件,而是**有一個弄壞了也無所謂的環境**的時候——資料庫參數敢亂調、服務敢直接 kill 掉看會發生什麼事。反過來,共用的 staging 環境我永遠綁手綁腳,因為弄壞了要跟整個團隊道歉。這也是我現在帶新人的原則:與其給一疊文件,不如給一個 `vagrant destroy` 就能重來的沙盒——**心理安全感不只來自團隊文化,也來自環境設計**。敢試,學習迴路才會轉起來。

### 膠帶的紀律,靠的是升級路徑平滑,不是靠克制

「應急指令用完要沉澱成正式流程」這種紀律,我看過太多團隊立了規矩卻做不到——因為沉澱的成本太高:急救用 shell 貼的指令,要轉成正式工具得整個重寫,大家自然選擇算了。Ansible 讓我欣賞的是它把這個摩擦力做到趨近於零:ad-hoc 跟 playbook 是同一套詞彙,膠帶轉正只是換個檔案格式。同一條指令打到第三次還在用膠帶,那就是標準的 [[sre-toil|toil]]。我的結論是:**想要團隊有紀律,先把「守紀律的成本」降到比「不守」還低——人性靠設計,不靠意志力。**

---

> **實驗場給你敢犯錯的自由,ad-hoc 給你第一天的價值——但同一件事的第二次,就是它該被寫下來的時候。**
