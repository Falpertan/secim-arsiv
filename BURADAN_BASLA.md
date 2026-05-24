# BURADAN BAŞLA — Cursor için devir mesajı

**Proje:** Türkiye Seçim Arşivi (AlperTan™)
**Devreden:** Claude (web sohbet)
**Devralan:** Cursor (yerel IDE)
**Tarih:** 24 Mayıs 2026

---

## 1. Bu zipte ne var?

```
BURADAN_BASLA.md          ← şu an okuduğun dosya
DEVIR_RAPORU.md           ← detaylı durum raporu (TÜM ayrıntılar burada)
CB2_MV_REHBERI.md         ← 2023 CB 2. tur için adım adım rehber

index.html                ← güncel, 11 modül script tag'li
assets/
  app.js                  ← ROUTES (12 modül), sidebar logo, sentence case
  style.css               ← logo sınıfları + uyumsuzluk yorumu
  alpertan_logo.png       ← dansçı + yunus, sidebar-footer'da kullanılıyor
data/
  manifest.json           ← 2023_MV eklendi, 12 seçim
modules/
  home.js, arsiv.js       ← party_count null-safe
  uyumsuzluk.js           ← eski anomali.js'in halefi
  senaryo.js              ← fmt fix uygulandı
  bolge.js                ← eksen biçimi düzeltildi
  metodoloji.js           ← Halk Oyu/hile/tahmin/aday/bağış temizliği
  hakkinda.js             ← tarafsızlık kutusu yeniden yazıldı
  + diğer 5 modül (değişmemiş ama tutarlılık için dahil)
```

---

## 2. Kullanıcının yerel projesi nerede?

Kullanıcının disketindeki kök klasörde şu yapı var (ekran görüntülerinden):

```
proje-kök/
├── assets/              (app.js, style.css — bu paketle güncel)
├── data/                (aggregates, core, demografi, demografi_iller, elections, manifest.json)
├── favicons/            (apple-touch + 7 boyut favicon — DOKUNMA)
├── modules/             (12 modül + bir adet artık dosya — aşağıya bak)
├── tools/               (build_aggregates.py, build_demografi.py, build_geo.py, build_geo_map.py)
├── ataturk_signature.png
├── index.html           (bu paketle güncel)
├── index_head.html      (?)
├── LICENSE, DATA_LICENSE, README.md, OKU_BENI.txt
├── parties.json
├── PROJE_DURUM_RAPORU_v3.md, v4.md
├── site.webmanifest
└── TEST_YONERGESI.html, .md
```

---

## 3. İLK 3 ADIM — yapılacaklar sırayla

### Adım 1: Dosyaları yerlerine kopyala

Zipteki dosyaları **kullanıcının kök klasörünün üzerine yaz**:

| Zipte | Hedef |
|---|---|
| `index.html` | proje kökü |
| `assets/*` (3 dosya) | `assets/` |
| `data/manifest.json` | `data/manifest.json` |
| `modules/*` (11 dosya) | `modules/` |

### Adım 2: Eski/gereksiz dosyaları sil

Kullanıcının `modules/` klasöründe **silinmesi gereken iki dosya** var:

```
modules/anomali.js          ← eski sürüm (90 KB), artık uyumsuzluk.js çalışıyor
modules/build_geo_map.py    ← yanlış klasör, tools/'da kopyası var
```

```bash
rm modules/anomali.js
rm modules/build_geo_map.py
```

### Adım 3: Yerel test

```bash
python -m http.server 8000
```

Tarayıcıda `localhost:8000` aç, **Ctrl+Shift+R** (hard refresh — kullanıcı eski cache problemi yaşadı). Şunları kontrol et:

1. Sol kenar çubuğunda 11 menü öğesi:
   - 00 Anasayfa, 01 Arşiv, 02 Uyumsuzluk tespiti, 03 Trend analizi, 04 Karşılaştırma, 05 Demografi
   - 06 Senaryo, 07 Bölge profili, 08 Vekil dağılımı
   - i Metodoloji, ii Hakkında
2. Sidebar-footer'da **AlperTan yazısının solunda küçük logo** (dansçı + yunus, 32×32px)
3. Arşiv sayfasında **12 seçim** listeli (2023 MV dahil, "— parti" gösterir)
4. Her menüye tıkla → konsol hatası olmamalı
5. Senaryo (06) → Sekme B ve C → hata vermeden çalışmalı (fmt fix)

