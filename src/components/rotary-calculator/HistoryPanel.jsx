// Presentational running log of past calculations (newest first).
export default function HistoryPanel({ entries }) {
  return (
    <aside className="rc-history" aria-label="計算紀錄">
      <h2 className="rc-history-title">紀錄</h2>
      {entries.length === 0 ? (
        <p className="rc-history-empty">還沒有計算紀錄</p>
      ) : (
        <ul className="rc-history-list">
          {entries.map((e) => (
            <li key={e.id} className="rc-history-item">
              <span className="rc-history-expr">{e.expr}</span>
              <span className="rc-history-eq">=</span>
              <span className="rc-history-result">{e.result}</span>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
