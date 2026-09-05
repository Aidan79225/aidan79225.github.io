// Canonical registry of blog series — the single source of truth for
// series metadata used by the homepage, /start/ and PostLayout.
//
// `name` must match the `series` frontmatter string in zh posts exactly, and
// `enName` the one used by their English translations.
// `slug` is the ASCII anchor used in URLs (/start/#<slug>).
// `color` reuses the layer colors from /start/ so the two pages read as
// one system (Domain green, Infra amber, Cross-cutting pink, …). It is a
// `var(--hue-*)` reference, not a literal, so it follows the light/dark skin —
// the hues live in src/styles/global.css.
export interface SeriesInfo {
  slug: string;
  name: string;
  /** The series string used by English translations (`series:` in
   *  src/content/blog/en/*.md). Kept here so both languages resolve to the
   *  same entry — see docs/en-translation-glossary.md for the canonical list. */
  enName?: string;
  blurb: string;
  /** English blurb, shown by /en/ and /en/start/. */
  enBlurb: string;
  color: string;
}

export const seriesList: SeriesInfo[] = [
  {
    slug: 'fode',
    name: 'Fundamentals of Data Engineering 讀書筆記',
    enName: 'Fundamentals of Data Engineering — Reading Notes',
    blurb: '資料工程的整體地圖——沿著資料工程生命週期,建立不被特定工具綁架的心智模型。',
    enBlurb: "The whole map of data engineering — a mental model built along the data engineering lifecycle, not held hostage by any one tool.",
    color: 'var(--hue-green)',
  },
  {
    slug: 'sql',
    name: 'SQL 我以為我懂',
    enName: 'SQL: I Thought I Knew It',
    blurb: '把「以為懂了」的 SQL 重新拆開講清楚——執行順序、去重、EXPLAIN 與優化器的真實行為。',
    enBlurb: "Taking apart the SQL you thought you knew — execution order, deduplication, EXPLAIN, and what the optimizer really does.",
    color: 'var(--hue-green)',
  },
  {
    slug: 'ddia',
    name: 'Designing Data-Intensive Applications 讀書筆記',
    enName: 'Designing Data-Intensive Applications — Reading Notes',
    blurb: '逐章讀《DDIA》:資料模型、儲存引擎、複寫、分區、交易,一路到分散式系統的取捨。',
    enBlurb: "DDIA chapter by chapter: data models, storage engines, replication, partitioning, transactions, all the way to the trade-offs of distributed systems.",
    color: 'var(--hue-green)',
  },
  {
    slug: 'redis',
    name: 'Redis 學習筆記',
    enName: 'Redis — Learning Notes',
    blurb: '從資料結構到叢集——快取模式、持久化、複寫、Sentinel 與分散式鎖,一次看懂 Redis 全貌。',
    enBlurb: "From data structures to clusters — cache patterns, persistence, replication, Sentinel and distributed locks; the whole of Redis in one pass.",
    color: 'var(--hue-amber)',
  },
  {
    slug: 'kafka',
    name: 'Kafka 學習筆記',
    enName: 'Kafka — Learning Notes',
    blurb: '事件串流的核心:topic 與分區、傳遞語義、生態系與維運。',
    enBlurb: "The core of event streaming: topics and partitions, delivery semantics, the ecosystem, and operations.",
    color: 'var(--hue-amber)',
  },
  {
    slug: 'spark',
    name: 'Spark 學習筆記',
    enName: 'Spark — Learning Notes',
    blurb: '分散式運算從入門到執行計畫:DataFrame、Spark SQL 與 .explain() 到底在說什麼。',
    enBlurb: "Distributed computing from first steps to execution plans: DataFrames, Spark SQL, and what .explain() is actually telling you.",
    color: 'var(--hue-amber)',
  },
  {
    slug: 'airflow',
    name: 'Airflow 學習筆記',
    enName: 'Airflow — Learning Notes',
    blurb: '工作流程編排:從第一個 DAG、排程、控制流,到測試、部署與可靠度。',
    enBlurb: "Workflow orchestration: from the first DAG, scheduling and control flow, to testing, deployment and reliability.",
    color: 'var(--hue-amber)',
  },
  {
    slug: 'k8s',
    name: 'Kubernetes 學習筆記',
    enName: 'Kubernetes — Learning Notes',
    blurb: '容器編排從 Pod 到叢集管理:Service、Ingress、儲存、排程、RBAC 與疑難排解。',
    enBlurb: "Container orchestration from Pods to cluster management: Services, Ingress, storage, scheduling, RBAC and troubleshooting.",
    color: 'var(--hue-amber)',
  },
  {
    slug: 'iac',
    name: 'Infrastructure as Code 讀書筆記',
    enName: 'Infrastructure as Code — Reading Notes',
    blurb: '讀 Kief Morris 的 IaC(3rd ed.)——工具背後不會過期的原則:變更成本、爆炸半徑、宣告式思維與 pipeline 交付。',
    enBlurb: "Reading Kief Morris's Infrastructure as Code (3rd ed.) — the principles behind the tools that don't expire: cost of change, blast radius, declarative thinking and pipeline delivery.",
    color: 'var(--hue-amber)',
  },
  {
    slug: 'ansible',
    name: 'Ansible for DevOps 讀書筆記',
    enName: 'Ansible for DevOps — Reading Notes',
    blurb: '把維運知識從人腦搬進版本控制:冪等、宣告式、可重跑、可審查的組態管理。',
    enBlurb: "Moving operational knowledge out of people's heads and into version control: idempotent, declarative, rerunnable, reviewable configuration management.",
    color: 'var(--hue-amber)',
  },
  {
    slug: 'infra',
    name: '從 Infra 角度看資料工具',
    enName: 'Data Tools Through an Infra Lens',
    blurb: '換一個視角——把資料工具當 infra 養:部署、維運與平台化。',
    enBlurb: "A change of lens — treating data tools as infrastructure to run: deployment, operations and platform-building.",
    color: 'var(--hue-amber)',
  },
  {
    slug: 'sre',
    name: 'Google SRE 讀書筆記',
    enName: 'Google SRE — Reading Notes',
    blurb: '讀 Google SRE:SLO、告警、On-call、過載與發布工程,把可靠度變成工程紀律。',
    enBlurb: "Reading Google's SRE book: SLOs, alerting, on-call, overload and release engineering — turning reliability into engineering discipline.",
    color: 'var(--hue-pink)',
  },
  {
    slug: 'obs',
    name: 'Grafana LGTM 可觀測性',
    enName: 'Observability with the Grafana LGTM Stack',
    blurb: '用 Grafana LGTM(Loki、Tempo、Mimir/Prometheus)把 metrics、logs、traces 接成一套可觀測性。',
    enBlurb: "Wiring metrics, logs and traces into one observability system with Grafana LGTM (Loki, Tempo, Mimir/Prometheus).",
    color: 'var(--hue-pink)',
  },
  {
    slug: 'rezero',
    name: 'Re:從零開始做直播代購電商平台',
    enName: 'Re:Building a Live-Commerce Platform from Zero',
    blurb: '戰爭故事:拿真實做過的直播代購電商平台重打一次——留言下單、庫存、金流物流;當年怎麼做、重來怎麼設計。',
    enBlurb: "War stories: rebuilding a real live-commerce platform — ordering by comment, inventory, payments and fulfillment; how it was done then, how I'd design it now.",
    color: 'var(--hue-lime)',
  },
  {
    slug: 'btl',
    name: '成為 Tech Leader 讀書筆記',
    enName: 'Becoming a Tech Leader — Reading Notes',
    blurb: '讀《成為 Tech Leader》——寫給正在或即將帶人的工程師的筆記與反思。',
    enBlurb: "Reading Becoming a Tech Leader — notes and reflections for engineers who are, or are about to be, leading people.",
    color: 'var(--hue-grey)',
  },
  {
    slug: 'ai-craft',
    name: '帶 AI 的手藝(2026)',
    enName: 'The Craft of Working with AI (2026)',
    blurb: '一個同時帶人也帶 AI 的 EM,把 AI 協作當一門手藝拆開:責任、規範、驗收、護欄與品味。掛上年份,因為這門手藝正在快速變形。',
    enBlurb: "An EM who leads people and AI at once takes AI collaboration apart as a craft: responsibility, standards, acceptance, guardrails and taste. Dated, because the craft is changing fast.",
    color: 'var(--hue-grey)',
  },
];

export const seriesBySlug = new Map(seriesList.map((s) => [s.slug, s]));
// Keyed by both language's series string, so a post resolves to its entry
// whichever locale it was written in.
export const seriesByName = new Map<string, SeriesInfo>(
  seriesList.flatMap((s) => {
    const entries: [string, SeriesInfo][] = [[s.name, s]];
    if (s.enName) entries.push([s.enName, s]);
    return entries;
  }),
);
