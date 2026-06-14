export default function NixieDisplay({ text }) {
  return (
    <div className="rc-nixie" aria-live="polite">
      <span className="rc-nixie-text">{text}</span>
    </div>
  );
}
