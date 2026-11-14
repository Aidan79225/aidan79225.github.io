#!/usr/bin/env python3
"""Turn slide-rehearsal workflow results into a readable Markdown report.

Usage:
    python3 -I report.py result.json [result2.json ...] --out report.md [--transcript transcript.md]

Every input is the JSON a rehearsal returned (the workflow's output file also works: a top-level
"result" key is unwrapped). Several inputs, e.g. the parts of a deck that ran as parallel
workflows, are merged and ordered by slide number. The report holds the scoreboard, the per-slide
heat table, the questions still below the bar after retries, the proposed slide revisions as
diffs, and the questions most worth preparing for. --transcript writes every Q&A in full.
"""

from __future__ import annotations

import argparse
import difflib
import json
from collections import Counter
from pathlib import Path
from typing import Any

Json = dict[str, Any]
ORDER = ["em", "staff", "junior"]


def load(path: Path) -> Json:
    raw: Any = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(raw, dict) and "result" in raw and "slides" not in raw:
        raw = raw["result"]
    if isinstance(raw, str):
        raw = json.loads(raw)
    if not isinstance(raw, dict) or "slides" not in raw:
        raise SystemExit(f'{path}: no "slides" key; is this a slide-rehearsal result?')
    return raw


def cell(text: object, limit: int = 0) -> str:
    s = " ".join(str(text).split()).replace("|", "\\|")
    return s[:limit] + "…" if limit and len(s) > limit else s


def mean(xs: list[float]) -> str:
    return f"{sum(xs) / len(xs):.1f}" if xs else "-"


def labels(slides: list[Json]) -> dict[str, str]:
    out: dict[str, str] = {}
    for s in slides:
        for lane in s["lanes"]:
            out[lane["persona"]] = lane.get("label", lane["persona"])
    return out


def rounds_of(s: Json) -> list[tuple[str, Json]]:
    return [(lane["persona"], r) for lane in s["lanes"] for r in lane["rounds"] if "final_score" in r]


def body_diff(before: str, after: str) -> str:
    diff = difflib.unified_diff(before.splitlines(), after.splitlines(), "之前", "之後", lineterm="", n=1)
    return "\n".join(diff)


