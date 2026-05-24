# 🇹🇷 Türkiye Halk Oyu Arşivi & Anomali Tespit Platformu — Durum Raporu v3

**Tarih**: 6 Mayıs 2026 (güncel)
**Marka**: AlperTan™ (sadece A ve T capital, `text-transform:uppercase` YASAK)
**Yayın hedefi**: Cloudflare Pages, kişisel domain, statik site, bağış modeli
**v3 değişiklikleri**: Veri çekirdeği üretildi, anomali modülü 3 sekmeli olarak inşa edildi

---

## 🎯 PROJENİN ASIL AMACI

Çok kapsamlı arşiv + geçmişe dönük analiz + geleceğe projeksiyon + ipucu tespiti.

Ana sütunlar:
- **Halk oyu arşivi**: 2018-2024 arası 12 seçim, il + ilçe granülarlığında (referandum + yenilenmiş seçimler de eklenecek)
- **Anomali tespiti** (3 perspektif): demografi karşılaştırması + zamansal değişim + tip tutarsızlığı
- **Demografik analiz**: yaş × eğitim × cinsiyet × seçim parti dağılımı eşleşmeleri
- **Trend analizi**: yıldan yıla parti hareketi, koalisyon dinamikleri
- **Projeksiyon**: mevcut trendlerle 2028 senaryoları (basit, tarafsız)

Mahalle granülarlığı yok (analitik ROI düşük).

---

## 📊 VERİ DURUMU — TAM ÜRETİLDİ

### ✅ Veri Çekirdeği (YENİ — v3)

