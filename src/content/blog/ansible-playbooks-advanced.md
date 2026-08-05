---
title: "Playbook 進階:變數、條件,與重新定義成功"
date: 2026-08-04
category: tech
description: "上一篇的 playbook 還是死的——這篇讓它活起來:變數的分層優先序(越具體越贏、-e 是逃生門)、facts 和 register 讓機器自己說話、when 做決策;changed_when / failed_when 重新定義成敗——exit code 0 不等於成功,就像 HTTP 200 不等於成功;block / rescue / always 就是維運界的 try / catch / finally,外加 Vault 讓祕密也能進版本控制。"
tags:
  - ansible
  - devops
  - automation
series: "Ansible for DevOps 讀書筆記"
seriesOrder: 4
comments: true
draft: false
---
[[ansible-playbooks|上一篇]]的 playbook 是死的:寫死的套件、寫死的路徑,只能打一種環境。第五章一口氣補上讓它活起來的所有機關——變數、條件、錯誤處理。內容很雜,但整理之後其實就三個主題:**資料從哪來**(變數、facts、register)、**怎麼做決策**(when)、**怎麼定義成敗**(changed_when / failed_when / blocks)。

## 變數:同一份 playbook,吃下所有環境差異

變數讓「dev 和 prod 各養一份 playbook」這種災難不會發生——邏輯只有一份,差異全部抽進變數。但變數可以定義在很多地方,同名時誰贏?Ansible 有一張十幾層的優先序表,背它沒意義,記住結構就好:**越靠近執行當下、越具體的定義,優先權越高**。

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 246" role="img" aria-label="變數優先序疊層,由下往上優先權越高:最底層 role defaults 是最通用的預設值;往上依序是 inventory 的 group_vars(整個群組共用)、host_vars(單一機器)、play 的 vars 與 vars_files、task 層級的 vars;最頂層是命令列的 extra vars,-e 參數,永遠最大。規則:越具體越贏,群組輸給單機、檔案輸給命令列" style="width:100%;max-width:580px;height:auto;margin:0 auto;">
    <defs><marker id="vp1" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#d6a45c"/></marker></defs>
    <rect x="60" y="196" width="330" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="225" y="215" fill="#9aa4b2" font-size="9.5" text-anchor="middle">role defaults —— 最通用的預設值</text>
    <rect x="75" y="162" width="300" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="225" y="181" fill="#9aa4b2" font-size="9.5" text-anchor="middle">group_vars —— 整個群組共用(如 prod)</text>
    <rect x="90" y="128" width="270" height="30" rx="6" fill="#262b3a" stroke="#3a4154" stroke-width="1.4"/>
    <text x="225" y="147" fill="#e6e6e6" font-size="9.5" text-anchor="middle">host_vars —— 單一機器</text>
    <rect x="105" y="94" width="240" height="30" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="225" y="113" fill="#e6e6e6" font-size="9.5" text-anchor="middle">play vars / vars_files</text>
    <rect x="120" y="60" width="210" height="30" rx="6" fill="#262b3a" stroke="#4f6df5" stroke-width="1.5"/>
    <text x="225" y="79" fill="#e6e6e6" font-size="9.5" text-anchor="middle">task vars</text>
    <rect x="135" y="26" width="180" height="30" rx="6" fill="#33291a" stroke="#e0733a" stroke-width="1.8"/>
    <text x="225" y="45" fill="#e0733a" font-size="9.5" text-anchor="middle" font-weight="bold">--extra-vars(-e)永遠最大</text>
    <line x1="440" y1="210" x2="440" y2="40" stroke="#d6a45c" stroke-width="1.6" marker-end="url(#vp1)"/>
    <text x="463" y="100" fill="#d6a45c" font-size="9.5" text-anchor="middle" transform="rotate(90 463 100)">越具體,優先權越高</text>
    <text x="225" y="240" fill="#9aa4b2" font-size="8.7" text-anchor="middle">群組輸給單機、檔案輸給命令列——通用預設放底層,緊急覆寫走 -e</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">變數優先序的心智模型:一疊由通用到具體的圖層,上層蓋過下層。完整表有十幾層,日常只要用其中三、四層就夠</figcaption>
</figure>

