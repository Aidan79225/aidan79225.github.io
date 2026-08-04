// Canonical registry of blog series — the single source of truth for
// series metadata used by the homepage, /series/, /start/ and PostLayout.
//
// `name` must match the `series` frontmatter string in posts exactly.
// `slug` is the ASCII anchor used in URLs (/series/#<slug>).
// `color` reuses the layer colors from /start/ so the two pages read as
// one system (Domain green, Infra amber, Cross-cutting pink, …).
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
    color: '#54b890',
  },
  {
    slug: 'sql',
    name: 'SQL 我以為我懂',
    blurb: '把「以為懂了」的 SQL 重新拆開講清楚——執行順序、去重、EXPLAIN 與優化器的真實行為。',
    color: '#54b890',
  },
  {
    slug: 'ddia',
    name: 'Designing Data-Intensive Applications 讀書筆記',
    blurb: '逐章讀《DDIA》:資料模型、儲存引擎、複寫、分區、交易,一路到分散式系統的取捨。',
    color: '#54b890',
  },
  {
    slug: 'redis',
    name: 'Redis 學習筆記',
    blurb: '從資料結構到叢集——快取模式、持久化、複寫、Sentinel 與分散式鎖,一次看懂 Redis 全貌。',
    color: '#d6a45c',
  },
  {
    slug: 'kafka',
    name: 'Kafka 學習筆記',
    blurb: '事件串流的核心:topic 與分區、傳遞語義、生態系與維運。',
    color: '#d6a45c',
  },
  {
    slug: 'spark',
    name: 'Spark 學習筆記',
    blurb: '分散式運算從入門到執行計畫:DataFrame、Spark SQL 與 .explain() 到底在說什麼。',
    color: '#d6a45c',
  },
  {
    slug: 'airflow',
    name: 'Airflow 學習筆記',
    blurb: '工作流程編排:從第一個 DAG、排程、控制流,到測試、部署與可靠度。',
    color: '#d6a45c',
  },
  {
    slug: 'k8s',
    name: 'Kubernetes 學習筆記',
    blurb: '容器編排從 Pod 到叢集管理:Service、Ingress、儲存、排程、RBAC 與疑難排解。',
    color: '#d6a45c',
  },
  {
    slug: 'infra',
    name: '從 Infra 角度看資料工具',
    blurb: '換一個視角——把資料工具當 infra 養:部署、維運與平台化。',
    color: '#d6a45c',
  },
  {
    slug: 'sre',
    name: 'Google SRE 讀書筆記',
    blurb: '讀 Google SRE:SLO、告警、On-call、過載與發布工程,把可靠度變成工程紀律。',
    color: '#e05a7d',
  },
  {
    slug: 'obs',
    name: 'Grafana LGTM 可觀測性',
    blurb: '用 Grafana LGTM(Loki、Tempo、Mimir/Prometheus)把 metrics、logs、traces 接成一套可觀測性。',
    color: '#e05a7d',
  },
  {
    slug: 'rezero',
    name: 'Re:從零開始做直播代購電商平台',
    blurb: '戰爭故事:拿真實做過的直播代購電商平台重打一次——留言下單、庫存、金流物流;當年怎麼做、重來怎麼設計。',
    color: '#9ccc65',
  },
  {
    slug: 'btl',
    name: '成為 Tech Leader 讀書筆記',
    blurb: '讀《成為 Tech Leader》——寫給正在或即將帶人的工程師的筆記與反思。',
    color: '#9aa4b2',
  },
];

export const seriesBySlug = new Map(seriesList.map((s) => [s.slug, s]));
export const seriesByName = new Map(seriesList.map((s) => [s.name, s]));
