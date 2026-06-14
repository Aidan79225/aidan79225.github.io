import { useRef, useState, useEffect } from 'react';
import { holeLayout, pointerAngle, holeMaxRotation, rotationFor, reachedStop } from '../../lib/dial-geometry.mjs';
import { DIAL_GEOMETRY } from './dial-config.mjs';

const { cx: CX, cy: CY, holeRadius: HOLE_R, stopRadius: STOP_R, startDeg, stepDeg, fingerStopDeg: FINGER_STOP_DEG } = DIAL_GEOMETRY;
const LAYOUT_OPTS = { startDeg, stepDeg, radius: HOLE_R, cx: CX, cy: CY };
const SPIN_MS = 500;                          // keep in sync with the CSS transition

export default function RotaryDial({ symbols, onDial }) {
  const svgRef = useRef(null);
  const drag = useRef(null);                 // { grabDeg, maxRot, value, lastRotation, peak }
  const spinTimer = useRef(null);            // fallback that always clears `spinning`
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  useEffect(() => () => clearTimeout(spinTimer.current), []);

  const holes = holeLayout(symbols.map((s) => s.label), LAYOUT_OPTS);
  const stop = holeLayout(['stop'], { startDeg: FINGER_STOP_DEG, stepDeg: 0, radius: STOP_R, cx: CX, cy: CY })[0];

  const svgAngle = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) * (320 / rect.width);
    const py = (e.clientY - rect.top) * (320 / rect.height);
    return pointerAngle(CX, CY, px, py);
  };

  const onPointerDown = (e, sym, angleDeg) => {
    // Always responsive: a new grab cancels any in-progress spin-back so the
    // dial can never get stuck waiting on a transition that didn't fire.
    clearTimeout(spinTimer.current);
    setSpinning(false);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { grabDeg: angleDeg, maxRot: holeMaxRotation(angleDeg, FINGER_STOP_DEG), value: sym.value, lastRotation: 0, peak: 0 };
    setRotation(0);
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const { grabDeg, maxRot } = drag.current;
    const r = rotationFor(grabDeg, svgAngle(e), maxRot);
    drag.current.lastRotation = r;
    if (r > drag.current.peak) drag.current.peak = r;
    setRotation(r);
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    const { maxRot, value, peak } = drag.current;
    const registered = reachedStop(peak, maxRot);
    drag.current = null;
    if (peak > 0) {                           // animate the spin-back from where we are
      setSpinning(true);
      setRotation(0);
      clearTimeout(spinTimer.current);        // fallback in case onTransitionEnd never fires
      spinTimer.current = setTimeout(() => setSpinning(false), SPIN_MS + 50);
    }
    if (registered) onDial(value);
  };

  return (
    <svg
      ref={svgRef}
      className="rc-dial"
      viewBox="0 0 320 320"
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <circle cx={CX} cy={CY} r="150" className="rc-dial-face" />
      <g
        className={spinning ? 'rc-dial-rotor rc-spinning' : 'rc-dial-rotor'}
        style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${CX}px ${CY}px` }}
        onTransitionEnd={(e) => { if (e.target === e.currentTarget) { clearTimeout(spinTimer.current); setSpinning(false); } }}
      >
        {holes.map((h, i) => (
          <g
            key={symbols[i].value}
            className="rc-hole"
            onPointerDown={(e) => onPointerDown(e, symbols[i], h.angleDeg)}
          >
            <circle cx={h.x} cy={h.y} r="20" className="rc-hole-bg" />
            <text x={h.x} y={h.y} className="rc-hole-label" dominantBaseline="central" textAnchor="middle">
              {h.symbol}
            </text>
          </g>
        ))}
      </g>
      <circle cx={CX} cy={CY} r="46" className="rc-dial-hub" />
      <circle cx={stop.x} cy={stop.y} r="11" className="rc-finger-stop" />
    </svg>
  );
}
