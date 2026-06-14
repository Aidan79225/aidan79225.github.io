import { useReducer, useEffect } from 'react';
import { initialState, reduce } from '../../lib/calculator.mjs';
import { DIAL_SYMBOLS } from './symbols.mjs';
import NixieDisplay from './NixieDisplay.jsx';
import './rotary-calculator.css';

export default function RotaryCalculator() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);

  // Temporary: keyboard input so the engine is testable before the dial lands.
  // Removed in Task 5 once the dial drives dispatch.
  useEffect(() => {
    const keyToken = (k) => {
      if (k >= '0' && k <= '9') return k;
      if (k === '.') return '.';
      if (k === '+') return '+';
      if (k === '-') return '-';
      if (k === '*') return '×';
      if (k === '/') return '÷';
      if (k === 'Enter' || k === '=') return '=';
      if (k === 'Escape' || k === 'c' || k === 'C') return 'C';
      return null;
    };
    const onKey = (e) => {
      const t = keyToken(e.key);
      if (t) { e.preventDefault(); dispatch(t); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="rc-stage">
      <NixieDisplay text={state.display} />
      {/* dial added in Task 5; symbols list ready: */}
      <ul className="rc-symbol-preview">
        {DIAL_SYMBOLS.map((s) => <li key={s.value}>{s.label}</li>)}
      </ul>
    </div>
  );
}
