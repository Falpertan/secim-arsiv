# Türkiye Halk Oyu Arşivi — Sistematik Test Yönergesi

> **Versiyon:** v1.0 · Mayıs 2026  
> **Amaç:** Yayın öncesi tüm modüllerin **adım adım** kontrolü.  
> **Yöntem:** Her maddeyi `[x]` ile işaretle. Sorun gördüğün her yerde **ekran görüntüsü al** ve not düş.

---

## Son test raporu — 24 Mayıs 2026

**Otomatik kontrol:** `python tools/run_qa_checks.py 8081` → **116/116 geçti**

| Alan | Sonuç |
|------|--------|
| 13 seçim manifest + tüm dashboard/meta dosyaları | ✅ |
| 2023 CB2 (973 ilçe, YSK toplamları, NaN yok) | ✅ |
| HTTP 200 — tüm veri + statik dosyalar | ✅ |
| index.html 11 modül script + `?v=7` | ✅ |
| Router: `#/projeksiyon` → demografi, bolge/vekil/uyumsuzluk | ✅ |
| Tarafsızlık grep (bağış/IBAN/sahtekarlık) | ✅ |
| Senaryo/trend CB2 entegrasyonu | ✅ |
| Bodrum referans: İnce %66.57, Kılıçdaroğlu %75.49 | ✅ |
| Favicon dosyaları mevcut | ✅ |

**Manuel (tarayıcı):** Harita etkileşimi, mobil drawer, Lighthouse, sekme gezintisi — aşağıdaki ilgili maddeler `[ ]` bırakıldı.

**Not:** Port `8000` bazen takılı kalabiliyor; sorun olursa `python -m http.server 8081` kullan.

**Simge:** `[x]` = otomatik doğrulandı · `[ ]` = tarayıcıda manuel kontrol

---

## Ön hazırlık

Test öncesi şunlar tamam olmalı:

