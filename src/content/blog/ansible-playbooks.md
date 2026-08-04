---
title: "第一份 Playbook:把 shell 腳本翻譯成宣告式"
date: 2026-08-04
category: tech
description: "Playbook 不是「換一種語法的腳本」——腳本描述步驟(怎麼做),playbook 描述狀態(要什麼),這個世界觀的差別決定了它可以中斷、可以重跑、可以當文件讀。拆解 play / task / handler 的骨架,看懂 notify 為什麼只在 changed 觸發、handler 為什麼在結尾只跑一次,再從書裡三個真實範例提煉出所有伺服器設定共用的同一個套路。"
tags:
  - ansible
  - devops
  - automation
series: "Ansible for DevOps 讀書筆記"
seriesOrder: 3
comments: true
draft: false
---
[[ansible-adhoc|上一篇]]說膠帶貼到第二次就該轉正——這篇就是轉正手續。Playbook 說穿了只是「把 ad-hoc 指令寫進 YAML 檔案」,但書的第四章真正想教的,是一個世界觀的切換:**腳本描述步驟,playbook 描述狀態**。看懂這個差別,後面所有語法都只是細節。

## 同一件事,兩種世界觀

書用一個最小例子開場。裝一台 Apache,shell 腳本這樣寫:

```bash
#!/bin/bash
apt-get update
apt-get install -y apache2
systemctl start apache2
```

Playbook 這樣寫:

```yaml
---
- hosts: web
  become: true

  tasks:
    - name: 安裝 Apache
      apt: name=apache2 state=present update_cache=yes

    - name: 確保服務啟動且開機自啟
      service: name=apache2 state=started enabled=yes
```

行數差不多,但語意完全不同——腳本的每一行是**動作**,playbook 的每個 task 是**斷言**:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 236" role="img" aria-label="兩種世界觀對比:左邊 shell 腳本描述步驟,apt-get update、apt-get install、systemctl start 依序執行,中斷會留下半套狀態、重跑可能出錯;右邊 playbook 描述狀態,apache2 已安裝、服務已啟動且開機自啟,每個斷言自帶現狀檢查,中斷了重跑就好,跑幾次結果都一樣" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="pb1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker></defs>
    <line x1="290" y1="18" x2="290" y2="220" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="4 4"/>
    <text x="146" y="32" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">腳本:描述步驟</text>
    <text x="146" y="48" fill="#9aa4b2" font-size="9" text-anchor="middle">「依序做這些動作」</text>
    <rect x="46" y="60" width="200" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="146" y="77" fill="#e6e6e6" font-size="9" text-anchor="middle" font-family="monospace">apt-get update</text>
    <line x1="146" y1="86" x2="146" y2="96" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pb1)"/>
    <rect x="46" y="98" width="200" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="146" y="115" fill="#e6e6e6" font-size="9" text-anchor="middle" font-family="monospace">apt-get install -y apache2</text>
    <line x1="146" y1="124" x2="146" y2="134" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#pb1)"/>
    <rect x="46" y="136" width="200" height="26" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.3"/>
    <text x="146" y="153" fill="#e6e6e6" font-size="9" text-anchor="middle" font-family="monospace">systemctl start apache2</text>
    <text x="146" y="190" fill="#e0733a" font-size="8.7" text-anchor="middle">中斷 = 卡在半套狀態</text>
    <text x="146" y="206" fill="#e0733a" font-size="8.7" text-anchor="middle">重跑 = 每一步都可能因「做過了」而爆炸</text>
    <text x="434" y="32" fill="#e6e6e6" font-size="12.5" text-anchor="middle" font-weight="bold">Playbook:描述狀態</text>
    <text x="434" y="48" fill="#9aa4b2" font-size="9" text-anchor="middle">「機器最後要長這樣」</text>
    <rect x="334" y="60" width="200" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <circle cx="352" cy="75" r="6" fill="#54b890"/>
    <text x="360" y="79" fill="#e6e6e6" font-size="9" text-anchor="start">apache2 已安裝</text>
    <rect x="334" y="100" width="200" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <circle cx="352" cy="115" r="6" fill="#54b890"/>
    <text x="360" y="119" fill="#e6e6e6" font-size="9" text-anchor="start">服務 started + enabled</text>
    <rect x="334" y="140" width="200" height="30" rx="6" fill="#262b3a" stroke="#54b890" stroke-width="1.4"/>
    <circle cx="352" cy="155" r="6" fill="#54b890"/>
    <text x="360" y="159" fill="#e6e6e6" font-size="9" text-anchor="start">設定檔內容 = 模板產出</text>
    <text x="434" y="190" fill="#54b890" font-size="8.7" text-anchor="middle">每個斷言自帶現狀檢查(冪等)</text>
    <text x="434" y="206" fill="#54b890" font-size="8.7" text-anchor="middle">中斷 = 重跑就好;跑幾次,結果都一樣</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">腳本的每一行是動作,中斷就留下半套狀態;playbook 的每個 task 是斷言,自帶「先檢查再動手」——這不是語法差異,是可以安心失敗的差異</figcaption>
