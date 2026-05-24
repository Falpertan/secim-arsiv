# 2023 CB 2. Tur + 2023 MV Manifest Düzeltmesi — Cursor Rehberi

**Tarih:** 24 Mayıs 2026
**Hazırlayan:** Claude (devir notu)
**Durum:** İki iş kaleminden biri "5 dakika", diğeri "1-2 saat"

---

## Sorun Özeti

Yerel disketinde `data/elections/` klasörü incelendiğinde:

- **12 dashboard.json + 12 meta.json** dosyası var
- **Ama `data/manifest.json`'da sadece 11 seçim listeli**
- **2023_CB2** ise hem dashboard hem meta olarak hiç yok

Sonuç: site sadece 11 seçim gösteriyor; "12. seçim" (2023 MV) görülmüyor, "13. seçim" (2023 CB 2. tur) ise hiç yok.

---

## İŞ 1 — 2023 MV manifest'e eklenmesi (5 dakika)

### Durum

- `data/elections/2023_MV_dashboard.json` (1.846 KB) ✓ disketinde
- `data/elections/2023_MV_meta.json` (273 KB) ✓ disketinde
- Tarih: 6-7 Mayıs 2026 (manifest 4 Mayıs'ta üretilmiş, sonra MV eklenmiş, manifest yenilenmemiş)

### Yapılacak

`data/manifest.json` dosyasında **`2023_CB1`** girdisinden SONRA, **`2024_BBB`** girdisinden ÖNCE şu objeyi ekle:

```json
    {
      "key": "2023_MV",
      "yil": 2023,
      "tip": "Milletvekili",
      "kategori": "genel",
      "kisa": "MV 2023",
      "dashboard": "data/elections/2023_MV_dashboard.json",
      "meta": "data/elections/2023_MV_meta.json",
      "dashboard_size": 1890000,
      "meta_size": 279000,
      "il_count": 87,
      "ilce_count": 973,
      "party_count": null,
      "has_meta": true,
      "toplam_kayitli_secmen": 60721745,
      "toplam_oy_kullanan": 53994049,
      "toplam_sandik": 192214
    },
```

**Notlar:**
- `dashboard_size` ve `meta_size` yaklaşık byte cinsinden (1.846 KB ≈ 1890000 byte, 273 KB ≈ 279000 byte). Hassas değer için dosyayı `Get-Item ... | % Length` (PowerShell) ya da `stat -c%s` (bash) ile oku.
- `party_count`: dashboard.json'daki üst seviye `parti_sayisi` ya da Türkiye toplamındaki parti adedi. Eğer alan yoksa, Türkiye seviyesindeki parti objesinin key sayısını kullan. **null bıraktım çünkü değeri kesin bilmiyorum** — Cursor doldursun.
- `il_count: 87` çünkü MV seçimlerinde yurtdışı/gümrük il olarak sayılıyor (2018 MV ile aynı). CB1 ise 81 (sadece yurtiçi).
- Üst seviye `kayitli_secmen`, `oy_kullanan_secmen`, `toplam_sandik` doğrudan meta.json'ın `TURKIYE_META` bölümünden alındı.

### Doğrulama

Ekledikten sonra:

```bash
python3 -c "import json; m=json.load(open('data/manifest.json')); print(len(m['elections']))"
# 12 dönmeli
```

Site başlat, arşiv sayfasında 2023 MV görünmeli.

---

## İŞ 2 — 2023 CB 2. tur verisi (1-2 saat)

### Durum

- `2023_CB2_dashboard.json` YOK
- `2023_CB2_meta.json` YOK
- YSK'da resmi sonuç açık ve indirilebilir

### Önemli — Tarafsızlık

2023 CB 2. tur (Erdoğan vs. Kılıçdaroğlu) projenin en tartışmalı seçim verisi olacak. Tarafsızlık kuralları metodolojide tanımlı — onlara sadık kal:
- "Uyumsuzluk" dili kullan, "hile" değil
- Yurtdışı oyları, mühürsüz sandık iddiaları gibi hassas konularda **alternatif açıklamalar her zaman sunulur**
- Modülde aday ismi geçtiğinde notasyon kuralı: "Erdoğan (CB)", "Kılıçdaroğlu (CB)"

### Veri kaynağı

YSK'nın resmi şeffaflık portalı:
- **https://www.ysk.gov.tr** veya
- **https://acikveri.ysk.gov.tr** (varsa)
- Yedek: TÜİK, Habertürk, Anadolu Ajansı'nın YSK'dan beslenen resmi sonuç sayfaları

İdeal olarak sandık düzeyinde veri al; en azından **il + ilçe** düzeyi yeterli.

### Şema (2023 CB1 ile birebir aynı)

Yeni dosyalar şu iki şemaya uygun olmalı (CB1 dosyalarını referans olarak aç):

**`data/elections/2023_CB2_meta.json`:**
```json
{
  "election_id": 5,
  "election_type_id": 1,
  "config_key": "2023_CB2",
  "name": "2023 CB 2.tur",
  "TURKIYE_META": {
    "toplam_sandik": ...,
    "sandiklarda_kayitli_secmen": ...,
    "kayitli_secmen": ...,
    "oy_kullanan_secmen": ...,
    "gecerli_oy": ...,
    "gecersiz_oy": ...,
    "katilim_orani": ...
  },
  "IL_META": { "ADANA": {...}, "ADIYAMAN": {...}, ... },
  "ILCE_META": { "ADANA": { "ALADAĞ": {...}, "CEYHAN": {...}, ... }, ... },
  "scraped_at": "2026-..."
}
```

**`data/elections/2023_CB2_dashboard.json`:**
2023_CB1_dashboard.json'ın yapısını birebir kopyala. Yarışmacı listesi farklı: 2. turda **sadece Erdoğan ve Kılıçdaroğlu** vardı.

### Manifest girdisi (CB2 için)

İŞ 1'deki 2023_MV girdisinin altına ekle:

```json
    {
      "key": "2023_CB2",
      "yil": 2023,
      "tip": "Cumhurbaşkanlığı 2.tur",
      "kategori": "genel",
      "kisa": "CB2 2023",
      "dashboard": "data/elections/2023_CB2_dashboard.json",
      "meta": "data/elections/2023_CB2_meta.json",
      "dashboard_size": ...,
      "meta_size": ...,
      "il_count": 81,
      "ilce_count": 973,
      "party_count": 2,
      "has_meta": true,
      "toplam_kayitli_secmen": ...,
      "toplam_oy_kullanan": ...,
      "toplam_sandik": ...
    },
```

(CB1 ile aynı 81 il / 973 ilçe yapısı, 2 yarışmacı.)

### `parties.json` kontrolü

`parties.json` dosyasında ittifak/koalisyon tanımları var. 2023 CB 2. tur'da:
- **Cumhur İttifakı** → Erdoğan
- **Millet İttifakı** → Kılıçdaroğlu
- (Oğan ve İnce 2. turda yok)

2023_CB1 girdisini kopyala, yarışmacı listesini 2'ye indir.

### Genel iş akışı

1. YSK'dan ham veriyi al (CSV/JSON/HTML scrape — kaynak formatına göre)
2. `tools/` klasöründeki mevcut build scriptlerini (`build_aggregates.py`, `build_geo.py`) referans alarak yeni bir `build_2023_cb2.py` yaz **veya** mevcut scripti generic'leştir
3. Üretilen `2023_CB2_dashboard.json` ve `2023_CB2_meta.json`'ı `data/elections/` altına koy
4. `data/manifest.json`'a yukarıdaki CB2 girdisini ekle
5. `parties.json`'a CB2 ittifak tanımlarını ekle
6. Yerel sunucu başlat, arşivde CB2 görünmeli ve modüllerde (uyumsuzluk, demografi, bolge vb.) seçilebilir olmalı

---

## Site UI tarafında değişecekler

Bu iki seçim eklendikten sonra (toplam 13 olur):

### `home.js`, `hakkinda.js`, `metodoloji.js`'te metin güncellemesi

Aradığın string'ler:
- "11 seçim" → "13 seçim"
- "2018-2024 arası 11" → "2018-2024 arası 13"
- "11 secim" (slug olarak varsa)

### Sidebar tagline (app.js içinde)

```js
<div class="sidebar-tagline">
  Bağımsız, açık, tarafsız.<br/>
  2018'den 2024'e 11 seçim için il + ilçe analizi.  // ← 13 yap
</div>
```

### Hızlı arama

```bash
grep -rn "11 seçim\|11 sec\|11 selection" *.js *.html *.md 2>/dev/null
```

---

## Test senaryosu

İki iş bittiğinde sırayla:

1. **Manifest sağlığı:**
   ```bash
   python3 -c "import json; m=json.load(open('data/manifest.json')); assert len(m['elections'])==13; print('OK 13 seçim')"
   ```

2. **Site açılır mı:**
   - Yerel HTTP sunucu başlat (`python -m http.server 8000`)
   - Arşiv sayfasını aç → 13 seçim listeli olmalı
   - 2023 MV'ye tıkla → il/ilçe rakamları gelir
   - 2023 CB2'ye tıkla → Erdoğan ve Kılıçdaroğlu için sonuçlar gelir

3. **Modül entegrasyonu:**
   - Uyumsuzluk tespiti modülünde 2023 CB2 seçilebilir mi?
   - Bölge profili modülünde CB2 verisi haritada renklendirilebilir mi?
   - Karşılaştırma modülünde CB1 vs CB2 yapılabilir mi?

---

## Tarafsızlık kontrol listesi (2023 CB2 için ÖZEL DİKKAT)

2023 CB 2. tur'un tartışmalı doğası nedeniyle sitede aşağıdakileri **kesinlikle kontrol et**:

- [ ] Modüllerde 2 yarışmacı için tek bir kelimelik tanımlama yapılmamış ("kazanan", "kaybeden" gibi)
- [ ] Yurtdışı sandık verileri sunulduğunda not düşülmüş: "Yurtdışı sandıklarda farklı koşullarda oy kullanılır"
- [ ] Geçersiz oy oranı yüksek görünüyorsa "alternatif açıklamalar" bölümü mevcut (sandık görevlisi hatası, seçmen tutumu vb.)
- [ ] İl bazlı katılım oranı sıçramaları "uyumsuzluk" olarak işaretlenirken, "ama göç/demografik kayma da olası" notu var
- [ ] CB1 → CB2 arası katılım artışı veya oy kayması "tutum değişimi" olarak yorumlanmadan, ham veri gösteriliyor

---

**Bu rehber bitince Cursor'da yeni durum:**
- `data/elections/` → 14 dosya (13 dashboard + 13 meta + 1 CB2 manifest ek)
- `data/manifest.json` → 13 seçim
- `parties.json` → CB2 ittifak girdisi
- UI metinleri → "13 seçim" tutarlılığı

---

**Son not:**
Bu işin ikinci kısmı (CB2) belki birkaç gün sürebilir çünkü YSK ham verisinin scraping/processing kısmı kolay değildir. Acelesi yok; **lansman öncesinde tamamlanması yeterli.** İŞ 1 (MV manifest düzeltmesi) ise bugün yapılabilecek hızlı bir kazanım.
