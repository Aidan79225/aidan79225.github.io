---
title: "Ansible 是什麼?從告別雪花伺服器講起"
date: 2026-08-04
category: tech
description: "組態管理工具一狗票,Ansible 憑什麼流行?第一章給的答案是兩個設計決定:Agentless——只靠 SSH,不用先在每台機器裝 agent、不用養 master;加上冪等——playbook 描述的是終點狀態,重複執行也安全。維運知識從此從某個人的腦袋,搬進一份跑得動的 YAML。"
tags:
  - ansible
  - devops
  - automation
series: "Ansible for DevOps 讀書筆記"
seriesOrder: 1
comments: true
draft: false
---
每個維運過伺服器的人都經歷過這個循環:SSH 登入機器、改幾個設定、裝幾個套件、登出——三個月後沒有人記得那台機器上到底改過什麼。書裡把這種機器叫做 **snowflake server(雪花伺服器)**:每一台都獨一無二、無法複製,而它的組態只存在於某個人的腦袋和零散的筆記裡。《Ansible for DevOps》第一章要回答的,就是這個問題的解法為什麼是 Ansible,而不是其他一狗票的組態管理工具。

## 手動維運的死穴:知識存在人身上,不在系統裡

第一章開場講了一個很寫實的故事:一位管理者手動照顧幾台伺服器,一開始沒問題——直到機器變多、半夜出事、本人休假。手動維運的問題從來不是「慢」,而是:

- **組態飄移(configuration drift)**:每台機器被手動改過的地方都不一樣,同一套服務在不同機器上行為不同。
- **不可重現**:機器掛了,沒有人能保證重建出一台一模一樣的。
- **知識鎖在個人身上**:會處理的永遠是那一兩個人,他們一離開,系統就變成黑盒子。

組態管理工具的本質,就是把「這台機器應該長什麼樣子」從人的腦袋搬進**版本控制裡的文字檔**——機器可以重建、變更有紀錄、知識變成團隊資產。

## Ansible 的關鍵賭注:Agentless

在 Ansible(2012)之前,Puppet、Chef 這些前輩早就存在了,但它們共同的門檻是**架構很重**:要先養一台 master/server,再到每一台受管機器上安裝 agent、簽發憑證,agent 定期回 master 拉取組態。你還沒開始自動化,就先多了一套要維運的系統。

