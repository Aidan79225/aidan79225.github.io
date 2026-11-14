#!/usr/bin/env python3
"""Inline a run configuration into rehearse.js, so a big deck never passes through a tool call.

Usage:
    python3 -I prepare_run.py --deck deck.json --out run.js \
        [--facts facts.md] [--forbidden forbidden.txt] \
        [--brief TEXT] [--abstract TEXT] [--principles TEXT] \
        [--only id,id] [--part 2/4] \
        [--min-rounds 3] [--max-rounds 3] [--threshold 8] [--max-retries 2] [--call-cap 900] \
        [--personas personas.json]

Then start it with  Workflow({scriptPath: "<absolute path of run.js>"}).

--part i/N keeps the i-th of N contiguous chunks of the slides, so one deck can run as several
workflows in parallel (every workflow has its own concurrency cap). Merge the results with report.py.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

MARKER = "const INLINE_ARGS = null // @@INLINE_ARGS@@"


def read_text(path: Path | None) -> str:
    return path.read_text(encoding="utf-8").strip() if path else ""


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--deck", type=Path, required=True, help="deck JSON from extract_slides.py (or hand-made)")
    ap.add_argument("--out", type=Path, required=True, help="where to write the ready-to-run workflow script")
    ap.add_argument("--facts", type=Path, help="text file: verified facts and known limits the presenter may rely on")
    ap.add_argument("--forbidden", type=Path, help="text file: things the presenter must never say or write")
    ap.add_argument("--brief", help="what the talk is about, for the presenter (overrides deck.brief)")
    ap.add_argument("--abstract", help="what the audience was told beforehand (overrides deck.abstract)")
    ap.add_argument("--principles", help="design principles revisions must respect (overrides deck.principles)")
    ap.add_argument("--only", help="comma-separated slide ids to rehearse")
    ap.add_argument("--part", help="i/N: rehearse only the i-th of N contiguous chunks of the slides")
    ap.add_argument("--min-rounds", type=int, default=3)
    ap.add_argument("--max-rounds", type=int)
    ap.add_argument("--threshold", type=int, default=8)
    ap.add_argument("--max-retries", type=int, default=2)
    ap.add_argument("--call-cap", type=int, default=900)
    ap.add_argument("--agent-type", default="Plan", help="subagent type for every role; 'default' = the workflow's default subagent")
    ap.add_argument("--personas", type=Path, help="JSON array [{key, label, brief}] replacing the three default audiences")
    ns = ap.parse_args()

    deck = json.loads(ns.deck.read_text(encoding="utf-8"))
    slides = deck.get("slides") or []
    if not slides:
        sys.exit("deck has no slides")
    for s in slides:
        for key in ("id", "n", "title", "body"):
            if key not in s:
                sys.exit(f"slide {s.get('id', '?')} lacks '{key}'")
        s.setdefault("notes", "")
    for key in ("brief", "abstract", "principles"):
        value = getattr(ns, key)
        if value:
            deck[key] = value

    only: list[str] | None = [x.strip() for x in ns.only.split(",") if x.strip()] if ns.only else None
    if ns.part:
        i, n = (int(x) for x in ns.part.split("/"))
        pool = [s["id"] for s in slides if not only or s["id"] in only]
        size = -(-len(pool) // n)
        only = pool[(i - 1) * size : i * size]
        if not only:
            sys.exit(f"--part {ns.part} selects no slides")

    cfg: dict[str, object] = {
        "deck": deck,
        "facts": read_text(ns.facts),
        "forbidden": read_text(ns.forbidden),
        "minRounds": ns.min_rounds,
        "threshold": ns.threshold,
        "maxRetries": ns.max_retries,
        "callCap": ns.call_cap,
    }
    if ns.max_rounds:
        cfg["maxRounds"] = ns.max_rounds
    if ns.personas:
        cfg["personas"] = json.loads(ns.personas.read_text(encoding="utf-8"))
    if only:
        cfg["only"] = only
    if ns.agent_type == "default":
        cfg["agentType"] = None
    elif ns.agent_type:
        cfg["agentType"] = ns.agent_type

    template = Path(__file__).with_name("rehearse.js").read_text(encoding="utf-8")
    if MARKER not in template:
        sys.exit("rehearse.js lost its INLINE_ARGS marker line")
    script = template.replace(MARKER, "const INLINE_ARGS = " + json.dumps(cfg, ensure_ascii=False) + " // inlined by prepare_run.py")
    ns.out.parent.mkdir(parents=True, exist_ok=True)
    ns.out.write_text(script, encoding="utf-8")
    shown = only if only else [s["id"] for s in slides]
    print(f"wrote {ns.out}: {len(shown)} slide(s): {', '.join(shown)}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
