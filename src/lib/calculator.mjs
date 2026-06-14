// Pure 4-function calculator engine. No DOM, no React.
// Builds an expression of tokens and evaluates only on '='. × ÷ bind before + −.

const OPERATORS = new Set(['+', '-', '×', '÷']);

export function initialState() {
  return {
    tokens: [],        // committed expression: [number, op, number, op, ...]
    entry: '',         // number currently being typed
    display: '0',
    justEvaluated: false,
    error: false,
    lastResult: 0,
  };
}

function exprString(tokens, entry) {
  const s = tokens.map(String).join('') + entry;
  return s === '' ? '0' : s;
}

function appendDigit(entry, d) {
  if (entry === '0') return d === '0' ? '0' : d;
  return entry + d;
}

// Evaluate [num, op, num, op, ...] with precedence. Throws on divide-by-zero.
function evalExpression(tokens) {
  const pass1 = [tokens[0]];
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i];
    const num = tokens[i + 1];
    if (op === '×') {
      pass1[pass1.length - 1] *= num;
    } else if (op === '÷') {
      if (num === 0) throw new Error('divide by zero');
      pass1[pass1.length - 1] /= num;
    } else {
      pass1.push(op, num);
    }
  }
  let acc = pass1[0];
  for (let i = 1; i < pass1.length; i += 2) {
    acc = pass1[i] === '+' ? acc + pass1[i + 1] : acc - pass1[i + 1];
  }
  return acc;
}

function formatResult(n) {
  if (!Number.isFinite(n)) return 'Error';
  const rounded = Number(n.toPrecision(12));
  let s = String(rounded);
  if (s.replace(/[-.]/g, '').length > 12) s = rounded.toExponential(6);
  return s;
}

function inputDigit(state, d) {
  const base = state.error || state.justEvaluated ? initialState() : state;
  const entry = appendDigit(base.entry, d);
  return { ...base, entry, justEvaluated: false, display: exprString(base.tokens, entry) };
}

function inputDot(state) {
  const base = state.error || state.justEvaluated ? initialState() : state;
  let entry = base.entry;
  if (entry === '') entry = '0.';
  else if (entry.includes('.')) entry = entry; // ignore second dot
  else entry = entry + '.';
  return { ...base, entry, justEvaluated: false, display: exprString(base.tokens, entry) };
}

function inputOperator(state, op) {
  if (state.error) return state;
  let tokens;
  let entry = '';
  if (state.justEvaluated) {
    tokens = [state.lastResult];
  } else {
    tokens = state.tokens.slice();
  }
  if (state.entry !== '' && !state.justEvaluated) {
    tokens.push(Number(state.entry));
  }
  const last = tokens[tokens.length - 1];
  if (tokens.length === 0) return state;            // nothing to operate on
  if (typeof last === 'string') tokens[tokens.length - 1] = op; // replace operator
  else tokens.push(op);
  return { ...state, tokens, entry, justEvaluated: false, error: false, display: exprString(tokens, '') };
}

function evaluate(state) {
  if (state.error) return state;
  const tokens = state.tokens.slice();
  if (state.entry !== '') tokens.push(Number(state.entry));
  if (typeof tokens[tokens.length - 1] === 'string') tokens.pop(); // drop trailing operator
  if (tokens.length === 0) return state;
  let result;
  try {
    result = evalExpression(tokens);
  } catch {
    return { ...initialState(), error: true, display: 'Error' };
  }
  if (!Number.isFinite(result)) return { ...initialState(), error: true, display: 'Error' };
  return { ...initialState(), display: formatResult(result), lastResult: result, justEvaluated: true };
}

export function reduce(state, token) {
  if (token === 'C') return initialState();
  if (token === '=') return evaluate(state);
  if (token === '.') return inputDot(state);
  if (OPERATORS.has(token)) return inputOperator(state, token);
  if (token >= '0' && token <= '9') return inputDigit(state, token);
  return state; // unknown token ignored
}
