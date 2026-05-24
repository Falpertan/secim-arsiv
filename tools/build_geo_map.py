"""
İl GeoJSON indirici ve doğrulayıcı
==========================================================================
Bu script:
  1) GitHub'dan Türkiye il GeoJSON'unu indirir (alpers/Turkey-Maps-GeoJSON)
  2) İl isimlerini geo.json ile eşleştirir
  3) Eşleşmeyenleri raporlar
  4) Eşleşen versiyonu data/core/turkiye_iller.geojson olarak kaydeder

Kullanım:
    python tools/build_geo_map.py
"""
import json
import urllib.request
import sys
from pathlib import Path

# İl GeoJSON kaynağı (alpers/Turkey-Maps-GeoJSON)
GEOJSON_URL = "https://raw.githubusercontent.com/alpers/Turkey-Maps-GeoJSON/master/tr-cities.json"

# Çıktı
OUTPUT = Path("data/core/turkiye_iller.geojson")
GEO_JSON = Path("data/core/geo.json")


def normalize_il_ad(s):
    """Türkçe karakterleri normalize ederek karşılaştırma için."""
    if not s:
        return ""
    s = s.strip()
    repl = {
        'Ç': 'C', 'Ğ': 'G', 'I': 'I', 'İ': 'I',
        'Ö': 'O', 'Ş': 'S', 'Ü': 'U',
        'ç': 'c', 'ğ': 'g', 'ı': 'i', 'i': 'i',
        'ö': 'o', 'ş': 's', 'ü': 'u',
    }
    for tr, ascii_ch in repl.items():
        s = s.replace(tr, ascii_ch)
    return s.lower().strip()


# Eski/kısa isim → resmi tam isim alias'ları
# Bazı GeoJSON kaynakları eski isimleri kullanır
IL_ALIAS_MAP = {
    'afyon': 'AFYONKARAHİSAR',
    'maras': 'KAHRAMANMARAŞ',
    'urfa':  'ŞANLIURFA',
}


def find_geo_il(gj_il_norm, geo_iller_norm):
    """Önce direkt eşleşme dene, sonra alias tablosundan bak."""
    if gj_il_norm in geo_iller_norm:
        return geo_iller_norm[gj_il_norm]
    # Alias kontrolü
    if gj_il_norm in IL_ALIAS_MAP:
        target = IL_ALIAS_MAP[gj_il_norm]
        target_norm = normalize_il_ad(target)
        if target_norm in geo_iller_norm:
            return geo_iller_norm[target_norm]
    return None


def main():
    print("=" * 60)
    print("İl GeoJSON indirme ve eşleştirme")
    print("=" * 60)
    
    # geo.json'u oku
    if not GEO_JSON.exists():
        print(f"✗ {GEO_JSON} bulunamadı. Önce build_geo.py çalıştırın.")
        sys.exit(1)
    
    with open(GEO_JSON, 'r', encoding='utf-8') as f:
        geo = json.load(f)
    
    geo_iller = list(geo['iller'].keys())
    print(f"✓ geo.json yüklendi: {len(geo_iller)} il")
    
    # GeoJSON'u indir
    print(f"\nGeoJSON indiriliyor: {GEOJSON_URL}")
    try:
        req = urllib.request.Request(GEOJSON_URL, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=30) as r:
            geojson_data = json.loads(r.read())
    except Exception as e:
        print(f"✗ İndirme hatası: {e}")
        print("\nManuel indirme için:")
        print(f"  1. Tarayıcıda aç: {GEOJSON_URL}")
        print(f"  2. Ctrl+S ile 'tr-cities.json' olarak kaydet")
        print(f"  3. Bu dosyayı şuraya kopyala: {OUTPUT.parent}")
        print(f"  4. Bu scripti --local flag ile çalıştır:")
        print(f"     python tools/build_geo_map.py --local")
        sys.exit(1)
    
    print(f"✓ GeoJSON indirildi: {len(geojson_data.get('features', []))} feature")
    
    # Feature'ların property yapısını incele
    features = geojson_data.get('features', [])
    if not features:
        print("✗ Feature bulunamadı")
        sys.exit(1)
    
    # İlk feature'ın property anahtarlarını göster
    sample_props = features[0].get('properties', {})
    print(f"\nFeature property anahtarları: {list(sample_props.keys())}")
    print(f"Örnek: {sample_props}")
    
    # İl adı hangi alanda? Olası adlar:
    olasi_alanlar = ['name', 'NAME', 'Name', 'name_1', 'NAME_1', 'IL_ADI', 'il', 'province', 'CITY', 'city']
    il_alani = None
    for f in olasi_alanlar:
        if f in sample_props:
            il_alani = f
            break
    
    if not il_alani:
        print(f"\n✗ İl adı alanı tespit edilemedi. Mevcut alanlar: {list(sample_props.keys())}")
        sys.exit(1)
    
    print(f"\n✓ İl adı alanı: '{il_alani}'")
    
    # Eşleştirme
    print(f"\nEşleştirme yapılıyor...")
    geo_iller_norm = {normalize_il_ad(il): il for il in geo_iller}
    
    eslesen = []
    eslesmeyen = []
    
    for feat in features:
        props = feat.get('properties', {})
        gj_il = props.get(il_alani, '').strip()
        if not gj_il:
            eslesmeyen.append(('(boş)', None))
            continue
        
        norm = normalize_il_ad(gj_il)
        geo_il = find_geo_il(norm, geo_iller_norm)
        if geo_il:
            eslesen.append((gj_il, geo_il))
            # Property'lere geo_il_adi ekle (sitenin kullanacağı standart ad)
            feat['properties']['geo_il_adi'] = geo_il
        else:
            eslesmeyen.append((gj_il, norm))
    
    print(f"\n✓ Eşleşen: {len(eslesen)} / {len(features)}")
    
    if eslesmeyen:
        print(f"✗ Eşleşmeyen: {len(eslesmeyen)}")
        for gj, n in eslesmeyen[:20]:
            print(f"    GeoJSON: '{gj}' (normalize: '{n}')")
    
    # Eksik geo iller (GeoJSON'da olmayan)
    eslesen_geo = set(geo_il for _, geo_il in eslesen)
    eksik = [il for il in geo_iller if il not in eslesen_geo]
    if eksik:
        print(f"\n✗ geo.json'da var, GeoJSON'da yok: {len(eksik)}")
        for il in eksik:
            print(f"    {il}")
    
    # Kaydet
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, 'w', encoding='utf-8') as f:
        json.dump(geojson_data, f, ensure_ascii=False, separators=(',', ':'))
    
    size = OUTPUT.stat().st_size
    print(f"\n✓ Kaydedildi: {OUTPUT}")
    print(f"  Boyut: {size:,} byte ({size/1024:.0f} KB)")
    
    if len(eslesen) == 81 and not eksik:
        print("\n🎉 Tüm 81 il eşleşti, harita için hazır!")
    else:
        print(f"\n⚠ {81 - len(eslesen)} il eksik. Eşleşmeyenleri Claude'a iletin.")


if __name__ == '__main__':
    main()
