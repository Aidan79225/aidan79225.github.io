import { useEffect, useRef, useState } from 'react';

// Colour nodes by series; standalone posts fall back to grey. Keep this the
// single source of truth — the legend below reads the same map.
const SERIES = [
  ['Fundamentals of Data Engineering 讀書筆記', '#4f6df5', 'FoDE'],
  ['Spark 學習筆記', '#e0733a', 'Spark'],
  ['Kafka 學習筆記', '#9b6ff0', 'Kafka'],
  ['Airflow 學習筆記', '#54b890', 'Airflow'],
  ['成為 Tech Leader 讀書筆記', '#e05a7d', 'Tech Leader'],
];
const COLOR = Object.fromEntries(SERIES.map(([s, c]) => [s, c]));
const OTHER = '#9aa4b2';
const colorFor = (n) => (n.series && COLOR[n.series]) || OTHER;

export default function Graph() {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const S = useRef({ nodes: [], edges: [], adj: new Map(), view: { x: 0, y: 0, scale: 1 }, hoverId: null });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let raf, canceled = false;
    fetch('/graph.json')
      .then((r) => r.json())
      .then((data) => {
        if (canceled) return;
        init(data);
        setReady(true);
      })
      .catch(() => {});

    function init(data) {
      const wrap = wrapRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const st = S.current;

      // Seed positions on a ring so the layout unfolds instead of exploding.
      const n = data.nodes.length;
      st.nodes = data.nodes.map((d, i) => ({
        ...d,
        x: Math.cos((i / n) * Math.PI * 2) * 160,
        y: Math.sin((i / n) * Math.PI * 2) * 160,
        vx: 0,
        vy: 0,
      }));
      const idx = new Map(st.nodes.map((nd, i) => [nd.id, i]));
      st.edges = data.edges
        .map((e) => ({ s: idx.get(e.source), t: idx.get(e.target) }))
        .filter((e) => e.s != null && e.t != null);
      st.adj = new Map(st.nodes.map((nd) => [nd.id, new Set()]));
      for (const e of data.edges) {
        st.adj.get(e.source)?.add(e.target);
        st.adj.get(e.target)?.add(e.source);
      }

      let W = 0, H = 0, dpr = 1;
      const resize = () => {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        W = wrap.clientWidth;
        H = wrap.clientHeight;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.width = W + 'px';
        canvas.style.height = H + 'px';
        if (!st.userMoved) fit();
      };
      // Frame the whole layout into the canvas with padding; min-scale keeps
      // nodes big enough to see/click even if the graph is large.
      const fit = () => {
        if (!st.nodes.length || !W) return;
        const xs = st.nodes.map((n) => n.x), ys = st.nodes.map((n) => n.y);
        const minX = Math.min(...xs), maxX = Math.max(...xs);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        const w = maxX - minX || 1, h = maxY - minY || 1;
        const pad = 70;
        const scale = Math.min(Math.max(Math.min((W - pad * 2) / w, (H - pad * 2) / h), 0.4), 1.6);
        st.view.scale = scale;
        st.view.x = W / 2 - ((minX + maxX) / 2) * scale;
        st.view.y = H / 2 - ((minY + maxY) / 2) * scale;
      };
      st.userMoved = false;
      st.ticks = 0;
      resize();
      window.addEventListener('resize', resize);

      const K = 95; // ideal edge length
      let alpha = 1;
      const step = () => {
        const N = st.nodes;
        for (let i = 0; i < N.length; i++) {
          const a = N[i];
          for (let j = i + 1; j < N.length; j++) {
            const b = N[j];
            let dx = a.x - b.x, dy = a.y - b.y;
            let d = Math.sqrt(dx * dx + dy * dy) || 0.01;
            if (d > 200) continue; // local repulsion only — keeps the graph compact
            const rep = (K * K) / d / d * K * 0.2;
            const fx = (dx / d) * rep, fy = (dy / d) * rep;
            a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
          }
        }
        for (const e of st.edges) {
          const a = N[e.s], b = N[e.t];
          let dx = b.x - a.x, dy = b.y - a.y;
          let d = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const f = (d - K) * 0.08;
          const fx = (dx / d) * f, fy = (dy / d) * f;
          a.vx += fx; a.vy += fy; b.vx -= fx; b.vy -= fy;
        }
        for (const nd of N) {
          nd.vx += -nd.x * 0.06;
          nd.vy += -nd.y * 0.06;
          nd.vx *= 0.82;
          nd.vy *= 0.82;
          if (st.dragNode === nd) continue;
          nd.x += nd.vx * alpha;
          nd.y += nd.vy * alpha;
        }
        alpha *= 0.985; // cool toward a frozen layout; drag reheats it
      };

      const toScreen = (nd) => ({ x: st.view.x + nd.x * st.view.scale, y: st.view.y + nd.y * st.view.scale });
      const radius = (nd) => 4 + Math.sqrt(nd.degree || 0) * 2.4;

      const draw = () => {
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, W, H);
        const hoverId = st.hoverId;
        const nb = hoverId ? st.adj.get(hoverId) : null;
        ctx.save();
        ctx.translate(st.view.x, st.view.y);
        ctx.scale(st.view.scale, st.view.scale);
        ctx.lineWidth = 1 / st.view.scale;
        for (const e of st.edges) {
          const a = st.nodes[e.s], b = st.nodes[e.t];
          const on = hoverId && (a.id === hoverId || b.id === hoverId);
          ctx.strokeStyle = on ? 'rgba(230,230,230,0.55)' : 'rgba(120,130,150,0.16)';
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
        for (const nd of st.nodes) {
          const dim = hoverId && nd.id !== hoverId && !(nb && nb.has(nd.id));
          ctx.globalAlpha = dim ? 0.2 : 1;
          ctx.fillStyle = colorFor(nd);
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, radius(nd), 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1;
        }
        ctx.restore();
        // Labels in screen space: hovered node + neighbours, or hubs when idle.
        ctx.font = '12px system-ui, sans-serif';
        ctx.textBaseline = 'middle';
        for (const nd of st.nodes) {
          const show = hoverId ? nd.id === hoverId || (nb && nb.has(nd.id)) : nd.degree >= 13;
          if (!show) continue;
          const p = toScreen(nd);
          const label = nd.title.length > 16 ? nd.title.slice(0, 16) + '…' : nd.title;
          const tx = p.x + radius(nd) * st.view.scale + 4;
          const w = ctx.measureText(label).width;
          ctx.fillStyle = 'rgba(31,35,48,0.82)';
          ctx.fillRect(tx - 2, p.y - 8, w + 4, 16);
          ctx.fillStyle = nd.id === hoverId ? '#e6e6e6' : '#9aa4b2';
          ctx.fillText(label, tx, p.y);
        }
      };

      const loop = () => {
        step();
        if (!st.userMoved && st.ticks < 240) fit(); // keep it framed while it settles
        st.ticks++;
        draw();
        raf = requestAnimationFrame(loop);
      };
      loop();

      // ---- interaction ----
      const worldAt = (ev) => {
        const rect = canvas.getBoundingClientRect();
        const sx = ev.clientX - rect.left, sy = ev.clientY - rect.top;
        return { x: (sx - st.view.x) / st.view.scale, y: (sy - st.view.y) / st.view.scale, sx, sy };
      };
      const nodeAt = (w) => {
        let best = null, bestD = Infinity;
        for (const nd of st.nodes) {
          const dx = nd.x - w.x, dy = nd.y - w.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          const r = radius(nd) + 6 / st.view.scale;
          if (d < r && d < bestD) { best = nd; bestD = d; }
        }
        return best;
      };

      let down = null;
      const onDown = (ev) => {
        canvas.setPointerCapture?.(ev.pointerId);
        const w = worldAt(ev);
        const hit = nodeAt(w);
        down = { sx: w.sx, sy: w.sy, moved: false, node: hit };
        if (hit) { st.dragNode = hit; alpha = Math.max(alpha, 0.3); }
      };
      const onMove = (ev) => {
        const w = worldAt(ev);
        if (down) {
          const dist = Math.hypot(w.sx - down.sx, w.sy - down.sy);
          if (dist > 4) { down.moved = true; st.userMoved = true; }
          if (st.dragNode) {
            st.dragNode.x = w.x; st.dragNode.y = w.y; st.dragNode.vx = 0; st.dragNode.vy = 0;
          } else {
            st.view.x += ev.movementX; st.view.y += ev.movementY;
          }
        } else {
          const hit = nodeAt(w);
          st.hoverId = hit ? hit.id : null;
          canvas.style.cursor = hit ? 'pointer' : 'grab';
        }
      };
      const onUp = (ev) => {
        if (down && !down.moved && down.node) window.location.href = down.node.url;
        st.dragNode = null;
        down = null;
      };
      const onWheel = (ev) => {
        ev.preventDefault();
        st.userMoved = true;
        const w = worldAt(ev);
        const factor = Math.exp(-ev.deltaY * 0.0012);
        const ns = Math.min(3, Math.max(0.3, st.view.scale * factor));
        st.view.x = w.sx - w.x * ns;
        st.view.y = w.sy - w.y * ns;
        st.view.scale = ns;
      };
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointerleave', () => { st.hoverId = null; });
      canvas.addEventListener('wheel', onWheel, { passive: false });

      S.cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', resize);
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('wheel', onWheel);
      };
    }

    return () => {
      canceled = true;
      cancelAnimationFrame(raf);
      S.cleanup?.();
    };
  }, []);

  return (
    <div ref={wrapRef} className="relative w-full h-[72vh] min-h-[420px] bg-base border border-line rounded-lg overflow-hidden touch-none">
      <canvas ref={canvasRef} className="block" style={{ cursor: 'grab' }} />
      <div className="absolute top-3 left-3 flex flex-col gap-1 text-xs bg-surface/80 border border-line rounded p-2 backdrop-blur">
        {SERIES.map(([s, c, label]) => (
          <span key={s} className="flex items-center gap-2 text-muted">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            {label}
          </span>
        ))}
        <span className="flex items-center gap-2 text-muted">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: OTHER }} />
          單篇
        </span>
      </div>
      {!ready && <p className="absolute inset-0 flex items-center justify-center text-muted text-sm">載入關係圖…</p>}
      <p className="absolute bottom-2 right-3 text-[11px] text-muted">拖曳移動 · 滾輪縮放 · 點節點看文章</p>
    </div>
  );
}