**Lokal yapı**: `D:\secim_arsiv\` (OneDrive'dan çıkarıldı, temiz dizin)

```
D:\secim_arsiv\
├── data\
│   ├── core\
│   │   ├── geo.json                  (350 KB) - 81 il, 973 ilçe, NUTS, beldeler, MV bölgeleri
│   │   └── turkiye_iller.geojson     (238 KB) - 81 il sınırları (alpers/Turkey-Maps-GeoJSON)
│   ├── elections\                    24 dosya (12 seçim × meta + dashboard)
│   ├── demografi\
│   │   └── all_demografi.min.json    (60 MB) - TÜİK ham veri
│   └── aggregates\                   8 dosya, hepsi gzip'li
│       ├── meta_turkiye_nuts.json    (gzip 11 KB)
│       ├── meta_iller.json           (gzip 20 KB)
│       ├── meta_ilceler.json         (gzip 281 KB)
│       ├── parti_turkiye_nuts.json   (gzip 7 KB)
│       ├── parti_iller.json          (gzip 10 KB)
│       ├── parti_ilceler.json        (gzip 123 KB)
│       ├── secmen_vs_18plus.json     (gzip 193 KB) - 3 anomali analizi
│       └── ilce_demografi_ozet.json  (gzip 996 KB) - demografi gezgini
├── tools\
│   ├── build_geo.py                  - geo.json üretici
│   ├── build_aggregates.py           - aggregate üretici (3 analiz tipi)
│   └── build_geo_map.py              - il GeoJSON indirici/eşleştirici
├── modules\
│   ├── home.js
│   ├── arsiv.js
│   └── anomali.js                    (72 KB - 3 sekmeli, haritalı)
├── assets\
│   ├── app.js
│   └── style.css
├── manifest.json
├── parties.json
└── index.html
```

### ✅ Veri Eşleştirme — %100 Başarılı

**TÜİK demografi ↔ YSK seçim eşleştirmesi:**
- Toplam demografi kaydı: 973
- **Eşleşen: 973 / 973 (%100)**
- Strateji dağılımı:
  - Türkçe karakter normalize: 526 ilçe
  - Tam eşleşme: 396 ilçe
  - Merkez ilçe genişletmesi: 51 ilçe
  - Belde fallback: 0 (ihtiyaç olmadı)

**İl GeoJSON eşleştirmesi:**
- 81/81 il eşleşti (Afyon → AFYONKARAHİSAR alias eklendi)

### ✅ TÜİK Demografi (TAMAM)
- **81 il / 973 ilçe / 7 yıl (2018-2024)**
- 2 cinsiyet × 13 yaş grubu × 10 eğitim seviyesi
- **Format**: `kod → {il, ilçe, yillar → {yyyy → {"cinsiyet|yas|egitim": sayı}}}`
- **Path**: `data/demografi/all_demografi.min.json` (57-60MB)

**Yaş kategorileri (site tarafında):** 18-24, 25-34, 35-44, 45-54, 55-64, 65+ (6-13 ve 14-17 dışlandı)

**Eğitim kategorileri (site tarafında):**
- okuma_yazma_bilmeyen
- okuryazar (Okuma Yazma Bilen Fakat Bir Okul Bitirmeyen)
- ilkokul_ortaokul (İlkokul + İlköğretim + Ortaokul Veya Dengi Meslek Ortaokul)
- lise_dengi (Lise Ve Dengi Meslek Okulu)
- universite_plus (Yüksekokul Veya Fakülte + Yüksek Lisans + Doktora)
- bilinmeyen (ayrı sayılır, toplama dahil edilmez)

### ✅ YSK Seçim Sonuçları — 12/12 TAMAM

| Konfig | İl | İlçe | Parti | Kayıtlı Seçmen |
|---|---|---|---|---|
| 2018_CB    | 81 | 972  | 6  | 56.322.632 |
| 2018_MV    | 87 | 972  | 78 | 56.322.632 |
| 2019_BBB   | 30 | 519  | 84 | 44.212.704 |
| 2019_BB    | 81 | 1359 | 13 | 53.203.842 |
| 2019_IGM   | 51 | 452  | 13 | 12.837.077 |
| 2019_BM    | 81 | 1359 | 13 | 53.203.842 |
| 2023_CB1   | 81 | 973  | 4  | 60.721.745 |
| **2023_MV** | 81 | 973 | 30 | 61.402.860 |
| 2024_BBB   | 30 | 519  | 130 | 47.867.134 |
| 2024_BB    | 81 | 1363 | 35 | 57.766.800 |
| 2024_IGM   | 51 | 452  | 29 | 13.563.800 |
| 2024_BM    | 81 | 1363 | 34 | 57.766.800 |

**Eklenecek seçimler:** 2023_CB2, 2019_IBB_YN, 2017_AY (referandum)

---

## 🚨 ANOMALİ MODÜLÜ — 3 PERSPEKTİFLİ ANALİZ (YENİ — v3)

Modül `modules/anomali.js` (72 KB) tamamlandı. Türkiye il haritası choropleth ile interaktif.

### Sekme A: Demografi Karşılaştırması

**Kapsam**: Sadece ilçe geneli kapsayan seçimler (CB, MV, IGM, BBB)
**Hesaplama**: kayıtlı seçmen / 18+ nüfus × 100
**Demografi yıl eşleştirmesi**: Seçim yılının bir öncesi (2017 yoksa en yakın yıl fallback)

**Bulgular (2024_BBB):**
- En yüksek: ŞANLIURFA/HALFETİ %105.91, VAN/MURADİYE %105.31, DİYARBAKIR/ÇERMİK %104.39
- En düşük: KİLİS/MUSABEYLİ ilçesi BU LİSTEYE DAHİL DEĞİL (BB seçimi olduğundan A sekmesinden çıkarıldı)
- %100 üstü: 305 ilçe (sorgulamaya açar)

**Coğrafi pattern (harita):**
- Doğu/Güneydoğu Anadolu: kırmızı/turuncu (genç nüfus + ADNKS gecikmesi)
- Karadeniz kıyısı + İç Anadolu: koyu mavi (göç vermiş)
- Marmara, Ege, Akdeniz: bej (normal aralıkta)

### Sekme B: Zamansal Değişim (YENİ)

**Kapsam**: Aynı seçim tipinde önceki ve sonraki seçim arasındaki kayıtlı seçmen değişimi

**6 seçim çifti:**
- 2018_CB → 2023_CB1
- 2018_MV → 2023_MV
- 2019_BBB → 2024_BBB
- 2019_BB → 2024_BB
- 2019_IGM → 2024_IGM
- 2019_BM → 2024_BM

**Beklenen aralık**: %5-10 (nüfus + 18 yaşına gelen yeni seçmenler)

**Eşik filtreleri**: +%20, +%40, -%10, -%30

**Tarihsel bulgular** (önceki analizden):
- 🔴 RİZE/GÜNEYSU: 2019→2024 BB seçmen +%76 (en uçtaki vaka)
- 🔴 ÇANKIRI'da 5 ilçe sistemik pattern: BAYRAMÖREN +%41, ORTA +%29, ATKARACALAR +%26, KORGUN +%25, ŞABANÖZÜ +%17
- 🔴 HATAY/YAYLADAĞI: 3 farklı seçimde de yüksek artış (BB +%18, BBB +%15, CB +%18)
- 🔴 ANKARA kırsalları: BALA +%23-26, HAYMANA +%21, ÇAMLIDERE +%16-23
- 🔴 RİZE 4 ilçe: İKİZDERE, KALKANDERE, ÇAMLIHEMŞİN, GÜNEYSU pattern (+%13-76)
- 🔴 HAKKARİ patterns: ÇUKURCA, DERECİK, ŞEMDİNLİ, YÜKSEKOVA tutarlı yüksek

### Sekme C: Tip Tutarsızlığı (YENİ)

**Kapsam**: Aynı yılda IGM ile BB seçmen sayısı oranı (BB / IGM × 100)

**Anlamı**: Bu oran ilçenin **belediye sınırı içinde yaşayan seçmen yüzdesini** verir.

**Yorumlama:**
- %95+ kapsam: Büyükşehir merkez ilçeleri (Çankaya, Kadıköy)
- %70-95: Şehir merkezi olan ilçeler
- %30-70: Yarı kırsal ilçeler
- %30 altı: Köy ağırlıklı ilçeler

**Bu sekme bir anomali değil, idari yapı haritasıdır.** Sekme A'da BB ve BM seçimlerinin neden hariç tutulduğunu açıklamak için kritik.

---

## 🐛 ÇÖZÜLEN KRİTİK BUG'LAR (v3)

### Bug 1: 2018 seçimleri filtrede görünmüyordu

**Sebep**: Seçim → demografi yıl eşleştirmesi `2018 seçim → 2017 demografi` olarak ayarlıydı, ama TÜİK demografi 2018'den başlıyor (2017 yok).

**Çözüm**: `en_yakin_yil()` fallback fonksiyonu eklendi. İstenen yıl yoksa en yakın mevcut yıl kullanılır. Her kayıtta `demografi_yili_fallback: bool` alanı var.

### Bug 2: BB ve BM seçimleri yanıltıcı sonuç verdi

**Sebep**: BB seçimi sadece **belediye sınırı içindeki** seçmenleri kapsar (köyleri kapsamaz), ama biz bunu **ilçe geneli 18+ nüfus** ile karşılaştırıyorduk. Sonuçta:

| İlçe | YSK BB seçmeni | TÜİK 18+ ilçe | Görünen oran | Gerçek |
|------|---|---|---|---|
| KİLİS/MUSABEYLİ | 819 | 8.689 | %9.4 (sahte düşük) | Kasaba sadece 819, köyler ayrı |
| AFYON/SİNANPAŞA | 2.917 | 30.726 | %9.5 (sahte düşük) | Aynı |

**Kanıt**: Aynı ilçe için 2024_IGM (ilçe geneli): MUSABEYLİ 8.824, SİNANPAŞA 30.854 — yani neredeyse 18+ nüfusla bire bir.

**Çözüm**:
1. `secmen_vs_18plus.json`'da her seçim kaydına `demografi_uygun: bool` alanı eklendi
2. BB ve BM için `false`, diğerleri için `true`
3. Sekme A frontend'i sadece `demografi_uygun: true` olanları gösterir
4. BB ve BM verileri Sekme B (zamansal değişim) ve Sekme C (tip tutarsızlığı) için kullanılır

---

## 🎨 SİTE İSKELE & TASARIM SİSTEMİ (DEĞİŞMEDİ)

### Marka kuralları (KRİTİK)
- **AlperTan™** — sadece A ve T capital
- **`text-transform:uppercase` KESİNLİKLE YASAK**
- Sentence case her yerde
- Tarafsızlık: 2028 tahmini yok, aday değerlendirmesi yok
- Türkçe locale: `'tr-TR'` upper/lower, `localeCompare(b, 'tr')`

### Tasarım tokenleri (`assets/style.css`)
- `--paper`, `--paper-2`, `--paper-3` (warm paper)
- `--ink`, `--ink-2`, `--ink-3`, `--ink-4` (kademeli koyu)
- `--signal-red` (#b8311a), `--signal-amber` (#c8861a), `--signal-green` (#2d6b3f), `--signal-blue` (#1f4d6e)
- `--brand-gold` (#a07820)
- `--font-display: 'Fraunces'`, `--font-body: 'Inter'`, `--font-mono: 'JetBrains Mono'`

### Modül pattern (`assets/app.js`)
```javascript
window.Modules.X = async function(container, ctx) {
  const m = ctx.state.manifest;
  const fmt = window.AT.fmt;
  // ...
}
```

### Helper'lar
- `window.AT.fmt.n(v)` — sayı formatı (tr-TR)
- `window.AT.fmt.n1(v)` — 1 ondalık
- `window.AT.fmt.pct(v, d=1)` — yüzde
- `window.AT.navigate(id, params)` — route navigation
- `window.AT.loadElection(key)` — dashboard JSON
- `window.AT.loadMeta(key)` — meta JSON

### CSS sınıfları (mevcut)
- `panel`, `panel-title`, `panel-meta`
- `data-table`, `bar-wrap`, `bar`
- `eyebrow`, `lede`, `footnote`
- `stat-grid`, `stat-tile`, `stat-label`, `stat-value`, `stat-sub`
- `election-grid`, `election-card`, `ec-year`, `ec-tip`, `ec-stats`, `ec-tag`
- `section-head`
- `module-placeholder`
- `anomaly-list`, `a-loc`, `a-desc`, `a-val`
- `loading`

---

## 🔧 ARAÇLAR & SCRIPT'LER

### `tools/build_geo.py`
geo.json üretici. Yeni ilçe/seçim eklendiğinde tekrar çalıştır.

### `tools/build_aggregates.py`
Tüm aggregate dosyalarını üretir. **3 anomali analizi içerir** (A, B, C).

```bash
python tools\build_aggregates.py --all
```

### `tools/build_geo_map.py`
İl GeoJSON indirici (alpers/Turkey-Maps-GeoJSON kaynaklı). Afyon → AFYONKARAHİSAR alias destekli.

### Önceki scraper'lar (yerel makinede saklı)
- `ysk_meta_scraper.js` — YSK üst panel meta scraper (test edilmiş, v1.0)
- `ysk_scraper.js` — Ana YSK parti/oy scraper

---

## 📋 MODÜL DURUMU

| # | Modül | Durum | Açıklama |
|---|---|---|---|
| 00 | Anasayfa | ✅ Hazır | İskele, stat tile'lar, election grid |
| 01 | Arşiv | ✅ Hazır | Seçim listesi + detay sayfası |
| 02 | **Anomali Tespiti** | **✅ Hazır (v3)** | **3 sekmeli, haritalı, choropleth** |
| 03 | Trend Analizi | ⏳ Yapılacak | Yıldan yıla parti hareketi |
| 04 | Karşılaştırma | ⏳ Yapılacak | Seçim/il/ilçe karşılaştırma |
| 05 | Demografi | ⏳ Yapılacak | Yaş piramidi, eğitim, cinsiyet |
| 06 | Projeksiyon | ⏳ Yapılacak | 2028 senaryoları (en son) |
| i  | Metodoloji | ⏳ Yapılacak | Veri kaynakları, hesaplama |
| ii | Hakkında & Bağış | ⏳ Yapılacak | Statik içerik |

---

## 🎯 SIRADAKİ ADIMLAR

### Hemen sonraki seans
1. **Anomali modülünü titiz şekilde test et** — sahte pattern bulgularına dikkat et
2. **PROJE_DURUM_RAPORU_v3.md'yi Project Knowledge'a yükle**

### Yakın gelecek
3. **02 Coğrafi Gezgin** veya **05 Demografi** modülü
4. **İlçe haritası** (973 ilçe choropleth) — alpers/Turkey-Maps-GeoJSON ilçe seviyesi yok, alternatif kaynak gerek
5. **Eksik seçimler**: 2023_CB2, 2019_IBB_YN, 2017_AY (referandum)

### Orta vade
6. **Cloudflare Pages deploy + domain**
7. **Premium kod sistemi** (Cloudflare Worker + bağış kodu)
8. **PDF rapor üretici**, Excel indirme modülü

---

## ⚙️ TEKNİK NOTLAR

### Sitenin lokalde çalıştırılması
```cmd
d:
cd D:\secim_arsiv
python -m http.server 8000
```
Tarayıcı: `http://localhost:8000`

