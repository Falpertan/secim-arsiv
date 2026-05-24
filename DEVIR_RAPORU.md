# Türkiye Seçim Arşivi — Devir Raporu

**Tarih:** 24 Mayıs 2026  
**Durum (güncel):** v1.0 — 13 seçim, CB2 dahil, UI cilası tamam, yayın bekliyor  
**Devralan:** Cursor (yerel IDE)  
**Devreden:** Claude (web sohbet)  
**Proje:** AlperTan™ Türkiye Seçim Arşivi  
**Hedef:** Cloudflare Pages, statik site, bağımsız tarafsız platform

### v1.0 özeti (Cursor oturumu)

- 13 seçim: 2023 MV + 2023 CB2 manifest ve veri dosyaları eklendi
- UI: mobil sidebar, favicon seti, design system, cache `?v=7`
- Bağış/para ifadeleri kaldırıldı; “gönüllü emekle” dili
- `#/projeksiyon` → `#/demografi` yönlendirmesi
- Deploy rehberi: `DEPLOY.md`

---

## 1. Tamamlananlar (bu sohbette)

### Aşama 1 (önceki sohbette zaten yapılmıştı)
- 7 dosyada denetim raporu düzeltmeleri: app.js, home.js, arsiv.js, anomali.js, trend.js, demografi.js, senaryo.js

### Aşama 2 (bu sohbette)

**Anomali → Uyumsuzluk dönüşümü:**
- `anomali.js` → `uyumsuzluk.js` (dosya yeniden adlandırıldı)
- 161 iç referans güncellendi (CSS sınıfları, fonksiyon adları, başlıklar dahil)
- `app.js` ROUTES: `module: 'uyumsuzluk'`, label "Uyumsuzluk tespiti"
- `index.html` script src güncellendi
- `home.js`, `demografi.js`, `style.css`'te tüm yan referanslar güncellendi

**bolge.js:**
- "tahmini · kategorilerden" → "Kategorilerden hesaplandı"
- Eksen biçimi "4.018K" formatı → tam Türkçe sayı `fmt.n(deger)`

**metodoloji.js — tarafsızlık temizliği:**
- 4× "Türkiye Halk Oyu Arşivi" → "Türkiye Seçim Arşivi"
- "Anomali eşikleri/tespiti" → "Uyumsuzluk eşikleri/tespiti"
- "Hile iddiası taşımaz" → "Suçlayıcı yargı taşımaz" (satır 59)
- '"şu kadar üzerinde hile vardır"' → '"kesin bir uygunsuzluk vardır"' (satır 191)
- Satır 217 başlık: '"Hile" değil "uyumsuzluk"' → "Tarafsız dil ve terim seçimi"
- '"hile", "sahtekarlık", "şüpheli" gibi suçlayıcı dil' → "yargılayıcı veya suçlayıcı bir dil"
- "Tahminî bir değerdir" → "Kategorilerden türetilmiş yaklaşık bir değerdir"
- "seçim tahmini yapmaz, aday değerlendirmesi" → "seçim öngörüsü yapmaz, kişi değerlendirmesi"
- "Geleceğe dönük tahmin yok" başlığı + paragrafı → "öngörü yok" + "Kişi değerlendirmesi"
- "2023 CB1'de aday adları" → "2023 CB1'de aday isimleri" (YSK resmi terimi kalır)
- "Bağış modeliyle finanse edilir" → "Gönüllü emekle hazırlanır"
- "yalnızca kullanıcı bağışlarından sağlanır" → "gönüllü emekle hazırlanır"

**hakkinda.js:**
- "Türkiye Halk Oyu Arşivi" → "Türkiye Seçim Arşivi"
- Tarafsızlık kutusu yeniden yazıldı: '"Hile" değil "uyumsuzluk"' ve "tahmin yapılmaz" temizlendi → "Yargılayıcı dil yerine 'uyumsuzluk' gibi tarafsız terimler... Geleceğe dönük öngörü yapılmaz."

**ROUTES & menü yapısı (app.js):**
- `projeksiyon` rotası kaldırıldı (modül dosyası yoktu, placeholder gösteriyordu)
- `senaryo` 08 → 06'ya alındı (modül zaten kendi içinde "Modül · 06" diyordu)
- `bolge` 07, `vekil` 08 oldu
- `trend Analizi` → `Trend analizi` (sentence case)
- `Hakkında & Bağış` → `Hakkında` (bağış kaldırıldı)
- index.html: 11 modülün hepsi `<script>` ile yüklendi (önceden sadece 3 vardı)

**senaryo.js — kritik runtime hatası:**
- IIFE üst seviyesinde `const fmt = window.AT.fmt;` tanımı eklendi
- `renderSekmeB` ve `renderSekmeC` fonksiyonlarındaki "ReferenceError: fmt is not defined" hatası giderildi

**Sidebar logo (yeniden eklendi):**
- `assets/alpertan_logo.png` — dansçı + yunus görseli
- `app.js` sidebar-footer: AlperTan™ yazısının solunda 32x32 logo
- `style.css`: `.sidebar-footer-brand`, `.sidebar-footer-logo` sınıfları eklendi

