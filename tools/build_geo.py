"""
geo.json üreticisi
==========================================================================
AlperTan Türkiye Halk Oyu Arşivi projesi için coğrafi referans dosyasını
üretir. Yeni seçim eklediğinde bu script'i tekrar çalıştırmak yeterli.

Girdi: data/elections/*_meta.json (her seçim için)
Çıktı: data/core/geo.json

Kullanım:
    python3 build_geo.py [--input-dir DIR] [--output FILE]

Yeni seçim eklendiğinde:
    1. data/elections/ klasörüne yeni *_meta.json ekle
    2. ELECTIONS sabitine config_key ekle
    3. python3 build_geo.py çalıştır

Yeni alias gerektiğinde (YSK farklı yazım kullanırsa):
    ILCE_ALIAS sözlüğüne ekle, scripti tekrar çalıştır.
"""
import json
import datetime
import argparse
import sys
from pathlib import Path
from collections import defaultdict


# ============================================================
# KONFİGÜRASYON — YENİ SEÇİM EKLENİNCE BURAYA EKLE
# ============================================================
ELECTIONS = [
    '2018_CB', '2018_MV',
    '2019_BBB', '2019_BB', '2019_IGM', '2019_BM',
    '2023_CB1', '2023_CB2', '2023_MV',
    '2024_BBB', '2024_BB', '2024_IGM', '2024_BM',
    # '2019_IBB_YN',  # İstanbul yenilenmiş — eklenecek
    # '2017_AY',      # referandum — eklenecek
]

# CB ve MV "saf ilçe" listesi verir (belde yok). Master kaynak bunlardan.
# Yeni saf ilçe veren seçim tipleri buraya eklenir.
SAF_ILCE_SECIMLERI = ['2018_CB', '2018_MV', '2023_CB1', '2023_CB2', '2023_MV']

# Belde belediyesi içeren seçim tipleri
BELDE_SECIMLERI = ['2019_BB', '2019_BM', '2024_BB', '2024_BM']

# YSK'nın aynı ilçeyi farklı yazdığı durumlar
# Format: "İL/YANLIŞ" → "İL/DOĞRU"
ILCE_ALIAS = {
    "KIRIKKALE/BAHŞILI": "KIRIKKALE/BAHŞİLİ",  # YSK 2018+2024'te BAHŞILI, 2019'da BAHŞİLİ. Resmi: BAHŞİLİ
}


# ============================================================
# NUTS REFERANS TABLOSU — TÜİK İBBS resmi sınıflandırması
# ============================================================
NUTS1 = {
    "TR1": "İstanbul", "TR2": "Batı Marmara", "TR3": "Ege",
    "TR4": "Doğu Marmara", "TR5": "Batı Anadolu", "TR6": "Akdeniz",
    "TR7": "Orta Anadolu", "TR8": "Batı Karadeniz", "TR9": "Doğu Karadeniz",
    "TRA": "Kuzeydoğu Anadolu", "TRB": "Ortadoğu Anadolu", "TRC": "Güneydoğu Anadolu",
}

NUTS2 = {
    "TR10": ("İstanbul", "TR1"), "TR21": ("Tekirdağ", "TR2"), "TR22": ("Balıkesir", "TR2"),
    "TR31": ("İzmir", "TR3"), "TR32": ("Aydın", "TR3"), "TR33": ("Manisa", "TR3"),
    "TR41": ("Bursa", "TR4"), "TR42": ("Kocaeli", "TR4"),
    "TR51": ("Ankara", "TR5"), "TR52": ("Konya", "TR5"),
    "TR61": ("Antalya", "TR6"), "TR62": ("Adana", "TR6"), "TR63": ("Hatay", "TR6"),
    "TR71": ("Kırıkkale", "TR7"), "TR72": ("Kayseri", "TR7"),
    "TR81": ("Zonguldak", "TR8"), "TR82": ("Kastamonu", "TR8"), "TR83": ("Samsun", "TR8"),
    "TR90": ("Trabzon", "TR9"),
    "TRA1": ("Erzurum", "TRA"), "TRA2": ("Ağrı", "TRA"),
    "TRB1": ("Malatya", "TRB"), "TRB2": ("Van", "TRB"),
    "TRC1": ("Gaziantep", "TRC"), "TRC2": ("Şanlıurfa", "TRC"), "TRC3": ("Mardin", "TRC"),
}

