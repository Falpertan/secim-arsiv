"""
Aggregate üretici v3
==========================================================================
AlperTan Türkiye Halk Oyu Arşivi için tüm aggregate dosyalarını üretir.

v3 yenilikleri:
  - Türkçe karakter normalize edilmiş eşleştirme (İZMİR vs IZMIR)
  - Merkez ilçe genişletmesi (MERKEZ → IL MERKEZ)
  - Belde belediyesi eşleştirmesi (TÜİK belde adı varsa, geo'daki ana ilçeye bağla)
  - Eşleşme istatistiği detaylı rapor

Çıktılar (data/aggregates/ altına):
    meta_turkiye_nuts.json     Türkiye + NUTS özet
    meta_iller.json            81 il bazlı
    meta_ilceler.json          973 ilçe bazlı
    parti_turkiye_nuts.json    Parti oyu (dashboard'lar gerekli)
    parti_iller.json
    parti_ilceler.json
    secmen_vs_18plus.json      Anomali atlası
    ilce_demografi_ozet.json   Demografi gezgini
    
Kullanım:
    python tools/build_aggregates.py --all
"""
import json
import os
import sys
import argparse
import gzip
import shutil
import datetime
from pathlib import Path
from collections import defaultdict


# ============================================================
# KONFİGÜRASYON
# ============================================================
ELECTIONS = [
    '2018_CB', '2018_MV',
    '2019_BBB', '2019_BB', '2019_IGM', '2019_BM',
    '2023_CB1', '2023_CB2', '2023_MV',
    '2024_BBB', '2024_BB', '2024_IGM', '2024_BM',
]

METRIC_KEYS = ["toplam_sandik", "kayitli_secmen", "oy_kullanan_secmen",
               "gecerli_oy", "gecersiz_oy"]

SECIM_DEMOGRAFI_YIL = {
    '2018_CB':  2017, '2018_MV':  2017,
    '2019_BBB': 2018, '2019_BB': 2018, '2019_IGM': 2018, '2019_BM': 2018,
    '2023_CB1': 2022, '2023_CB2': 2022, '2023_MV': 2022,
    '2024_BBB': 2023, '2024_BB': 2023, '2024_IGM': 2023, '2024_BM': 2023,
}

# Demografi karşılaştırması için UYGUN seçimler (analiz tipi A)
# CB, MV, IGM, BBB → ilçe geneli kapsar (demografi ile karşılaştırılabilir)
# BB, BM → SADECE belediye sınırı içi kapsar (köyleri kapsamaz, demografi ile yanıltıcı)
DEMOGRAFI_UYGUN_SECIMLER = {
    '2018_CB', '2018_MV',
    '2019_BBB', '2019_IGM',
    '2023_CB1', '2023_CB2', '2023_MV',
    '2024_BBB', '2024_IGM',
}

# Zamansal değişim için seçim çiftleri (analiz tipi B)
# (önceki, sonraki) — aynı seçim tipinde kayıtlı seçmen artışını izle
ZAMANSAL_CIFTLER = [
    ('2018_CB',  '2023_CB1'),   # Cumhurbaşkanlığı 2018 → 2023 1. tur
    ('2023_CB1', '2023_CB2'),   # Cumhurbaşkanlığı 2023 1. tur → 2. tur
    ('2018_MV',  '2023_MV'),    # Milletvekili 2018 → 2023
    ('2019_BBB', '2024_BBB'),   # Büyükşehir BB 2019 → 2024
    ('2019_BB',  '2024_BB'),    # BB 2019 → 2024
    ('2019_IGM', '2024_IGM'),   # İl Genel Meclisi 2019 → 2024
    ('2019_BM',  '2024_BM'),    # Belediye Meclisi 2019 → 2024
]

# Seçim tipi tutarsızlığı için karşılaştırma çiftleri (analiz tipi C)
# Aynı yılda iki seçimin aynı ilçedeki seçmen farkı = belde + köy seçmenleri
# Beklenen: IGM > BB (IGM tüm ilçe, BB sadece belediye sınırı)
TUTARSIZLIK_CIFTLER = [
    ('2024_IGM', '2024_BB'),
    ('2019_IGM', '2019_BB'),
]

YAS_KATEGORI = {
    "18-24": ["18-21", "22-24"],
    "25-34": ["25-29", "30-34"],
    "35-44": ["35-39", "40-44"],
    "45-54": ["45-49", "50-54"],
    "55-64": ["55-59", "60-64"],
    "65+":   ["65+"],
}

EGITIM_KATEGORI = {
    "okuma_yazma_bilmeyen": ["Okuma Yazma Bilmeyen"],
    "okuryazar": ["Okuma Yazma Bilen Fakat Bir Okul Bitirmeyen"],
    "ilkokul_ortaokul": [
        "İlkokul", "İlköğretim", "Ortaokul Veya Dengi Meslek Ortaokul"
    ],
    "lise_dengi": ["Lise Ve Dengi Meslek Okulu"],
    "universite_plus": [
        "Yüksekokul Veya Fakülte",
        "Yüksek Lisans (5 Veya 6 Yıllık Fakülteler Dahil)",
        "Doktora"
    ],
}
EGITIM_BILINMEYEN = "Bilinmeyen"


# ============================================================
# YARDIMCILAR
# ============================================================
def safe_int(v):
    return int(v) if v else 0


