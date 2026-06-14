// Wraps the pure calculator engine with a running history log. Each successful
// '=' appends { id, expr, result } (newest first). No DOM, no React.
import { initialState, reduce } from './calculator.mjs';

const MAX_ENTRIES = 50;

export function initWithHistory() {
  return { ...initialState(), history: [], nextId: 1 };
}

export function reduceWithHistory(state, token) {
  const next = reduce(state, token);
  const records =
    token === '=' && next.justEvaluated && !next.error && next.display !== state.display;
  if (records) {
    const id = state.nextId;
    const entry = { id, expr: state.display, result: next.display };
    return { ...next, history: [entry, ...state.history].slice(0, MAX_ENTRIES), nextId: id + 1 };
  }
  // Carry the log across every other token (digits, operators, C all keep it).
  return { ...next, history: state.history, nextId: state.nextId };
}