</figure>

這個差別的實際體感,就在 `PLAY RECAP` 的輸出裡:

```text
PLAY RECAP *********************************************************
192.168.60.4  : ok=4  changed=3   ← 第一次:動手改了三件事
192.168.60.4  : ok=4  changed=0   ← 第二次:已在期望狀態,全部跳過
```

`changed=0` 就是冪等的證明——你可以把 playbook 排進 cron 定期重跑,把被手動亂改的機器拉回正軌,而不用擔心它「多做了什麼」。

## 骨架:play、task、handler

一份 playbook 由上到下就三層:**play**(對哪些機器、用什麼身分)、**task**(一連串狀態斷言,依序執行)、**handler**(被 notify 才執行的特殊 task)。Handler 是第一個值得停下來看的設計:

```yaml
---
- hosts: web
  become: true

  handlers:
    - name: restart apache
      service: name=apache2 state=restarted

  tasks:
    - name: 部署主設定檔
      template: src=apache2.conf.j2 dest=/etc/apache2/apache2.conf
      notify: restart apache

    - name: 部署站台設定檔
      template: src=vhost.conf.j2 dest=/etc/apache2/sites-enabled/vhost.conf
      notify: restart apache
```

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 580 214" role="img" aria-label="handler 的觸發規則:tasks 依序執行,兩個 template task 都 notify 同一個 restart apache handler。只有回報 changed 的 task 會真的觸發 notify,ok 的不會;而且不管被 notify 幾次,handler 在 play 結尾只執行一次。設定檔沒變就不重啟,兩個檔案都變了也只重啟一次" style="width:100%;max-width:640px;height:auto;margin:0 auto;">
    <defs><marker id="hd1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="hd2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker></defs>
    <text x="130" y="28" fill="#9aa4b2" font-size="9.5" text-anchor="middle">tasks(依序執行)</text>
    <rect x="30" y="40" width="200" height="34" rx="7" fill="#262b3a" stroke="#e0733a" stroke-width="1.5"/>
    <text x="118" y="55" fill="#e6e6e6" font-size="9" text-anchor="middle">部署主設定檔</text>
    <text x="118" y="68" fill="#e0733a" font-size="8.5" text-anchor="middle">changed</text>
    <line x1="130" y1="74" x2="130" y2="88" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#hd1)"/>
    <rect x="30" y="90" width="200" height="34" rx="7" fill="#262b3a" stroke="#54b890" stroke-width="1.5"/>
    <text x="118" y="105" fill="#e6e6e6" font-size="9" text-anchor="middle">部署站台設定檔</text>
    <text x="118" y="118" fill="#54b890" font-size="8.5" text-anchor="middle">ok(內容沒變)</text>
    <line x1="130" y1="124" x2="130" y2="138" stroke="#9aa4b2" stroke-width="1.2" marker-end="url(#hd1)"/>
    <rect x="30" y="140" width="200" height="34" rx="7" fill="#262b3a" stroke="#e0733a" stroke-width="1.5"/>
    <text x="118" y="155" fill="#e6e6e6" font-size="9" text-anchor="middle">部署防火牆規則</text>
    <text x="118" y="168" fill="#e0733a" font-size="8.5" text-anchor="middle">changed</text>
    <line x1="230" y1="57" x2="360" y2="98" stroke="#e0733a" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#hd2)"/>
    <text x="292" y="62" fill="#e0733a" font-size="8" text-anchor="middle">notify ✓</text>
    <line x1="230" y1="107" x2="356" y2="110" stroke="#3a4154" stroke-width="1.2" stroke-dasharray="2 4"/>
    <text x="292" y="100" fill="#9aa4b2" font-size="8" text-anchor="middle">ok 不觸發 ✗</text>
    <line x1="230" y1="157" x2="360" y2="122" stroke="#e0733a" stroke-width="1.3" stroke-dasharray="4 3" marker-end="url(#hd2)"/>
    <text x="292" y="158" fill="#e0733a" font-size="8" text-anchor="middle">notify ✓</text>
    <rect x="364" y="86" width="186" height="48" rx="8" fill="#33291a" stroke="#d6a45c" stroke-width="1.8"/>
    <text x="457" y="106" fill="#d6a45c" font-size="10" text-anchor="middle" font-weight="bold">handler: restart apache</text>
    <text x="457" y="122" fill="#9aa4b2" font-size="8.5" text-anchor="middle">被 notify 兩次,只執行一次</text>
    <text x="457" y="160" fill="#9aa4b2" font-size="8.7" text-anchor="middle">執行時機:play 結尾</text>
    <text x="290" y="200" fill="#9aa4b2" font-size="8.7" text-anchor="middle">設定沒變就不重啟;改了三個檔案,也只重啟一次——「重啟服務」該有的樣子</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">Handler 的兩條規則:只有 <b style="color:#e0733a">changed</b> 的 task 會觸發 notify;同一個 handler 被 notify 再多次,也只在 play 結尾執行一次</figcaption>