def add_katilim_orani(record):
    if record.get("kayitli_secmen", 0) > 0:
        record["katilim_orani"] = round(
            100 * record["oy_kullanan_secmen"] / record["kayitli_secmen"], 2
        )
    else:
        record["katilim_orani"] = 0
    return record


def find_election_file(input_dirs, ckey, suffix):
    for d in input_dirs:
        p = Path(d) / f"{ckey}_{suffix}.json"
        if p.exists():
            return str(p)
    return None


def write_with_gzip(path, data, log):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    gz_path = path + '.gz'
    with open(path, 'rb') as fin, gzip.open(gz_path, 'wb', compresslevel=9) as fout:
        shutil.copyfileobj(fin, fout)
    
    size = os.path.getsize(path)
    gz_size = os.path.getsize(gz_path)
    log(f"  ✓ {Path(path).name:35s} {size/1024:>8.1f} KB  (gzip: {gz_size/1024:>6.1f} KB)")


def normalize_il_ad(s):
    return s.upper().strip() if s else ""


def normalize_ilce_ad(s):
    return s.upper().strip() if s else ""


def trchar_normalize(s):
    """
    Türkçe karakter → ASCII, küçük harf, eşleştirme için kullanılır.
    'ALİAĞA' ↔ 'ALIAĞA' eşleşir, 'İZMİR' ↔ 'IZMIR' eşleşir.
    """
    if not s:
        return ""
    s = s.strip()
    # Türkçe karakterleri önce ASCII'ye çevir (case-sensitive olarak)
    repl = {
        'Ç': 'C', 'Ğ': 'G', 'I': 'I', 'İ': 'I',
        'Ö': 'O', 'Ş': 'S', 'Ü': 'U',
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i': 'i',
        'ö': 'o', 'ş': 's', 'ü': 'u',
    }
    for tr, ascii_ch in repl.items():
        s = s.replace(tr, ascii_ch)
    return s.lower().strip()


# ============================================================
# 1. META AGGREGATE
# ============================================================
def build_meta_aggregates(geo, input_dirs, output_dir, log):
    log("\n" + "=" * 60)
    log("1. META AGGREGATE")
    log("=" * 60)
    
    ilce_alias = geo.get('_alias_kayitlari', {}).get('ilce_alias', {})
    
    def normalize_ilce(il, ilce):
        key = f"{il}/{ilce}"
        return ilce_alias[key].split('/', 1)[1] if key in ilce_alias else ilce
    
    il_nuts1 = {il: info["nuts1"] for il, info in geo["iller"].items()}
    il_nuts2 = {il: info["nuts2"] for il, info in geo["iller"].items()}
    
    base = {
        "version": "1.0.0",
        "updated_at": datetime.date.today().isoformat(),
        "kaynak": "YSK *_meta.json dosyaları",
    }
    
    secimler_full = {}
    
    for ckey in ELECTIONS:
        path = find_election_file(input_dirs, ckey, "meta")
        if not path:
            log(f"  [!] {ckey} meta dosyası yok, atla")
            continue
        
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        sk = {
            "name": data.get('name', ckey),
            "turkiye": {k: safe_int((data.get('TURKIYE_META') or {}).get(k)) for k in METRIC_KEYS},
            "iller": {}, "ilceler": {}, "nuts1": {}, "nuts2": {},
        }
        
        for il_key, m in (data.get('IL_META') or {}).items():
            normal_il = il_key.split('-')[0] if '-' in il_key else il_key
            if normal_il not in geo["iller"]:
                continue
            if normal_il not in sk["iller"]:
                sk["iller"][normal_il] = {k: 0 for k in METRIC_KEYS}
            for k in METRIC_KEYS:
                sk["iller"][normal_il][k] += safe_int(m.get(k))
        
        for m in sk["iller"].values():
            add_katilim_orani(m)
        
        for level, mapping in [("nuts1", il_nuts1), ("nuts2", il_nuts2)]:
            t = defaultdict(lambda: {**{k: 0 for k in METRIC_KEYS}, "il_sayisi": 0})
            for il, m in sk["iller"].items():
                n = mapping.get(il)
                if n:
                    for k in METRIC_KEYS:
                        t[n][k] += m[k]
                    t[n]["il_sayisi"] += 1
            for v in t.values():
                add_katilim_orani(v)
            sk[level] = dict(t)
        
        for il_key, ilceler in (data.get('ILCE_META') or {}).items():
            normal_il = il_key.split('-')[0] if '-' in il_key else il_key
            for ilce_key, m in ilceler.items():
                ilce_norm = normalize_ilce(normal_il, ilce_key)
                full_key = f"{normal_il}/{ilce_norm}"
                if full_key not in geo["ilceler"]:
                    continue
                if full_key not in sk["ilceler"]:
                    sk["ilceler"][full_key] = {k: 0 for k in METRIC_KEYS}
                for k in METRIC_KEYS:
                    sk["ilceler"][full_key][k] += safe_int(m.get(k))
        
        for m in sk["ilceler"].values():
            add_katilim_orani(m)
        
        if sk["turkiye"]["kayitli_secmen"] == 0 and sk["iller"]:
            sk["turkiye"] = {k: sum(m[k] for m in sk["iller"].values()) for k in METRIC_KEYS}
            add_katilim_orani(sk["turkiye"])
            sk["turkiye"]["_kaynak"] = "il toplamından hesaplandı"
        else:
            add_katilim_orani(sk["turkiye"])
        
        secimler_full[ckey] = sk
        log(f"  • {ckey:12s}: {len(sk['iller'])} il × {len(sk['ilceler'])} ilçe")
    
    layers = {
        'meta_turkiye_nuts.json': {
            **base,
            "icerik": "Türkiye + 12 NUTS-1 + 26 NUTS-2 toplamları",
            "secimler": {ckey: {"name": sk["name"], "turkiye": sk["turkiye"],
                                "nuts1": sk["nuts1"], "nuts2": sk["nuts2"]}
                         for ckey, sk in secimler_full.items()}
        },
        'meta_iller.json': {
            **base,
            "icerik": "81 il × seçim meta toplamları",
            "secimler": {ckey: {"name": sk["name"], "iller": sk["iller"]}
                         for ckey, sk in secimler_full.items()}
        },
        'meta_ilceler.json': {
            **base,
            "icerik": "973 idari ilçe × seçim meta toplamları (beldeler hariç)",
            "secimler": {ckey: {"name": sk["name"], "ilceler": sk["ilceler"]}
                         for ckey, sk in secimler_full.items()}
        },
    }
    
    log("\n  Yazılıyor:")
    for fname, payload in layers.items():
        write_with_gzip(os.path.join(output_dir, fname), payload, log)
    
    return secimler_full


