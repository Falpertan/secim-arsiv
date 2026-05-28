#!/usr/bin/env python3
"""Eksik firma anketlerini bundle.json'a ekler (doğrulanmış kaynaklı)."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLE_PATH = ROOT / "data" / "anket" / "bundle.json"

NEW_POLLS = [
    {
        "id": "piar-2023-pres-r1-05-10",
        "electionId": "2023-presidential-r1",
        "firmId": "piar",
        "publishedDate": "2023-05-11",
        "fieldworkStart": "2023-05-06",
        "fieldworkEnd": "2023-05-09",
        "scope": "candidate",
        "predictions": [
            {"targetId": "kilicdaroglu", "percent": 51.3},
            {"targetId": "erdogan", "percent": 45.3},
            {"targetId": "ogan", "percent": 2.6},
            {"targetId": "ince", "percent": 0.8},
        ],
        "publications": [
            {
                "id": "piar-2023-r1-bianet",
                "channel": "online_news",
                "outlet": "Bianet",
                "title": "PİAR Araştırma: Kılıçdaroğlu %51,3 — Erdoğan %45,3",
                "publishedAt": "2023-05-11",
                "url": "https://bianet.org/haber/yoneylem-ve-piar-arastirma-anket-sonuclari-kilicdaroglu-onde-gidiyor-278559",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "PİAR Araştırma — Bianet",
        "notes": "26 ilde CATI; kararsızlar dağıtıldıktan sonra.",
    },
    {
        "id": "piar-2023-pres-r2-05-27",
        "electionId": "2023-presidential-r2",
        "firmId": "piar",
        "publishedDate": "2023-05-27",
        "fieldworkStart": "2023-05-23",
        "fieldworkEnd": "2023-05-25",
        "scope": "candidate",
        "sampleSize": 2560,
        "predictions": [
            {"targetId": "erdogan", "percent": 52.5},
            {"targetId": "kilicdaroglu", "percent": 47.5},
        ],
        "publications": [
            {
                "id": "piar-2023-r2-kisadalga",
                "channel": "online_news",
                "outlet": "Kısa Dalga",
                "title": "Piar Araştırma ikinci tur anketi: Erdoğan %52,5 — Kılıçdaroğlu %47,5",
                "publishedAt": "2023-05-28",
                "url": "https://kisadalga.net/haber/detay/secim-sonucunu-piar-arastirma-tutturdu_70011",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "PİAR Araştırma",
        "notes": "Seçim sonucunu hata payı içinde doğru tahmin etti.",
    },
    {
        "id": "piar-2019-istanbul-rerun-06",
        "electionId": "2019-istanbul-rerun",
        "firmId": "piar",
        "publishedDate": "2019-06-20",
        "scope": "candidate",
        "predictions": [
            {"targetId": "imamoglu", "percent": 51.5},
            {"targetId": "yildirim", "percent": 47.6},
        ],
        "publications": [
            {
                "id": "piar-2019-ist-600vekil",
                "channel": "online_news",
                "outlet": "600vekil",
                "title": "Piar — İstanbul yenileme seçimi anket özeti",
                "publishedAt": "2019-06-20",
                "url": "https://600vekil.com/arastirmaci/piar",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "PİAR Araştırma — 600vekil arşivi",
    },
    {
        "id": "aksoy-2023-pres-r1-05-12",
        "electionId": "2023-presidential-r1",
        "firmId": "aksoy",
        "publishedDate": "2023-05-13",
        "fieldworkStart": "2023-05-09",
        "fieldworkEnd": "2023-05-12",
        "scope": "candidate",
        "sampleSize": 4000,
        "predictions": [
            {"targetId": "kilicdaroglu", "percent": 47.9},
            {"targetId": "erdogan", "percent": 45.6},
            {"targetId": "ogan", "percent": 5.7},
            {"targetId": "ince", "percent": 0.8},
        ],
        "publications": [
            {
                "id": "aksoy-2023-r1-medyascope",
                "channel": "online_news",
                "outlet": "Medyascope",
                "title": "Aksoy Araştırma son anket: seçim ikinci tura kalıyor",
                "publishedAt": "2023-05-13",
                "url": "https://medyascope.tv/2023/05/13/aksoy-arastirma-anket-sonuclarini-paylasti-secim-ikinci-tura-kaliyor/",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "Aksoy Araştırma — Türkiye Monitörü",
        "notes": "81 il, CATI; seçime 1 gün kala.",
    },
    {
        "id": "aksoy-2023-pres-r2-05-26",
        "electionId": "2023-presidential-r2",
        "firmId": "aksoy",
        "publishedDate": "2023-05-27",
        "fieldworkStart": "2023-05-24",
        "fieldworkEnd": "2023-05-26",
        "scope": "candidate",
        "sampleSize": 3000,
        "predictions": [
            {"targetId": "erdogan", "percent": 53.0},
            {"targetId": "kilicdaroglu", "percent": 47.0},
        ],
        "publications": [
            {
                "id": "aksoy-2023-r2-wiki",
                "channel": "academic_report",
                "outlet": "Wikipedia (anket derlemesi)",
                "title": "Aksoy Araştırma — 24-26 Mayıs 2023 ikinci tur anketi",
                "publishedAt": "2023-05-27",
                "url": "https://tr.wikipedia.org/wiki/2023_T%C3%BCrkiye_cumhurba%C5%9Fkanl%C4%B1%C4%9F%C4%B1_se%C3%A7imi_i%C3%A7in_yap%C4%B1lan_anketler",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "Aksoy Araştırma",
    },
    {
        "id": "istanbul-ekonomi-2023-pres-r1-05-12",
        "electionId": "2023-presidential-r1",
        "firmId": "istanbul-ekonomi",
        "publishedDate": "2023-05-12",
        "fieldworkStart": "2023-05-12",
        "fieldworkEnd": "2023-05-12",
        "scope": "candidate",
        "sampleSize": 1500,
        "predictions": [
            {"targetId": "kilicdaroglu", "percent": 50.5},
            {"targetId": "erdogan", "percent": 45.6},
            {"targetId": "ogan", "percent": 3.9},
            {"targetId": "ince", "percent": 4.9},
        ],
        "publications": [
            {
                "id": "iea-2023-r1-wiki",
                "channel": "academic_report",
                "outlet": "Wikipedia (İEA / Türkiye Raporu)",
                "title": "İstanbul Ekonomi Araştırma — 12 Mayıs 2023 cumhurbaşkanlığı anketi",
                "publishedAt": "2023-05-12",
                "url": "https://tr.wikipedia.org/wiki/2023_T%C3%BCrkiye_cumhurba%C5%9Fkanl%C4%B1%C4%9F%C4%B1_se%C3%A7imi_i%C3%A7in_yap%C4%B1lan_anketler",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "İstanbul Ekonomi Araştırma (İEA)",
        "notes": "Türkiye Raporu serisi; Wikipedia derlemesinden.",
    },
    {
        "id": "ozkiraz-2023-pres-r1-05-05",
        "electionId": "2023-presidential-r1",
        "firmId": "ozkiraz",
        "publishedDate": "2023-05-06",
        "fieldworkStart": "2023-04-27",
        "fieldworkEnd": "2023-05-05",
        "scope": "candidate",
        "sampleSize": 5600,
        "predictions": [
            {"targetId": "kilicdaroglu", "percent": 50.9},
            {"targetId": "erdogan", "percent": 43.6},
            {"targetId": "ogan", "percent": 3.0},
            {"targetId": "ince", "percent": 2.5},
        ],
        "publications": [
            {
                "id": "ozkiraz-2023-r1-wiki-avrasya",
                "channel": "online_news",
                "outlet": "Wikipedia (Avrasya derlemesi)",
                "title": "Avrasya Araştırma — 27 Nisan-5 Mayıs 2023 anketi",
                "publishedAt": "2023-05-06",
                "url": "https://tr.wikipedia.org/wiki/2023_T%C3%BCrkiye_cumhurba%C5%9Fkanl%C4%B1%C4%9F%C4%B1_se%C3%A7imi_i%C3%A7in_yap%C4%B1lan_anketler",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "Avrasya Araştırma — Kemal Özkıraz",
    },
    {
        "id": "mediar-2018-pres-04",
        "electionId": "2018-presidential",
        "firmId": "mediar",
        "publishedDate": "2018-04-25",
        "scope": "candidate",
        "sampleSize": 2660,
        "predictions": [
            {"targetId": "erdogan", "percent": 42.11},
            {"targetId": "ince", "percent": 20.11},
            {"targetId": "aksener", "percent": 19.70},
            {"targetId": "demirtas", "percent": 13.38},
            {"targetId": "karamollaoglu", "percent": 3.08},
        ],
        "publications": [
            {
                "id": "mediar-2018-04-indigo",
                "channel": "online_news",
                "outlet": "İndigo Dergisi",
                "title": "Mediar Araştırma — Nisan 2018 cumhurbaşkanlığı anketi",
                "publishedAt": "2018-04-25",
                "url": "https://indigodergisi.com/2018/04/mediar-24-haziran-secim-anketi-sonuclari/",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "Mediar Araştırma",
        "notes": "CHP adayı henüz İnce değildi; oran CHP adayına aittir.",
    },
    {
        "id": "mediar-2018-pres-05-23",
        "electionId": "2018-presidential",
        "firmId": "mediar",
        "publishedDate": "2018-05-24",
        "fieldworkStart": "2018-05-22",
        "fieldworkEnd": "2018-05-23",
        "scope": "candidate",
        "sampleSize": 4268,
        "predictions": [
            {"targetId": "erdogan", "percent": 43.50},
            {"targetId": "ince", "percent": 22.20},
            {"targetId": "aksener", "percent": 19.31},
            {"targetId": "demirtas", "percent": 12.79},
            {"targetId": "karamollaoglu", "percent": 1.61},
            {"targetId": "perincek", "percent": 0.60},
        ],
        "publications": [
            {
                "id": "mediar-2018-05-indigo",
                "channel": "online_news",
                "outlet": "İndigo Dergisi",
                "title": "Mediar — 22-23 Mayıs 2018 cumhurbaşkanlığı anketi",
                "publishedAt": "2018-05-24",
                "url": "https://indigodergisi.com/2018/05/son-secim-anketleri-24-haziran/",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "Mediar Araştırma",
    },
    {
        "id": "mediar-2018-pres-06-11",
        "electionId": "2018-presidential",
        "firmId": "mediar",
        "publishedDate": "2018-06-12",
        "fieldworkStart": "2018-06-08",
        "fieldworkEnd": "2018-06-11",
        "scope": "candidate",
        "sampleSize": 2401,
        "predictions": [
            {"targetId": "erdogan", "percent": 47.96},
            {"targetId": "ince", "percent": 29.88},
            {"targetId": "aksener", "percent": 9.15},
            {"targetId": "demirtas", "percent": 10.18},
            {"targetId": "karamollaoglu", "percent": 2.06},
            {"targetId": "perincek", "percent": 0.76},
        ],
        "publications": [
            {
                "id": "mediar-2018-06-turkipedia",
                "channel": "academic_report",
                "outlet": "Turkipedia (anket derlemesi)",
                "title": "Mediar — 8-11 Haziran 2018 son anket",
                "publishedAt": "2018-06-12",
                "url": "https://turkipedia.com/2018_T%C3%BCrkiye_cumhurba%C5%9Fkanl%C4%B1%C4%9F%C4%B1_se%C3%A7imi_i%C3%A7in_yap%C4%B1lan_anketler",
                "isPrimary": True,
            }
        ],
        "sourceLabel": "Mediar Araştırma",
        "notes": "Seçime 13 gün kala.",
    },
]


def main() -> None:
    bundle = json.loads(BUNDLE_PATH.read_text(encoding="utf-8"))
    existing = {p["id"] for p in bundle.get("polls", [])}
    added = 0
    for poll in NEW_POLLS:
        if poll["id"] in existing:
            continue
        bundle["polls"].append(poll)
        existing.add(poll["id"])
        added += 1
    if "dataRange" in bundle:
        bundle["dataRange"]["pollCount"] = len(bundle["polls"])
    BUNDLE_PATH.write_text(json.dumps(bundle, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Added {added} polls; total {len(bundle['polls'])}")


if __name__ == "__main__":
    main()
