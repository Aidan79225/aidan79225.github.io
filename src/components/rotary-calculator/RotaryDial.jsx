import { useRef, useState } from 'react';
import { holeLayout, pointerAngle, holeMaxRotation, rotationFor, reachedStop } from '../../lib/dial-geometry.mjs';

const CX = 160, CY = 160, HOLE_R = 122, FINGER_STOP_DEG = 330;
const LAYOUT_OPTS = { startDeg: 0, stepDeg: 18, radius: HOLE_R, cx: CX, cy: CY };

export default function RotaryDial({ symbols, onDial }) {
  const svgRef = useRef(null);
  const drag = useRef(null);                 // { grabDeg, maxRot, value }
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);

  const holes = holeLayout(symbols.map((s) => s.label), LAYOUT_OPTS);

  const svgAngle = (e) => {
    const rect = svgRef.current.getBoundingClientRect();
    const scale = 320 / rect.width;
    const px = (e.clientX - rect.left) * scale;
    const py = (e.clientY - rect.top) * scale;
    return pointerAngle(CX, CY, px, py);
  };

  const onPointerDown = (e, sym, angleDeg) => {
    if (spinning) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { grabDeg: angleDeg, maxRot: holeMaxRotation(angleDeg, FINGER_STOP_DEG), value: sym.value };
    setRotation(0);
  };

  const onPointerMove = (e) => {
    if (!drag.current) return;
    const { grabDeg, maxRot } = drag.current;
    setRotation(rotationFor(grabDeg, svgAngle(e), maxRot));
  };

  const onPointerUp = () => {
    if (!drag.current) return;
    const { maxRot, value } = drag.current;
    const registered = reachedStop(rotation, maxRot);
    drag.current = null;
    if (rotation > 0) {                       // only animate (and arm onTransitionEnd) if we actually moved
      setSpinning(true);                      // CSS transition animates rotation → 0
      setRotation(0);
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
        onTransitionEnd={() => setSpinning(false)}
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
      <rect x={CX + 96} y={CY + 70} width="26" height="16" rx="3" className="rc-finger-stop" />
    </svg>
  );
}
