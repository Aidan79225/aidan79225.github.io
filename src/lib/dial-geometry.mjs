// Pure dial geometry. Angles are degrees clockwise from 12 o'clock.

export function holeLayout(symbols, { startDeg = 0, stepDeg = 18, radius = 1, cx = 0, cy = 0 } = {}) {
  return symbols.map((symbol, i) => {
    const angleDeg = startDeg + i * stepDeg;
    const rad = (angleDeg * Math.PI) / 180;
    return {
      symbol,
      angleDeg,
      x: cx + radius * Math.sin(rad),
      y: cy - radius * Math.cos(rad),
    };
  });
}

export function pointerAngle(cx, cy, px, py) {
  let deg = (Math.atan2(px - cx, -(py - cy)) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  return deg;
}

export function holeMaxRotation(holeAngleDeg, fingerStopDeg) {
  return (fingerStopDeg - holeAngleDeg + 360) % 360;
}

export function rotationFor(grabDeg, pointerDeg, maxRot, slack = 30) {
  const delta = (pointerDeg - grabDeg + 360) % 360;
  if (delta <= maxRot) return delta;
  if (delta >= 360 - slack) return 0; // counterclockwise jitter
  return maxRot;                       // dragged past the stop
}

export function reachedStop(rotation, maxRot, threshold = 0.9) {
  return rotation >= maxRot * threshold;
}
