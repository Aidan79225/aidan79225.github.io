import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initWithHistory, reduceWithHistory } from '../src/lib/calculator-history.mjs';

const run = (tokens) => tokens.reduce(reduceWithHistory, initWithHistory());

test('history starts empty', () => {
  assert.deepEqual(initWithHistory().history, []);
});

test('= records the evaluated expression and its result', () => {
  const s = run(['2', '+', '3', '×', '4', '=']);
  assert.equal(s.history.length, 1);
  assert.equal(s.history[0].expr, '2+3×4');
  assert.equal(s.history[0].result, '14');
});

test('results accumulate newest-first with unique ids', () => {
  const s = run(['1', '+', '1', '=', '2', '×', '3', '=']);
  assert.equal(s.history.length, 2);
  assert.equal(s.history[0].expr, '2×3');
  assert.equal(s.history[0].result, '6');
  assert.equal(s.history[1].result, '2');
  assert.notEqual(s.history[0].id, s.history[1].id);
});

test('errors are not recorded', () => {
  const s = run(['5', '÷', '0', '=']);
  assert.equal(s.history.length, 0);
});

test('pressing = with nothing to compute records nothing; repeated = does not double-record', () => {
  assert.equal(run(['=']).history.length, 0);
  assert.equal(run(['2', '+', '3', '=', '=']).history.length, 1); // second = is a no-op
});

test('C clears the current entry but keeps the history log', () => {
  const s = run(['1', '+', '1', '=', 'C']);
  assert.equal(s.history.length, 1);
  assert.equal(s.display, '0');
});
