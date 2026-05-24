#!/usr/bin/env python3
"""Otomatik QA kontrolleri — TEST_YONERGESI.md için."""
from __future__ import annotations

import json
import re
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BASE = f"http://127.0.0.1:{sys.argv[1] if len(sys.argv) > 1 else '8081'}"

DATA_FILES = [
    "data/manifest.json",
    "parties.json",
    "data/aggregates/parti_iller.json",
    "data/aggregates/parti_ilceler.json",
    "data/aggregates/meta_iller.json",
    "data/aggregates/meta_ilceler.json",
    "data/aggregates/ilce_demografi_ozet.json.gz",
    "data/aggregates/tr_demografi_ozet.json",
    "data/aggregates/demografi_iller_manifest.json",
    "data/core/geo.json",
    "data/core/turkiye_iller.geojson",
    "data/elections/2023_CB2_dashboard.json",
    "data/elections/2023_CB2_meta.json",
]

STATIC_FILES = [
    "index.html",
    "assets/app.js",
    "assets/style.css",
    "site.webmanifest",
    "favicons/favicon.ico",
    "favicons/apple-touch-icon.png",
    "ataturk_signature.png",
]

MODULES = [
    "home", "arsiv", "uyumsuzluk", "trend", "karsilastirma",
    "demografi", "bolge", "senaryo", "vekil", "metodoloji", "hakkinda",
]

BANNED_IN_MODULES = [
    (r"Sahtekarlık", "sahtekarlık"),
    (r"bağış|bagis|IBAN|patreon|kreosus|kendi cebinden", "bağış/para"),
]
# "hile" yalnızca olumsuz bağlamda (ör. "hile iddiası taşımaz") kabul edilir
HILE_NEGATION = re.compile(r"hile iddiası taşımaz", re.I)


def fetch_status(path: str) -> tuple[int, str]:
    url = f"{BASE}/{path.lstrip('/')}"
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "QA/1.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, r.read(200).decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, ""
    except Exception as e:
        return -1, str(e)


