import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_FORM,
  validateStep,
  validateAll,
  firstInvalidStep,
  toggleTopic,
  sanitizeDraft,
  formEndpoint,
  buildPayload,
} from '../src/lib/consulting-form.mjs';

const filled = {
  ...EMPTY_FORM,
  topics: ['data-platform', 'sre'],
  companySize: '11-50',
  timeline: 'asap',
  budget: 'unsure',
  stack: ' Airflow, Spark ',
  name: ' Alice ',
  email: ' alice@example.com ',
  company: ' Acme ',
  message: '我們的 Airflow DAG 常常卡住,想請你幫忙看一下整體架構。',
};

test('an empty form fails at the first step', () => {
  assert.deepEqual(validateStep('topic', EMPTY_FORM), { topics: 'required' });
  assert.equal(firstInvalidStep(EMPTY_FORM), 0);
});

test('context step requires size, timeline and budget', () => {
  assert.deepEqual(validateStep('context', { ...filled, companySize: '', budget: '' }), {
    companySize: 'required',
    budget: 'required',
  });
});

test('contact step checks email format and message length', () => {
  assert.deepEqual(validateStep('contact', { ...filled, email: 'nope', message: 'hi' }), {
    email: 'email',
    message: 'tooShort',
  });
  assert.deepEqual(validateStep('contact', { ...filled, name: '   ', email: '' }), {
    name: 'required',
    email: 'required',
  });
});

test('a fully filled form is valid', () => {
  assert.deepEqual(validateAll(filled), {});
  assert.equal(firstInvalidStep(filled), -1);
});

test('firstInvalidStep points at the earliest broken step', () => {
  assert.equal(firstInvalidStep({ ...filled, timeline: '', name: '' }), 1);
  assert.equal(firstInvalidStep({ ...filled, name: '' }), 2);
});

test('toggleTopic adds and removes without mutating', () => {
  const start = ['sre'];
  assert.deepEqual(toggleTopic(start, 'backend'), ['sre', 'backend']);
  assert.deepEqual(toggleTopic(start, 'sre'), []);
  assert.deepEqual(start, ['sre']);
});

test('sanitizeDraft keeps known fields and drops junk', () => {
  const d = sanitizeDraft({ name: 'Bob', topics: ['sre', 'hacking'], budget: 42, evil: 'x' });
  assert.equal(d.name, 'Bob');
  assert.deepEqual(d.topics, ['sre']);
  assert.equal(d.budget, '');
  assert.equal('evil' in d, false);
  assert.deepEqual(sanitizeDraft(null), EMPTY_FORM);
  assert.deepEqual(sanitizeDraft('garbage'), EMPTY_FORM);
});

test('formEndpoint is empty without an id', () => {
  assert.equal(formEndpoint(''), '');
  assert.equal(formEndpoint(undefined), '');
  assert.equal(formEndpoint(' abcd1234 '), 'https://formspree.io/f/abcd1234');
});

test('buildPayload trims fields and sets subject / reply-to', () => {
  const p = buildPayload(filled, 'zh-hant');
  assert.equal(p.name, 'Alice');
  assert.equal(p.email, 'alice@example.com');
  assert.equal(p.company, 'Acme');
  assert.equal(p.stack, 'Airflow, Spark');
  assert.equal(p.topics, 'data-platform, sre');
  assert.equal(p._replyto, 'alice@example.com');
  assert.equal(p._subject, '[Consulting] Alice — data-platform, sre');
  assert.equal(p.locale, 'zh-hant');
});
