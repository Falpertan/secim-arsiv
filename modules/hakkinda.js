/* ─────────────────────────────────────────────────────────
   Hakkında module v2 — Statik içerik
   
   Yayın için kritik sayfa. Marka kimliği ve katkı yolları.
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  window.Modules.hakkinda = function(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Bölüm · ii · Bu proje hakkında</span>
        <h1>Hakkında</h1>
        <p class="lede">
          Türkiye'nin geçmiş seçimlerine herkesin <strong>açık, ücretsiz ve tarafsız</strong> erişebileceği
          bir arşiv. Reklamsız, takipsiz, bağımsız.
        </p>
      </header>

      <div class="prose">

      <!-- ═══ HİKAYE ═══ -->
      <section class="hakk-bolum">
        <h2>Neden var bu site?</h2>
        <p>
          Türkiye'de seçim sonuçları YSK'da, demografi verileri TÜİK'te yayımlanır.
          İkisi de halka açık. Ama <strong>tek bir yerde, ilçe bazında, yıllar arası karşılaştırmalı,
          haritalı, ücretsiz</strong> bir incelemek için ortam yok.
        </p>
        <p>
          Kim ne kadar oy aldı, hangi ilçede demografi nasıl değişti, hangi seçim bir öncekinden ne kadar
          farklıydı &mdash; bu soruları sormak için veri tabanlarına abone olmak ya da
          her kaynağı tek tek indirmek gerekiyor. Bu site bunu değiştirir.
        </p>
        <p>
          <strong>Türkiye Seçim Arşivi</strong> tek kişinin (<strong>AlperTan</strong>)
          boş zamanlarında gönüllü emekle hazırladığı bir projedir.
          Politik bir taraf gözetmez, ticari amaç taşımaz. Sadece
          <strong>verinin halkın elinde olması</strong> gerektiği inancıyla kurulmuştur.
        </p>
      </section>

      <!-- ═══ MİSYON ═══ -->
      <section class="hakk-bolum">
        <h2>Misyonumuz</h2>
        <div class="hakk-misyon-grid">
          <div class="hakk-misyon-tile">
            <div class="hakk-misyon-num">01</div>
            <h3>Açık veri</h3>
            <p>
              Tüm veri ve hesaplama scriptleri açık kaynak. Sayılar nereden geldi, nasıl
              hesaplandı &mdash; kullanıcı kontrol edebilsin.
            </p>
          </div>
          <div class="hakk-misyon-tile">
            <div class="hakk-misyon-num">02</div>
            <h3>Tarafsızlık</h3>
            <p>
              Hiçbir parti, kişi veya gruba odaklanmaz. Yargılayıcı dil yerine "uyumsuzluk" gibi
              tarafsız terimler kullanılır ve alternatif açıklamalar her zaman sunulur.
              Geleceğe dönük öngörü yapılmaz.
            </p>
          </div>
          <div class="hakk-misyon-tile">
            <div class="hakk-misyon-num">03</div>
            <h3>Erişilebilirlik</h3>
            <p>
              Mobilden masaüstüne, her cihazda çalışır. Reklam yok, takip kodu yok, çerez yok.
              Hesap açmak gerekmez. Tamamen ücretsiz.
            </p>
          </div>
          <div class="hakk-misyon-tile">
            <div class="hakk-misyon-num">04</div>
            <h3>Gönüllü çalışma</h3>
            <p>
              Bireysel bir gönüllü projesidir. Reklam veya siyasi kurum bağlantısı
              kabul etmez. Bağımsızlığı tartışılmaz.
            </p>
          </div>
        </div>
      </section>

      <!-- ═══ KATKI ═══ -->
      <section class="hakk-bolum" id="katki">
        <h2>Katkıda bulunmak</h2>
        <p>
          Bu site bireysel bir gönüllü projesidir. Katkıda bulunmanın iki yolu var:
        </p>
        <ul class="hakk-destek-listesi">
          <li>
            <strong>Hata bildir.</strong> Bir grafikte yanlış sayı, bir ilçede eksik veri,
            bir cümlede yanlış ifade gördüysen <a href="#/metodoloji">Metodoloji</a> sayfasındaki
            atıf bölümünden haber ver.
            En değerli geri bildirim odur.
          </li>
          <li>
            <strong>Paylaş.</strong> Faydalı bulduğun bir görselin ekran görüntüsünü, faydalı
            bulduğun bir karşılaştırmayı &mdash; sosyal mecralarda paylaş.
            Kaynak göster yeterli.
          </li>
        </ul>
      </section>

      <!-- ═══ TEŞEKKÜR ═══ -->
      <section class="hakk-bolum">
        <h2>Teşekkürler</h2>
        <p>
          Bu proje <strong>YSK</strong> ve <strong>TÜİK</strong>'in açık veri politikası olmadan
          mümkün olmazdı. İki kurumun da seçim ve demografi verilerini şeffaf biçimde yayımlaması,
          bu tür bağımsız analiz çalışmalarının zeminidir.
        </p>
        <p>
          Ayrıca aşağıdaki açık kaynak araçlara teşekkür ederiz:
        </p>
        <ul>
          <li><strong>Python</strong> &mdash; Veri işleme ve aggregate üretimi</li>
          <li><strong>OpenStreetMap</strong> &mdash; İdari sınır temel verisi</li>
          <li><strong>Cloudflare Pages</strong> &mdash; Ücretsiz statik site barındırma</li>
          <li><strong>Inter</strong>, <strong>Source Serif Pro</strong>, <strong>JetBrains Mono</strong>
              &mdash; Tipografi (açık kaynak fontlar)</li>
        </ul>
      </section>

      <!-- ═══ KAPANIŞ ═══ -->
      <section class="hakk-bolum hakk-kapanis">
        <h2>Son bir söz</h2>
        <blockquote class="hakk-alinti">
          <p class="hakk-alinti-metin">
            &ldquo;Egemenlik kayıtsız şartsız milletindir.&rdquo;
          </p>
          <div class="hakk-alinti-imza">
            <img src="ataturk_signature.png" alt="Mustafa Kemal Atatürk imzası" class="hakk-imza-svg">
            <div class="hakk-alinti-isim">Mustafa Kemal Atatürk</div>
            <div class="hakk-alinti-kaynak">1921 Anayasası, Madde 1</div>
          </div>
        </blockquote>
      </section>

      </div>

      ${renderStiller()}
    `;
  };

  function renderStiller() {
    return `
      <style>
        /* Bölümler */
        .hakk-bolum {
          margin-bottom: var(--space-7);
        }
        .hakk-bolum h2 {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 500;
          color: var(--ink);
          margin: 0 0 var(--space-4) 0;
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--line);
          letter-spacing: -0.02em;
        }
        .hakk-bolum h3 {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
          margin: var(--space-3) 0 var(--space-2) 0;
        }
        .hakk-bolum p {
          font-size: 14.5px;
          line-height: 1.75;
          color: var(--ink-2);
          margin: 0 0 var(--space-3) 0;
        }
        .hakk-bolum ul, .hakk-bolum ol {
          font-size: 14.5px;
          line-height: 1.75;
          color: var(--ink-2);
          margin: 0 0 var(--space-3) 0;
          padding-left: var(--space-5);
        }
        .hakk-bolum li {
          margin-bottom: var(--space-2);
        }
        .hakk-bolum a {
          color: var(--brand-gold);
          text-decoration: none;
          border-bottom: 1px dotted var(--brand-gold);
        }
        .hakk-bolum a:hover {
          border-bottom-style: solid;
        }
        .hakk-bolum strong {
          color: var(--ink);
        }

        /* Misyon kutuları */
        .hakk-misyon-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-4);
          margin: var(--space-4) 0;
        }
        .hakk-misyon-tile {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-4) var(--space-5);
          position: relative;
        }
        .hakk-misyon-num {
          font-family: var(--font-display);
          font-size: 32px;
          font-weight: 500;
          color: var(--brand-gold);
          opacity: 0.5;
          line-height: 1;
          margin-bottom: var(--space-2);
        }
        .hakk-misyon-tile h3 {
          margin: 0 0 var(--space-2) 0;
        }
        .hakk-misyon-tile p {
          font-size: 13.5px;
          line-height: 1.65;
          margin: 0;
        }

        /* Destek listesi */
        .hakk-destek-listesi li {
          margin-bottom: var(--space-3);
        }

        /* Kapanış */
        .hakk-kapanis {
          padding: var(--space-5) var(--space-6);
          background: #fdfaf2;
          border-radius: var(--radius);
          border: 1px solid var(--line);
        }
        .hakk-kapanis h2 {
          border-bottom: none;
          padding-bottom: 0;
        }

        /* Atatürk alıntısı */
        .hakk-alinti {
          margin: var(--space-4) 0 0;
          padding: 0;
          border: none;
        }
        .hakk-alinti-metin {
          font-family: var(--font-display);
          font-size: 24px;
          font-weight: 400;
          font-style: italic;
          line-height: 1.5;
          color: var(--ink);
          text-align: center;
          margin: 0 0 var(--space-5);
          letter-spacing: -0.01em;
        }
        .hakk-alinti-imza {
          text-align: center;
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
        }
        .hakk-imza-svg {
          display: block;
          margin: 0 auto var(--space-2);
          width: 180px;
          max-width: min(220px, 100%);
          height: auto;
          opacity: 0.85;
        }
        .hakk-alinti-isim {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--ink-2);
          letter-spacing: 0.02em;
        }
        .hakk-alinti-kaynak {
          font-size: 11.5px;
          color: var(--ink-3);
          margin-top: 2px;
          font-style: italic;
        }

        /* Not */
        .hakk-not {
          font-size: 12.5px;
          color: var(--ink-3);
          font-style: italic;
        }

        .mono {
          font-family: var(--font-mono);
          font-size: 0.92em;
          color: var(--ink);
        }
      </style>
    `;
  }
})();