def main() -> int:
    results: list[tuple[str, bool, str]] = []

    def ok(name: str, passed: bool, detail: str = ""):
        results.append((name, passed, detail))
        mark = "OK" if passed else "FAIL"
        print(f"  [{mark}] {name}" + (f" — {detail}" if detail else ""))

    print("=== Dosya varlığı (disk) ===")
    for p in DATA_FILES + STATIC_FILES + [f"modules/{m}.js" for m in MODULES]:
        fp = ROOT / p
        ok(p, fp.is_file(), f"{fp.stat().st_size:,} B" if fp.is_file() else "eksik")

    print("\n=== HTTP 200 (sunucu) ===")
    server_up = fetch_status("index.html")[0] == 200
    ok("http.server", server_up, BASE if server_up else "Sunucu yanıt vermiyor — python -m http.server 8000")
    if server_up:
        for p in DATA_FILES + STATIC_FILES:
            st, _ = fetch_status(p)
            ok(f"GET {p}", st == 200, f"status={st}")

    print("\n=== Manifest & seçimler ===")
    manifest = json.loads((ROOT / "data/manifest.json").read_text(encoding="utf-8"))
    elections = manifest.get("elections", [])
    ok("manifest.version 1.0.0", manifest.get("version") == "1.0.0", manifest.get("version", ""))
    ok("13 seçim", len(elections) == 13, str(len(elections)))
    keys = {e["key"] for e in elections}
    ok("2023_CB2 manifest", "2023_CB2" in keys)
    ok("2023_MV manifest", "2023_MV" in keys)

    print("\n=== CB2 JSON ===")
    cb2m = (ROOT / "data/elections/2023_CB2_meta.json").read_text(encoding="utf-8")
    ok("CB2 meta NaN yok", "NaN" not in cb2m)
    cb2 = json.loads((ROOT / "data/elections/2023_CB2_dashboard.json").read_text(encoding="utf-8"))
    ilce = sum(len(v) for v in cb2.get("SECIM_ILCE", {}).values())
    ok("CB2 973 ilçe", ilce == 973, str(ilce))
    t = cb2["TURKIYE_TOPLAM"]["partiler"]
    ok("CB2 Erdoğan toplam", t.get("RECEP TAYYİP ERDOĞAN") == 26690529)
    ok("CB2 Kılıçdaroğlu toplam", t.get("KEMAL KILIÇDAROĞLU") == 24728027)

    print("\n=== index.html script tag ===")
    html = (ROOT / "index.html").read_text(encoding="utf-8")
    for m in MODULES:
        ok(f"script modules/{m}.js", f"modules/{m}.js" in html)
    ok("cache ?v=7", "?v=7" in html)

    print("\n=== app.js router ===")
    app = (ROOT / "assets/app.js").read_text(encoding="utf-8")
    ok("13 seçim sidebar", "13 seçim" in app)
    ok("footer v1.0", "v1.0" in app)
    ok("projeksiyon redirect", "projeksiyon' ? 'demografi'" in app or "projeksiyon" in app and "demografi" in app)
    for r in ["uyumsuzluk", "bolge", "vekil"]:
        ok(f"route {r}", f"id: '{r}'" in app or f'id: "{r}"' in app)

    print("\n=== Manifest election dosyaları ===")
    for e in elections:
        for k in ("dashboard", "meta"):
            fp = ROOT / e[k]
            ok(f"{e['key']} {k}", fp.is_file())

    print("\n=== Tarafsızlık / bağış grep ===")
    mod_dir = ROOT / "modules"
    hits = []
    for fp in mod_dir.glob("*.js"):
        text = fp.read_text(encoding="utf-8")
        for pat, label in BANNED_IN_MODULES:
            if re.search(pat, text, re.I):
                hits.append(f"{fp.name}:{label}")
        if re.search(r"\b[Hh]ile\b", text) and not HILE_NEGATION.search(text):
            hits.append(f"{fp.name}:hile (olumsuz bağlam dışı)")
    ok("modüllerde yasak kelime yok", not hits, "; ".join(hits))

    print("\n=== Senaryo / trend CB2 ===")
    senaryo = (ROOT / "modules/senaryo.js").read_text(encoding="utf-8")
    trend = (ROOT / "modules/trend.js").read_text(encoding="utf-8")
    ok("senaryo 2023_CB2", "2023_CB2" in senaryo)
    ok("trend 2023_CB2", "2023_CB2" in trend)
    ok("senaryo tahmin uyarısı", "tahmin değildir" in senaryo)

    print("\n=== Metodoloji / hakkında ===")
    met = (ROOT / "modules/metodoloji.js").read_text(encoding="utf-8")
    hak = (ROOT / "modules/hakkinda.js").read_text(encoding="utf-8")
    ok("metodoloji gönüllü emek", "gönüllü" in met.lower())
    ok("metodoloji github placeholder yok", "github.com/placeholder" not in met.lower())
    ok("hakkında bağış yok", not re.search(r"bağış|iban", hak, re.I))

    print("\n=== Karşılaştırma Bodrum referans verisi ===")
    d18 = json.loads((ROOT / "data/elections/2018_CB_dashboard.json").read_text(encoding="utf-8"))
    d23 = json.loads((ROOT / "data/elections/2023_CB1_dashboard.json").read_text(encoding="utf-8"))
    b18 = d18["SECIM_ILCE"]["MUĞLA"]["BODRUM"]["yuzde"]["MUHARREM İNCE"]
    b23 = d23["SECIM_ILCE"]["MUĞLA"]["BODRUM"]["yuzde"]["KEMAL KILIÇDAROĞLU"]
    ok("Bodrum 2018 CB İnce ~66.6%", 66.0 <= b18 <= 67.0, f"{b18}")
    ok("Bodrum 2023 CB1 Kılıçdaroğlu ~75.5%", 75.0 <= b23 <= 76.0, f"{b23}")

    print("\n=== home / arsiv metin ===")
    home = (ROOT / "modules/home.js").read_text(encoding="utf-8")
    ok("home 13 seçim", "13 seçim" in home)
    arsiv = (ROOT / "modules/arsiv.js").read_text(encoding="utf-8")
    ok("arsiv 13 seçim", "13 seçim" in arsiv)

    print("\n=== Aggregates CB2 ===")
    pi = json.loads((ROOT / "data/aggregates/parti_iller.json").read_text(encoding="utf-8"))
    ok("aggregates parti_iller CB2", "2023_CB2" in pi.get("secimler", pi))

    fails = [r for r in results if not r[1]]
    print(f"\n=== ÖZET: {len(results) - len(fails)}/{len(results)} geçti, {len(fails)} hata ===")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