- [x] `python -m http.server 8081` çalışıyor *(8000 takılıysa 8081 kullan)*
- [ ] Tarayıcıda `http://localhost:8081` açık
- [ ] **F12** ile DevTools açık, **Console** sekmesinde kırmızı hata yok
- [ ] Tarayıcı **Chrome veya Edge** (Firefox'ta da çalışmalı ama önce Chromium tabanlıda test et)

### Hızlı veri sağlığı kontrolü

Console'a yapıştır:

```javascript
['data/manifest.json','data/aggregates/parti_iller.json','data/aggregates/parti_ilceler.json','data/aggregates/meta_iller.json','data/aggregates/meta_ilceler.json','data/aggregates/ilce_demografi_ozet.json','data/aggregates/tr_demografi_ozet.json','data/aggregates/demografi_iller_manifest.json','data/core/geo.json','data/core/turkiye_iller.geojson'].forEach(p => fetch(p).then(r => console.log(p, r.status)).catch(e => console.log(p, 'HATA', e.message)));
```

- [x] Tüm dosyalar **200** dönüyor (24 Mayıs 2026 otomatik test)

---

## 00 Anasayfa

URL: `http://localhost:8081/#/home`

- [ ] **Başlık, lede** doğru görünüyor (uppercase yok)
- [x] **AlperTan™** markası kodda doğru (`modules/home.js`, `assets/app.js`)
- [ ] Modül kartları doğru sıralama: Arşiv → Uyumsuzluk → Trend → Karşılaştırma → Demografi
- [ ] Sol menü **00 Anasayfa** aktif (altın renk)
- [ ] Sol menüdeki modül başlıkları:
  - `00 Anasayfa, 01 Arşiv, 02 Uyumsuzluk tespiti, 03 Trend analizi`
  - `04 Karşılaştırma, 05 Demografi`
  - `06 Senaryo, 07 Bölge profili, 08 Vekil dağılımı`
  - `i Metodoloji, ii Hakkında`

**Sorun yoksa:** [ ] **00 Anasayfa OK**

---

## 01 Arşiv

URL: `http://localhost:8081/#/arsiv`

- [x] **13 seçimin listesi** geliyor (2018 ×2, 2019 ×4, 2023 CB1/CB2/MV, 2024 ×4)
- [ ] Her seçim için **kayıtlı seçmen, sandık, katılım** sayıları doğru
- [ ] Bir seçime tıklayınca detay açılıyor mu? *(eğer açılması bekleniyorsa)*

**Sorun yoksa:** [ ] **01 Arşiv OK**

---

## 02 Uyumsuzluk tespiti

URL: `http://localhost:8081/#/uyumsuzluk`

### Sekme A — Demografik uyumsuzluk

- [ ] **4 sekme butonu** görünüyor (A, B, C, D)
- [ ] **Yıl seçici** çalışıyor (2018 → 2024)
- [ ] **Seçim tipi seçici** çalışıyor (CB, MV, BBB, IGM)
- [ ] **Coğrafi katman seçici**: Türkiye / NUTS-1 / NUTS-2 / İl
- [ ] Harita: **5:3 aspect ratio**, sol tarafta, kompakt
- [ ] Sağ tarafta **NUTS-1 bar grafiği** (12 satır)
- [ ] Altta **geniş histogram** (800px, 130px yükseklik)
- [ ] Histogram'da **alt sınır (<%85)** ve **üst sınır (%115+)** bucket'ları görünür
- [ ] Eşik çizgisi **%100 çizgisi** kesik altın renkli
- [ ] X-axis etiketleri: `<%85, %85, [orta], %100 (kalın), %115, %115+`
- [ ] Y-axis sağda: max ilçe sayısı + "ilçe" alt yazı
- [ ] İle hover yapınca **tooltip** çıkıyor, doğru sayıları gösteriyor
- [ ] İle tıklayınca filtre o ile geçiyor (NUTS-2 → İl)
- [ ] **Lejant** harita altında

### Sekme A — Hibrit vurgu testi

- [ ] **NUTS-1 katmanı seç → "TR3 · Ege" seç**
- [ ] Yan grafikte **Ege satırı altın çerçeve** ile vurgulu
- [ ] Histogramda Ege ilçeleri **koyu**, geri kalan **opacity 0.22**
- [ ] **İl katmanı seç → "İSTANBUL"**
- [ ] Histogramda İstanbul ilçeleri **vurgulu**, geri kalanı soluk

### Sekme B — Zamansal değişim

- [ ] Sekme B'ye tıkla
- [ ] **İki seçim** seçicisi çalışıyor (örn. 2018_MV → 2023_MV)
- [ ] Harita değişim yüzdeleri ile **yeşil/kırmızı** renkli
- [ ] Histogram **-20% ile +40%** arasında, +20 ve +40 sınır bucket'ları var
- [ ] **6 seçim çifti** mevcut (CB-CB, MV-MV, BBB-BBB vs.)
- [ ] BB/BM seçimleri **dahil değil** (demografi_uygun: false)

### Sekme C — Tip tutarsızlığı

- [ ] Sekme C'ye tıkla
- [ ] **BB veya IGM seçimi** seçilebilir
- [ ] Harita kapsam oranını gösteriyor (0-100%)
- [ ] **MUSABEYLİ** gibi uç ilçeler dikkat çekici görünüyor

### Sekme D — İstatistiksel göstergeler

- [ ] Sekme D'ye tıkla
- [ ] Katılım, geçersiz oy ve büyüme göstergeleri tabloda görünüyor
- [ ] Seçim/yıl filtresi çalışıyor

**Sorun yoksa:** [ ] **02 Uyumsuzluk tespiti OK**

---

## 03 Trend Analizi

URL: `http://localhost:8081/#/trend`

### Sekme A — Parti zaman çizelgesi

- [ ] **3 sekme butonu** görünüyor
- [ ] Filtre: **Seçim tipi (CB/MV)**, **Coğrafi katman**
- [ ] **MV seçimi seçili** durumda Türkiye geneli
- [ ] Çizgi grafik: 2018 → 2023 arası **renkli çizgiler**
- [ ] AKP altın, CHP kırmızı, MHP koyu kırmızı, İYİ mavi, DEM/HDP mor
- [ ] Çizgilerin **sağ kenarında parti adı + son yüzde**
- [ ] Sayısal değişim tablosu altta: **yüzde puanı fark (yeşil/kırmızı)**
- [ ] **CB seçimi** seçilince Erdoğan, Kılıçdaroğlu, İnce, Akşener çizgileri görünür
- [ ] DEM/HDP **tek çizgi** (HDP+YSP+DEM birleşik)

### Sekme B — Bölgesel ısı haritası

- [ ] Sekme B'ye tıkla
- [ ] **Parti seçici** (AKP, CHP, MHP, İYİ, DEM/HDP, YENİDEN REFAH vs.)
- [ ] **Mod seçici**: Yüzde / Fark (2018→2023)
- [ ] **AKP yüzde modu**: Doğu Karadeniz, Orta Anadolu koyu altın
- [ ] **AKP fark modu**: nerede kazandı/kaybetti yeşil-kırmızı
- [ ] Yan tarafta **NUTS-1 bazlı bar** sıralı
- [ ] Altta **İlk 20 il** tablosu

### Sekme C — Koalisyon analizi

- [ ] Sekme C'ye tıkla
- [ ] **2018 ve 2023** için yığılmış bar
- [ ] **Cumhur**: 53.6% → 49.4%
- [ ] **Millet**: 34.4% → 35.5%
- [ ] **Emek ve Özgürlük**: 11.5% → 10.8% *(HDP+EÖ tek satır)*
- [ ] **ATA İttifakı**: 0% → 2.3%
- [ ] Açıklama panelinde **ittifak yapısının değiştiği** notlandı

**Sorun yoksa:** [ ] **03 Trend Analizi OK**

---

## 04 Karşılaştırma

URL: `http://localhost:8081/#/karsilastirma`

### Sekme A — İki ilçe karşılaştırması

- [ ] **3 sekme butonu** görünüyor
- [ ] **Seçim seçici** (2023_MV varsayılan)
- [ ] **İlçe 1**: ANKARA / ÇANKAYA
- [ ] **İlçe 2**: ANKARA / KEÇİÖREN
- [ ] Her panel'de **meta kutular**: kayıtlı seçmen, katılım, geçerli oy, sandık
- [ ] Her panel'de **parti dağılımı** (yatay bar)
- [ ] Altta **fark tablosu**: ÇANKAYA vs KEÇİÖREN, yüzde puanı (yeşil/kırmızı)
- [ ] **İl değiştirince** ilçe otomatik ilk ilçeye değişir (örn. ANKARA → İSTANBUL = ADALAR)

### Sekme B — İki seçim karşılaştırması

- [ ] Sekme B'ye tıkla
- [ ] **Kapsam**: Türkiye geneli / İl / İlçe
- [ ] **Seçim 1**: 2018_MV, **Seçim 2**: 2023_MV
- [ ] Türkiye geneli için: AKP %41.6 → %35.1
- [ ] **İl seç → ANKARA**: Ankara değerleri görünür
- [ ] **İlçe seç → ANKARA/ÇANKAYA**: Çankaya 2018 vs 2023

### Sekme C — Tek ilçenin geçmişi

- [ ] Sekme C'ye tıkla
- [ ] İl: **ANKARA**, İlçe: **ÇANKAYA**
- [ ] **Tüm seçimlerde parti dağılımı** (yığılmış bar)
- [ ] **Katılım oranı çizgisi**
- [ ] **Detay tablo**: her seçimde ilk 3 parti
- [ ] **İl değiştir → MUĞLA**: ilk ilçe otomatik (BODRUM)

### Test senaryosu — Bodrum 2018 CB

- [ ] MUĞLA/BODRUM seç, Sekme C'de **2018 CB** satırı
- [x] **İnce (CB) %66.6** (turuncu) baskın — veri: %66.57
- [x] **2023 CB1**: Kılıçdaroğlu (CB) %75.5 — veri: %75.49

**Sorun yoksa:** [ ] **04 Karşılaştırma OK**

---

## 05 Demografi

URL: `http://localhost:8081/#/demografi`

### Sekme A — Yaş analizi

- [ ] **3 sekme** görünüyor
- [ ] Filtre: **Yıl, İl, İlçe**
- [ ] **Türkiye geneli, 2024** varsayılan
- [ ] **Özet kutuları**: Toplam 18+, Ortalama yaş, Genç %, Yaşlı %
- [ ] Sol: **Türkiye haritası** (65+ oranı, mavi tonları)
- [ ] Sağ: **Yaş piramidi** (sol erkek, sağ kadın, 6 yaş kategorisi)
- [ ] Alt: Yaş dağılımı yıllar arası (yatay yığılmış bar)
- [ ] **İl seç → SİNOP**: yaşlı oranı yüksek, piramit üstü ağır
- [ ] **İlçe seç → SİNOP/BOYABAT**: daha spesifik veri

### Sekme B — Eğitim analizi

- [ ] Sekme B'ye tıkla
- [ ] **Üniversite+ oranı haritası** (yeşil tonları)
- [ ] Sağ tarafta eğitim dağılımı
- [ ] Altta yıllar arası eğitim
- [ ] **"Eğitim seviyesine göre cinsiyet dağılımı"** — zıt bar
- [ ] **Okur-yazar değil**: kadın %87+ baskın (koyu altın vurgu)
- [ ] **"Yaş × eğitim çaprazı"** — kuşak akışı
- [ ] **65+**: lise %7.4, ilkokul %38.2, okur-yazar değil %31.9
- [ ] **Amber uyarı kutusu**: 18-24 öğrenci notu

### Sekme C — Cinsiyet & zaman

- [ ] Sekme C'ye tıkla
- [ ] **Cinsiyet dengesi haritası** (mavi-kırmızı)
- [ ] **18+ nüfus** çizgisi 2018→2024 (büyüme +%X)
- [ ] **Cinsiyet × yaş grid**
- [ ] **Cinsiyetler arası eğitim** (yığılmış bar)
- [ ] **3 boyutlu çapraz**: yaş × cinsiyet × eğitim
  - Sol erkek, sağ kadın, üstten alta yaş
  - 25-34 kadında üniversite **%48.9** (kadın üstün)
  - 65+ kadında üniversite **%0.5** (büyük cinsiyet eşitsizliği)
- [ ] **Amber uyarı kutusu**: 18-24 notu

**Sorun yoksa:** [ ] **05 Demografi OK**

---

## 06 Senaryo Modelleri

URL: `http://localhost:8081/#/senaryo`

### Genel kontrol

- [x] **Üstte amber uyarı**: "⚠️ Bu bir tahmin değildir" *(kod doğrulandı)*
- [ ] **3 sekme**: A (aktif), B, C
- [ ] B ve C **"Hazırlık aşamasında"** yazıyor

### Sekme A — Sürgü modeli

- [ ] **Taban seçim**: 2023_MV varsayılan
- [ ] **Sürgüler**: AKP, CHP, MHP, İYİ PARTİ, DEM/HDP, YENİDEN REFAH, ZAFER PARTİSİ vs.
- [ ] Her sürgünün altında **%X → %Y** (kayma yokken aynı)
- [ ] **Sıfırla butonu**: Tüm sürgüler sıfıra döner
- [ ] **Sonuç tablosu** sağda: Parti / Taban / Yeni / Fark

### Sürgü oynama testi

- [ ] **AKP sürgüsünü -7'ye çek**: tablo güncellenir, harita değişir
- [ ] Türkiye haritası **kazanan partiye göre renklenir**
- [ ] Bazı iller **AKP altın → CHP kırmızı** veya **İYİ mavi** olur
- [ ] **CHP'yi +5'e çek**: daha çok il kırmızıya geçer
- [ ] **Toplam kontrol kutusu**: ⚠ veya ✓ doğru gösteriyor
- [ ] **Sıfırla** sonra harita gerçek 2023_MV sonuçlarına döner (AKP %35'lerde her yerde önde)
- [ ] **Tooltip**: bir ile hover yap, ilk 4 parti yeni yüzdelerini gör

**Sorun yoksa:** [ ] **06 Senaryo Modelleri OK**

---

## i Metodoloji

URL: `http://localhost:8081/#/metodoloji`

- [ ] **İçindekiler** kutusu (8 madde) en üstte
- [ ] Her maddenin linkine tıklayınca **smooth scroll**
- [ ] **8 bölüm** sırayla görünüyor:
  1. Bu site nedir?
  2. Veri kaynakları (YSK + TÜİK)
  3. Hesaplama yöntemi (parti normalize, koalisyon tabloları, anomali eşikleri)
  4. Tarafsızlık ilkeleri
  5. Sınırlamalar (4 amber uyarı kutusu)
  6. Atıf ve kullanım
  7. Açık kaynak ve bağımsızlık
  8. İletişim
- [ ] **Tarafsızlık ilkeleri** açıkça yazılmış
- [ ] **18-24 öğrenci** uyarısı sınırlamalarda var
- [ ] **BB/BM kapsama** uyarısı var
- [ ] **Atıf biçimi** kod kutusunda

### Açık kaynak

- [x] GitHub placeholder **yok** — “yayına alındığında” notu var
- [x] Bağımsızlık metninde bağış/para ifadesi **yok**

**Sorun yoksa:** [ ] **i Metodoloji OK**

---

## ii Hakkında

URL: `http://localhost:8081/#/hakkinda`

- [ ] **"Neden var bu site?"** açılış metni
- [ ] **Misyon: 4 kutucuk** (Açık veri, Tarafsızlık, Erişilebilirlik, Gönüllü çalışma)
- [x] **Katkıda bulunmak** — yalnızca hata bildir + paylaş (bağış/IBAN **olmamalı**)
- [ ] **Teşekkürler** bölümü
- [ ] Atatürk alıntılı kapanış

**Sorun yoksa:** [ ] **ii Hakkında OK**

---

## Genel responsive testi (mobil)

Chrome DevTools → **Cihaz görünümü** (Ctrl+Shift+M) → **iPhone 14 Pro** seç

- [ ] **Anasayfa** mobilde okunabilir
- [ ] **Sol menü** açılıp kapanabiliyor (eğer hamburger menü varsa)
- [ ] **Uyumsuzluk, Trend, Karşılaştırma haritaları** mobil ekrana sığıyor
- [ ] **Demografi sekmesindeki yaş × eğitim çaprazı** mobilde okunabilir kalıyor
- [ ] **Senaryo sürgüleri** mobilde de oynatılabiliyor
- [ ] **Yazı boyutları** çok küçük değil

**Sorun yoksa:** [ ] **Mobil responsive OK**

---

## Performans testi

DevTools → **Network** sekmesi → **Disable cache** kutucuğunu işaretle → Sayfayı **Ctrl + Shift + R** ile yenile

- [ ] **İlk yükleme süresi** (Load): **< 3 saniye** olmalı
- [ ] **DOMContentLoaded**: < 1 saniye
- [ ] Toplam transfer: **< 10 MB** (demografi yüklendiyse)
- [ ] **Konsola hata mı yok** (favicon hariç)

**Sorun yoksa:** [ ] **Performans OK**

---

## Tarafsızlık kontrolü (manuel okuma)

Aşağıdaki cümleleri sitenizde ara, **kullanılmamalı**:

- [ ] "Hile" kelimesi geçmiyor *(istisna: anasayfa dipnotu "hile iddiası taşımaz" — olumsuz bağlam, kabul)*
- [ ] "Sahtekarlık" geçmiyor
- [ ] "Şüpheli" geçmiyor (hile bağlamında)
- [ ] "Kazanır", "kaybeder" geleceğe dair değil
- [ ] "Aday X iyi/kötü" türünde değerlendirme yok
- [ ] "Hedef seçmen kitlesi şu olmalı" türünde strateji yok

### Kullanılması gereken alternatifler

- [ ] "Uyumsuzluk" terimi anomali bölümünde var
- [ ] "Sorgulamaya açar" / "dikkat çekici" terimleri var
- [ ] "Alternatif açıklamalar: göç, deprem, idari sınır" tarzı notlar var
- [x] "Bu bir tahmin değildir" senaryoda var

**Sorun yoksa:** [x] **Tarafsızlık OK** *(otomatik grep geçti)*

---

## Marka & Tipografi kontrolü

- [ ] **AlperTan™** sadece "A" ve "T" capital, gerisi küçük
- [x] **Hiçbir yerde** `text-transform: uppercase` CSS kuralı yok *(style.css yalnızca yasak yorumu)*
- [ ] **Tam büyük harf** kullanılmıyor (ALPERTAN, TÜRKİYE SEÇİM ARŞİVİ yok)
- [ ] **Sentence case** her yerde

DevTools → **Elements** sekmesinde:

- [ ] **Elemente sağ tık → Inspect** → **Computed** → **text-transform** ara
- [ ] Hiçbir elementte `uppercase` olmamalı (none veya boş)

**Sorun yoksa:** [ ] **Marka & Tipografi OK**

---

## Son kontrol — Tüm modüllerin gezilmesi

Sırayla her modüle git, **her sekmeye bas**, **temel etkileşimi dene**:

- [ ] 00 → 01 → 02 (A/B/C) → 03 (A/B/C) → 04 (A/B/C) → 05 (A/B/C) → 06 (A) → i → ii

Eğer **5 dakika boyunca dolaşırsan** ve **hiçbir hata vermez, hiçbir veri eksik olmazsa** site yayına hazırdır.

**Sorun yoksa:** [ ] **TÜM TESTLER TAMAM — YAYINA HAZIR**

---

## Bug bildirim formatı

Eğer bir sorun bulursan:

```
Modül: [örn. 03 Trend Analizi, Sekme B]
Beklenen: [ne olmalıydı]
Gerçekleşen: [ne oldu]
Tekrar üretim adımları: [1, 2, 3]
Ekran görüntüsü: [link/dosya]
Console hatası: [varsa kopyala]
```

Bu formatı kullanarak bana bildir, hemen düzeltelim.

---

## Yayın öncesi son liste

Test tamamen geçtikten sonra:

- [x] `#/projeksiyon` eski URL → Demografi'ye yönleniyor
- [ ] Konsol bütün modüllerde **temiz** (kırmızı yok)
- [x] `index.html` tüm script taglerini içeriyor
- [ ] **Lighthouse skoru** (Chrome DevTools → Lighthouse → Analyze) >80
- [ ] GitHub repo'su kuruldu, kod yüklendi *(isteğe bağlı)*
- [ ] Cloudflare Pages bağlantısı yapıldı, domain test edildi *(DEPLOY.md)*

---

## Görsel ve UI kontrolü (v3 cilası)

Tarayıcıda `Ctrl+Shift+R` ile hard refresh yap, ardından:

### Genel
- [x] Sekme ikonu (favicon) dosyaları mevcut — `favicons/favicon.ico`
- [ ] Tema rengi krem/bej (`#f5f1e8`), koyu arka plan yok
- [ ] Sol sidebar'da aktif modül altın çizgi ile vurgulu

### Mobil (≤900px genişlik — DevTools responsive mod)
- [ ] Üstte hamburger menü çubuğu görünüyor
- [ ] Menü tıklanınca sidebar soldan açılıyor
- [ ] Overlay tıklanınca menü kapanıyor
- [ ] Modül seçince menü otomatik kapanıyor

### Anasayfa
- [ ] 2024 seçim kartları altın kenarlıkla öne çıkıyor (`featured`)
- [ ] Seçim kartları yeni→eski sıralı (2024 üstte)
- [ ] Stat kutularında sol kenar renk accent var
- [ ] Genel/Yerel etiketleri renkli badge

### Modüller
- [ ] Arşiv → seçim detay → il arama kutusu çalışıyor
- [ ] Uyumsuzluk → 4 sekme mobilde 2×2 veya tek sütun
- [ ] Hakkında / Metodoloji okuma genişliği daraltılmış (`prose`)

### Breakpoint test
- [ ] 375px — menü + tek sütun kartlar
- [ ] 768px — sidebar drawer
- [ ] 1024px — tam sidebar
- [ ] 1440px — içerik ortalanmış, max 1200px

**Sorun yoksa:** [ ] **Görsel UI OK**

---

## Otomatik test komutu

Yerel sunucu açıkken (varsayılan port **8081**):

```bash
python tools/run_qa_checks.py 8081
```

Farklı port: `python tools/run_qa_checks.py 8000`

Kontrol edilenler: dosya varlığı, HTTP 200, manifest (13 seçim), CB2 bütünlüğü, script tagları, router, tarafsızlık grep, Bodrum referans yüzdeleri, aggregates CB2.

---

*Hazırlayan: AlperTan™ ekibi, Mayıs 2026*