### Aggregate'leri yeniden üret
```cmd
d:
cd D:\secim_arsiv
python tools\build_geo.py
python tools\build_aggregates.py --all
python tools\build_geo_map.py
```

### Parti/aday normalizasyonu
- HDP → YSP → DEM trajectory aynı parti
- AK PARTİ varyantları: "AK PARTİ", "AK Parti", "AKP"
- BAĞIMSIZ TOPLAM OY → BGM (id 50)
- 270+ farklı parti adı görüldü tüm seçimlerde

### MEDAS pivot CSV format
- UTF-8 BOM, "|" pipe ayraçlı
- Sütun: ilçe (`Adana(Aladağ)-1757` gibi, sondaki sayı ilçe kodu)
- Satır: cinsiyet × yaş × eğitim kombinasyonu
- Yıl ayrı kolon

### Statik site maliyeti
- Cloudflare Pages: ücretsiz (10,000 ziyaret/ay)
- Domain: ~$1/ay
- Para kazanma: bağış modeli (Wikipedia tarzı), ileride premium PDF rapor

---

## 📋 YENİ KONUŞMADA İLK MESAJ ÖRNEĞİ

> "Türkiye Halk Oyu Arşivi projesinde devam. Anomali modülü 3 sekmeli haritalı olarak tamamlandı. Şimdi [X modülüne] geçeceğiz."

Project Knowledge'taki dosyalar:
- Bu rapor (PROJE_DURUM_RAPORU_v3.md) — context'in tamamı
- manifest.json — 12 seçim özeti
- parties.json — parti listesi
- *_meta.json (12 dosya) — kayıtlı seçmen verileri
- build_geo.py, build_aggregates.py, build_geo_map.py — script'ler

Yeni konuşmaya başlandığında bu dosyalar otomatik context'te olur, tekrar yüklemek gerekmez.

---

**Önemli notlar**:
- 60MB demografi dosyası Project Knowledge'a yüklenmez (boyut). O dosya `D:\secim_arsiv\data\demografi\` altında durur.
- Aggregate dosyaları (gzip versiyonları toplam ~1.5 MB) deploy'da yer alır, lokalde de var.
- `data/core/turkiye_iller.geojson` (238 KB) yeni eklendi, harita için kritik.
