import { useState } from 'react';

export default function Counter() {
  const [n, setN] = useState(0);
  return (
    <button
      onClick={() => setN(n + 1)}
      className="bg-accent text-white px-4 py-2 rounded"
    >
      React island clicks: {n}
    </button>
  );
}
