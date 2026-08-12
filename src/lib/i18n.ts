// Minimal i18n layer. Two locales: the site's native zh-Hant (unprefixed
// URLs, the default for everything) and English under /en/. English posts are
// opt-in, per-file translations living in src/content/blog/en/ — see
// docs/i18n.md for the workflow. UI strings used by layouts/components live
// here so templates stay declarative.
export type Locale = 'zh-hant' | 'en';

export const DEFAULT_LOCALE: Locale = 'zh-hant';
export const LOCALES: Locale[] = ['zh-hant', 'en'];

// Per-locale values for the various places a language identifier is spelled
// differently: <html lang>, og:locale, and toLocaleDateString.
export const HTML_LANG: Record<Locale, string> = { 'zh-hant': 'zh-Hant', en: 'en' };
export const OG_LOCALE: Record<Locale, string> = { 'zh-hant': 'zh_TW', en: 'en_US' };
export const DATE_LOCALE: Record<Locale, string> = { 'zh-hant': 'zh-TW', en: 'en-US' };

export const ui = {
  'zh-hant': {
    updatedOn: '更新於',
    seriesLabel: '📚 系列:',
    thisPost: '(本篇)',
    referencedIn: '🔗 被引用於',
    minutes: (n: number) => `約 ${n} 分鐘`,
    // Footer: 本文採用 <CC BY 4.0> 授權
    licensePrefix: '本文採用 ',
    licenseSuffix: ' 授權',
    // Shown on a zh post that has an English translation.
    translationNote: '這篇文章也有英文版:',
    translationLink: 'Read in English →',
  },
  en: {
    updatedOn: 'Updated',
    seriesLabel: '📚 Series: ',
    thisPost: ' (this post)',
    referencedIn: '🔗 Referenced in',
    minutes: (n: number) => `${n} min read`,
    licensePrefix: 'Content licensed under ',
    licenseSuffix: '',
    // Shown on an English post, pointing back at the zh original.
    translationNote: 'Translated from the Chinese original:',
    translationLink: '閱讀中文版 →',
  },
} as const;
