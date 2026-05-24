# Yeni sohbet için devir özeti

## Yeni sohbete bunu yapıştır:

---

Türkiye Halk Oyu Arşivi projesinde devam ediyorum. Geçmiş sohbette veri çekirdeğini tamamladık, şimdi modüllere geçiyoruz.

**Şimdiye kadar yapılanlar:**

1. **Site adı genişletildi:** "Seçim Arşivi" değil, **"Halk Oyu Arşivi"** — referandum (2017_AY) ve yenilenmiş seçimler (2019_IBB_YN) kapsama alındı
2. **Login sistemi reddedildi** — statik mimari korunuyor. Premium için Cloudflare Worker + bağış kodu sistemi planlandı
3. **Karar verilen modül listesi:**
   - 00 Anasayfa (var)
   - 01 Arşiv (var)
   - 02 Coğrafi Gezgin (yapılacak — NUTS-1/2/3 + il + ilçe drill-down)
   - 03 Demografi Gezgini (yapılacak)
   - 04 Anomali Atlası (yapılacak — site'in asıl iddiası)
   - 05 Trend (yapılacak)
   - 06 Karşılaştırma (yapılacak)
   - 07 Çapraz Analiz (yapılacak — demografi ↔ seçim)
   - 08 Veri İndirme (yapılacak — açık CSV özet + premium full Excel + PDF rapor)
   - 09 Metodoloji (yapılacak)

**Üretilen veri çekirdeği** (lokalde D:\secim_arsiv\ altında):

- `data/core/geo.json` — 81 il + 973 ilçe + 12 NUTS-1 + 26 NUTS-2 + 392 belde + 2018/2023 MV bölgeleri + alias sistemi
- `data/aggregates/meta_turkiye_nuts.json` — Türkiye + NUTS özet (gzip 11 KB)
- `data/aggregates/meta_iller.json` — 81 il × 12 seçim (gzip 20 KB)
- `data/aggregates/meta_ilceler.json` — 973 ilçe × 12 seçim (gzip 281 KB)
- `data/aggregates/parti_turkiye_nuts.json` — parti dağılımları NUTS (gzip 7 KB)
- `data/aggregates/parti_iller.json` — parti dağılımları il (gzip 10 KB)
- `data/aggregates/parti_ilceler.json` — parti dağılımları ilçe (gzip 123 KB)
- `data/aggregates/secmen_vs_18plus.json` — anomali atlas girdisi (gzip 80 KB)
- `data/aggregates/ilce_demografi_ozet.json` — demografi özet (gzip 996 KB)
- `tools/build_geo.py` — geo.json üretici (yeni seçim/ilçe için tekrar çalıştırılır)
- `tools/build_aggregates.py` — aggregate üretici (akıllı eşleştirme: tam, tr_normalize, merkez)

**12 seçim kapsama:**
2018_CB, 2018_MV, 2019_BBB, 2019_BB, 2019_IGM, 2019_BM, 2023_CB1, 2023_MV, 2024_BBB, 2024_BB, 2024_IGM, 2024_BM
*Eksik (sonra eklenecek):* 2023_CB2, 2019_IBB_YN, 2017_AY

**Veri eşleşmesi: 973/973 (%100)** — TÜİK demografi ile geo.json arasında tam eşleşme.

**Anomali ön-bakış 2024_BB:**
- En yüksek: %105.91 ŞANLIURFA/HALFETİ, %105.31 VAN/MURADİYE, %104.39 DİYARBAKIR/ÇERMİK
- En düşük: %9.43 KİLİS/MUSABEYLİ, %9.49 AFYONKARAHİSAR/SİNANPAŞA
- %100 üstü: 305 ilçe (incelemeye değer)

**Karar verilen yapılar:**
- Yaş kategorileri: 18-24, 25-34, 35-44, 45-54, 55-64, 65+
- Eğitim kategorileri: okuma_yazma_bilmeyen, okuryazar, ilkokul_ortaokul, lise_dengi, universite_plus, bilinmeyen
- Seçim → demografi yıl eşleştirmesi: seçim yılının bir öncesi (2024 seçim → 2023 demografi)
- 2018_MV ve 2023_MV bölge yapısı: Ankara-1/2/3, Bursa-1/2, İstanbul-1/2/3, İzmir-1/2 (ayrı `mv_bolgeler` bölümünde, varsayılan il toplamı, kullanıcı isterse bölge bazı)

**Sıradaki adım:** Modüllere geç, sıralama:
1. 02 Coğrafi Gezgin (omurga, diğer modüller bunun üstüne kurulacak)
2. 04 Anomali Atlası (asıl iddia)
3. Diğerleri

Devam edelim. Hangisine geçelim?

---

## PROJE_DURUM_RAPORU_v2.md'ye ekleyebileceğin notlar:

```markdown
## v2.1 — Veri çekirdeği tamamlandı (6 Mayıs 2026)

### Üretilen dosyalar
- data/core/geo.json (350 KB)
- data/aggregates/ altında 8 dosya (toplam gzip 1.5 MB)
- tools/build_geo.py
- tools/build_aggregates.py

### Veri kapsama
- 12 seçim × 81 il × 973 ilçe = 11.676 ilçe-seçim kombinasyonu
- 7 yıl demografi (2018-2024) × 973 ilçe × yaş × cinsiyet × eğitim
- 392 belde belediyesi (BB ve BM seçimlerinde ayrı kayıt)
- 2018 MV ve 2023 MV: 10 seçim çevresi (Ankara, Bursa, İstanbul, İzmir)

### Eşleştirme algoritması
- TÜİK demografi ↔ YSK seçim verisi: %100 eşleşme
- Strateji: 1) tam eşleşme, 2) Türkçe karakter normalize, 3) merkez ilçe genişletme, 4) belde fallback

### Anomali bulguları (kayıtlı_seçmen / 18+_nüfus)
- 2024_BB seçiminde 305 ilçe %100 üstü oran
- En yüksek: ŞANLIURFA, VAN, DİYARBAKIR, MARDİN illerinde yoğun (genç nüfus + doğum oranı)
- En düşük: KİLİS, AFYONKARAHİSAR, KARABÜK, BİTLİS (göç verme bölgeleri)

### Mimari kararlar
- Login sistemi YOK (statik mimari)
- Premium için Cloudflare Worker + bağış kodu
- Site adı: "Halk Oyu Arşivi" (referandum dahil)
- Tarafsızlık: anomali değil "uyumsuzluk", alternatif açıklamalar (göç, doğum oranı) sunulur
```
