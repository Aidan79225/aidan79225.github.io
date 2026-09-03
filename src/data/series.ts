// Canonical registry of blog series — the single source of truth for
// series metadata used by the homepage, /start/ and PostLayout.
//
// `name` must match the `series` frontmatter string in posts exactly.
// `slug` is the ASCII anchor used in URLs (/start/#<slug>).
// `color` reuses the layer colors from /start/ so the two pages read as
// one system (Domain green, Infra amber, Cross-cutting pink, …). It is a
// `var(--hue-*)` reference, not a literal, so it follows the light/dark skin —
// the hues live in src/styles/global.css.
export interface SeriesInfo {
  slug: string;
  name: string;
  blurb: string;
  color: string;
}

export const seriesList: SeriesInfo[] = [
  {
    slug: 'fode',
    name: 'Fundamentals of Data Engineering 讀書筆記',
    blurb: '資料工程的整體地圖——沿著資料工程生命週期,建立不被特定工具綁架的心智模型。',
    color: 'var(--hue-green)',
  },
  {
    slug: 'sql',
    name: 'SQL 我以為我懂',
    blurb: '把「以為懂了」的 SQL 重新拆開講清楚——執行順序、去重、EXPLAIN 與優化器的真實行為。',
    color: 'var(--hue-green)',
  },
  {
    slug: 'ddia',
    name: 'Designing Data-Intensive Applications 讀書筆記',
    blurb: '逐章讀《DDIA》:資料模型、儲存引擎、複寫、分區、交易,一路到分散式系統的取捨。',
    color: 'var(--hue-green)',
  },
  {
    slug: 'redis',
    name: 'Redis 學習筆記',
    blurb: '從資料結構到叢集——快取模式、持久化、複寫、Sentinel 與分散式鎖,一次看懂 Redis 全貌。',
    color: 'var(--hue-amber)',
  },
  {
    slug: 'kafka',
    name: 'Kafka 學習筆記',
    blurb: '事件串流的核心:topic 與分區、傳遞語義、生態系與維運。',
    color: 'var(--hue-amber)',
  },
  {
    slug: 'spark',
    name: 'Spark 學習筆記',
    blurb: '分散式運算從入門到執行計畫:DataFrame、Spark SQL 與 .explain() 到底在說什麼。',
    color: 'var(--hue-amber)',
  },
  {
    slug: 'airflow',
    name: 'Airflow 學習筆記',
    blurb: '工作流程編排:從第一個 DAG、排程、控制流,到測試、部署與可靠度。',
    color: 'var(--hue-amber)',
  },
  {
    slug: 'k8s',
    name: 'Kubernetes 學習筆記',
    blurb: '容器編排從 Pod 到叢集管理:Service、Ingress、儲存、排程、RBAC 與疑難排解。',
    color: 'var(--hue-amber)',
  },
  {
    slug: 'iac',
    name: 'Infrastructure as Code 讀書筆記',
    blurb: '讀 Kief Morris 的 IaC(3rd ed.)——工具背後不會過期的原則:變更成本、爆炸半徑、宣告式思維與 pipeline 交付。',
    color: 'var(--hue-amber)',
  },
  {
    slug: 'ansible',
    name: 'Ansible for DevOps 讀書筆記',
    blurb: '把維運知識從人腦搬進版本控制:冪等、宣告式、可重跑、可審查的組態管理。',
    color: 'var(--hue-amber)',
  },
  {
    slug: 'infra',
    name: '從 Infra 角度看資料工具',
    blurb: '換一個視角——把資料工具當 infra 養:部署、維運與平台化。',
    color: 'var(--hue-amber)',
  },
  {
    slug: 'sre',
    name: 'Google SRE 讀書筆記',
    blurb: '讀 Google SRE:SLO、告警、On-call、過載與發布工程,把可靠度變成工程紀律。',
    color: 'var(--hue-pink)',
  },
  {
    slug: 'obs',
    name: 'Grafana LGTM 可觀測性',
    blurb: '用 Grafana LGTM(Loki、Tempo、Mimir/Prometheus)把 metrics、logs、traces 接成一套可觀測性。',
    color: 'var(--hue-pink)',
  },
  {
    slug: 'rezero',
    name: 'Re:從零開始做直播代購電商平台',
    blurb: '戰爭故事:拿真實做過的直播代購電商平台重打一次——留言下單、庫存、金流物流;當年怎麼做、重來怎麼設計。',
    color: 'var(--hue-lime)',
  },
  {
    slug: 'btl',
    name: '成為 Tech Leader 讀書筆記',
    blurb: '讀《成為 Tech Leader》——寫給正在或即將帶人的工程師的筆記與反思。',
    color: 'var(--hue-grey)',
  },
  {
    slug: 'ai-craft',
    name: '帶 AI 的手藝(2026)',
    blurb: '一個同時帶人也帶 AI 的 EM,把 AI 協作當一門手藝拆開:責任、規範、驗收、護欄與品味。掛上年份,因為這門手藝正在快速變形。',
    color: 'var(--hue-grey)',
  },
];

export const seriesBySlug = new Map(seriesList.map((s) => [s.slug, s]));
export const seriesByName = new Map(seriesList.map((s) => [s.name, s]));
