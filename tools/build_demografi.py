"""
build_demografi.py
═══════════════════════════════════════════════════════════════
Demografi modülü için 3 katmanlı veri üretici:

  1. tr_demografi_ozet.json        — Türkiye geneli + 81 il toplamı (~50 KB)
                                     Sayfa açılışında otomatik yüklenir.
  
  2. data/demografi_iller/il_<IL>.json  — 81 ayrı dosya, her biri o ilin
                                     tüm ilçelerini detaylı içerir (~50-300 KB)
                                     Kullanıcı il seçince yüklenir.
  
  3. Veri kaynağı: data/aggregates/ilce_demografi_ozet.json
                  (build_aggregates.py'dan üretilir, hazır)

YAPISI (örnek):
  tr_demografi_ozet.json
  {
    "version": "1.0.0",
    "yillar": ["2018", ..., "2024"],
    "yas_kategorileri": ["18-24", ..., "65+"],
    "egitim_kategorileri": ["okuma_yazma_bilmeyen", ..., "universite_plus"],
    "turkiye": { yillar: { "2024": {toplam_18plus, yas, egitim, ...} } },
    "iller": {
      "İSTANBUL": { yillar: {...}, ilce_sayisi: 39 },
      ...
    }
  }
  
  il_<İSTANBUL>.json
  {
    "il": "İSTANBUL",
    "yillar": ["2018", ..., "2024"],
    "ilceler": {
      "ADALAR": { yillar: {...} },
      "KADIKÖY": { yillar: {...} },
      ...
    }
  }
═══════════════════════════════════════════════════════════════
"""

import json
import gzip
import os
import sys
import datetime


def log(msg):
    print(msg, flush=True)


