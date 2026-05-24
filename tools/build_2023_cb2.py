#!/usr/bin/env python3
"""
2023 Cumhurbaşkanlığı 2. tur — dashboard + meta üretici.

Kaynak: secimharitasi.com (YSK kesin sonuçlarıyla uyumlu yayın).
Çıktı: data/elections/2023_CB2_dashboard.json
       data/elections/2023_CB2_meta.json

Kullanım:
    python tools/build_2023_cb2.py
    python tools/build_2023_cb2.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import unicodedata
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
ELECTIONS_DIR = ROOT / "data" / "elections"
CB1_META = ELECTIONS_DIR / "2023_CB1_meta.json"

BASE = "https://secimharitasi.com"
MAIN_PATH = "/2023-cumhurbaskanligi-ikinci-tur-secim-sonuclari"
UA = "AlperTan-SecimArsivi/1.0"

CANDIDATES = ["RECEP TAYYİP ERDOĞAN", "KEMAL KILIÇDAROĞLU"]

EXPECTED_TURKEY = {
    "kayitli_secmen": 60823248,
    "gecerli_oy": 51418556,
    "erdogan": 26690529,
    "kilicdaroglu": 24728027,
}


def log(msg: str) -> None:
    print(msg, flush=True)


def tr_upper(text: str) -> str:
    mapping = str.maketrans({"i": "İ", "ı": "I", "ş": "Ş", "ğ": "Ğ", "ü": "Ü", "ö": "Ö", "ç": "Ç"})
    return text.translate(mapping).upper()


def parse_int(num: str) -> int:
    return int(re.sub(r"[^\d]", "", num))


def parse_pct(num: str) -> float:
    import math
    s = num.replace("%", "").replace(",", ".").strip()
    if not s or s.lower() == "nan":
        return 0.0
    try:
        v = float(s)
    except ValueError:
        return 0.0
    return 0.0 if math.isnan(v) or math.isinf(v) else v


def fetch(path: str, retries: int = 3, delay: float = 0.35) -> str:
    url = path if path.startswith("http") else BASE + path
    last_err: Exception | None = None
    for attempt in range(retries):
        try:
            req = Request(url, headers={"User-Agent": UA, "Accept-Language": "tr-TR,tr;q=0.9"})
            with urlopen(req, timeout=45) as resp:
                return resp.read().decode("utf-8", "replace")
        except (HTTPError, URLError, TimeoutError) as err:
            last_err = err
            time.sleep(delay * (attempt + 1))
    raise RuntimeError(f"Fetch failed: {url} — {last_err}")


def strip_tags(html: str) -> str:
    return unescape(re.sub(r"<[^>]+>", "", html)).strip()


def parse_stat_boxes(html: str) -> dict:
    stats: dict = {}
    for m in re.finditer(r"<span[^>]*>([^<]{3,40})</span>\s*<p>([^<]+)</p>", html, re.I):
        label = strip_tags(m.group(1)).lower()
        val = strip_tags(m.group(2))
        if "kayıtlı" in label or "kayitli" in label:
            stats["kayitli_secmen"] = parse_int(val)
        elif "katılım" in label or "katilim" in label:
            stats["katilim_orani"] = parse_pct(val)
        elif "kullanılan" in label or "kullanilan" in label:
            stats["oy_kullanan_secmen"] = parse_int(val)
        elif "geçerli" in label or "gecerli" in label:
            stats["gecerli_oy"] = parse_int(val)
        elif "geçersiz" in label or "gecersiz" in label:
            stats["gecersiz_oy"] = parse_int(val)
    return stats


def parse_il_table(html: str) -> list[dict]:
    rows = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S | re.I)
        if len(tds) < 5:
            continue
        name = strip_tags(tds[0])
        if not name:
            continue
        link_m = re.search(r'href="(/2023-cumhurbaskanligi-ikinci-tur-secim-sonuclari/sehir/[^"]+)"', row, re.I)
        if not link_m:
            continue
        rows.append({
            "name_raw": name,
            "path": link_m.group(1),
            "erdogan": parse_int(strip_tags(tds[2])),
            "kilicdaroglu": parse_int(strip_tags(tds[4])),
        })
    return rows


def parse_ilce_table(html: str) -> list[dict]:
    rows = []
    for row in re.findall(r"<tr[^>]*>(.*?)</tr>", html, re.S | re.I):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", row, re.S | re.I)
        if len(tds) < 5:
            continue
        name = strip_tags(tds[0])
        if not name or name.startswith("%"):
            continue
        link_m = re.search(r'href="(/2023-cumhurbaskanligi-ikinci-tur-secim-sonuclari/ilce/[^"]+)"', row, re.I)
        rows.append({
            "name_raw": name,
            "path": link_m.group(1) if link_m else None,
            "erdogan": parse_int(strip_tags(tds[2])),
            "kilicdaroglu": parse_int(strip_tags(tds[4])),
        })
    return rows


def fold(s: str) -> str:
    s = tr_upper(s)
    s = unicodedata.normalize("NFKD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return re.sub(r"[^A-Z0-9]", "", s)


def build_lookup(cb1_meta: dict) -> tuple[dict[str, str], dict[str, dict[str, str]]]:
    il_map: dict[str, str] = {}
    ilce_map: dict[str, dict[str, str]] = {}
    for il in cb1_meta["IL_META"]:
        il_map[fold(il)] = il
        ilce_map[il] = {fold(ilce): ilce for ilce in cb1_meta["ILCE_META"].get(il, {})}
    return il_map, ilce_map


IL_ALIASES = {
    "AFYONKARAHISAR": "AFYONKARAHİSAR",
    "AGRI": "AĞRI",
    "ELAZIG": "ELAZIĞ",
    "KAHRAMANMARAS": "KAHRAMANMARAŞ",
    "SANLIURFA": "ŞANLIURFA",
}

ILCE_ALIASES = {
    "SAHINBEY": "ŞAHİNBEY",
    "SEHITKAMIL": "ŞEHİTKAMİL",
    "CUKUROVA": "ÇUKUROVA",
    "IMAMOGLU": "İMAMOĞLU",
    "KARATAS": "KARATAŞ",
    "SAIMBEYLI": "SAİMBEYLİ",
    "YUREGIR": "YÜREĞİR",
    "DIYADIN": "DİYADİN",
    "PATNOS": "PATNOS",
    "TASLIÇAY": "TAŞLIÇAY",
    "TUTAK": "TUTAK",
}


def resolve_il(name_raw: str, il_map: dict[str, str]) -> str:
    folded = fold(name_raw)
    if folded in il_map:
        return il_map[folded]
    if folded in IL_ALIASES:
        return IL_ALIASES[folded]
    raise KeyError(f"İl eşleşmedi: {name_raw!r}")


def resolve_ilce(il: str, name_raw: str, ilce_map: dict[str, dict[str, str]]) -> str:
    folded = fold(name_raw)
    local = ilce_map.get(il, {})
    if folded in local:
        return local[folded]
    if folded in ILCE_ALIASES:
        target = ILCE_ALIASES[folded]
        if target in local.values():
            return target
    raise KeyError(f"İlçe eşleşmedi: {il}/{name_raw!r}")


def vote_block(erdogan: int, kilicdaroglu: int) -> dict:
    total = erdogan + kilicdaroglu
    yuzde = {}
    if total > 0:
        yuzde = {
            CANDIDATES[0]: round(erdogan / total * 100, 2),
            CANDIDATES[1]: round(kilicdaroglu / total * 100, 2),
        }
    return {
        "partiler": {CANDIDATES[0]: erdogan, CANDIDATES[1]: kilicdaroglu},
        "toplam": total,
        "yuzde": yuzde,
    }


def meta_block(stats: dict, sandik: int) -> dict:
    import math
    kayitli = stats.get("kayitli_secmen", 0)
    oy_kullanan = stats.get("oy_kullanan_secmen", 0)
    gecerli = stats.get("gecerli_oy", 0)
    gecersiz = stats.get("gecersiz_oy", 0)
    katilim = stats.get("katilim_orani", 0.0)
    if math.isnan(katilim) or math.isinf(katilim):
        katilim = round(oy_kullanan / kayitli * 100, 2) if kayitli else 0.0
    return {
        "toplam_sandik": sandik,
        "sandiklarda_kayitli_secmen": kayitli,
        "kayitli_secmen": kayitli,
        "oy_kullanan_secmen": oy_kullanan,
        "gecerli_oy": gecerli,
        "gecersiz_oy": gecersiz,
        "katilim_orani": katilim,
    }


def json_safe(obj):
    import math
    if isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return 0.0
        return obj
    if isinstance(obj, dict):
        return {k: json_safe(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [json_safe(v) for v in obj]
    return obj


def build_cb2(dry_run: bool = False) -> None:
    cb1_meta = json.loads(CB1_META.read_text(encoding="utf-8"))
    il_map, ilce_map = build_lookup(cb1_meta)

    log("Ana sayfa çekiliyor…")
    main_html = fetch(MAIN_PATH)
    il_rows = parse_il_table(main_html)
    log(f"  {len(il_rows)} il")
    turkey_stats = parse_stat_boxes(main_html)

    secim_il: dict = {}
    secim_ilce: dict = {}
    il_meta: dict = {}
    ilce_meta: dict = {}
    total_e = total_k = 0
    missing_ilce: list[str] = []

    for idx, il_row in enumerate(il_rows, 1):
        il_name = resolve_il(il_row["name_raw"], il_map)
        log(f"[{idx}/81] {il_name}")
        prov_html = fetch(il_row["path"])
        il_stats = parse_stat_boxes(prov_html)
        sandik_il = cb1_meta["IL_META"].get(il_name, {}).get("toplam_sandik", 0)
        il_meta[il_name] = meta_block(il_stats, sandik_il)
        secim_il[il_name] = vote_block(il_row["erdogan"], il_row["kilicdaroglu"])
        total_e += il_row["erdogan"]
        total_k += il_row["kilicdaroglu"]

        secim_ilce[il_name] = {}
        ilce_meta[il_name] = {}
        for ilce_row in parse_ilce_table(prov_html):
            try:
                ilce_name = resolve_ilce(il_name, ilce_row["name_raw"], ilce_map)
            except KeyError as err:
                missing_ilce.append(str(err))
                continue
            secim_ilce[il_name][ilce_name] = vote_block(ilce_row["erdogan"], ilce_row["kilicdaroglu"])
            votes = secim_ilce[il_name][ilce_name]
            cb1_ic = cb1_meta["ILCE_META"].get(il_name, {}).get(ilce_name, {})
            sandik = cb1_ic.get("toplam_sandik", 0)
            if ilce_row["path"]:
                ilce_stats = parse_stat_boxes(fetch(ilce_row["path"]))
                if not ilce_stats.get("kayitli_secmen") and cb1_ic:
                    gecerli = votes["toplam"]
                    gecersiz = cb1_ic.get("gecersiz_oy", 0)
                    if cb1_ic.get("gecerli_oy"):
                        gecersiz = round(gecerli * cb1_ic["gecersiz_oy"] / cb1_ic["gecerli_oy"])
                    oy_kullanan = gecerli + gecersiz
                    kayitli = cb1_ic.get("kayitli_secmen", oy_kullanan)
                    ilce_stats = {
                        "kayitli_secmen": kayitli,
                        "oy_kullanan_secmen": oy_kullanan,
                        "gecerli_oy": gecerli,
                        "gecersiz_oy": gecersiz,
                        "katilim_orani": round(oy_kullanan / kayitli * 100, 2) if kayitli else 0.0,
                    }
                ilce_meta[il_name][ilce_name] = meta_block(ilce_stats, sandik)
        time.sleep(0.1)

    if missing_ilce:
        log(f"\nUYARI: {len(missing_ilce)} ilçe eşleşmedi:")
        for m in missing_ilce[:10]:
            log(f"  {m}")

    log(f"\nErdoğan: {total_e:,} | Kılıçdaroğlu: {total_k:,}")
    log(f"Beklenen: {EXPECTED_TURKEY['erdogan']:,} | {EXPECTED_TURKEY['kilicdaroglu']:,}")

    dashboard = {
        "election_id": 5,
        "election_type_id": 1,
        "config_key": "2023_CB2",
        "name": "2023 Cumhurbaşkanlığı 2.tur",
        "party_columns": CANDIDATES,
        "TURKIYE_TOPLAM": vote_block(total_e, total_k),
        "SECIM_IL": secim_il,
        "SECIM_ILCE": secim_ilce,
    }
    meta = {
        "election_id": 5,
        "election_type_id": 1,
        "config_key": "2023_CB2",
        "name": "2023 CB 2.tur",
        "TURKIYE_META": meta_block(turkey_stats, cb1_meta["TURKIYE_META"].get("toplam_sandik", 192214)),
        "IL_META": il_meta,
        "ILCE_META": ilce_meta,
        "scraped_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.000Z"),
        "kaynak": "secimharitasi.com (YSK kesin sonuçları; yurtiçi 81 il)",
    }

    if dry_run:
        log(f"DRY RUN — ilçe sayısı: {sum(len(v) for v in secim_ilce.values())}")
        return

    dash_path = ELECTIONS_DIR / "2023_CB2_dashboard.json"
    meta_path = ELECTIONS_DIR / "2023_CB2_meta.json"
    dash_path.write_text(json.dumps(json_safe(dashboard), ensure_ascii=False, indent=2), encoding="utf-8")
    meta_path.write_text(json.dumps(json_safe(meta), ensure_ascii=False, indent=2), encoding="utf-8")
    log(f"Yazıldı: {dash_path} ({dash_path.stat().st_size:,} byte)")
    log(f"Yazıldı: {meta_path} ({meta_path.stat().st_size:,} byte)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    try:
        build_cb2(dry_run=args.dry_run)
    except Exception as exc:
        log(f"HATA: {exc}")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
