import { useReducer } from 'react';
import { initialState, reduce } from '../../lib/calculator.mjs';
import { DIAL_SYMBOLS } from './symbols.mjs';
import NixieDisplay from './NixieDisplay.jsx';
import RotaryDial from './RotaryDial.jsx';
import './rotary-calculator.css';

export default function RotaryCalculator() {
  const [state, dispatch] = useReducer(reduce, undefined, initialState);
  return (
    <div className="rc-stage">
      <NixieDisplay text={state.display} />
      <RotaryDial symbols={DIAL_SYMBOLS} onDial={dispatch} />
    </div>
  );
}
