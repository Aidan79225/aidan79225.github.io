import { useEffect, useRef, useState } from 'react';
import {
  TOPICS,
  COMPANY_SIZES,
  TIMELINES,
  BUDGETS,
  STEPS,
  EMPTY_FORM,
  validateStep,
  firstInvalidStep,
  toggleTopic,
  sanitizeDraft,
  formEndpoint,
  buildPayload,
} from '../../lib/consulting-form.mjs';

// Multi-step consulting inquiry form. Logic lives in lib/consulting-form.mjs;
// this file is rendering + submit. Without a Formspree id (PUBLIC_FORMSPREE_ID
// unset, e.g. local dev) the last step falls back to a prefilled mailto link.

const CONTACT_EMAIL = 'aidan79225@gmail.com';
const DRAFT_KEY = 'consulting-draft';

const STRINGS = {
  'zh-hant': {
    steps: ['想聊什麼', '你的情況', '聯絡方式'],
    stepOf: (i, n) => `第 ${i} / ${n} 步`,
    topicQ: '想聊的主題(可複選)',
    topics: {
      'data-platform': '資料平台 / 資料管線',
      backend: '後端架構',
      sre: 'SRE / 可靠度',
      leadership: 'Tech Lead / 團隊',
      other: '其他',
    },
    companySizeQ: '公司規模',
    companySizes: { '1-10': '1–10 人', '11-50': '11–50 人', '51-200': '51–200 人', '200+': '200 人以上' },
    timelineQ: '希望什麼時候開始',
    timelines: { asap: '越快越好', '1-3-months': '1–3 個月內', exploring: '先了解看看' },
    budgetQ: '預算區間',
    budgets: {
      'single-session': '先約一次諮詢',
      'under-100k': 'NT$10 萬以下',
      '100k-300k': 'NT$10–30 萬',
      'over-300k': 'NT$30 萬以上',
      unsure: '還不確定',
    },
    stackQ: '目前的技術棧(選填)',
    stackPh: '例如:Airflow、Spark、Django、Kubernetes…',
    nameQ: '怎麼稱呼你',
    emailQ: 'Email',
    companyQ: '公司 / 團隊(選填)',
    messageQ: '簡單描述遇到的問題',
    messagePh: '現在的狀況、卡在哪裡、希望達成什麼。寫得越具體,初談越有效率。',
    errors: {
      required: '這一題必填',
      email: 'Email 格式看起來不對',
      tooShort: '再多寫一點點(至少 20 字)',
    },
    back: '← 上一步',
    next: '下一步 →',
    submit: '送出',
    submitting: '送出中…',
    draftNote: '填到一半離開也沒關係,內容會暫存在這台裝置上。',
    successTitle: '收到了,謝謝!',
    successBody: '我通常會在 2 個工作天內用 Email 回覆你,約一個 30 分鐘的初談。',
    again: '再送一份',
    errorBody: '送出失敗了,可能是網路問題。可以稍後再試,或直接寄信給我:',
    mailtoNote: '表單服務尚未設定,按下方按鈕會用你的郵件程式開一封預先填好的信。',
    mailtoButton: '用 Email 寄出',
  },
  en: {
    steps: ['Topic', 'Context', 'Contact'],
    stepOf: (i, n) => `Step ${i} of ${n}`,
    topicQ: 'What would you like to talk about? (pick any)',
    topics: {
      'data-platform': 'Data platform / pipelines',
      backend: 'Backend architecture',
      sre: 'SRE / reliability',
      leadership: 'Tech lead / team',
      other: 'Something else',
    },
    companySizeQ: 'Company size',
    companySizes: { '1-10': '1–10', '11-50': '11–50', '51-200': '51–200', '200+': '200+' },
    timelineQ: 'When would you like to start?',
    timelines: { asap: 'As soon as possible', '1-3-months': 'Within 1–3 months', exploring: 'Just exploring' },
    budgetQ: 'Budget range',
    budgets: {
      'single-session': 'A single session first',
      'under-100k': 'Under NT$100k',
      '100k-300k': 'NT$100k–300k',
      'over-300k': 'Over NT$300k',
      unsure: 'Not sure yet',
    },
    stackQ: 'Current stack (optional)',
    stackPh: 'e.g. Airflow, Spark, Django, Kubernetes…',
    nameQ: 'Your name',
    emailQ: 'Email',
    companyQ: 'Company / team (optional)',
    messageQ: 'What are you running into?',
    messagePh: 'Where things stand, what is stuck, and what you want to get to. The more concrete, the more useful our first call.',
    errors: {
      required: 'This one is required',
      email: "That email doesn't look right",
      tooShort: 'A little more detail, please (20+ characters)',
    },
    back: '← Back',
    next: 'Next →',
    submit: 'Send',
    submitting: 'Sending…',
    draftNote: 'Your answers are saved on this device if you leave halfway.',
    successTitle: 'Got it — thank you!',
    successBody: "I usually reply by email within 2 business days to set up a 30-minute intro call.",
    again: 'Send another',
    errorBody: 'Something went wrong — possibly the network. Try again later, or email me directly:',
    mailtoNote: "The form service isn't configured yet — the button below opens a prefilled email instead.",
    mailtoButton: 'Send by email',
  },
};

function loadDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? sanitizeDraft(JSON.parse(raw)) : EMPTY_FORM;
  } catch {
    return EMPTY_FORM;
  }
}

function saveDraft(data) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(data));
  } catch {
    // Storage blocked (private mode etc.) — the form still works, just no draft.
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function mailtoHref(data, t) {
  const p = buildPayload(data, '');
  const lines = [
    `${t.topicQ}: ${data.topics.map((k) => t.topics[k]).join(', ')}`,
    `${t.companySizeQ}: ${t.companySizes[data.companySize] ?? ''}`,
    `${t.timelineQ}: ${t.timelines[data.timeline] ?? ''}`,
    `${t.budgetQ}: ${t.budgets[data.budget] ?? ''}`,
    p.stack ? `${t.stackQ}: ${p.stack}` : null,
    p.company ? `${t.companyQ}: ${p.company}` : null,
    '',
    p.message,
    '',
    `— ${p.name}`,
  ].filter((l) => l !== null);
  return `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(p._subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
}

// A row of pill-shaped radio / checkbox choices.
function Choices({ name, options, labels, selected, multiple, onPick, error, t }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2" role={multiple ? 'group' : 'radiogroup'} aria-invalid={!!error}>
        {options.map((opt) => {
          const on = multiple ? selected.includes(opt) : selected === opt;
          return (
            <label
              key={opt}
              className={`cursor-pointer select-none rounded-full border px-4 py-2 text-sm transition-colors ${
                on ? 'border-accent bg-accent text-white' : 'border-line bg-base text-ink hover:border-accent'
              }`}
            >
              <input
                type={multiple ? 'checkbox' : 'radio'}
                name={name}
                value={opt}
                checked={on}
                onChange={() => onPick(opt)}
                className="sr-only"
              />
              {labels[opt]}
            </label>
          );
        })}
      </div>
      {error && <p className="mt-2 text-sm text-red-500">{t.errors[error]}</p>}
    </div>
  );
}

function Field({ label, error, t, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {error && <span className="mt-1 block text-sm text-red-500">{t.errors[error]}</span>}
    </label>
  );
}

const inputClass =
  'w-full rounded-md border border-line bg-base px-3 py-2 text-ink placeholder:text-muted focus:border-accent focus:outline-none';

export default function ContactForm({ locale = 'zh-hant', formId = '' }) {
  const t = STRINGS[locale] ?? STRINGS['zh-hant'];
  const endpoint = formEndpoint(formId);
  const [data, setData] = useState(EMPTY_FORM);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [status, setStatus] = useState('idle'); // idle | submitting | success | error
  const [gotcha, setGotcha] = useState('');
  const loaded = useRef(false);
  const top = useRef(null);

  // Restore the draft after mount (localStorage isn't available during SSR).
  useEffect(() => {
    setData(loadDraft());
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (loaded.current && status !== 'success') saveDraft(data);
  }, [data, status]);

  const set = (key, value) => {
    setData((d) => ({ ...d, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const goTo = (i) => {
    setStep(i);
    setErrors({});
    top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const next = () => {
    const errs = validateStep(STEPS[step], data);
    setErrors(errs);
    if (Object.keys(errs).length === 0) goTo(step + 1);
  };

  const submit = async (e) => {
    e.preventDefault();
    if (step < STEPS.length - 1) return next();
    const bad = firstInvalidStep(data);
    if (bad !== -1) {
      setStep(bad);
      setErrors(validateStep(STEPS[bad], data));
      return;
    }
    if (!endpoint) {
      window.location.href = mailtoHref(data, t);
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...buildPayload(data, locale), _gotcha: gotcha }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      clearDraft();
      setStatus('success');
    } catch {
      setStatus('error');
    }
  };

  const reset = () => {
    setData(EMPTY_FORM);
    setStep(0);
    setErrors({});
    setStatus('idle');
  };

  if (status === 'success') {
    return (
      <div ref={top} className="rounded-lg border border-accent bg-surface p-6 text-center" role="status">
        <p className="mb-2 text-2xl">✉️</p>
        <p className="mb-2 text-lg font-bold text-ink">{t.successTitle}</p>
        <p className="mb-4 text-muted">{t.successBody}</p>
        <button type="button" onClick={reset} className="text-sm text-accent hover:underline">
          {t.again}
        </button>
      </div>
    );
  }

  const stepName = STEPS[step];
  const last = step === STEPS.length - 1;

  return (
    <form ref={top} onSubmit={submit} noValidate className="scroll-mt-4 rounded-lg border border-line bg-surface p-5 sm:p-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-medium text-ink">{t.steps[step]}</span>
          <span className="text-muted">{t.stepOf(step + 1, STEPS.length)}</span>
        </div>
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-colors duration-300 ${i <= step ? 'bg-accent' : 'bg-line'}`}
            />
          ))}
        </div>
      </div>

      {/* Honeypot: invisible to people, bots fill it and Formspree drops the submission. */}
      <input
        type="text"
        name="_gotcha"
        value={gotcha}
        onChange={(e) => setGotcha(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <div key={stepName} className="consulting-step space-y-6">
        {stepName === 'topic' && (
          <fieldset>
            <legend className="mb-3 font-medium text-ink">{t.topicQ}</legend>
            <Choices
              name="topics"
              options={TOPICS}
              labels={t.topics}
              selected={data.topics}
              multiple
              onPick={(v) => set('topics', toggleTopic(data.topics, v))}
              error={errors.topics}
              t={t}
            />
          </fieldset>
        )}

        {stepName === 'context' && (
          <>
            <fieldset>
              <legend className="mb-3 font-medium text-ink">{t.companySizeQ}</legend>
              <Choices name="companySize" options={COMPANY_SIZES} labels={t.companySizes}
                selected={data.companySize} onPick={(v) => set('companySize', v)} error={errors.companySize} t={t} />
            </fieldset>
            <fieldset>
              <legend className="mb-3 font-medium text-ink">{t.timelineQ}</legend>
              <Choices name="timeline" options={TIMELINES} labels={t.timelines}
                selected={data.timeline} onPick={(v) => set('timeline', v)} error={errors.timeline} t={t} />
            </fieldset>
            <fieldset>
              <legend className="mb-3 font-medium text-ink">{t.budgetQ}</legend>
              <Choices name="budget" options={BUDGETS} labels={t.budgets}
                selected={data.budget} onPick={(v) => set('budget', v)} error={errors.budget} t={t} />
            </fieldset>
            <Field label={t.stackQ} t={t}>
              <input className={inputClass} value={data.stack} placeholder={t.stackPh}
                onChange={(e) => set('stack', e.target.value)} />
            </Field>
          </>
        )}

        {stepName === 'contact' && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t.nameQ} error={errors.name} t={t}>
                <input className={inputClass} value={data.name} autoComplete="name"
                  onChange={(e) => set('name', e.target.value)} />
              </Field>
              <Field label={t.emailQ} error={errors.email} t={t}>
                <input className={inputClass} type="email" value={data.email} autoComplete="email"
                  onChange={(e) => set('email', e.target.value)} />
              </Field>
            </div>
            <Field label={t.companyQ} t={t}>
              <input className={inputClass} value={data.company} autoComplete="organization"
                onChange={(e) => set('company', e.target.value)} />
            </Field>
            <Field label={t.messageQ} error={errors.message} t={t}>
              <textarea className={`${inputClass} min-h-36`} value={data.message} placeholder={t.messagePh}
                onChange={(e) => set('message', e.target.value)} />
            </Field>
          </>
        )}
      </div>

      {status === 'error' && (
        <p className="mt-4 text-sm text-red-500" role="alert">
          {t.errorBody} <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent hover:underline">{CONTACT_EMAIL}</a>
        </p>
      )}
      {last && !endpoint && <p className="mt-4 text-sm text-muted">{t.mailtoNote}</p>}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button type="button" onClick={() => goTo(step - 1)} className="text-sm text-muted hover:text-ink">
            {t.back}
          </button>
        ) : (
          <span className="text-xs text-muted">{t.draftNote}</span>
        )}
        <button
          type="submit"
          disabled={status === 'submitting'}
          className="rounded-md bg-accent px-5 py-2 font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {!last ? t.next : !endpoint ? t.mailtoButton : status === 'submitting' ? t.submitting : t.submit}
        </button>
      </div>
    </form>
  );
}
