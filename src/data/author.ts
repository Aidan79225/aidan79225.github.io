import type { Locale } from '../lib/i18n';

// Author card + Person schema. `bio` is per locale so the card under an
// English post (and /en/about/'s JSON-LD) reads in English instead of falling
// back to the Chinese line.
export const author = {
  name: 'Aidan Wang',
  avatar: '/assets/images/avatar.webp',
  bio: {
    'zh-hant': 'Engineering Manager,用一張圖加精簡的文字,把複雜的系統講清楚',
    en: 'Engineering Manager — explaining complex systems with one diagram and concise text',
  } satisfies Record<Locale, string>,
  location: 'Taiwan',
  links: [
    { label: 'GitHub', url: 'https://github.com/aidan79225' },
    { label: 'LinkedIn', url: 'https://www.linkedin.com/in/aidan79225/' },
  ],
};