ILLER_NUTS = {
    1:("ADANA","TR62"),2:("ADIYAMAN","TRC1"),3:("AFYONKARAHİSAR","TR33"),4:("AĞRI","TRA2"),
    5:("AMASYA","TR83"),6:("ANKARA","TR51"),7:("ANTALYA","TR61"),8:("ARTVİN","TR90"),
    9:("AYDIN","TR32"),10:("BALIKESİR","TR22"),11:("BİLECİK","TR41"),12:("BİNGÖL","TRB1"),
    13:("BİTLİS","TRB2"),14:("BOLU","TR42"),15:("BURDUR","TR61"),16:("BURSA","TR41"),
    17:("ÇANAKKALE","TR22"),18:("ÇANKIRI","TR82"),19:("ÇORUM","TR83"),20:("DENİZLİ","TR32"),
    21:("DİYARBAKIR","TRC2"),22:("EDİRNE","TR21"),23:("ELAZIĞ","TRB1"),24:("ERZİNCAN","TRA1"),
    25:("ERZURUM","TRA1"),26:("ESKİŞEHİR","TR41"),27:("GAZİANTEP","TRC1"),28:("GİRESUN","TR90"),
    29:("GÜMÜŞHANE","TR90"),30:("HAKKARİ","TRB2"),31:("HATAY","TR63"),32:("ISPARTA","TR61"),
    33:("MERSİN","TR62"),34:("İSTANBUL","TR10"),35:("İZMİR","TR31"),36:("KARS","TRA2"),
    37:("KASTAMONU","TR82"),38:("KAYSERİ","TR72"),39:("KIRKLARELİ","TR21"),40:("KIRŞEHİR","TR71"),
    41:("KOCAELİ","TR42"),42:("KONYA","TR52"),43:("KÜTAHYA","TR33"),44:("MALATYA","TRB1"),
    45:("MANİSA","TR33"),46:("KAHRAMANMARAŞ","TRC1"),47:("MARDİN","TRC3"),48:("MUĞLA","TR32"),
    49:("MUŞ","TRB1"),50:("NEVŞEHİR","TR71"),51:("NİĞDE","TR71"),52:("ORDU","TR90"),
    53:("RİZE","TR90"),54:("SAKARYA","TR42"),55:("SAMSUN","TR83"),56:("SİİRT","TRC3"),
    57:("SİNOP","TR82"),58:("SİVAS","TR72"),59:("TEKİRDAĞ","TR21"),60:("TOKAT","TR83"),
    61:("TRABZON","TR90"),62:("TUNCELİ","TRB1"),63:("ŞANLIURFA","TRC2"),64:("UŞAK","TR33"),
    65:("VAN","TRB2"),66:("YOZGAT","TR72"),67:("ZONGULDAK","TR81"),68:("AKSARAY","TR71"),
    69:("BAYBURT","TRA1"),70:("KARAMAN","TR52"),71:("KIRIKKALE","TR71"),72:("BATMAN","TRC3"),
    73:("ŞIRNAK","TRC3"),74:("BARTIN","TR81"),75:("ARDAHAN","TRA2"),76:("IĞDIR","TRA2"),
    77:("YALOVA","TR42"),78:("KARABÜK","TR81"),79:("KİLİS","TRC1"),80:("OSMANİYE","TR62"),
    81:("DÜZCE","TR42"),
}

# 30 büyükşehir (resmi liste, 6360 sayılı kanun)
BUYUKSEHIRLER = {
    "ADANA","ANKARA","ANTALYA","AYDIN","BALIKESİR","BURSA","DENİZLİ","DİYARBAKIR",
    "ERZURUM","ESKİŞEHİR","GAZİANTEP","HATAY","İSTANBUL","İZMİR","KAHRAMANMARAŞ",
    "KAYSERİ","KOCAELİ","KONYA","MALATYA","MANİSA","MARDİN","MERSİN","MUĞLA",
    "ORDU","SAKARYA","SAMSUN","ŞANLIURFA","TEKİRDAĞ","TRABZON","VAN"
}

MV_SECIMLERI = ('2018_MV', '2023_MV')  # ileride 2028_MV vs gelirse buraya ekle


def normalize_ilce(il, ilce):
    """YSK alias'larını resmi yazıma çevir."""
    key = f"{il}/{ilce}"
    if key in ILCE_ALIAS:
        return ILCE_ALIAS[key].split('/', 1)[1]
    return ilce


