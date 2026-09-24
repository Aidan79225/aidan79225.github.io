import type { Locale } from '../lib/i18n';

// Copy for /consulting/ and /en/consulting/. Both pages render the same
// component (src/components/consulting/ConsultingPage.astro); only the text
// differs, so it lives here side by side to keep the two in step.

interface Service {
  icon: string;
  title: string;
  desc: string;
  deliverable: string;
}

interface Proof {
  stat: string;
  label: string;
}

interface Reading {
  title: string;
  href: string;
}

interface Faq {
  q: string;
  a: string;
}

export interface ConsultingCopy {
  title: string;
  description: string;
  eyebrow: string;
  headline: string;
  lede: string;
  cta: string;
  servicesTitle: string;
  services: Service[];
  deliverableLabel: string;
  proofTitle: string;
  proof: Proof[];
  readingTitle: string;
  readingIntro: string;
  reading: Reading[];
  processTitle: string;
  process: string[];
  faqTitle: string;
  faq: Faq[];
  formTitle: string;
  formIntro: string;
  aboutLink: string;
}

export const consulting: Record<Locale, ConsultingCopy> = {
  'zh-hant': {
    title: '技術顧問',
    description:
      '資料平台、後端架構、SRE 與技術團隊的顧問服務 —— 幫成長中的團隊把系統從「能跑」變成「撐得住」。',
    eyebrow: 'Consulting',
    headline: '把系統從「能跑」變成「撐得住」',
    lede:
      '我幫 10–200 人規模的團隊處理資料平台、後端架構與可靠度的問題,也陪 Tech Lead / EM 把團隊的運作方式建起來。十多年從 GPU 運算、Android、電商後端一路做到資料工程與 SRE,看過系統在不同階段怎麼長歪、又怎麼拉回來。',
    cta: '聊聊你的狀況 →',
    servicesTitle: '可以怎麼合作',
    deliverableLabel: '交付:',
    services: [
      {
        icon: '🩺',
        title: '架構健檢',
        desc: '針對資料管線(Airflow / Spark / dbt)或後端(Django / PostgreSQL / Redis)做一次完整盤點:瓶頸在哪、風險在哪、先修什麼。',
        deliverable: '書面報告 + 優先順序清單 + 一次說明會',
      },
      {
        icon: '🛟',
        title: '可靠度盤點',
        desc: 'Kubernetes、Kafka / Redis / RabbitMQ cluster、監控告警、on-call 與事故流程。把「靠某個人記得」的東西變成系統。',
        deliverable: 'SLO 建議、告警整理、runbook 範本',
      },
      {
        icon: '🧭',
        title: 'Tech Lead / EM 陪跑',
        desc: '每月固定 1:1,一起處理 code review 制度、技術選型、開發流程、團隊分工與帶人的問題。',
        deliverable: '按月進行,可隨時調整或暫停',
      },
      {
        icon: '☕',
        title: '單次諮詢',
        desc: '60–90 分鐘線上會議,針對一個具體問題深入討論。適合想先試試合作方式,或只需要第二意見的時候。',
        deliverable: '會後附重點整理',
      },
    ],
    proofTitle: '做過的事',
    proof: [
      { stat: 'NT$1 億+', label: '從零打造的電商後端,支撐的金流月處理量' },
      { stat: '6 人', label: '目前帶領的資料工程團隊,兼任 interim SRE' },
      { stat: '−25%', label: '重新設計 WebRTC signaling 後的啟動時間' },
      { stat: '+57%', label: '導入 Elasticsearch 後的搜尋效能提升' },
    ],
    readingTitle: '先看看我怎麼想',
    readingIntro: '合作前最好的了解方式,是讀我寫的東西。這幾個系列最貼近顧問會處理的問題:',
    reading: [
      { title: 'Airflow 學習筆記', href: '/start/#airflow' },
      { title: '從 Infra 角度看資料工具', href: '/start/#infra' },
      { title: 'Google SRE 讀書筆記', href: '/start/#sre' },
      { title: '成為 Tech Leader 讀書筆記', href: '/start/#btl' },
      { title: 'An Elegant Puzzle 讀書筆記', href: '/start/#aep' },
    ],
    processTitle: '合作流程',
    process: [
      '填下方表單,簡單描述你的狀況。',
      '免費 30 分鐘線上初談,確認問題與我幫不幫得上忙。',
      '我提出範圍、時程與報價,你確認後開始。',
      '執行與交付;結束後保留一段時間可以追問。',
    ],
    faqTitle: '常見問題',
    faq: [
      {
        q: '遠端還是到場?',
        a: '以遠端為主(Google Meet / Zoom)。台北地區需要到場的話可以討論。',
      },
      {
        q: '可以簽 NDA 嗎?',
        a: '可以。看系統或程式碼之前,通常會先簽保密協議。',
      },
      {
        q: '費用怎麼算?',
        a: '依範圍報價:單次諮詢按次計費,健檢與盤點按專案,陪跑按月。初談後會給你明確的數字,不會有意外的追加費用。',
      },
      {
        q: '可以用英文溝通嗎?',
        a: '可以,中文與英文都沒問題。',
      },
      {
        q: '什麼樣的案子你不接?',
        a: '與我目前任職公司業務重疊或有利益衝突的案子;還有純外包寫功能、沒有架構或流程成分的開發工作。',
      },
    ],
    formTitle: '聊聊你的狀況',
    formIntro: '三個步驟,大約兩分鐘。我會在 2 個工作天內回覆。',
    aboutLink: '完整經歷看 About →',
  },
  en: {
    title: 'Consulting',
    description:
      'Consulting on data platforms, backend architecture, SRE and engineering teams — helping growing teams take systems from "it runs" to "it holds up".',
    eyebrow: 'Consulting',
    headline: 'From "it runs" to "it holds up"',
    lede:
      "I help teams of 10–200 people untangle data platforms, backend architecture and reliability, and I work with tech leads and EMs on how their teams operate. Over a decade — from GPU computing and Android to e-commerce backends, data engineering and SRE — I've seen how systems drift at each stage, and how to pull them back.",
    cta: "Tell me what you're facing →",
    servicesTitle: 'Ways to work together',
    deliverableLabel: 'You get: ',
    services: [
      {
        icon: '🩺',
        title: 'Architecture review',
        desc: 'A thorough look at your data pipelines (Airflow / Spark / dbt) or backend (Django / PostgreSQL / Redis): where the bottlenecks are, where the risks are, and what to fix first.',
        deliverable: 'Written report, prioritised action list, and a walkthrough session',
      },
      {
        icon: '🛟',
        title: 'Reliability assessment',
        desc: 'Kubernetes, Kafka / Redis / RabbitMQ clusters, monitoring and alerting, on-call and incident process — turning "someone remembers how" into a system.',
        deliverable: 'SLO proposals, alert cleanup, runbook templates',
      },
      {
        icon: '🧭',
        title: 'Tech lead / EM advisory',
        desc: 'Regular monthly 1:1s covering code review practice, technical decisions, delivery process, team structure and growing people.',
        deliverable: 'Month to month — adjust or pause any time',
      },
      {
        icon: '☕',
        title: 'Single session',
        desc: 'A 60–90 minute call focused on one concrete problem. A good way to try working together, or to get a second opinion.',
        deliverable: 'Written notes after the call',
      },
    ],
    proofTitle: 'Track record',
    proof: [
      { stat: 'NT$100M+', label: 'monthly payment volume on e-commerce backends built from scratch' },
      { stat: '6', label: 'engineers on the data team I lead today, as interim SRE too' },
      { stat: '−25%', label: 'startup time after redesigning WebRTC signaling' },
      { stat: '+57%', label: 'search performance after introducing Elasticsearch' },
    ],
    readingTitle: 'See how I think',
    readingIntro:
      'The best way to get a feel for working with me is to read what I write. These series are closest to the problems consulting covers (mostly in Chinese):',
    reading: [
      { title: 'Airflow notes', href: '/en/start/#airflow' },
      { title: 'Data tools from an infra angle', href: '/en/start/#infra' },
      { title: 'Google SRE reading notes', href: '/en/start/#sre' },
      { title: 'Becoming a Technical Leader notes', href: '/en/start/#btl' },
      { title: 'An Elegant Puzzle notes', href: '/en/start/#aep' },
    ],
    processTitle: 'How it works',
    process: [
      'Fill in the form below with a short description of your situation.',
      "A free 30-minute intro call to confirm the problem and whether I'm the right fit.",
      'I propose scope, timeline and price; we start once you confirm.',
      'Work and delivery — with a follow-up window for questions afterwards.',
    ],
    faqTitle: 'FAQ',
    faq: [
      {
        q: 'Remote or on-site?',
        a: 'Mostly remote (Google Meet / Zoom). On-site in the Taipei area can be arranged.',
      },
      {
        q: 'Will you sign an NDA?',
        a: 'Yes — usually before I look at any system or code.',
      },
      {
        q: 'How is pricing set?',
        a: 'By scope: single sessions per session, reviews and assessments per project, advisory per month. You get a clear number after the intro call, with no surprise add-ons.',
      },
      {
        q: 'Which languages?',
        a: 'English and Mandarin Chinese.',
      },
      {
        q: "What won't you take on?",
        a: "Anything overlapping with, or conflicting with, my current employer's business; and pure feature outsourcing with no architecture or process component.",
      },
    ],
    formTitle: "Tell me what you're facing",
    formIntro: "Three short steps, about two minutes. I'll reply within 2 business days.",
    aboutLink: 'Full background on About →',
  },
};