# ============================================================
# 2. PARTİ AGGREGATE
# ============================================================
def build_party_aggregates(geo, input_dirs, output_dir, log):
    log("\n" + "=" * 60)
    log("2. PARTİ AGGREGATE (dashboard)")
    log("=" * 60)
    
    ilce_alias = geo.get('_alias_kayitlari', {}).get('ilce_alias', {})
    
    def normalize_ilce(il, ilce):
        key = f"{il}/{ilce}"
        return ilce_alias[key].split('/', 1)[1] if key in ilce_alias else ilce
    
    il_nuts1 = {il: info["nuts1"] for il, info in geo["iller"].items()}
    il_nuts2 = {il: info["nuts2"] for il, info in geo["iller"].items()}
    
    base = {
        "version": "1.0.0",
        "updated_at": datetime.date.today().isoformat(),
        "kaynak": "YSK *_dashboard.json dosyaları",
    }
    
    secimler_full = {}
    eksik = []
    
    for ckey in ELECTIONS:
        path = find_election_file(input_dirs, ckey, "dashboard")
        if not path:
            eksik.append(ckey)
            continue
        
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        partiler = data.get('party_columns', [])
        sk = {
            "name": data.get('name', ckey),
            "partiler": partiler,
            "turkiye": data.get('TURKIYE_TOPLAM', {}),
            "iller": {}, "ilceler": {}, "nuts1": {}, "nuts2": {},
        }
        
        for il_key, votes in (data.get('SECIM_IL') or {}).items():
            normal_il = il_key.split('-')[0] if '-' in il_key else il_key
            if normal_il not in geo["iller"]:
                continue
            if normal_il not in sk["iller"]:
                sk["iller"][normal_il] = {p: 0 for p in partiler}
                sk["iller"][normal_il]["toplam"] = 0
            # YSK dashboard formatı: parti oyları 'partiler' alt-objesinde
            votes_partiler = votes.get('partiler', {}) if isinstance(votes.get('partiler'), dict) else {}
            for p in partiler:
                # Önce 'partiler' alt-objesinden dene, yoksa eski format (geriye uyum)
                deger = votes_partiler.get(p) if votes_partiler else votes.get(p)
                sk["iller"][normal_il][p] += safe_int(deger)
            sk["iller"][normal_il]["toplam"] += safe_int(votes.get("toplam"))
        
        for level, mapping in [("nuts1", il_nuts1), ("nuts2", il_nuts2)]:
            t = defaultdict(lambda: {**{p: 0 for p in partiler}, "toplam": 0, "il_sayisi": 0})
            for il, votes in sk["iller"].items():
                n = mapping.get(il)
                if n:
                    for p in partiler:
                        t[n][p] += votes[p]
                    t[n]["toplam"] += votes["toplam"]
                    t[n]["il_sayisi"] += 1
            sk[level] = dict(t)
        
        for il_key, ilceler in (data.get('SECIM_ILCE') or {}).items():
            normal_il = il_key.split('-')[0] if '-' in il_key else il_key
            for ilce_key, votes in ilceler.items():
                ilce_norm = normalize_ilce(normal_il, ilce_key)
                full_key = f"{normal_il}/{ilce_norm}"
                if full_key not in geo["ilceler"]:
                    continue
                if full_key not in sk["ilceler"]:
                    sk["ilceler"][full_key] = {p: 0 for p in partiler}
                    sk["ilceler"][full_key]["toplam"] = 0
                # YSK dashboard formatı: parti oyları 'partiler' alt-objesinde
                votes_partiler = votes.get('partiler', {}) if isinstance(votes.get('partiler'), dict) else {}
                for p in partiler:
                    deger = votes_partiler.get(p) if votes_partiler else votes.get(p)
                    sk["ilceler"][full_key][p] += safe_int(deger)
                sk["ilceler"][full_key]["toplam"] += safe_int(votes.get("toplam"))
        
        secimler_full[ckey] = sk
        log(f"  • {ckey:12s}: {len(partiler)} parti, {len(sk['iller'])} il, {len(sk['ilceler'])} ilçe")
    
    if eksik:
        log(f"\n  [!] {len(eksik)} seçimin dashboard dosyası eksik:")
        for ckey in eksik:
            log(f"      - {ckey}_dashboard.json")
    
    if not secimler_full:
        log("  Hiç dashboard dosyası bulunamadı, parti aggregate atlanıyor.")
        return
    
    layers = {
        'parti_turkiye_nuts.json': {
            **base,
            "icerik": "Türkiye + NUTS bazlı parti dağılımları",
            "secimler": {ckey: {"name": sk["name"], "partiler": sk["partiler"],
                                "turkiye": sk["turkiye"], "nuts1": sk["nuts1"], "nuts2": sk["nuts2"]}
                         for ckey, sk in secimler_full.items()}
        },
        'parti_iller.json': {
            **base,
            "icerik": "81 il × parti dağılımları",
            "secimler": {ckey: {"name": sk["name"], "partiler": sk["partiler"], "iller": sk["iller"]}
                         for ckey, sk in secimler_full.items()}
        },
        'parti_ilceler.json': {
            **base,
            "icerik": "973 ilçe × parti dağılımları",
            "secimler": {ckey: {"name": sk["name"], "partiler": sk["partiler"], "ilceler": sk["ilceler"]}
                         for ckey, sk in secimler_full.items()}
        },
    }
    
    log("\n  Yazılıyor:")
    for fname, payload in layers.items():
        write_with_gzip(os.path.join(output_dir, fname), payload, log)