def write_with_gzip(path, data, indent=None):
    """JSON ve gzip versiyonu yan yana yazar."""
    # Normal JSON
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, separators=(',', ':') if not indent else (',', ': '), indent=indent)
    # Gzip
    raw = json.dumps(data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    gz_path = path + '.gz'
    with gzip.open(gz_path, 'wb', compresslevel=9) as f:
        f.write(raw)
    
    size_kb = os.path.getsize(path) / 1024
    gz_kb = os.path.getsize(gz_path) / 1024
    log(f"    ✓ {os.path.basename(path):40s} {size_kb:7.1f} KB  (gzip: {gz_kb:6.1f} KB)")


def topla_iki_kayit(a, b):
    """İki demografi özet kaydını toplar (in-place a'ya yazar)."""
    for k in ["toplam_18plus", "erkek_18plus", "kadin_18plus", "toplam_tum_yaslar"]:
        a[k] = a.get(k, 0) + b.get(k, 0)
    
    for kat in a.get("yas", {}):
        for c in ["erkek", "kadin", "toplam"]:
            a["yas"][kat][c] = a["yas"][kat].get(c, 0) + b["yas"].get(kat, {}).get(c, 0)
    
    for kat in a.get("egitim", {}):
        for c in ["erkek", "kadin", "toplam"]:
            a["egitim"][kat][c] = a["egitim"][kat].get(c, 0) + b["egitim"].get(kat, {}).get(c, 0)
    
    # Yaş × eğitim çapraz toplama
    if "yas_egitim" in a and "yas_egitim" in b:
        for yas_kat in a["yas_egitim"]:
            for egt_kat in a["yas_egitim"][yas_kat]:
                for c in ["erkek", "kadin", "toplam"]:
                    a["yas_egitim"][yas_kat][egt_kat][c] = (
                        a["yas_egitim"][yas_kat][egt_kat].get(c, 0) +
                        b["yas_egitim"].get(yas_kat, {}).get(egt_kat, {}).get(c, 0)
                    )


def bos_kayit(yas_kategorileri, egitim_kategorileri):
    """Sıfır değerli bir özet kaydı oluşturur."""
    return {
        "toplam_18plus": 0,
        "erkek_18plus": 0,
        "kadin_18plus": 0,
        "toplam_tum_yaslar": 0,
        "yas": {k: {"erkek": 0, "kadin": 0, "toplam": 0} for k in yas_kategorileri},
        "egitim": {k: {"erkek": 0, "kadin": 0, "toplam": 0} for k in egitim_kategorileri},
        "yas_egitim": {
            yk: {ek: {"erkek": 0, "kadin": 0, "toplam": 0} for ek in egitim_kategorileri}
            for yk in yas_kategorileri
        },
    }


def main():
    # Yolları belirle
    script_dir = os.path.dirname(os.path.abspath(__file__))
    proje_root = os.path.dirname(script_dir)
    
    # Giriş
    ozet_path = os.path.join(proje_root, 'data', 'aggregates', 'ilce_demografi_ozet.json')
    
    # Çıkış
    out_dir = os.path.join(proje_root, 'data', 'aggregates')
    iller_dir = os.path.join(proje_root, 'data', 'demografi_iller')
    
    os.makedirs(iller_dir, exist_ok=True)
    
    # ============================================================
    # 1. Aggregate'i oku
    # ============================================================
    log("=" * 60)
    log("DEMOGRAFI VERI URETICI")
    log("=" * 60)
    log("")
    log(f"Okunuyor: {ozet_path}")
    
    if not os.path.exists(ozet_path):
        log(f"\n[HATA] Dosya bulunamadı: {ozet_path}")
        log("Önce 'python tools/build_aggregates.py --all' çalıştırın.")
        sys.exit(1)
    
    with open(ozet_path, 'r', encoding='utf-8') as f:
        ozet = json.load(f)
    
    yas_kategorileri = ozet.get("yas_kategorileri", [])
    egitim_kategorileri = ozet.get("egitim_kategorileri", [])
    
    log(f"  ✓ {len(ozet['ilceler'])} ilçe kaydı")
    log(f"  Yaş kategorileri: {yas_kategorileri}")
    log(f"  Eğitim kategorileri: {egitim_kategorileri}")
    
    # Tüm yılları topla
    tum_yillar = set()
    for ilce_data in ozet['ilceler'].values():
        for yil in ilce_data.get('yillar', {}):
            tum_yillar.add(yil)
    tum_yillar = sorted(tum_yillar)
    log(f"  Yıllar: {tum_yillar}")
    
    # ============================================================
    # 2. İller bazında grupla
    # ============================================================
    log("")
    log("=" * 60)
    log("2. IL BAZINDA GRUPLAMA")
    log("=" * 60)
    
    iller_data = {}  # il_adi → {ilceler: {ilce_adi: {yillar: ...}}}
    
    for geo_key, ilce_data in ozet['ilceler'].items():
        il_adi = ilce_data.get('il')
        ilce_adi = ilce_data.get('ad')
        
        if not il_adi or not ilce_adi:
            log(f"  [!] Atlandı (eksik bilgi): {geo_key}")
            continue
        
        if il_adi not in iller_data:
            iller_data[il_adi] = {
                "il": il_adi,
                "yillar_listesi": tum_yillar,
                "yas_kategorileri": yas_kategorileri,
                "egitim_kategorileri": egitim_kategorileri,
                "ilceler": {},
            }
        
        # İlçe verisini ilin altına koy
        iller_data[il_adi]["ilceler"][ilce_adi] = {
            "ad": ilce_adi,
            "yillar": ilce_data.get('yillar', {}),
        }
    
    log(f"  ✓ {len(iller_data)} il, toplam {sum(len(i['ilceler']) for i in iller_data.values())} ilçe")
    
    # ============================================================
    # 3. Her il için ayrı dosya yaz
    # ============================================================
    log("")
    log("=" * 60)
    log("3. IL DOSYALARI YAZILIYOR")
    log("=" * 60)
    
    toplam_il_dosya_boyut = 0
    for il_adi, il_data in sorted(iller_data.items()):
        # Dosya adı için il'i temizle (Türkçe karakter ok, ama / ve boşluk yok)
        il_safe = il_adi.replace(' ', '_').replace('/', '_')
        il_path = os.path.join(iller_dir, f'il_{il_safe}.json')
        
        # Dosyayı yaz (gzip + normal)
        with open(il_path, 'w', encoding='utf-8') as f:
            json.dump(il_data, f, ensure_ascii=False, separators=(',', ':'))
        
        raw = json.dumps(il_data, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
        gz_path = il_path + '.gz'
        with gzip.open(gz_path, 'wb', compresslevel=9) as f:
            f.write(raw)
        
        toplam_il_dosya_boyut += os.path.getsize(il_path)
    
    ortalama_il_boyut_kb = toplam_il_dosya_boyut / len(iller_data) / 1024
    log(f"  ✓ {len(iller_data)} il dosyası yazıldı")
    log(f"  Ortalama dosya boyutu: {ortalama_il_boyut_kb:.1f} KB")
    log(f"  Toplam boyut: {toplam_il_dosya_boyut/1024:.1f} KB ({toplam_il_dosya_boyut/1024/1024:.2f} MB)")
    
    # ============================================================
    # 4. Türkiye + il özetleri (tr_demografi_ozet.json)
    # ============================================================
    log("")
    log("=" * 60)
    log("4. TURKIYE + IL OZETLERI")
    log("=" * 60)
    
    tr_ozet = {
        "version": "1.0.0",
        "updated_at": datetime.date.today().isoformat(),
        "icerik": "Türkiye geneli + 81 il bazında demografi özeti. Detay için il_<X>.json dosyalarını kullanın.",
        "yillar": tum_yillar,
        "yas_kategorileri": yas_kategorileri,
        "egitim_kategorileri": egitim_kategorileri,
        "turkiye": {
            "yillar": {},
            "il_sayisi": len(iller_data),
            "ilce_sayisi": sum(len(i['ilceler']) for i in iller_data.values()),
        },
        "iller": {},
    }
    
    # Türkiye geneli için yıl yıl toplam tut
    for yil in tum_yillar:
        tr_ozet["turkiye"]["yillar"][yil] = bos_kayit(yas_kategorileri, egitim_kategorileri)
    
    # Her il için yıl yıl toplam yap
    for il_adi, il_data in iller_data.items():
        il_ozet = {
            "il": il_adi,
            "ilce_sayisi": len(il_data["ilceler"]),
            "yillar": {},
        }
        
        for yil in tum_yillar:
            il_yil_toplam = bos_kayit(yas_kategorileri, egitim_kategorileri)
            
            for ilce_adi, ilce in il_data["ilceler"].items():
                ilce_yil = ilce["yillar"].get(yil)
                if ilce_yil:
                    topla_iki_kayit(il_yil_toplam, ilce_yil)
            
            il_ozet["yillar"][yil] = il_yil_toplam
            # Türkiye'ye de ekle
            topla_iki_kayit(tr_ozet["turkiye"]["yillar"][yil], il_yil_toplam)
        
        tr_ozet["iller"][il_adi] = il_ozet
    
    # Yaz
    tr_ozet_path = os.path.join(out_dir, 'tr_demografi_ozet.json')
    write_with_gzip(tr_ozet_path, tr_ozet)
    
    # ============================================================
    # 5. İl bağlantı tablosu (manifest)
    # ============================================================
    log("")
    log("=" * 60)
    log("5. IL DOSYA MANIFEST")
    log("=" * 60)
    
    iller_manifest = {
        "version": "1.0.0",
        "updated_at": datetime.date.today().isoformat(),
        "icerik": "İl adından dosya yoluna eşleştirme",
        "iller": {
            il_adi: f"data/demografi_iller/il_{il_adi.replace(' ', '_').replace('/', '_')}.json"
            for il_adi in sorted(iller_data.keys())
        },
    }
    
    manifest_path = os.path.join(out_dir, 'demografi_iller_manifest.json')
    write_with_gzip(manifest_path, iller_manifest, indent=2)
    
    # ============================================================
    # ÖZET
    # ============================================================
    log("")
    log("=" * 60)
    log("OZET — ne uretildi?")
    log("=" * 60)
    log("")
    log(f"  ✓ data/aggregates/tr_demografi_ozet.json")
    log(f"     Türkiye geneli + 81 il toplamı (sayfa açılışında yüklenir)")
    log("")
    log(f"  ✓ data/aggregates/demografi_iller_manifest.json")
    log(f"     İl adından dosya yoluna eşleştirme")
    log("")
    log(f"  ✓ data/demografi_iller/il_<X>.json  ({len(iller_data)} dosya)")
    log(f"     Her il için detay (kullanıcı il seçince yüklenir)")
    log(f"     Ortalama: {ortalama_il_boyut_kb:.1f} KB / il")
    log("")
    log("Tamamlandı.")


if __name__ == "__main__":
    main()
