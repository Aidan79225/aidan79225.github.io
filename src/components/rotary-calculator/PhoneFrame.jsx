// Presentational telephone chrome. A receiver (handset) rests on the cradle
// above the body; `display` renders in the strip; `children` (the dial) sit in
// the body.
export default function PhoneFrame({ display, children }) {
  return (
    <div className="rc-phone">
      <svg className="rc-handset" viewBox="0 0 320 108" aria-hidden="true">
        {/* cradle hooks the receiver rests on */}
        <rect className="rc-cradle" x="54" y="86" width="44" height="14" rx="5" />
        <rect className="rc-cradle" x="222" y="86" width="44" height="14" rx="5" />
        {/* arched handle */}
        <path className="rc-handset-handle" d="M76 74 Q76 22 160 22 Q244 22 244 74" />
        {/* ear / mouth pieces pointing down into the cradle */}
        <ellipse className="rc-handset-bulb" cx="76" cy="76" rx="32" ry="24" />
        <ellipse className="rc-handset-bulb" cx="244" cy="76" rx="32" ry="24" />
      </svg>
      <div className="rc-body">
        <div className="rc-display-strip">{display}</div>
        <div className="rc-dial-mount">{children}</div>
      </div>
    </div>
  );
}