# ============================================================
# 3. DEMOGRAFİ AGGREGATE — AKILLI EŞLEŞTIRME (v3 yeniliği)
# ============================================================
def parse_demografi_anahtar(anahtar):
    parts = anahtar.split('|')
    return tuple(parts) if len(parts) == 3 else None


def topla_yas_egitim(yil_kayit):
    egitim_kat_listesi = list(EGITIM_KATEGORI.keys()) + ["bilinmeyen"]
    
    sonuc = {
        "toplam_18plus": 0,
        "erkek_18plus": 0,
        "kadin_18plus": 0,
        "yas": {kat: {"erkek": 0, "kadin": 0, "toplam": 0} for kat in YAS_KATEGORI},
        "egitim": {kat: {"erkek": 0, "kadin": 0, "toplam": 0} 
                   for kat in egitim_kat_listesi},
        # YENİ: yaş × eğitim çaprazı (her hücre erkek/kadın/toplam)
        "yas_egitim": {
            yas_kat: {
                egt_kat: {"erkek": 0, "kadin": 0, "toplam": 0}
                for egt_kat in egitim_kat_listesi
            }
            for yas_kat in YAS_KATEGORI
        },
        "toplam_tum_yaslar": 0,
    }
    
    yas_to_kategori = {g: kat for kat, gruplar in YAS_KATEGORI.items() for g in gruplar}
    egitim_to_kategori = {s: kat for kat, seviyeler in EGITIM_KATEGORI.items() for s in seviyeler}
    
    for anahtar, sayi in yil_kayit.items():
        parsed = parse_demografi_anahtar(anahtar)
        if not parsed:
            continue
        cinsiyet, yas, egitim = parsed
        
        sonuc["toplam_tum_yaslar"] += sayi
        
        yas_kat = yas_to_kategori.get(yas)
        if not yas_kat:
            continue
        
        sonuc["toplam_18plus"] += sayi
        if cinsiyet == "Erkek":
            sonuc["erkek_18plus"] += sayi
            sonuc["yas"][yas_kat]["erkek"] += sayi
        elif cinsiyet == "Kadın":
            sonuc["kadin_18plus"] += sayi
            sonuc["yas"][yas_kat]["kadin"] += sayi
        sonuc["yas"][yas_kat]["toplam"] += sayi
        
        if egitim == EGITIM_BILINMEYEN:
            egt_kat = "bilinmeyen"
        else:
            egt_kat = egitim_to_kategori.get(egitim)
        
        if egt_kat:
            if cinsiyet == "Erkek":
                sonuc["egitim"][egt_kat]["erkek"] += sayi
            elif cinsiyet == "Kadın":
                sonuc["egitim"][egt_kat]["kadin"] += sayi
            sonuc["egitim"][egt_kat]["toplam"] += sayi
            
            # YENİ: yaş × eğitim çaprazı
            if cinsiyet == "Erkek":
                sonuc["yas_egitim"][yas_kat][egt_kat]["erkek"] += sayi
            elif cinsiyet == "Kadın":
                sonuc["yas_egitim"][yas_kat][egt_kat]["kadin"] += sayi
            sonuc["yas_egitim"][yas_kat][egt_kat]["toplam"] += sayi
    
    return sonuc


