// Dial layout geometry, shared by RotaryDial and its invariant test.
// Holes are laid out AWAY from the finger stop (negative step) so the first
// symbol ('1') is the shortest dial and every hole's max rotation stays well
// under the 330° counterclockwise-jitter boundary in rotationFor.
export const DIAL_GEOMETRY = {
  cx: 160,
  cy: 160,
  holeRadius: 122,
  stopRadius: 138,
  startDeg: 117,     // '1' sits just counterclockwise of the finger stop
  stepDeg: -18,      // later symbols fan out counterclockwise
  fingerStopDeg: 135,
};
