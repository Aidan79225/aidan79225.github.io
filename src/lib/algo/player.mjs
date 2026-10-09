// 逐步播放器:把演算法模組產生的 frame 陣列畫成「程式碼 + 陣列 + 變數 + 說明」,
// 讓讀者一步一步往前、往後、自動播放、拖進度條,或改輸入重跑。
// 原生 DOM、不用 React:跟站內搜尋同一個理由,不為一個元件下載 react-dom。
//
// frame 的形狀(由各演算法模組產生):
//   { line, note, array, cursor, ranges: [{ from, to, kind }], vars: [{ name, value }] }

const UI = {
  'zh-hant': {
    first: '回到第一步',
    prev: '上一步',
    play: '播放',
    pause: '暫停',
    next: '下一步',
    last: '跳到最後',
    step: '步驟',
    speed: '速度',
    slow: '慢',
    normal: '中',
    fast: '快',
    input: '輸入陣列',
    apply: '套用',
    random: '隨機',
    invalid: (n) => `請輸入 1 到 ${n} 個介於 -99 和 99 的整數,用逗號或空白隔開。`,
    keys: '可用 ← → 逐步、空白鍵播放',
  },
  en: {
    first: 'First step',
    prev: 'Previous step',
    play: 'Play',
    pause: 'Pause',
    next: 'Next step',
    last: 'Last step',
    step: 'Step',
    speed: 'Speed',
    slow: 'Slow',
    normal: 'Normal',
    fast: 'Fast',
    input: 'Input array',
    apply: 'Apply',
    random: 'Random',
    invalid: (n) => `Enter 1 to ${n} integers between -99 and 99, separated by commas or spaces.`,
    keys: 'Use ← → to step, Space to play',
  },
};

const SPEEDS = { slow: 1800, normal: 1000, fast: 450 };

const h = (tag, attrs = {}, ...children) => {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v);
  }
  el.append(...children);
  return el;
};