實務上的收斂用法:通用預設放 `group_vars/all.yml`,環境差異放 `group_vars/prod.yml`,個別機器的例外放 `host_vars/`,救火時用 `-e "app_version=1.2.3"` 從命令列強制覆寫——**`-e` 是逃生門,不是日常入口**。

除了你自己定義的,還有兩種「機器告訴你」的變數:

- **Facts**:執行 playbook 時 Ansible 先跑 `setup` 模組,蒐集機器的自我介紹——`ansible_os_family`、`ansible_memtotal_mb`、IP、磁碟。跨發行版的 playbook 就靠它:`when: ansible_os_family == "Debian"` 走 apt、RedHat 走 yum。
- **`register`**:把某個 task 的輸出存成變數,給後面的 task 用。

## 條件:when + register,playbook 學會看情況

書裡的範例很實際——app 沒在跑才啟動它:

```yaml
- name: 檢查 app 是否已在執行
  command: forever list
  register: forever_list
  changed_when: false          # 純查詢,永遠不該算 changed

- name: 啟動 app
  command: forever start /path/to/app.js
  when: "'app.js' not in forever_list.stdout"
```

`register` 接住輸出、`when` 判斷要不要做——這對組合就是 playbook 的 if。注意第一個 task 的 `changed_when: false`:查詢類指令永遠不該把 RECAP 弄髒,這是保住「`changed=0` 等於沒動任何東西」這個信任的紀律。

## 重新定義成功:changed_when、failed_when、blocks

`command` / `shell` 模組預設用 exit code 判斷成敗——但 exit code 會說謊:有些工具失敗照樣回 0,錯誤訊息藏在輸出裡。這時候用 `failed_when` 把「失敗」重新定義成業務語意:

```yaml
- name: 執行資料庫遷移
  command: /opt/app/migrate.sh
  register: migrate_result
  failed_when: "'ERROR' in migrate_result.stdout"
  ignore_errors: false
```

而多個 task 的錯誤處理,交給 `block` / `rescue` / `always`——如果你寫過任何後端語言,這張圖不用解釋:

<figure style="margin:1.5rem 0;text-align:center;">
  <svg viewBox="0 0 560 220" role="img" aria-label="block、rescue、always 的執行流程,對應 try、catch、finally:block 裡的 tasks 依序執行,全部成功就直接跳到 always;任何一個失敗就進 rescue 做補救,例如回滾或通知,rescue 結束後同樣進 always;always 無論成敗都會執行,例如解除維護模式" style="width:100%;max-width:580px;height:auto;margin:0 auto;">
    <defs><marker id="br1" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#9aa4b2"/></marker><marker id="br2" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#e0733a"/></marker><marker id="br3" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L7,3 z" fill="#54b890"/></marker></defs>
    <rect x="30" y="40" width="190" height="64" rx="8" fill="#262b3a" stroke="#4f6df5" stroke-width="1.8"/>
    <text x="125" y="62" fill="#4f6df5" font-size="11" text-anchor="middle" font-weight="bold">block(try)</text>
    <text x="125" y="80" fill="#9aa4b2" font-size="8.5" text-anchor="middle">部署新版、跑遷移、重啟服務</text>
    <text x="125" y="94" fill="#9aa4b2" font-size="8.5" text-anchor="middle">tasks 依序執行</text>
    <rect x="330" y="40" width="190" height="64" rx="8" fill="#33291a" stroke="#e0733a" stroke-width="1.8"/>
    <text x="425" y="62" fill="#e0733a" font-size="11" text-anchor="middle" font-weight="bold">rescue(catch)</text>
    <text x="425" y="80" fill="#9aa4b2" font-size="8.5" text-anchor="middle">任何 task 失敗才進來</text>
    <text x="425" y="94" fill="#9aa4b2" font-size="8.5" text-anchor="middle">回滾到上一版、發告警</text>
    <rect x="180" y="152" width="190" height="52" rx="8" fill="#2e4a40" stroke="#54b890" stroke-width="1.8"/>
    <text x="275" y="173" fill="#54b890" font-size="11" text-anchor="middle" font-weight="bold">always(finally)</text>
    <text x="275" y="190" fill="#9aa4b2" font-size="8.5" text-anchor="middle">成敗都跑:解除維護模式</text>
    <line x1="220" y1="72" x2="326" y2="72" stroke="#e0733a" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#br2)"/>
    <text x="273" y="64" fill="#e0733a" font-size="8.5" text-anchor="middle">失敗</text>
    <line x1="125" y1="104" x2="200" y2="152" stroke="#54b890" stroke-width="1.4" marker-end="url(#br3)"/>
    <text x="140" y="134" fill="#54b890" font-size="8.5" text-anchor="middle">全部成功</text>
    <line x1="425" y1="104" x2="350" y2="152" stroke="#9aa4b2" stroke-width="1.3" marker-end="url(#br1)"/>
    <text x="412" y="134" fill="#9aa4b2" font-size="8.5" text-anchor="middle">補救後</text>
  </svg>
  <figcaption style="font-size:.85rem;color:#9aa4b2;margin-top:.4rem;">block / rescue / always 就是維運界的 try / catch / finally:部署失敗自動回滾(rescue),而「解除維護模式」放 always——成功要解除,失敗更要解除</figcaption>