def smart_match_demografi_to_geo(demo_il_ad, demo_ilce_ad, geo, log_eslesme=False):
    """
    Demografi'deki (il, ilçe) → geo.json'daki ilçe key'ine eşleştirir.
    
    Strateji sırası:
      1. Tam eşleşme: 'KASTAMONU/ABANA' ↔ 'KASTAMONU/ABANA'
      2. Türkçe normalize: 'ALIAĞA' ↔ 'ALİAĞA' (lowercase tr-ascii eşleşmesi)
      3. Merkez ilçe: 'AFYONKARAHİSAR/MERKEZ' → 'AFYONKARAHİSAR/AFYONKARAHİSAR MERKEZ'
      4. Belde olarak eşleşme: demografi'de belde, geo'da ana ilçenin altında belde
    
    Returns (geo_key, eslesme_tipi) veya (None, None)
    """
    il = normalize_il_ad(demo_il_ad)
    ilce = normalize_ilce_ad(demo_ilce_ad)
    
    # 1. Tam eşleşme
    direct_key = f"{il}/{ilce}"
    if direct_key in geo["ilceler"]:
        return direct_key, "tam"
    
    # 2. Türkçe karakter normalize ile il'i bul, sonra ilçeyi bul
    il_norm = trchar_normalize(il)
    geo_iller_norm = {trchar_normalize(g_il): g_il for g_il in geo["iller"]}
    if il_norm not in geo_iller_norm:
        return None, None
    
    geo_il = geo_iller_norm[il_norm]
    
    # Bu il'in ilçeleri
    il_ilceleri = [k.split('/', 1)[1] for k in geo["ilceler"] if k.startswith(geo_il + '/')]
    il_ilceleri_norm = {trchar_normalize(g_ilce): g_ilce for g_ilce in il_ilceleri}
    
    ilce_norm = trchar_normalize(ilce)
    if ilce_norm in il_ilceleri_norm:
        return f"{geo_il}/{il_ilceleri_norm[ilce_norm]}", "tr_normalize"
    
    # 3. Merkez ilçe genişletmesi
    if ilce_norm == "merkez":
        # Geo'da '{IL} MERKEZ' formatında ara
        for g_ilce_norm, g_ilce_orig in il_ilceleri_norm.items():
            if g_ilce_norm == trchar_normalize(geo_il + " MERKEZ") or \
               g_ilce_norm.endswith(" merkez"):
                return f"{geo_il}/{g_ilce_orig}", "merkez"
    
    # 4. Belde olarak eşleşme
    # Demografi 'KASTAMONU/X BELDESİ' veya 'KASTAMONU/X' (geo'da X bir beldenin adı)
    for g_ilce in il_ilceleri:
        g_full = f"{geo_il}/{g_ilce}"
        beldeler = geo["ilceler"][g_full].get("beldeler", [])
        beldeler_norm = {trchar_normalize(b): b for b in beldeler}
        if ilce_norm in beldeler_norm:
            return g_full, "belde"
    
    return None, None