export function mountPlayer(root, algo, lang) {
  const t = UI[lang] ?? UI['zh-hant'];
  const legend = algo.legend?.[lang] ?? algo.legend?.['zh-hant'] ?? {};
  const initial = algo.parseInput(root.dataset.input ?? '') ?? algo.defaultInput;

  let frames = [];
  let index = 0;
  let timer = null;
  let speed = 'normal';

  // ── 版面 ──
  const code = h('ol', { class: 'algo-code', 'aria-label': 'code' });
  algo.code.forEach((line) => code.append(h('li', {}, h('code', {}, line))));

  const cells = h('div', { class: 'algo-cells' });
  const vars = h('dl', { class: 'algo-vars' });
  const note = h('p', { class: 'algo-note', 'aria-live': 'polite' });
  const legendRow = h(
    'p',
    { class: 'algo-legend' },
    ...Object.entries(legend).map(([kind, label]) =>
      h('span', {}, h('i', { class: `algo-swatch algo-${kind}` }), label),
    ),
  );

  const btn = (label, glyph, onclick) =>
    h('button', { type: 'button', 'aria-label': label, title: label, onclick }, glyph);
  const firstBtn = btn(t.first, '⇤', () => go(0));
  const prevBtn = btn(t.prev, '←', () => go(index - 1));
  const playBtn = btn(t.play, '▶\uFE0E', () => (timer ? stop() : play()));
  playBtn.classList.add('algo-play');
  const nextBtn = btn(t.next, '→', () => go(index + 1));
  const lastBtn = btn(t.last, '⇥', () => go(frames.length - 1));

  const scrub = h('input', { type: 'range', min: '0', value: '0', 'aria-label': t.step });
  scrub.addEventListener('input', () => go(Number(scrub.value)));
  const counter = h('span', { class: 'algo-counter' });

  const speedSel = h('select', { 'aria-label': t.speed });
  for (const key of Object.keys(SPEEDS)) {
    const opt = h('option', { value: key }, t[key]);
    if (key === speed) opt.selected = true;
    speedSel.append(opt);
  }
  speedSel.addEventListener('change', () => {
    speed = speedSel.value;
    if (timer) {
      stop();
      play();
    }
  });

  const inputBox = h('input', {
    type: 'text',
    value: initial.join(', '),
    'aria-label': t.input,
    inputmode: 'numeric',
  });
  const error = h('p', { class: 'algo-error', role: 'alert' });
  const apply = () => {
    const arr = algo.parseInput(inputBox.value);
    if (!arr) {
      error.textContent = t.invalid(algo.maxLength);
      return;
    }
    error.textContent = '';
    load(arr);
  };
  inputBox.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') apply();
    e.stopPropagation(); // 打字時的 ← → 空白不要被當成播放鍵
  });

  const controls = h(
    'div',
    { class: 'algo-controls' },
    firstBtn,
    prevBtn,
    playBtn,
    nextBtn,
    lastBtn,
    scrub,
    counter,
    h('label', {}, `${t.speed} `, speedSel),
  );
  const inputRow = h(
    'div',
    { class: 'algo-input' },
    h('label', {}, `${t.input} `, inputBox),
    btn(t.apply, t.apply, apply),
    btn(t.random, t.random, () => {
      const arr = algo.randomInput();
      inputBox.value = arr.join(', ');
      error.textContent = '';
      load(arr);
    }),
  );

  root.replaceChildren(
    h(
      'div',
      { class: 'algo-stage' },
      code,
      h('div', { class: 'algo-view' }, cells, legendRow, vars),
    ),
    note,
    controls,
    inputRow,
    error,
    h('p', { class: 'algo-hint' }, t.keys),
  );
  root.classList.add('algo-player');
  root.tabIndex = 0;
  root.setAttribute('role', 'group');

  root.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'SELECT' || e.target.tagName === 'INPUT') return;
    if (e.key === 'ArrowRight') go(index + 1);
    else if (e.key === 'ArrowLeft') go(index - 1);
    else if (e.key === ' ') timer ? stop() : play();
    else return;
    e.preventDefault();
  });

  // ── 播放控制 ──
  function play() {
    if (index >= frames.length - 1) go(0);
    playBtn.textContent = '❚❚';
    playBtn.setAttribute('aria-label', t.pause);
    playBtn.title = t.pause;
    timer = setInterval(() => {
      if (index >= frames.length - 1) stop();
      else go(index + 1, true);
    }, SPEEDS[speed]);
  }

  function stop() {
    clearInterval(timer);
    timer = null;
    playBtn.textContent = '▶\uFE0E';
    playBtn.setAttribute('aria-label', t.play);
    playBtn.title = t.play;
  }

  function go(i, fromTimer = false) {
    if (!fromTimer && timer) stop(); // 手動操作就停下來,讓讀者自己控制節奏
    index = Math.max(0, Math.min(frames.length - 1, i));
    render(frames[index]);
  }

  function load(arr) {
    stop();
    frames = algo.frames(arr, lang);
    scrub.max = String(frames.length - 1);
    go(0);
  }

  // ── 繪製 ──
  function render(f) {
    [...code.children].forEach((li, n) => li.classList.toggle('is-active', n === f.line));

    cells.replaceChildren(
      ...f.array.map((value, i) => {
        const kinds = f.ranges.filter((r) => i >= r.from && i <= r.to).map((r) => r.kind);
        return h(
          'div',
          {
            class: ['algo-cell', i === f.cursor ? 'is-cursor' : '', ...kinds.map((k) => `in-${k}`)]
              .filter(Boolean)
              .join(' '),
          },
          h('span', { class: 'algo-value' }, String(value)),
          h('span', { class: 'algo-index' }, String(i)),
        );
      }),
    );

    vars.replaceChildren(
      ...f.vars.flatMap(({ name, value }) => [h('dt', {}, name), h('dd', {}, String(value))]),
    );
    note.textContent = f.note;
    scrub.value = String(index);
    counter.textContent = `${t.step} ${index + 1} / ${frames.length}`;
    firstBtn.disabled = prevBtn.disabled = index === 0;
    nextBtn.disabled = lastBtn.disabled = index === frames.length - 1;
  }

  load(initial);
}