Ansible 反過來賭了一個極簡的架構:**不裝任何 agent,只用每台機器本來就有的 SSH**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 250" role="img" aria-label="兩種組態管理架構對比:左邊是 agent 模式,要先養一台 master,每台節點裝 agent 定期回 master 拉組態;右邊是 Ansible 的 agentless 模式,從你的筆電直接用 SSH 推送到各節點,節點只需要 SSH 和 Python,沒有常駐程式、沒有額外基礎設施" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="ag1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="ag2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#4f6df5"/></marker></defs>
    <line x1="290" y1="20" x2="290" y2="234" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="146" y="30" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Agent 模式(Puppet / Chef)</text>
    <text x="146" y="46" fill="#9aa4b2" font-size="9" text-anchor="middle">先養 master、每台機器裝 agent</text>
    <rect x="94" y="58" width="104" height="34" rx="7" fill="#262b3a" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="146" y="79" fill="#d6a45c" font-size="10.5" text-anchor="middle">Master 伺服器</text>
    <rect x="22" y="164" width="76" height="32" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="60" y="178" fill="#9aa4b2" font-size="9" text-anchor="middle">節點</text>
    <text x="60" y="190" fill="#d6a45c" font-size="8" text-anchor="middle">+ agent</text>
    <rect x="108" y="164" width="76" height="32" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="146" y="178" fill="#9aa4b2" font-size="9" text-anchor="middle">節點</text>
    <text x="146" y="190" fill="#d6a45c" font-size="8" text-anchor="middle">+ agent</text>
    <rect x="194" y="164" width="76" height="32" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="232" y="178" fill="#9aa4b2" font-size="9" text-anchor="middle">節點</text>
    <text x="232" y="190" fill="#d6a45c" font-size="8" text-anchor="middle">+ agent</text>
    <line x1="66" y1="162" x2="118" y2="94" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ag1)"/>
    <line x1="146" y1="162" x2="146" y2="94" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ag1)"/>
    <line x1="226" y1="162" x2="174" y2="94" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#ag1)"/>
    <text x="146" y="130" fill="#9aa4b2" font-size="8.5" text-anchor="middle">agent 定期輪詢、拉取組態</text>
    <text x="146" y="222" fill="#9aa4b2" font-size="8.7" text-anchor="middle">開始自動化之前,先多一套要維運的系統</text>
    <text x="434" y="30" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Agentless(Ansible)</text>
    <text x="434" y="46" fill="#9aa4b2" font-size="9" text-anchor="middle">沒有 master、沒有 agent</text>
    <rect x="382" y="58" width="104" height="34" rx="7" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="434" y="79" fill="#4f6df5" font-size="10.5" text-anchor="middle">你的筆電</text>
    <rect x="310" y="164" width="76" height="32" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="348" y="184" fill="#9aa4b2" font-size="9" text-anchor="middle">節點</text>
    <rect x="396" y="164" width="76" height="32" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="434" y="184" fill="#9aa4b2" font-size="9" text-anchor="middle">節點</text>
    <rect x="482" y="164" width="76" height="32" rx="7" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="520" y="184" fill="#9aa4b2" font-size="9" text-anchor="middle">節點</text>
    <line x1="406" y1="94" x2="354" y2="162" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#ag2)"/>
    <line x1="434" y1="94" x2="434" y2="162" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#ag2)"/>
    <line x1="462" y1="94" x2="514" y2="162" stroke="#4f6df5" stroke-width="1.4" marker-end="url(#ag2)"/>
    <text x="434" y="130" fill="#4f6df5" font-size="8.5" text-anchor="middle">SSH 主動推送</text>
    <text x="434" y="222" fill="#9aa4b2" font-size="8.7" text-anchor="middle">節點只需要 SSH + Python——本來就有</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">同樣是「管一群機器」,agent 模式要先建 master、到每台機器裝 agent;Ansible 只需要一台能 SSH 的筆電——受管節點上什麼都不用裝</figcaption>
</figure>

這個決定帶來的差異是全面的:

- **採用成本趨近於零**:能 SSH 到的機器,現在就能開始管,不用先跑一輪「裝 agent」的前置專案。
- **沒有新的攻擊面**:安全模型就是 SSH 本身——你本來就在信任它了,不用多開 port、多管一套憑證。
- **沒有常駐程式**:節點上不會多一個吃資源、要升級、會壞掉的 daemon。
- **推送(push)而非拉取(pull)**:變更在你按下 Enter 的當下發生,而不是等 agent 下次輪詢——出事時你確切知道「什麼時候、誰、改了什麼」。

代價是大規模場景下 SSH 逐台連線比較慢——但書的觀點(我也同意)是:對絕大多數團隊,**先能用起來**遠比極致效能重要。

## 冪等:描述終點,而不是描述步驟