</figure>

這兩條規則把「什麼時候該重啟服務」這個維運判斷,直接寫死進工具的語意:**設定沒變就不動它,改了五個檔案也只重啟一次**。用 shell 腳本要自己維護 flag 變數才能做到;在 Ansible 裡它是預設行為。

## 執行與日常開關

```bash
ansible-playbook playbook.yml                  # 就這樣
ansible-playbook playbook.yml --limit web1     # 只打一台(先拿一台試!)
ansible-playbook playbook.yml --check          # 彩排:只回報會改什麼
ansible-playbook playbook.yml -v               # 看每個 task 的細節輸出
```

`--limit` 加 `--check` 是上正式環境前的標準組合:先在一台機器上彩排,確認 `changed` 的項目跟你預期一致,再全面執行。

## 真實世界的 playbook 都是同一首歌

第四章後半用三個完整範例收尾——Rocky Linux 的 Node.js app server、Ubuntu 的 LAMP + Drupal、Ubuntu 的 Solr。細節各異,但骨架完全是同一個 pattern:

1. **加套件來源**(EPEL / Remi / apt repo)
2. **裝套件**(`package` / `apt` / `yum`)
3. **鋪設定**(`template` / `copy` / `lineinfile`,改了就 `notify`)
4. **確保服務跑著**(`service: started enabled=yes`)

外加兩個新面孔:`vars_files` 把變數抽出去(同一份 playbook,換個變數檔就是另一個環境),`pre_tasks` 在正式 tasks 前先跑(典型用途:先 `apt update` 快取)。看懂這個套路之後,讀任何人的 playbook 都像讀同一首歌的變奏——**伺服器設定的花樣其實很少,少到可以標準化,這正是它適合被自動化的原因**。

## 反思

### 宣告式真正的紅利,是「可以安心失敗」

我最有感的不是 playbook 比腳本優雅,而是它改變了**失敗的代價**。部署腳本跑到一半斷線,是我做 backend 以來最討厭的時刻之一——機器卡在半套狀態,你得逐行對照腳本猜「做到哪了」,手動把它救回可重跑的起點。冪等把這件事變成:再跑一次就好。這跟後端設計的直覺完全相通——訊息會 [[kafka-delivery|at-least-once 重複投遞]]、API 要冪等鍵、排程要能重跑,**分散式世界的預設就是「同一件事會再來一次」,所有不能安心重來的設計,遲早變成半夜的事故**。組態管理只是把這條鐵律應用到伺服器上而已。

### `name:` 是寫給三個月後的自己

Playbook 能當文件讀,是它比腳本高明的第二件事——但這件事不是自動發生的。我看過 task 全用 `shell` 模組、`name` 隨便寫的 playbook,那跟腳本一樣難讀。差別在紀律:`name: 安裝 Apache` 這種寫得像句子的斷言,串起來就是一份會自己執行的 runbook;新人問「這台機器上有什麼」,答案不是過期的 wiki,是 repo 裡這份跑得動的文件。我對團隊的要求也一樣:**程式碼的註解可以少,但「意圖」必須留在某個跑得動、review 得到的地方**——對 API 是測試案例,對機器就是 playbook 的 name 欄位。

---

> **腳本記錄你做過什麼,playbook 宣告機器該是什麼——前者會過期,後者每跑一次就驗證一次。**