---

## 2. Kalan işler (öncelik sırasıyla)

### Yüksek öncelik

**(a) "hile" kelimesi 3 yerde daha geçiyor (olumsuzlama bağlamı)**
- `home.js:104` — "rapor hile iddiası taşımaz" benzeri ifade
- `uyumsuzluk.js`'te 2 yer (118 ve 191) — modülün kendi tarafsızlık metni

Önerilen değişim deseni: "hile iddiası" → "suçlayıcı yargı" veya tamamen yeniden ifade. Aşama 2 yönergesinde yoktu ama tutarlılık için temizlenmesi mantıklı.

**(b) "tahmin" demografi.js'te 5 yerde**
- Hepsi "yaş kategorilerinden türetildiği için tahmindir" gibi metodolojik açıklamalar
- metodoloji.js'te bunu "yaklaşık bir değerdir"e çekmiştik — demografi.js de hizalanmalı (tutarlılık)
- senaryo.js:236'da "Bu bir tahmin değildir" — olumsuzlama, masum, dokunulmayabilir

### Orta öncelik

**(c) Aşağıdaki üç dosya muhtemelen `modules/` klasöründe gereksiz (kullanıcının ekran görüntüsünden):**
- `modules/anomali.js` (90 KB) — artık `uyumsuzluk.js` aktif, eski sürüm SİLİNMELİ
- `modules/build_geo_map.py` — `tools/` klasöründe kopyası var, modules'tekini sil
- Kök klasörde `ataturk_signature.png` — kullanılıyor mu belli değil, kullanılmıyorsa sil

**(d) Anomali (uyumsuzluk) tespit motoru — esas iş**
- Şu an `uyumsuzluk.js` 3 sekmeli atlas/panel/harita gösteriyor
- Asıl algoritmik tespit (Benford yasası uyumu, sandık başına oy dağılımı tutarlılığı, katılım kayması vb.) henüz yapılmadı
- Bu projenin "Sıradaki: anomali tespit motoru" olarak işaretlenmiş asıl hedefi

### Düşük öncelik (yeni özellikler)

**(e) Arama/filtreleme**
- Arşiv (01) il tablosu: 25 il sınırı + arama-filtre
- Uyumsuzluk A paneli: 50 satır sınırı + arama

**(f) Metodoloji'de placeholder doldurma**
- GitHub repo linki (yayın hazırlığında)
- E-posta adresi (yayın hazırlığında)

**(g) Veri eksikleri**
- 2023 CB 2. tur seçimi (meta.json yok) — atlanmış

---

## 3. Bilinen hatalar & uyarılar

### Çözüldü
- ~~`ReferenceError: fmt is not defined` — senaryo.js Sekme B/C~~ ✓
- ~~Menüde sayfalar açılmıyor (script tag eksikti)~~ ✓
- ~~06 Projeksiyon placeholder (dosya yok)~~ ✓
- ~~Sidebar'da logo yok~~ ✓

### Açık
- **`bolge.js` eksen padding kontrolü:** "4.018K" → tam sayı (örn. "4.018.000") yapıldı, sol padding (`padL`) çok büyük sayılarda taşırma yapabilir. Test edip gerekiyorsa `padL` artırılmalı.
- **Cache invalidation:** Tarayıcı eski JS'i tutabiliyor, hard refresh (Ctrl+Shift+R) gerek. Cloudflare Pages'a deploy edildiğinde de aynı sorun olur; CSS/JS dosyalarına hash veya versiyon parametresi düşünülmeli (örn. `style.css?v=2`).
- **`projeksiyon` URL'leri kırık:** `#/projeksiyon` rotası kaldırıldığı için bu URL'i bookmarklamış kullanıcılar 404 görür (router placeholder gösterir). Sorun değil ama belirtmekte fayda var.

---

## 4. Deploy durumu

- **Hedef platform:** Cloudflare Pages, statik site (build adımı yok)
- **Mevcut durum:** Henüz deploy edilmedi, yerel test ediliyor (localhost:8000)
- **Yapı:** İhtiyaç duyulan tek şey kök klasörü Cloudflare'e push etmek. Yapılandırma dosyası gerekmiyor (saf statik).
- **Domain:** Henüz seçilmemiş / belirtilmemiş
- **SSL/HTTPS:** Cloudflare otomatik halleder
- **CDN:** Cloudflare otomatik
- **Build komutu:** Yok (statik)
- **Output directory:** `/` (kök)

---

## 5. Placeholder'lar (yayın öncesi doldurulacak)

| Yer | Placeholder |
|---|---|
| `metodoloji.js` | GitHub repo URL'i |
| `metodoloji.js` | İletişim e-posta adresi |
| `app.js` | Versiyon "v0.1" (yayında v1.0 mı olacak?) |
| `data/manifest.json` | 2023 CB 2. tur eksik |

---

