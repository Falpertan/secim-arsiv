# Ziyaretçi ve paylaşım takibi

Site statik; kullanıcı girişi yok. İki ücretsiz araç birlikte kullanılır:

| Araç | Ne ölçer |
|------|----------|
| **Cloudflare Web Analytics** | Toplam ziyaret, ülke, cihaz (genel trafik) |
| **Umami** | Hangi modül kaç kez açıldı, hangi platformdan kaç paylaşım |

---

## 1. Cloudflare Web Analytics (genel trafik)

Site Cloudflare Pages’te yayına alındıktan sonra:

1. [Cloudflare Dashboard](https://dash.cloudflare.com) → siteni seç
2. Sol menü → **Analytics & Logs** → **Web Analytics**
3. **Add a site** → domain’ini ekle
4. Verilen `<script>` satırını kopyala
5. `index.html` içinde `<!-- Cloudflare Web Analytics -->` yorumunun altına yapıştır
6. Deploy et

**Not:** Hash routing (`#/trend`) yüzünden modül bazlı ayrım CF’de net görünmez; modül detayı için Umami kullan.

---

## 2. Umami (modül + paylaşım)

### Hesap aç

1. [https://umami.is](https://umami.is) → ücretsiz hesap
2. **Add website** → ad: `Türkiye Seçim Arşivi`
3. Domain: yayın adresin (ör. `secim-arsiv.pages.dev`)
4. **Website ID** kopyala (UUID gibi uzun bir kod)

### Siteye ekle

`index.html` dosyasında şu satırın yorumunu kaldır, ID’yi yapıştır:

```html
<script defer src="https://cloud.umami.is/script.js" data-website-id="BURAYA-ID-YAPIŞTIR"></script>
```

Deploy et. Birkaç dakika içinde Umami panelinde veri gelmeye başlar.

### Panelde ne görürsün?

**Pages / URLs** sekmesi:
- `/home`, `/trend`, `/karsilastirma` … → modül görüntülenme

**Events** sekmesi:
- `module-view` → modül adı, numarası
- `share` → platform (`whatsapp`, `x`, `telegram`, `instagram`, `linkedin`, `copy`) + hangi modülden

Örnek sorular:
- “Trend modülü bu hafta kaç kez açıldı?” → Events → `module-view` → filter `module: trend`
- “En çok hangi platformdan paylaşılıyor?” → Events → `share` → platform dağılımı

---

## Gizlilik

- Umami çerez banner’ı gerektirmez (anonim, GDPR dostu)
- Kişisel veri toplanmaz; e-posta / IP saklanmaz
- Metodoloji sayfasına “Anonim kullanım istatistiği toplanır” notu eklenebilir

---

## Analytics kapalıyken

Umami script’i yorum satırındayken site normal çalışır; sadece istatistik gönderilmez.

Test: tarayıcıda modül gez, paylaş butonuna bas → Umami panelinde Events’i kontrol et.