def build_demografi_aggregates(geo, demografi_path, meta_secimler, output_dir, log):
    log("\n" + "=" * 60)
    log("3. DEMOGRAFİ AGGREGATE (akıllı eşleştirme)")
    log("=" * 60)
    
    if not Path(demografi_path).exists():
        log(f"  [!] Demografi dosyası bulunamadı: {demografi_path}")
        return
    
    log(f"  Yükleniyor: {demografi_path}")
    log(f"  Boyut: {os.path.getsize(demografi_path)/1024/1024:.1f} MB")
    
    with open(demografi_path, 'r', encoding='utf-8') as f:
        demo = json.load(f)
    
    log(f"  {len(demo)} ilçe kaydı")
    
    # ============================================================
    # AKILLI EŞLEŞTIRME
    # ============================================================
    log("\n  Akıllı eşleştirme başlıyor...")
    
    eslesme = {}  # demografi_kod -> geo_key
    eslesme_tip_sayilari = defaultdict(int)
    eslesmeyen = []
    
    # Geo key → demografi kayıtları (birden fazla demografi kaydı bir geo key'e eşleşebilir, beldeler)
    geo_key_to_demo_kods = defaultdict(list)
    
    for kod, kayit in demo.items():
        il = kayit.get("il", "")
        ilce = kayit.get("ilce", "")
        
        geo_key, tip = smart_match_demografi_to_geo(il, ilce, geo)
        
        if geo_key:
            eslesme[kod] = geo_key
            eslesme_tip_sayilari[tip] += 1
            geo_key_to_demo_kods[geo_key].append(kod)
        else:
            eslesmeyen.append((kod, f"{normalize_il_ad(il)}/{normalize_ilce_ad(ilce)}"))
    
    log(f"\n  Eşleşme sonucu:")
    log(f"    Toplam demografi kaydı:  {len(demo):>5d}")
    log(f"    Eşleşen:                 {len(eslesme):>5d}  ({100*len(eslesme)/len(demo):.1f}%)")
    log(f"    Eşleşmeyen:              {len(eslesmeyen):>5d}")
    log(f"\n  Eşleşme tiplerinin dağılımı:")
    for tip, sayi in sorted(eslesme_tip_sayilari.items(), key=lambda x: -x[1]):
        log(f"    {tip:15s}: {sayi:>5d}")
    
    log(f"\n  Geo'daki ilçe sayısı:    {len(geo['ilceler']):>5d}")
    log(f"  Eşleşen unique geo:      {len(geo_key_to_demo_kods):>5d}")
    log(f"  Geo'da eşleşmeyen:       {len(geo['ilceler']) - len(geo_key_to_demo_kods):>5d}")
    
    if eslesmeyen:
        log(f"\n  [!] Eşleşmeyenlerden ilk 15:")
        for kod, k in eslesmeyen[:15]:
            log(f"      {kod}: {k}")
        if len(eslesmeyen) > 15:
            log(f"      ... ve {len(eslesmeyen)-15} tane daha")
    
    geo_eksik = sorted(set(geo['ilceler'].keys()) - set(geo_key_to_demo_kods.keys()))
    if geo_eksik:
        log(f"\n  [!] Geo'da var ama hiçbir demografi kaydıyla eşleşmeyen ilk 15:")
        for k in geo_eksik[:15]:
            log(f"      {k}")
        if len(geo_eksik) > 15:
            log(f"      ... ve {len(geo_eksik)-15} tane daha")
    
    # ============================================================
    # Yıl × ilçe özetlerini topla (birden fazla demografi kaydı varsa toplanır)
    # ============================================================
    log("\n  Yıl × ilçe özetleri:")
    
    ilce_yillar = {}
    
    for geo_key, demo_kods in geo_key_to_demo_kods.items():
        ilce_yillar[geo_key] = {}
        
        for kod in demo_kods:
            yillar = demo[kod].get("yillar", {})
            for yil_str, yil_kayit in yillar.items():
                ozet = topla_yas_egitim(yil_kayit)
                if yil_str in ilce_yillar[geo_key]:
                    mevcut = ilce_yillar[geo_key][yil_str]
                    for k in ["toplam_18plus", "erkek_18plus", "kadin_18plus", "toplam_tum_yaslar"]:
                        mevcut[k] += ozet[k]
                    for kat in mevcut["yas"]:
                        for c in ["erkek", "kadin", "toplam"]:
                            mevcut["yas"][kat][c] += ozet["yas"][kat][c]
                    for kat in mevcut["egitim"]:
                        for c in ["erkek", "kadin", "toplam"]:
                            mevcut["egitim"][kat][c] += ozet["egitim"][kat][c]
                else:
                    ilce_yillar[geo_key][yil_str] = ozet
    
    log(f"  ✓ {len(ilce_yillar)} ilçe için özet hazır")
    
    tum_yillar = sorted({y for ks in ilce_yillar.values() for y in ks.keys()})
    log(f"  Demografi yılları: {tum_yillar}")
    
    # ============================================================
    # secmen_vs_18plus.json
    # ============================================================
    log("\n  secmen_vs_18plus.json üretiliyor...")
    
    secmen_18plus = {
        "version": "1.0.0",
        "updated_at": datetime.date.today().isoformat(),
        "icerik": "Her ilçe × seçim için kayıtlı seçmen vs 18+ nüfus karşılaştırması",
        "kaynak": "YSK kayıtlı seçmen + TÜİK 18+ nüfus, seçim yılının bir öncesi demografi",
        "secim_yil_eslestirme": SECIM_DEMOGRAFI_YIL,
        "ilceler": {}
    }
    
    # Fallback: istenen yıl yoksa en yakın mevcut yılı kullan
    def en_yakin_yil(istenen_yil_int, mevcut_yillar_set):
        """Mevcut yıllar arasından istenene en yakın olanı bulur (string döner)."""
        if not mevcut_yillar_set:
            return None
        mevcut_int = sorted(int(y) for y in mevcut_yillar_set)
        if istenen_yil_int in mevcut_int:
            return str(istenen_yil_int)
        en_yakin = min(mevcut_int, key=lambda y: abs(y - istenen_yil_int))
        return str(en_yakin)
    
    for geo_key, ilce_data in geo["ilceler"].items():
        if geo_key not in ilce_yillar:
            continue
        
        kayit = {"il": ilce_data["il"], "ad": ilce_data["ad"], "secimler": {}}
        mevcut_yillar = set(ilce_yillar[geo_key].keys())
        
        for ckey in ELECTIONS:
            if ckey not in meta_secimler:
                continue
            ilce_meta = meta_secimler[ckey]["ilceler"].get(geo_key)
            if not ilce_meta:
                continue
            
            kayitli = ilce_meta["kayitli_secmen"]
            istenen_yil = SECIM_DEMOGRAFI_YIL.get(ckey)
            if not istenen_yil:
                continue
            
            # Fallback: istenen yıl yoksa en yakın mevcut yıl
            kullanilan_yil = en_yakin_yil(istenen_yil, mevcut_yillar)
            if not kullanilan_yil:
                continue
            
            n18plus = ilce_yillar[geo_key][kullanilan_yil]["toplam_18plus"]
            oran = round(100 * kayitli / n18plus, 2) if n18plus > 0 else 0
            
            kayit["secimler"][ckey] = {
                "kayitli_secmen": kayitli,
                "n18plus": n18plus,
                "demografi_yili": int(kullanilan_yil),
                "demografi_yili_istenen": istenen_yil,
                "demografi_yili_fallback": kullanilan_yil != str(istenen_yil),
                "oran_yuzde": oran,
                # Bu seçim demografi karşılaştırması için uygun mu?
                # BB ve BM sadece belediye sınırı içini kapsar, ilçe geneli demografisiyle karşılaştırılması yanıltıcı
                "demografi_uygun": ckey in DEMOGRAFI_UYGUN_SECIMLER,
            }
        
        if kayit["secimler"]:
            secmen_18plus["ilceler"][geo_key] = kayit
    
    log(f"  {len(secmen_18plus['ilceler'])} ilçe kaydı (analiz A — demografi)")
    
    # ============================================================
    # ANALİZ B: Zamansal değişim (her ilçe için her seçim çifti için)
    # ============================================================
    log("\n  Zamansal değişim hesaplanıyor (analiz B)...")
    
    # Her ilçenin tüm seçim verilerini topla (geo_key → {ckey: kayitli_secmen})
    ilce_secmenleri = {}
    for ckey in ELECTIONS:
        if ckey not in meta_secimler:
            continue
        for geo_key, m in meta_secimler[ckey]["ilceler"].items():
            if geo_key not in ilce_secmenleri:
                ilce_secmenleri[geo_key] = {}
            ilce_secmenleri[geo_key][ckey] = m["kayitli_secmen"]
    
    # Zamansal değişim çiftleri
    zamansal_kayitlar = {}  # geo_key → {cift_key: {onceki, sonraki, fark, fark_yuzde, ...}}
    
    for geo_key in ilce_secmenleri:
        if geo_key not in geo["ilceler"]:
            continue
        zamansal_kayitlar[geo_key] = {
            "il": geo["ilceler"][geo_key]["il"],
            "ad": geo["ilceler"][geo_key]["ad"],
            "ciftler": {}
        }
        for onceki_ckey, sonraki_ckey in ZAMANSAL_CIFTLER:
            onceki = ilce_secmenleri[geo_key].get(onceki_ckey)
            sonraki = ilce_secmenleri[geo_key].get(sonraki_ckey)
            if not onceki or not sonraki:
                continue
            fark = sonraki - onceki
            fark_yuzde = round(100 * fark / onceki, 2) if onceki > 0 else None
            cift_key = f"{onceki_ckey}_to_{sonraki_ckey}"
            zamansal_kayitlar[geo_key]["ciftler"][cift_key] = {
                "onceki_secim": onceki_ckey,
                "sonraki_secim": sonraki_ckey,
                "onceki_kayitli": onceki,
                "sonraki_kayitli": sonraki,
                "fark": fark,
                "fark_yuzde": fark_yuzde,
            }
    
    # Boş ilçeleri at
    zamansal_kayitlar = {k: v for k, v in zamansal_kayitlar.items() if v["ciftler"]}
    
    secmen_18plus["zamansal_degisim"] = {
        "icerik": "Her ilçe için aynı seçim tipinde önceki ve sonraki seçim arasındaki kayıtlı seçmen değişimi",
        "ciftler": [{"onceki": a, "sonraki": b} for a, b in ZAMANSAL_CIFTLER],
        "yorum": "Beklenen: %5-10 (nüfus artışı + yaşına gelen yeni seçmenler). %20+ veya -%10'dan az = açıklanması gereken değişim.",
        "ilceler": zamansal_kayitlar,
    }
    log(f"  ✓ {len(zamansal_kayitlar)} ilçe için zamansal değişim hazır")
    
    # ============================================================
    # ANALİZ C: Seçim tipi tutarsızlığı (aynı yıl IGM vs BB)
    # ============================================================
    log("\n  Seçim tipi tutarsızlığı hesaplanıyor (analiz C)...")
    
    tutarsizlik_kayitlar = {}
    for geo_key in ilce_secmenleri:
        if geo_key not in geo["ilceler"]:
            continue
        if geo_key not in tutarsizlik_kayitlar:
            tutarsizlik_kayitlar[geo_key] = {
                "il": geo["ilceler"][geo_key]["il"],
                "ad": geo["ilceler"][geo_key]["ad"],
                "ciftler": {}
            }
        for buyuk_ckey, kucuk_ckey in TUTARSIZLIK_CIFTLER:
            buyuk = ilce_secmenleri[geo_key].get(buyuk_ckey)
            kucuk = ilce_secmenleri[geo_key].get(kucuk_ckey)
            if not buyuk or not kucuk or buyuk == 0:
                continue
            # Beklenen: buyuk >= kucuk (IGM ilçe geneli, BB sadece belediye)
            fark = buyuk - kucuk
            kapsam_orani = round(100 * kucuk / buyuk, 2) if buyuk > 0 else 0  # BB'nin IGM'ye oranı
            cift_key = f"{kucuk_ckey}_vs_{buyuk_ckey}"
            tutarsizlik_kayitlar[geo_key]["ciftler"][cift_key] = {
                "buyuk_secim": buyuk_ckey,
                "kucuk_secim": kucuk_ckey,
                "buyuk_kayitli": buyuk,
                "kucuk_kayitli": kucuk,
                "fark": fark,
                "kapsam_yuzde": kapsam_orani,  # BB'nin IGM'ye oranı (= belediye sınırı içi seçmen oranı)
            }
    
    tutarsizlik_kayitlar = {k: v for k, v in tutarsizlik_kayitlar.items() if v["ciftler"]}
    
    secmen_18plus["tip_tutarsizligi"] = {
        "icerik": "Aynı yılda farklı seçim tiplerinde aynı ilçenin kayıtlı seçmen sayısının tutarlılığı",
        "yorum": "BB/IGM oranı = belediye sınırı içindeki seçmen oranı. Düşük oran (örn %30) = ilçenin çoğu köylerde/beldelerde yaşıyor. Yüksek oran (%95+) = belediye sınırı tüm ilçeyi kapsıyor (büyükşehir merkez ilçeleri).",
        "ciftler": [{"kucuk": k, "buyuk": b} for b, k in TUTARSIZLIK_CIFTLER],
        "ilceler": tutarsizlik_kayitlar,
    }
    log(f"  ✓ {len(tutarsizlik_kayitlar)} ilçe için tutarsızlık hazır")
    
    write_with_gzip(os.path.join(output_dir, 'secmen_vs_18plus.json'), secmen_18plus, log)
    
    # ============================================================
    # ilce_demografi_ozet.json
    # ============================================================
    log("\n  ilce_demografi_ozet.json üretiliyor...")
    
    demo_ozet = {
        "version": "1.0.0",
        "updated_at": datetime.date.today().isoformat(),
        "icerik": "Her ilçe × yıl için yaş, cinsiyet, eğitim özeti (18+)",
        "kaynak": "TÜİK demografi (all_demografi.min.json), 6-13 ve 14-17 yaş grupları dışlandı",
        "yas_kategorileri": list(YAS_KATEGORI.keys()),
        "egitim_kategorileri": list(EGITIM_KATEGORI.keys()) + ["bilinmeyen"],
        "ilceler": {}
    }
    
    for geo_key, yillar_data in ilce_yillar.items():
        ilce_data = geo["ilceler"][geo_key]
        kayit = {
            "il": ilce_data["il"],
            "ad": ilce_data["ad"],
            "yillar": {}
        }
        
        for yil, ozet in yillar_data.items():
            kayit["yillar"][yil] = {
                "toplam_18plus": ozet["toplam_18plus"],
                "erkek_18plus": ozet["erkek_18plus"],
                "kadin_18plus": ozet["kadin_18plus"],
                "yas": ozet["yas"],
                "egitim": ozet["egitim"],
                "yas_egitim": ozet["yas_egitim"],  # YENİ: yaş × eğitim çapraz tablo
                "toplam_tum_yaslar": ozet["toplam_tum_yaslar"],
            }
        
        demo_ozet["ilceler"][geo_key] = kayit
    
    log(f"  {len(demo_ozet['ilceler'])} ilçe × {len(tum_yillar)} yıl")
    write_with_gzip(os.path.join(output_dir, 'ilce_demografi_ozet.json'), demo_ozet, log)
    
    # ============================================================
    # Anomali ön-bakış
    # ============================================================
    log("\n  Anomali ön-bakış (2024_BB):")
    if '2024_BB' in meta_secimler:
        oranlar = []
        for k, kayit in secmen_18plus["ilceler"].items():
            sec = kayit["secimler"].get('2024_BB')
            if sec and sec["oran_yuzde"]:
                oranlar.append((sec["oran_yuzde"], k))
        oranlar.sort(reverse=True)
        
        log(f"    En yüksek 10 ilçe (kayıtlı / 18+):")
        for oran, k in oranlar[:10]:
            log(f"      %{oran:6.2f}  {k}")
        log(f"    En düşük 5 ilçe:")
        for oran, k in oranlar[-5:]:
            log(f"      %{oran:6.2f}  {k}")
        
        ust_100 = sum(1 for o, _ in oranlar if o > 100)
        ust_105 = sum(1 for o, _ in oranlar if o > 105)
        ust_110 = sum(1 for o, _ in oranlar if o > 110)
        log(f"    %100 üstü: {ust_100} ilçe, %105 üstü: {ust_105}, %110 üstü: {ust_110}")


