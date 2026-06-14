import { useReducer } from 'react';
import { initWithHistory, reduceWithHistory } from '../../lib/calculator-history.mjs';
import { DIAL_SYMBOLS } from './symbols.mjs';
import NixieDisplay from './NixieDisplay.jsx';
import RotaryDial from './RotaryDial.jsx';
import PhoneFrame from './PhoneFrame.jsx';
import HistoryPanel from './HistoryPanel.jsx';
import './rotary-calculator.css';

export default function RotaryCalculator() {
  const [state, dispatch] = useReducer(reduceWithHistory, undefined, initWithHistory);
  return (
    <div className="rc-stage">
      <PhoneFrame display={<NixieDisplay text={state.display} />}>
        <RotaryDial symbols={DIAL_SYMBOLS} onDial={dispatch} />
      </PhoneFrame>
      <HistoryPanel entries={state.history} />
    </div>
  );
}
