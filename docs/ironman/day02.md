# Day 2|起手式:五個元件與一條 CI/CD

昨天鋪完全景,講戰役之前先把當年的武器庫攤開——後面每一章的取捨,都是在這套技術棧的邊界裡做的。團隊很小:**3 個後端、3 個前端**;武器庫也很樸素:**PostgreSQL、Django(API + WebSocket)、RabbitMQ、Redis、Celery**,全套跑在 GCP 上。

## 五個元件,三種時間尺度

回頭看,這五個元件剛好是**每一種時間尺度各請一位專家**:同步的毫秒級走 Django API、即時推送走 WebSocket、秒到分鐘級的慢工交給 RabbitMQ + Celery;底下一份事實(PostgreSQL)、一份速度(Redis)。

![五個元件的分工:同步走 Django、即時推 WebSocket、慢工交 Celery;PostgreSQL 管事實,Redis 管速度](day02-1.png)

幾個分工的細節:

- **API 層用 Django Ninja。**寫起來非常像 FastAPI——型別註記、自動 OpenAPI 文件——但底下還是完整的 Django:ORM、migration、admin 一樣不少。等於**用 FastAPI 的開發體驗,換到 Django 的生態紅利**,對只有三個後端的團隊是雙倍划算。
- **WebSocket 的服務對象是主播,不是客人。**它唯一的工作是把客人留言即時推到主播 dashboard。客人的下單可以慢幾秒,但主播的視野必須是現場——整個系統的**延遲預算全押在主播體驗上**:直播的節奏由主播控,主播不斷貨、不喊錯,客訴自然少。這個取捨後面每一篇都會再出現。
- **RabbitMQ 從頭到尾只做一件事:當 Celery 的管道。**抓留言、批次下單、開發票、寄 email、匯出訂單全跑在 Celery 上。發票這種又慢又不能失敗的外部呼叫,跟每兩秒跑一次的抓留言迴圈,天生就不該擠在同一條請求路徑上。
- **Redis 只放 banned user,沒有 session。**認證直接用 JWT、權限塞在 token 裡——完全 stateless。而 JWT 的教科書弱點是「發出去就收不回來」,Redis 那份黑名單恰好就是**撤銷機制**:留言進來先問 Redis,在名單裡就直接不理。Redis 重啟就從 DB 的黑名單表重建——**快速判斷放 Redis,事實永遠在 DB**。

## 一條 CI/CD:每天十幾個 feature 的底氣

技術棧樸素,但 pipeline 很完整——這才是當年真正的競爭力。

![CI/CD:GitLab flow 分支、GitHub Actions 擋關、staging 自動部署、prod 過 Cloud Build 人工核准](day02-2.png)

流程只有三句話:push 之後 GitHub Actions 跑測試與驗證;合進 staging 分支就自動部署,想試什麼推上去馬上看;要上正式環境,推 prod 分支、到 Cloud Build 按一顆核准鈕。**staging 零摩擦、prod 一道人閘、CI 永遠擋在最前面**——就這樣,六個工程師的團隊每天可以上線十幾個 feature。

我後來的結論是:**技術棧決定你能做什麼,CI/CD 決定你做多快。**boring tech 誰都會選,但同樣五個元件,有的團隊一週上一次版都心驚膽跳。差別從來不在元件,在 push 到上線之間有多少人工步驟。

## 重來也不換

這五個元件,重來一次我全部保留。最大的理由是 Django admin——**只給工程師用**的安全操作台,比直接對 DB 下 SQL 安全得多,設定排程、處理花式的一次性需求,註冊個 model 就有介面。第二個理由是 Celery:配上 RabbitMQ 和 heartbeat 排程,你就有了**一套類似 Airflow 的能力,但完全不用管 Airflow 的維運**——在每天十幾個 feature 的節奏裡,「不用管維運」本身就是最大的 feature。

小團隊的複雜度預算是固定的:infra 上花掉一點,業務上就少一點。當年這套選擇的高明之處,是把預算幾乎全留給了業務——留言解析、庫存不變量、金流冪等,這些才是產品的難點;infra 全選最無聊的,每個元件都成熟到不會半夜給你驚喜。

但另一面也要誠實講:這篇講的「快」,是用「穩」欠債換的。上線初期 API server 只開一台 process、單一 CPU,直播一開就被打爆;那個年代團隊裡沒有 SRE 這個角色,每場直播人肉跟播、提心吊膽。**起手式決定你跑多快;跑得久不久,是另一門功課**——這筆帳,後面會專門用一篇來算。

明天進主線第一戰:一則留言,怎麼變成一筆單。

---
> 本文改寫自我的部落格系列《Re:從零開始做直播代購電商平台》,本篇完整版:https://blog.aidan.tw/blog/rezero-stack/