</figure>

## Vault:祕密也能進版本控制

變數檔一旦包含資料庫密碼、API key,「進 repo」就從理所當然變成資安事件。Ansible Vault 的解法直接:**把變數檔加密後放進 repo**,執行時再供鑰匙:

```bash
ansible-vault create secrets.yml            # 建立加密變數檔
ansible-vault edit secrets.yml              # 編輯(自動解密再加密)
ansible-playbook main.yml --ask-vault-pass  # 執行時輸入密碼
ansible-playbook main.yml --vault-password-file ~/.vault_pass  # 或用檔案/腳本供鑰
```

於是祕密有了跟程式碼一樣的待遇:有版本、有 review、有出處——而不是散落在誰的 `.env`、聊天紀錄和交接文件裡。

## 其他遲早會用到的機關

- **`tags`**:幫 play / task 貼標籤,`--tags "deploy"` 只跑一角——playbook 長大之後的剛需。
- **`delegate_to`**:這個 task 去別台機器上執行——經典用法:滾動更新前,先到 load balancer 上把這台摘掉。
- **`wait_for`**:等 port 開、等檔案出現再繼續——服務「啟動指令送出」和「真的能服務」中間的那段空窗,就靠它補。
- **`vars_prompt`**:執行時互動式問值,適合偶爾跑、每次參數不同的操作型 playbook。

## 反思

### 工具給你十層,不代表你要用十層

變數優先序表有十幾層,我的第一反應不是「好強大」,而是「這會被玩壞」。同名變數散在五個地方,查一個值要開五個檔案——這跟程式裡濫用全域變數、多層繼承是同一種病:**每多一層彈性,就多一層讀者的成本**。我會給團隊收斂成慣例:變數只准出現在 `group_vars`、`host_vars`、`-e` 三個地方,role defaults 只放真正的預設值,其他層一律不准用。這件事跟我治理 coding style 的體會一致——工具的能力範圍是廠商決定的,但**團隊實際使用的子集,是 lead 該畫的線**;線畫得好,新人讀專案的成本直接砍半。

### exit code 0 不等於成功,HTTP 200 也不等於

`changed_when` / `failed_when` 表面上是小工具,背後是一個誠實的承認:**工具只懂傳輸語意,不懂業務語意**。exit code 0 只代表「程式正常結束」,不代表「事情做對了」——這跟後端每天遇到的「HTTP 200 但 body 裡是 error code」一模一樣,我就被第三方 API 的 200 + `errcode: 40001` 教育過:監控全綠、功能全掛。所以我現在寫任何整合——不管是 API client 還是 playbook task——第一個問題都是:**「成功」由誰定義?用什麼欄位判斷?** 把這個判斷寫明(`failed_when`、或 API client 裡的 response validator),等於把你對外部系統的理解固化成程式;沒寫,就是默默接受「別人說 OK 就是 OK」——那不是信任,是沒設防。

---

> **變數讓一份 playbook 走遍所有環境,條件讓它看情況行動——但最重要的機關是 failed_when:成功的定義,永遠該由你寫下,而不是由 exit code 決定。**