def load_election(input_dir, config_key):
    """Bir seçimin meta dosyasını yükle."""
    path = Path(input_dir) / f"{config_key}_meta.json"
    if not path.exists():
        print(f"  [!] Eksik dosya: {path}", file=sys.stderr)
        return None
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


def build_geo(input_dir, output_path, verbose=True):
    """Ana üretici."""
    log = print if verbose else (lambda *a, **k: None)
    
    log("=" * 60)
    log("geo.json üretimi başlıyor")
    log("=" * 60)
    
    # 1) Saf ilçe master (CB/MV)
    saf_ilceler = defaultdict(set)
    for ckey in SAF_ILCE_SECIMLERI:
        if ckey not in ELECTIONS:
            continue
        data = load_election(input_dir, ckey)
        if not data:
            continue
        ilce_dict = data.get('ILCE_META') or data.get('SECIM_ILCE') or {}
        for il_key, ilceler in ilce_dict.items():
            normal_il = il_key.split('-')[0] if '-' in il_key else il_key
            for ilce in ilceler.keys():
                saf_ilceler[normal_il].add(normalize_ilce(normal_il, ilce))
    
    toplam_ilce = sum(len(v) for v in saf_ilceler.values())
    log(f"\n[1] Saf ilçe master: {len(saf_ilceler)} il × {toplam_ilce} ilçe")
    
    # 2) Aktif seçim eşleşmeleri
    ilce_aktif = defaultdict(set)
    mv_bolge_ilceler = {}
    
    for ckey in ELECTIONS:
        data = load_election(input_dir, ckey)
        if not data:
            continue
        ilce_dict = data.get('ILCE_META') or data.get('SECIM_ILCE') or {}
        
        if ckey in MV_SECIMLERI:
            mv_bolge_ilceler[ckey] = {}
        
        for il_key, ilceler in ilce_dict.items():
            normal_il = il_key.split('-')[0] if '-' in il_key else il_key
            
            if ckey in MV_SECIMLERI and '-' in il_key:
                mv_bolge_ilceler[ckey][il_key] = sorted([
                    normalize_ilce(normal_il, i) for i in ilceler.keys()
                ])
            
            for ilce in ilceler.keys():
                normalized = normalize_ilce(normal_il, ilce)
                if normalized in saf_ilceler.get(normal_il, set()):
                    ilce_aktif[f"{normal_il}/{normalized}"].add(ckey)
    
    log(f"[2] Aktif ilçe-seçim eşleşmesi: {len(ilce_aktif)}")
    
    # 3) Belde belediyeleri
    beldeler = defaultdict(set)
    problemli = []
    
    for ckey in BELDE_SECIMLERI:
        if ckey not in ELECTIONS:
            continue
        data = load_election(input_dir, ckey)
        if not data:
            continue
        ilce_dict = data.get('ILCE_META') or data.get('SECIM_ILCE') or {}
        
        for il_key, ilceler in ilce_dict.items():
            normal_il = il_key.split('-')[0] if '-' in il_key else il_key
            ilin_saf = saf_ilceler.get(normal_il, set())
            
            for kayit in ilceler.keys():
                kayit_norm = normalize_ilce(normal_il, kayit)
                if kayit_norm in ilin_saf:
                    continue
                
                ana_ilce = None
                for saf in ilin_saf:
                    if kayit_norm.startswith(saf + ' '):
                        ana_ilce = saf
                        break
                
                if ana_ilce:
                    belde_adi = kayit_norm[len(ana_ilce)+1:]
                    beldeler[f"{normal_il}/{ana_ilce}"].add(belde_adi)
                else:
                    problemli.append(f"{ckey} {normal_il}/{kayit}")
    
    if problemli:
        log(f"\n[!] Eşleşmeyen kayıtlar (alias gerekebilir):")
        for p in problemli:
            log(f"    {p}")
    else:
        log(f"[3] Tüm belde kayıtları başarıyla eşleştirildi")
    
    # 4) geo yapısı
    geo = {
        "version": "1.0.0",
        "updated_at": datetime.date.today().isoformat(),
        "kaynaklar": {
            "nuts": "TÜİK İBBS (İstatistiki Bölge Birimleri Sınıflandırması)",
            "ilceler": "YSK seçim verilerinden derlendi",
            "beldeler": "YSK BB ve BM seçim verilerinden derlendi",
        },
        "_alias_kayitlari": {
            "_aciklama": "YSK farklı seçimlerde aynı ilçeyi farklı yazabilir. Build sırasında bu tablo ile normalize edilir.",
            "ilce_alias": ILCE_ALIAS,
        },
        "nuts1": {
            kod: {
                "ad": ad,
                "iller": sorted([
                    ILLER_NUTS[p][0] for p in ILLER_NUTS
                    if NUTS2[ILLER_NUTS[p][1]][1] == kod
                ])
            } for kod, ad in NUTS1.items()
        },
        "nuts2": {
            kod: {
                "ad": ad,
                "nuts1": n1,
                "iller": sorted([
                    ILLER_NUTS[p][0] for p in ILLER_NUTS
                    if ILLER_NUTS[p][1] == kod
                ])
            } for kod, (ad, n1) in NUTS2.items()
        },
        "iller": {
            ILLER_NUTS[p][0]: {
                "plaka": p,
                "nuts1": NUTS2[ILLER_NUTS[p][1]][1],
                "nuts2": ILLER_NUTS[p][1],
                "buyuksehir_mi": ILLER_NUTS[p][0] in BUYUKSEHIRLER,
                "ilce_sayisi": len(saf_ilceler.get(ILLER_NUTS[p][0], set())),
            } for p in ILLER_NUTS
        },
        "ilceler": {},
        "mv_bolgeler": {
            "_aciklama": "Milletvekili seçimlerinde 4 il (ANKARA, BURSA, İSTANBUL, İZMİR) seçim çevrelerine bölünür. Her seçim için ayrı kayıt — YSK ileride yeniden dağıtım yapabilir.",
            **mv_bolge_ilceler
        }
    }
    
    for il, ilce_set in saf_ilceler.items():
        for ilce in sorted(ilce_set):
            key = f"{il}/{ilce}"
            ilce_beldeler = sorted(beldeler.get(key, set()))
            kayit = {
                "il": il,
                "ad": ilce,
                "tip": "merkez_ilce" if "MERKEZ" in ilce else "ilce",
                "aktif_secimler": sorted(ilce_aktif.get(key, set())),
            }
            if ilce_beldeler:
                kayit["beldeler"] = ilce_beldeler
            geo["ilceler"][key] = kayit
    
    # 5) Validator
    log("\n" + "=" * 60)
    log("VALİDATÖR")
    log("=" * 60)
    
    issues = []
    if len(geo["iller"]) != 81:
        issues.append(f"İl sayısı 81 değil: {len(geo['iller'])}")
    if len(geo["nuts1"]) != 12:
        issues.append(f"NUTS-1 sayısı 12 değil: {len(geo['nuts1'])}")
    if len(geo["nuts2"]) != 26:
        issues.append(f"NUTS-2 sayısı 26 değil: {len(geo['nuts2'])}")
    
    buyuksehir_count = sum(1 for v in geo["iller"].values() if v["buyuksehir_mi"])
    if buyuksehir_count != 30:
        issues.append(f"Büyükşehir sayısı 30 değil: {buyuksehir_count}")
    
    log(f"  {len(geo['iller'])} il, {len(geo['ilceler'])} ilçe")
    log(f"  {len(geo['nuts1'])} NUTS-1, {len(geo['nuts2'])} NUTS-2")
    log(f"  {buyuksehir_count} büyükşehir")
    log(f"  {len([v for v in geo['ilceler'].values() if 'beldeler' in v])} ilçede toplam "
        f"{sum(len(v.get('beldeler',[])) for v in geo['ilceler'].values())} belde belediyesi")
    
    if issues:
        log("\n[!] SORUNLAR:")
        for i in issues:
            log(f"    {i}")
        return None
    
    log("  ✓ Tüm validasyonlar geçti")
    
    # 6) Yaz
    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(geo, f, ensure_ascii=False, indent=2)
    
    size = Path(output_path).stat().st_size
    log(f"\n✓ Yazıldı: {output_path}")
    log(f"  Boyut: {size:,} byte ({size/1024:.1f} KB)")
    
    return geo


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='geo.json üretici')
    parser.add_argument('--input-dir', default='data/elections',
                        help='Seçim meta dosyalarının bulunduğu klasör')
    parser.add_argument('--output', default='data/core/geo.json',
                        help='Çıktı dosyası yolu')
    parser.add_argument('--quiet', action='store_true',
                        help='Sessiz mod')
    args = parser.parse_args()
    
    result = build_geo(args.input_dir, args.output, verbose=not args.quiet)
    sys.exit(0 if result else 1)