## 6. Bir sonraki 3 adım (Cursor için sıralı)

### Adım 1: Test ve temizlik (1-2 saat)
- Yerel `python -m http.server 8000` ile her menü öğesini test et
- Konsol hata olmadığını doğrula
- Aşağıdaki gereksiz dosyaları sil:
  - `modules/anomali.js` (eski sürüm, artık uyumsuzluk.js çalışıyor)
  - `modules/build_geo_map.py` (yanlış klasör, tools/'da kopyası var)
- "hile" 3 kalan geçişi temizle (home.js, uyumsuzluk.js × 2)
- "tahmin" demografi.js'teki 5 geçişi metodoloji.js dili ile hizala

### Adım 2: Uyumsuzluk tespit motoru (asıl iş, 1-2 hafta)
- `uyumsuzluk.js`'in mevcut yapısı: A paneli (sıralı liste), B haritası (atlas), C (?) — ama bu sadece **görselleştirme**
- Eksik olan: gerçek istatistik tespit algoritmaları
  - **Benford yasası analizi** sandık bazında ilk basamak dağılımı
  - **Katılım sıçraması tespiti** — il-bazlı katılım oranı IQR×1.5 dışı
  - **Geçersiz oy oranı outlier'ları**
  - **2018→2024 nüfus/seçmen büyüme oranı tutarlılığı** (göç hipotezi her zaman alternatif olarak sunulmalı)
- Her metrik için: skor + güven aralığı + alternatif açıklamalar listesi (tarafsızlık kuralı)

### Adım 3: Yayın hazırlığı (1-3 gün)
- GitHub repo aç, kodları push et
- `metodoloji.js`'teki placeholder'ları doldur (GitHub link, e-posta)
- Cloudflare Pages projesi oluştur, repo'yu bağla
- Custom domain (varsa) ayarla
- DNS, SSL sertifikası doğrula
- İlk lansman testleri: mobile, farklı tarayıcı, ağ throttle
- Cache stratejisi: JS/CSS dosyalarına `?v=1` parametresi veya hash ekleme

---

## 7. Marka kuralları (Cursor'a hatırlatma)

- **AlperTan™**: Sadece `A` ve `T` büyük harf
- **Sentence case her yerde**: "Trend analizi" ✓, "Trend Analizi" ✗
- **`text-transform: uppercase` CSS YASAK**
- **Tarafsızlık dili**: "uyumsuzluk", "sorgulamaya açar", "kategorilerden hesaplandı"; "hile", "sahtekarlık", "tahmin" sözcükleri olumsuzlama bağlamında bile mümkün olduğunca kaçınılır
- **2028 öngörüsü yok, kişi değerlendirmesi yok**
- **Alternatif açıklamalar her zaman seçenek olarak sunulur** (göç, deprem, demografik kayma vb.)

---

## 8. Dosya değişiklikleri özet listesi (Aşama 2)

| Dosya | Lokasyon | Durum |
|---|---|---|
| `index.html` | kök | DEĞİŞTİ (11 script tag) |
| `app.js` | assets/ | DEĞİŞTİ (ROUTES, logo, sentence case) |
| `style.css` | assets/ | DEĞİŞTİ (logo sınıfları + uyumsuzluk yorumu) |
| `home.js` | modules/ | DEĞİŞTİ (anomali → uyumsuzluk) |
| `arsiv.js` | modules/ | DEĞİŞMEDİ |
| `uyumsuzluk.js` | modules/ | YENİ (eski anomali.js'in halefi) |
| `trend.js` | modules/ | DEĞİŞMEDİ |
| `karsilastirma.js` | modules/ | DEĞİŞMEDİ |
| `demografi.js` | modules/ | DEĞİŞTİ (1 yorum) |
| `bolge.js` | modules/ | DEĞİŞTİ (eksen + etiket) |
| `senaryo.js` | modules/ | DEĞİŞTİ (fmt fix) |
| `vekil.js` | modules/ | DEĞİŞMEDİ |
| `metodoloji.js` | modules/ | DEĞİŞTİ (kapsamlı temizlik) |
| `hakkinda.js` | modules/ | DEĞİŞTİ (Halk Oyu, tarafsızlık kutusu) |
| `assets/alpertan_logo.png` | assets/ | YENİ |
| `modules/anomali.js` | modules/ | **SİLİNECEK** (eski, artık uyumsuzluk.js) |

---

**Veri yapısı (referans):**
```
data/
├── manifest.json              # tüm seçim ve yılların kataloğu
├── elections/                 # her seçim: dashboard.json + meta.json
├── demografi/                 # kod → {il, ilçe, yıllar → ...}
├── demografi_iller/           # il bazlı demografi (?)
├── aggregates/                # build_aggregates.py çıktısı
└── core/                      # ?
```

11 seçim: 2018 CB & MV, 2019 BB/BBB/IGM/BM, 2023 CB1/MV, 2024 BB/BBB/IGM/BM
81 il, 973 ilçe, 7 yıl demografi (TÜİK)
