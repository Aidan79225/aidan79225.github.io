import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initialState, reduce } from '../src/lib/calculator.mjs';

// Feed a sequence of tokens through reduce, return final state.
function run(tokens) {
  return tokens.reduce(reduce, initialState());
}
const display = (tokens) => run(tokens).display;

test('initial display is 0', () => {
  assert.equal(initialState().display, '0');
});

test('typing digits builds the entry', () => {
  assert.equal(display(['1', '2', '3']), '123');
});

test('leading zero is replaced by the next digit', () => {
  assert.equal(display(['0', '5']), '5');
  assert.equal(display(['0', '0']), '0');
});

test('decimal point is added once; a second dot is ignored', () => {
  assert.equal(display(['1', '.', '5']), '1.5');
  assert.equal(display(['1', '.', '5', '.', '2']), '1.52');
});

test('a leading dot becomes 0.', () => {
  assert.equal(display(['.', '5']), '0.5');
});

test('expression string grows as operators are added', () => {
  assert.equal(display(['2', '+', '3', '×', '4']), '2+3×4');
});

test('nothing is computed until = is pressed', () => {
  // before '=' the display is still the expression, not 5
  assert.equal(display(['2', '+', '3']), '2+3');
});

test('= evaluates with precedence: 2+3×4 = 14', () => {
  assert.equal(display(['2', '+', '3', '×', '4', '=']), '14');
});

test('= respects left-to-right within a level: 8÷4÷2 = 1', () => {
  assert.equal(display(['8', '÷', '4', '÷', '2', '=']), '1');
});

test('subtraction and addition: 10-3+1 = 8', () => {
  assert.equal(display(['1', '0', '-', '3', '+', '1', '=']), '8');
});

test('a second operator replaces the pending one', () => {
  assert.equal(display(['5', '+', '-', '2', '=']), '3');
});

test('after =, a digit starts a fresh expression', () => {
  const s = run(['2', '+', '3', '=']);      // display 5
  const s2 = reduce(s, '7');
  assert.equal(s2.display, '7');
});

test('after =, an operator continues from the result', () => {
  const s = run(['2', '+', '3', '=']);      // 5
  const s2 = ['×', '4', '='].reduce(reduce, s);
  assert.equal(s2.display, '20');
});

test('divide by zero shows Error', () => {
  assert.equal(display(['5', '÷', '0', '=']), 'Error');
});

test('Error is cleared by starting a new number', () => {
  const s = run(['5', '÷', '0', '=']);      // Error
  const s2 = reduce(s, '9');
  assert.equal(s2.display, '9');
});

test('C resets everything', () => {
  assert.equal(display(['1', '2', '+', '3', 'C']), '0');
});

test('trailing operator before = is ignored: 2+ = 2', () => {
  assert.equal(display(['2', '+', '=']), '2');
});

test('float noise is rounded: 0.1+0.2 = 0.3', () => {
  assert.equal(display(['0', '.', '1', '+', '0', '.', '2', '=']), '0.3');
});
