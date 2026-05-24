# Cloudflare Pages — yayın rehberi

Statik site; build adımı yok. Kök klasör doğrudan yayınlanır.

## 1. GitHub (önerilen)

1. Yeni repo oluştur (ör. `secim-arsiv`)
2. Proje kökünü push et (`.gitignore` ile büyük ham dosyalar hariç tutulabilir)
3. [Cloudflare Dashboard](https://dash.cloudflare.com) → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
4. Repo seç, ayarlar:
   - **Framework preset:** None
   - **Build command:** *(boş)*
   - **Build output directory:** `/` *(veya repo kökü)*
5. **Save and Deploy**

## 2. Doğrudan yükleme (Git olmadan)

Pages → **Upload assets** → proje kökünün zip’i.

> 60 MB+ demografi dosyası varsa Cloudflare limitini kontrol et; gerekirse `data/demografi/` hariç tutulup sadece aggregates kullanılır.

## 3. Domain

Pages → proje → **Custom domains** → alan adını ekle. DNS Cloudflare’de ise otomatik yönlendirilir.

## 4. Cache

JS/CSS dosyaları `index.html` içinde `?v=7` ile sürümlenir. Deploy sonrası kullanıcılar hard refresh (`Ctrl+Shift+R`) yapmalı; yeni sürümde `?v=` numarasını artır.

## 5. Yayın sonrası kontrol

- [ ] `https://[domain]/#/home` açılıyor
- [ ] Arşiv → 13 seçim
- [ ] `#/projeksiyon` → Demografi’ye yönleniyor
- [ ] F12 Console’da kırmızı hata yok
- [ ] Mobilde hamburger menü çalışıyor

## 6. Ortam değişkeni

Gerekmez — tamamen statik.

## 7. Ziyaretçi takibi

Modül görüntüleme ve paylaşım sayıları için **ANALYTICS.md** dosyasına bak (Cloudflare Web Analytics + Umami).
