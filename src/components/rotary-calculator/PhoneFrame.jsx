// Presentational telephone chrome. `display` renders in the strip above the
// dial; `children` (the dial) sit in the body.
export default function PhoneFrame({ display, children }) {
  return (
    <div className="rc-phone">
      <div className="rc-handset">
        <span className="rc-earpiece" />
        <span className="rc-handle" />
        <span className="rc-earpiece" />
      </div>
      <div className="rc-body">
        <div className="rc-display-strip">{display}</div>
        <div className="rc-dial-mount">{children}</div>
      </div>
    </div>
  );
}
