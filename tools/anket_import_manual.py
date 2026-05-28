#!/usr/bin/env python3
"""Dışa aktarılmış elle eklenen anketleri bundle.json polls dizisine birleştirir."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE_PATH = ROOT / "data" / "anket" / "bundle.json"


def main() -> None:
    if len(sys.argv) < 2:
        print("Kullanım: python tools/anket_import_manual.py path/to/anket-manuel-kaynaklar.json")
        raise SystemExit(1)
    src = Path(sys.argv[1])
    manual = json.loads(src.read_text(encoding="utf-8"))
    if not isinstance(manual, list):
        raise SystemExit("Dosya bir dizi olmalı")
    bundle = json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))
    existing = {p["id"] for p in bundle.get("polls", [])}
    added = 0
    for poll in manual:
        pid = poll.get("id")
        if not pid or pid in existing:
            continue
        poll.pop("_manual", None)
        poll.pop("_addedAt", None)
        bundle["polls"].append(poll)
        existing.add(pid)
        added += 1
    if "dataRange" in bundle:
        bundle["dataRange"]["pollCount"] = len(bundle["polls"])
    BUNDLE_PATH.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Imported {added} manual polls into bundle ({len(bundle['polls'])} total)")


if __name__ == "__main__":
    main()
