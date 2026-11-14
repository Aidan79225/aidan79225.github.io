#!/usr/bin/env python3
"""Turn a Slides-artifact deck folder into the JSON that rehearse.js expects.

Usage:
    python3 -I extract_slides.py <deck-root> [--visuals visuals.json] > deck.json

<deck-root> holds project/deck.json and project/slides/<id>.html, the layout the Slides
artifact type uses. Every slide becomes {id, n, title, body, notes, visual?}:

    body    what the audience can read on the slide, one element per line
            (# / ## / ### mark headings, table rows are joined with " | ",
            images and figures become [image: alt] / [figure: label])
    notes   the speaker notes (<aside>); only the presenter agent sees them
    visual  from --visuals: a JSON object id -> plain description of what text cannot
            carry (charts, diagrams, photos), so the audience agents can "see" it

For any other source (PPTX, Keynote, Markdown outline) build the same JSON by hand.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from html.parser import HTMLParser
from pathlib import Path

HEADINGS = {"h1": "# ", "h2": "## ", "h3": "### "}
TEXT_TAGS = {"p", "li"}
CELL_TAGS = {"td", "th"}


def squash(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


class SlideParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.body: list[str] = []
        self.notes_parts: list[str] = []
        self.title = ""
        self._buf: list[str] | None = None
        self._row: list[str] | None = None
        self._in_aside = False

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        a = dict(attrs)
        if tag == "aside":
            self._in_aside = True
            return
        if self._in_aside:
            return
        if tag in HEADINGS or tag in TEXT_TAGS or tag in CELL_TAGS:
            self._buf = []
        elif tag == "tr":
            self._row = []
        elif tag == "br":
            if self._buf is not None:
                self._buf.append(" ")
        elif tag == "img" and a.get("alt"):
            self.body.append(f"[image: {a['alt']}]")
        elif tag == "svg" and a.get("aria-label"):
            self.body.append(f"[figure: {a['aria-label']}]")

    def handle_endtag(self, tag: str) -> None:
        if tag == "aside":
            self._in_aside = False
            return
        if self._in_aside:
            return
        if tag in HEADINGS or tag in TEXT_TAGS:
            text = squash("".join(self._buf or []))
            self._buf = None
            if not text:
                return
            if tag in HEADINGS:
                self.body.append(HEADINGS[tag] + text)
                if not self.title:
                    self.title = text
            else:
                self.body.append(text)
        elif tag in CELL_TAGS:
            text = squash("".join(self._buf or []))
            self._buf = None
            if self._row is not None:
                self._row.append(text)
        elif tag == "tr":
            if self._row:
                self.body.append(" | ".join(self._row))
            self._row = None

    def handle_data(self, data: str) -> None:
        if self._in_aside:
            self.notes_parts.append(data)
        elif self._buf is not None:
            self._buf.append(data)

    @property
    def notes(self) -> str:
        lines = [ln.strip() for ln in "".join(self.notes_parts).splitlines()]
        return "\n".join(ln for ln in lines if ln)


def load_deck(root: Path, visuals: dict[str, str]) -> dict[str, object]:
    index_path = root / "project" / "deck.json"
    slides_dir = root / "project" / "slides"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else {}
    order: list[str] = index.get("order") or sorted(p.stem for p in slides_dir.glob("*.html"))
    slides: list[dict[str, object]] = []
    for n, slide_id in enumerate(order, start=1):
        path = slides_dir / f"{slide_id}.html"
        parser = SlideParser()
        parser.feed(path.read_text(encoding="utf-8"))
        slide: dict[str, object] = {
            "id": slide_id,
            "n": n,
            "title": parser.title or slide_id,
            "body": "\n".join(parser.body),
            "notes": parser.notes,
        }
        if slide_id in visuals:
            slide["visual"] = visuals[slide_id]
        slides.append(slide)
    return {"title": index.get("title", root.name), "slides": slides}


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("root", type=Path, help="folder that contains project/deck.json and project/slides/")
    ap.add_argument("--visuals", type=Path, help="JSON object: slide id -> description of non-text visuals")
    ns = ap.parse_args()
    visuals: dict[str, str] = {}
    if ns.visuals:
        visuals = json.loads(ns.visuals.read_text(encoding="utf-8"))
    json.dump(load_deck(ns.root, visuals), sys.stdout, ensure_ascii=False, indent=2)
    sys.stdout.write("\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