def build(results: list[Json], threshold: int) -> tuple[str, str]:
    slides: list[Json] = sorted((s for r in results for s in r["slides"]), key=lambda s: s["slide"]["n"])
    names = labels(slides)
    personas = [p for p in ORDER if p in names] + [p for p in names if p not in ORDER]
    cfg = results[0].get("config", {})
    calls = sum(int(r.get("calls", 0)) for r in results)
    all_rounds = [(s, p, r) for s in slides for p, r in rounds_of(s)]
    out: list[str] = []
    title = "簡報演練報告"
    out.append(f"# {title}")
    out.append(
        f"- 設定:門檻 {threshold} 分;每位觀眾每頁至少 {cfg.get('minRounds', 3)} 輪;"
        f"低於門檻時重答或修頁,最多 {cfg.get('maxRetries', 2)} 次。"
    )
    out.append(f"- 規模:{len(slides)} 頁、{len(all_rounds)} 輪問答、{calls} 次 agent 呼叫。")

    out.append("\n## 一、總分")
    out.append("| 觀眾 | 輪數 | 首答平均 | 重答後平均 | 需重答的輪數 | 重答後仍低於門檻 |")
    out.append("|---|---|---|---|---|---|")
    for p in personas:
        rs = [r for _, q, r in all_rounds if q == p]
        out.append(
            f"| {names[p]} | {len(rs)} | {mean([r['first_score'] for r in rs])} | {mean([r['final_score'] for r in rs])} "
            f"| {sum(1 for r in rs if r['retries'] > 0)} | {sum(1 for r in rs if not r['passed'])} |"
        )
    rs = [r for _, _, r in all_rounds]
    out.append(
        f"| 全部 | {len(rs)} | {mean([r['first_score'] for r in rs])} | {mean([r['final_score'] for r in rs])} "
        f"| {sum(1 for r in rs if r['retries'] > 0)} | {sum(1 for r in rs if not r['passed'])} |"
    )
    blocked_n = Counter(r.get("blocked_by", "none") for r in rs)
    if blocked_n["missing_data"] or blocked_n["out_of_scope"]:
        out.append(
            f"\n簡報者宣告重答也沒用的問題:缺資料 {blocked_n['missing_data']} 個、不在範圍 {blocked_n['out_of_scope']} 個"
            "(這些是「你需要先去量或先決定怎麼回」的清單)。"
        )

    out.append("\n## 二、逐頁熱度(數字 = 該觀眾三輪首答的平均;最低 = 重答後的最低分)")
    out.append("| # | 頁 | " + " | ".join(names[p] for p in personas) + " | 最低 | 修頁 | 複核未過 |")
    out.append("|---|---|" + "---|" * len(personas) + "---|---|---|")
    for s in slides:
        cols = []
        for p in personas:
            rs = [r for q, r in rounds_of(s) if q == p]
            cols.append(mean([r["first_score"] for r in rs]))
        finals = [r["final_score"] for _, r in rounds_of(s)]
        revised = "是" if s.get("merged") else ""
        unresolved = ", ".join(names.get(p, p) for p in s.get("unresolved", []))
        out.append(
            f"| {s['slide']['n']} | {cell(s['slide']['title'], 28)} | " + " | ".join(cols)
            + f" | {min(finals) if finals else '-'} | {revised} | {unresolved} |"
        )

    findings = [
        (s, lane, f)
        for s in slides
        for lane in s["lanes"]
        for f in (lane.get("audit") or [])
    ]
    unchecked = sum(1 for s in slides for lane in s["lanes"] if lane.get("audit") is None)
    sev = Counter(f["severity"] for _, _, f in findings)
    remaining = [
        (s, lane, f)
        for s in slides
        for lane in s["lanes"]
        for f in (lane.get("reaudit") or [])
        if f["severity"] in ("high", "medium")
    ]
    rewritten = sum(1 for _, _, r in all_rounds if r.get("clean_answer"))
    out.append(
        f"\n事實查核:簡報者的最終回答裡有 {len(findings)} 項說法沒有依據(高 {sev['high']}、中 {sev['medium']}、低 {sev['low']})"
        + f";其中高、中度的已改寫 {rewritten} 個回答,改寫後複查仍有 {len(remaining)} 項高、中度"
        + (f";{unchecked} 條對話沒有查核結果" if unchecked else "")
        + "。見第七節。"
    )

    out.append(f"\n## 三、重答或修頁後仍低於 {threshold} 分的問題")
    below = [(s, p, r) for s, p, r in all_rounds if not r["passed"]]
    if not below:
        out.append("無。")
    blocked_label = {"missing_data": "缺資料:觀眾要的數據或證據不存在,重答也補不了", "out_of_scope": "不在這場演講的範圍"}
    for s, p, r in below:
        out.append(f"\n### 第 {s['slide']['n']} 頁 {s['slide']['title']} · {names[p]} · {r['final_score']} 分")
        out.append(f"- 問題:{r['question']}")
        if r.get("blocked_by", "none") != "none":
            out.append(f"- 卡住原因:{blocked_label.get(r['blocked_by'], r['blocked_by'])}")
        out.append(f"- 最後的回答:{cell(r['final_answer'], 500)}")
        out.append(f"- 觀眾的評語:{cell(r.get('verdict', ''))}")
        out.append(f"- 還缺:{cell(r.get('missing', ''))}")

    revised_slides = [s for s in slides if s.get("merged")]
    out.append(f"\n## 四、投影片修正建議(共 {len(revised_slides)} 頁,不會自動套用到簡報)")
    if not revised_slides:
        out.append("沒有任何一頁需要修。")
    for s in revised_slides:
        m = s["merged"]
        orig = s["slide"]
        out.append(f"\n### 第 {orig['n']} 頁 {orig['title']}")
        triggers = []
        for lane in s["lanes"]:
            for rev in lane.get("revisionLog", []):
                triggers.append(f"- {names.get(lane['persona'], lane['persona'])}:「{cell(rev['question'], 120)}」→ {cell(rev['change_summary'])}")
        out.append("觸發:\n" + "\n".join(triggers))
        if m.get("unchanged"):
            out.append("\n合併後決定**不改版面**:建議都是但書或補充,已放進講者備忘。")
            if m.get("notes") and m["notes"] != orig.get("notes"):
                out.append(f"\n講者備忘改為:{cell(m['notes'], 800)}")
            continue
        out.append(f"\n摘要:{cell(m['change_summary'])}")
        if m["title"] != orig["title"]:
            out.append(f"\n標題:`{orig['title']}` → `{m['title']}`")
        d = body_diff(orig["body"], m["body"])
        out.append("\n```diff\n" + (d or "(內文沒有變)") + "\n```")
        if m.get("notes") and m["notes"] != orig.get("notes"):
            out.append(f"\n講者備忘改為:{cell(m['notes'], 600)}")
        if m.get("handled"):
            out.append("\n處理了:" + ";".join(f"{cell(h['audience'])}:{cell(h['concern'], 80)}({cell(h['how'], 80)})" for h in m["handled"]))
        if m.get("dropped"):
            out.append("刻意不放上頁:" + ";".join(f"{cell(h['audience'])}:{cell(h['concern'], 80)}({cell(h['why'], 80)})" for h in m["dropped"]))
        for v in s.get("verify", []):
            res = v["result"]
            probs = ";".join(cell(x, 100) for x in res.get("new_problems", []))
            out.append(f"- 複核 {names.get(v['persona'], v['persona'])}:整體 {res['overall']} 分" + (f";新問題:{probs}" if probs else ""))

    out.append("\n## 五、最值得準備的問題(首答分數最低的前 20 個)")
    hard = sorted(all_rounds, key=lambda t: (t[2]["first_score"], -t[2]["retries"]))[:20]
    for s, p, r in hard:
        out.append(f"\n**第 {s['slide']['n']} 頁 · {names[p]} · 首答 {r['first_score']} → {r['final_score']}**:{r['question']}")
        clean = r.get("clean_answer")
        out.append(f"> {cell(clean or r['final_answer'], 700)}" + ("(已移除沒有依據的說法)" if clean else ""))

    out.append("\n## 六、各觀眾愛問的角度(第一輪)")
    out.append("| 觀眾 | 角度(次數) |")
    out.append("|---|---|")
    for p in personas:
        c = Counter(r.get("angle", "") for _, q, r in all_rounds if q == p and r.get("angle"))
        out.append(f"| {names[p]} | " + ", ".join(f"{a} ({n})" for a, n in c.most_common()) + " |")

    out.append("\n## 七、簡報者回答裡沒有依據的說法(上台別照講)")
    if not findings:
        out.append("查核員沒有找到。")
    else:
        out.append("| 頁 | 觀眾 | 輪 | 說法 | 類型 | 嚴重度 | 改成這樣說 |")
        out.append("|---|---|---|---|---|---|---|")
        rank = {"high": 0, "medium": 1, "low": 2}
        for s, lane, f in sorted(findings, key=lambda t: (rank[t[2]["severity"]], t[0]["slide"]["n"])):
            out.append(
                f"| {s['slide']['n']} | {names.get(lane['persona'], lane['persona'])} | {f['round']} | {cell(f['claim'], 160)} "
                f"| {f['problem']} | {f['severity']} | {cell(f['suggestion'], 160)} |"
            )

    if remaining:
        out.append("\n改寫後複查仍有的高、中度問題(需要人工處理):")
        for s, lane, f in remaining:
            out.append(f"- 第 {s['slide']['n']} 頁 · {names.get(lane['persona'], lane['persona'])} · 第 {f['round']} 輪:{cell(f['claim'], 160)}({f['problem']},{f['severity']})")

    t: list[str] = ["# 簡報演練逐字稿"]
    for s in slides:
        t.append(f"\n## 第 {s['slide']['n']} 頁 {s['slide']['title']}")
        t.append(f"簡報者:{s['talk']}")
        for lane in s["lanes"]:
            t.append(f"\n### {names.get(lane['persona'], lane['persona'])}")
            for r in lane["rounds"]:
                t.append(f"\n**第 {r['round']} 輪**:{r['question']}")
                for i, a in enumerate(r.get("attempts", []), start=1):
                    label = "首答" if i == 1 else f"重答 {i - 1}({a.get('action', '')})"
                    t.append(f"- {label} · {a['score']} 分:{a['answer']}\n  - 評語:{a['verdict']}")
                if r.get("clean_answer"):
                    t.append(f"- 查核後改寫(建議講法):{r['clean_answer']}")
                if not r.get("attempts") and r.get("error"):
                    t.append(f"- 錯誤:{r['error']}")
    return "\n".join(out) + "\n", "\n".join(t) + "\n"


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("results", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, required=True)
    ap.add_argument("--transcript", type=Path)
    ns = ap.parse_args()
    results = [load(p) for p in ns.results]
    threshold = int(results[0].get("config", {}).get("threshold", 8))
    report, transcript = build(results, threshold)
    ns.out.parent.mkdir(parents=True, exist_ok=True)
    ns.out.write_text(report, encoding="utf-8")
    if ns.transcript:
        ns.transcript.write_text(transcript, encoding="utf-8")
    print(f"wrote {ns.out}" + (f" and {ns.transcript}" if ns.transcript else ""))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
