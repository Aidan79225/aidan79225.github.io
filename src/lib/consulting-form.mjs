// Consulting inquiry form: the step definitions, validation and submit
// payload, kept free of React so they can be unit-tested. The component
// (src/components/consulting/ContactForm.jsx) only renders these.
//
// Submission currently goes to Formspree (a hosted form backend, since GitHub
// Pages has no server). Everything Formspree-specific lives in
// `formEndpoint()` / `buildPayload()` — moving to our own endpoint later
// (e.g. a Cloudflare Worker at /api/contact) means changing those two only.

// Option values are stable English keys (what lands in the inbox and, later,
// in a database); labels are per locale.
export const TOPICS = ['data-platform', 'backend', 'sre', 'leadership', 'other'];
export const COMPANY_SIZES = ['1-10', '11-50', '51-200', '200+'];
export const TIMELINES = ['asap', '1-3-months', 'exploring'];
export const BUDGETS = ['single-session', 'under-100k', '100k-300k', 'over-300k', 'unsure'];

export const STEPS = ['topic', 'context', 'contact'];

export const EMPTY_FORM = {
  topics: [],
  companySize: '',
  timeline: '',
  budget: '',
  stack: '',
  name: '',
  email: '',
  company: '',
  message: '',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MESSAGE_MIN = 20;

// Returns { field: errorKey } for the given step; empty object = step valid.
// Error keys are looked up in the component's per-locale strings.
export function validateStep(step, data) {
  const errors = {};
  if (step === 'topic') {
    if (!data.topics?.length) errors.topics = 'required';
  } else if (step === 'context') {
    if (!data.companySize) errors.companySize = 'required';
    if (!data.timeline) errors.timeline = 'required';
    if (!data.budget) errors.budget = 'required';
  } else if (step === 'contact') {
    if (!data.name?.trim()) errors.name = 'required';
    if (!data.email?.trim()) errors.email = 'required';
    else if (!EMAIL_RE.test(data.email.trim())) errors.email = 'email';
    if ((data.message?.trim().length ?? 0) < MESSAGE_MIN) errors.message = 'tooShort';
  }
  return errors;
}

export function validateAll(data) {
  return Object.assign({}, ...STEPS.map((s) => validateStep(s, data)));
}

// Index of the first step with an error, or -1 when the whole form is valid.
export function firstInvalidStep(data) {
  return STEPS.findIndex((s) => Object.keys(validateStep(s, data)).length > 0);
}

export function toggleTopic(topics, topic) {
  return topics.includes(topic) ? topics.filter((t) => t !== topic) : [...topics, topic];
}

// Draft restore: keep only known fields of the right type, so a stale or
// hand-edited localStorage entry can't inject junk into the form.
export function sanitizeDraft(raw) {
  const out = { ...EMPTY_FORM };
  if (!raw || typeof raw !== 'object') return out;
  for (const key of Object.keys(EMPTY_FORM)) {
    if (key === 'topics') {
      if (Array.isArray(raw.topics)) out.topics = raw.topics.filter((t) => TOPICS.includes(t));
    } else if (typeof raw[key] === 'string') {
      out[key] = raw[key];
    }
  }
  return out;
}

export function formEndpoint(formId) {
  const id = (formId ?? '').trim();
  return id ? `https://formspree.io/f/${encodeURIComponent(id)}` : '';
}

// Flat JSON body for the submit request. `_subject` and `_replyto` are
// Formspree conventions (email subject line / reply-to header).
export function buildPayload(data, locale) {
  const name = data.name.trim();
  const email = data.email.trim();
  return {
    name,
    email,
    company: data.company.trim(),
    topics: data.topics.join(', '),
    companySize: data.companySize,
    timeline: data.timeline,
    budget: data.budget,
    stack: data.stack.trim(),
    message: data.message.trim(),
    locale,
    _subject: `[Consulting] ${name} — ${data.topics.join(', ')}`,
    _replyto: email,
  };
}