另一個核心概念是**冪等(idempotence)**:同一份 playbook 執行一次和執行十次,結果完全相同。這跟 shell 腳本是本質上的不同——腳本描述的是**步驟**(「執行 apt install」),Ansible 的模組描述的是**狀態**(「nginx 必須存在且啟動」)。模組每次執行都先檢查現狀,符合就什麼都不做。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 190" role="img" aria-label="冪等的運作方式:playbook 描述期望狀態,每個模組執行前先檢查現狀。現狀不符合就動手修改,回報 changed;已經符合就什麼都不做,回報 ok。所以同一份 playbook 跑一次和跑十次,機器都收斂到同一個狀態" style="width:100%;max-width:600px;height:auto;margin:0 auto;">
    <defs><marker id="id1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <rect x="22" y="70" width="130" height="52" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="87" y="92" fill="#4f6df5" font-size="10.5" text-anchor="middle" font-weight="bold">Playbook</text>
    <text x="87" y="108" fill="#9aa4b2" font-size="8.5" text-anchor="middle">描述「終點狀態」</text>
    <line x1="152" y1="96" x2="192" y2="96" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#id1)"/>
    <rect x="196" y="70" width="140" height="52" rx="8" fill="#262b3a" stroke="#d6a45c" stroke-width="1.6"/>
    <text x="266" y="92" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">檢查現狀</text>
    <text x="266" y="108" fill="#9aa4b2" font-size="8.5" text-anchor="middle">現狀 = 期望?</text>
    <line x1="336" y1="84" x2="392" y2="52" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#id1)"/>
    <text x="358" y="56" fill="#9aa4b2" font-size="8" text-anchor="middle">不符合</text>
    <line x1="336" y1="108" x2="392" y2="140" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#id1)"/>
    <text x="358" y="140" fill="#9aa4b2" font-size="8" text-anchor="middle">已符合</text>
    <rect x="396" y="28" width="140" height="46" rx="8" fill="#33291a" stroke="#e0733a" stroke-width="1.6"/>
    <text x="466" y="47" fill="#e0733a" font-size="10" text-anchor="middle" font-weight="bold">changed</text>
    <text x="466" y="63" fill="#9aa4b2" font-size="8.5" text-anchor="middle">動手改到符合為止</text>
    <rect x="396" y="118" width="140" height="46" rx="8" fill="#2e4a40" stroke="#54b890" stroke-width="1.6"/>
    <text x="466" y="137" fill="#54b890" font-size="10" text-anchor="middle" font-weight="bold">ok</text>
    <text x="466" y="153" fill="#9aa4b2" font-size="8.5" text-anchor="middle">什麼都不做</text>
    <text x="280" y="182" fill="#9aa4b2" font-size="8.7" text-anchor="middle">跑一次、跑十次,機器都收斂到同一個狀態——重複執行永遠安全</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">冪等的關鍵在「先檢查、再動手」:不符合期望才改(<b style="color:#e0733a">changed</b>),已符合就跳過(<b style="color:#54b890">ok</b>)。這讓 playbook 可以放心重跑,shell 腳本做不到</figcaption>
</figure>

冪等聽起來像小細節,其實它決定了整個工作流程:因為重跑安全,playbook 才能拿來**修復飄移**(定期重跑,把被手動亂改的機器拉回正軌)、才能**半途失敗直接重來**,不用寫一堆「如果已經裝過就跳過」的防禦邏輯。

## 第一次接觸:一個 inventory、一行指令

Ansible 的入門低到有點不可思議。裝好之後(`pip install ansible`),寫一個 inventory 檔案列出你的機器:

```ini
[web]
192.168.60.4
192.168.60.5

[web:vars]
ansible_user=ubuntu
```

然後就能對整群機器下 ad-hoc 指令:

```bash
ansible web -i hosts.ini -m ping        # 確認連得上
ansible web -i hosts.ini -a "free -h"   # 一次看所有機器的記憶體
```

沒有 master 要架、沒有 agent 要裝、沒有 DSL 要先學——第一天就能拿它取代「開三個 terminal 分頁逐台 SSH」的日常。playbook(用 YAML 描述一連串期望狀態)是下一章的主角,但光是 ad-hoc 指令,就已經值回票價。

## 反思

### 文件會過期,playbook 不會說謊

我對「知識鎖在人身上」這件事很有感。團隊的 wiki 上永遠有一份部署文件,而那份文件永遠跟現實有落差——因為文件跟機器之間沒有任何強制的連結,改了機器忘了改文件,一點成本都沒有。playbook 最漂亮的地方是它**同時是文件和執行程式**:它過期的那一刻就是它跑失敗的那一刻,落差會立刻被抓出來。這跟我推 type checker 的理由是同一個——與其靠人的自律去維持一致性,不如把一致性做進工具裡,讓「不一致」變成一個會冒出來的錯誤,而不是一個沒人發現的祕密。

### Agentless 是「採用成本」的勝利,不只是技術取捨

Ansible 跟 Puppet/Chef 的差異,常被講成 push vs pull 的技術比較,但我認為真正的勝負手是**採用成本**。我自己在團隊推工具的經驗是:多一個前置步驟,就多一半的人放棄——要先架一台 server、要到每台機器裝東西,這種工具在提案階段就輸了。Ansible 的「能 SSH 就能用」讓它可以從一台機器、一個人、一個下午開始,價值先發生,規模再慢慢長。選工具時我越來越看重這件事:**功能決定它的上限,採用成本決定它有沒有明天。**

---

> **自動化的第一步不是寫程式,而是承認:存在人腦裡的組態,就是還沒發生的事故。**