# ============================================================
# ANA AKIŞ
# ============================================================
def main():
    parser = argparse.ArgumentParser(description='Aggregate üretici v3')
    parser.add_argument('--geo', default='data/core/geo.json')
    parser.add_argument('--input-dirs', nargs='+', default=['data/elections'])
    parser.add_argument('--demografi', default='data/demografi/all_demografi.min.json')
    parser.add_argument('--output-dir', default='data/aggregates')
    parser.add_argument('--with-dashboards', action='store_true')
    parser.add_argument('--with-demographics', action='store_true')
    parser.add_argument('--all', action='store_true')
    parser.add_argument('--quiet', action='store_true')
    args = parser.parse_args()
    
    log = print if not args.quiet else (lambda *a, **k: None)
    
    if not Path(args.geo).exists():
        print(f"[!] geo.json bulunamadı: {args.geo}", file=sys.stderr)
        print("    Önce build_geo.py çalıştır.", file=sys.stderr)
        sys.exit(1)
    
    with open(args.geo, 'r', encoding='utf-8') as f:
        geo = json.load(f)
    
    log(f"geo.json yüklendi: {len(geo['iller'])} il, {len(geo['ilceler'])} ilçe")
    
    meta_secimler = build_meta_aggregates(geo, args.input_dirs, args.output_dir, log)
    
    if args.with_dashboards or args.all:
        build_party_aggregates(geo, args.input_dirs, args.output_dir, log)
    
    if args.with_demographics or args.all:
        build_demografi_aggregates(geo, args.demografi, meta_secimler, args.output_dir, log)
    
    log("\n" + "=" * 60)
    log("Tamam.")
    log("=" * 60)


if __name__ == '__main__':
    main()