---

## 4. Sonraki büyük iş: 2023 CB 2. tur

`CB2_MV_REHBERI.md` dosyasını oku. Özet:

- Kullanıcının `tools/build_aggregates.py` (37 KB) gibi mevcut scriptleri YSK'dan veri çekme işini biliyor (önceki Claude sohbetleri sayesinde yazılmış)
- Aynı scripting yöntemini 2023 CB 2. tur için kullan
- Üretilecek dosyalar: `data/elections/2023_CB2_dashboard.json` + `data/elections/2023_CB2_meta.json`
- `data/manifest.json`'a CB2 girdisi ekle (rehberde JSON kalıbı var)
- `parties.json`'a CB2 ittifak tanımları (Erdoğan/Cumhur, Kılıçdaroğlu/Millet, sadece 2 yarışmacı)
- UI'da "11 seçim" string'leri "13 seçim"e güncellenmeli (kullanıcı tüm sayıları yenilemeli)

**Önce kullanıcıya `tools/build_aggregates.py`'yi göster** — script CB2'yi nasıl ekleyeceğini ondan anla, sonra Cursor agent'ı YSK'ya bağlanıp veriyi çekebilir. Network erişimi serbest, "Claude in Chrome" benzeri kısıtlama yok.

---

## 5. Tarafsızlık kuralları (KRİTİK — proje DNA'sı)

Kullanıcının kesin tutumu, asla değişmez:

- **AlperTan™**: sadece A ve T büyük harf; `text-transform: uppercase` YASAK; sentence case her yerde
- **"Hile" iddiası YOK** — "uyumsuzluk", "sorgulamaya açar" dili kullanılır
- **2028 öngörüsü YOK**, kişi/aday değerlendirmesi YOK
- **Alternatif açıklamalar her zaman seçenek olarak sunulur** (göç, demografik kayma, deprem vb.)
- **Bağış kelimesi kaldırıldı** — "gönüllü emekle hazırlanır" kullanılır

---

## 6. Bilinen küçük kalan işler (öncelik düşük → yüksek)

1. (DÜŞÜK) `modules/uyumsuzluk.js` satır 118 ve 191'de "hile" geçişleri (olumsuzlama bağlamı — istenirse temizlenir)
2. (DÜŞÜK) `modules/home.js` satır 104'te "hile" geçişi (aynı)
3. (DÜŞÜK) `modules/demografi.js`'te 5 yerde "tahmini/tahmindir" (yaş ortalaması metodolojisi — metodoloji.js'te "yaklaşık değer" denmişti, demografi.js de hizalansın)
4. (ORTA) `metodoloji.js`'te GitHub repo URL'i ve e-posta placeholder'ları
5. (ORTA) `data/manifest.json`'da `2023_MV.party_count: null` — dashboard'dan gerçek sayı çekilmeli (rehberde Python snippet'ı var)
6. (YÜKSEK) 2023 CB 2. tur veri eklemesi
7. (BÜYÜK) Asıl iş: uyumsuzluk tespit motoru — Benford yasası, IQR outlier'ı, katılım kayması, demografi tutarlılığı algoritmaları (şu an uyumsuzluk.js sadece görselleştirme yapıyor)

---

## 7. Deploy

**Hedef:** Cloudflare Pages, statik site, build adımı yok
**Domain:** henüz seçilmemiş
**Cache stratejisi:** JS/CSS dosyalarına `?v=X` parametresi düşünülmeli (kullanıcı hard refresh sorunu yaşadı, deploy edildiğinde aynı sorun gelir)

---

## 8. Önemli iletişim notu

Kullanıcı tek başına çalışan bir gönüllü. Önemli kararları (terminoloji, ittifak tanımı, UI değişiklikleri) **kendi başına alma**, sor. Özellikle:

- Tarafsızlık konularında bir kelime bile yargı içeriyorsa onayla
- Yeni metin yazarken AlperTan markasıyla tutarlı dil kullan
- Veri/scraping işlerinde ona script çıktısını göster, sonuçları onaylasın

---

**Tüm detay için → `DEVIR_RAPORU.md`**
**2023 CB 2. tur için → `CB2_MV_REHBERI.md`**

İyi çalışmalar.
