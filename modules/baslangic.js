/* ─────────────────────────────────────────────────────────
   Başlangıç rehberi — 5 dakikada site
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  window.Modules.baslangic = function(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Bölüm · iii · İlk ziyaret</span>
        <h1>Başlangıç rehberi</h1>
        <p class="lede">
          Siteye ilk kez geldiyseniz bu sayfa yeterli. Hesap gerekmez; sol menüden modüllere geçin.
          Okuma süresi yaklaşık <strong>5 dakika</strong>.
        </p>
      </header>

      <div class="prose">

      <section class="rehber-bolum">
        <h2>Üç adımda başlayın</h2>
        <div class="rehber-adimlar">
          <article class="rehber-adim">
            <div class="rehber-adim-num">1</div>
            <h3>Bir seçim seçin</h3>
            <p>Anasayfadaki kartlardan veya <strong>Arşiv</strong> modülünden 13 seçimden birini açın. İl ve ilçe bazında oy, katılım ve geçersiz oy oranlarını görürsünüz.</p>
            <a class="rehber-link focus-ring" href="#/arsiv">Arşiv modülü →</a>
          </article>
          <article class="rehber-adim">
            <div class="rehber-adim-num">2</div>
            <h3>İki yeri karşılaştırın</h3>
            <p><strong>Karşılaştırma</strong> modülünde iki ilçeyi, iki seçimi veya tek ilçenin geçmişini yan yana koyun. Haber veya araştırma için en hızlı yol budur.</p>
            <a class="rehber-link focus-ring" href="#/karsilastirma">Karşılaştırma modülü →</a>
          </article>
          <article class="rehber-adim">
            <div class="rehber-adim-num">3</div>
            <h3>Uyumsuzluğu doğru okuyun</h3>
            <p><strong>Uyumsuzluk</strong> modülü seçmen–nüfus farklarını listeler. Bu bir <em>hile kanıtı değildir</em>; göç, deprem, belde birleşmesi gibi açıklamalar geçerlidir. Sayfa üstündeki uyarı kutusunu okuyun.</p>
            <a class="rehber-link focus-ring" href="#/uyumsuzluk">Uyumsuzluk modülü →</a>
          </article>
        </div>
      </section>

      <section class="rehber-bolum">
        <h2>Tüm modüller — kısa rehber</h2>
        <div class="rehber-tablo-wrap">
          <table class="data-table rehber-tablo">
            <thead>
              <tr><th>Modül</th><th>Ne işe yarar?</th><th>Kim kullanır?</th></tr>
            </thead>
            <tbody>
              <tr><td><a href="#/arsiv">01 Arşiv</a></td><td>13 seçimin listesi ve detayı</td><td>Herkes</td></tr>
              <tr><td><a href="#/uyumsuzluk">02 Uyumsuzluk</a></td><td>Seçmen/nüfus sapmaları, 4 sekme</td><td>Araştırmacı, meraklı</td></tr>
              <tr><td><a href="#/trend">03 Trend</a></td><td>Parti oy oranı zaman serisi, harita</td><td>Gazeteci, analist</td></tr>
              <tr><td><a href="#/karsilastirma">04 Karşılaştırma</a></td><td>İki ilçe veya iki seçim</td><td>Herkes</td></tr>
              <tr><td><a href="#/demografi">05 Demografi</a></td><td>Yaş, eğitim, cinsiyet (TÜİK)</td><td>Sosyolog, akademisyen</td></tr>
              <tr><td><a href="#/senaryo">06 Senaryo</a></td><td>Varsayımsal “ne olurdu” modelleri</td><td>İleri kullanıcı — tahmin değildir</td></tr>
              <tr><td><a href="#/bolge">07 Bölge profili</a></td><td>NUTS, il, ilçe odaklı profil</td><td>Bölgesel analiz</td></tr>
              <tr><td><a href="#/vekil">08 Vekil dağılımı</a></td><td>Seçmen başına vekil (2018, 2024)</td><td>Anayasa / sistem meraklısı</td></tr>
              <tr><td><a href="#/anket">09 Anket firmaları</a></td><td>Firma paylaşımları vs YSK, kaynak linkleri, isabet puanı</td><td>Gazeteci, meraklı</td></tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="rehber-bolum">
        <h2>Sık sorulan sorular</h2>
        <div class="rehber-sss">
          <details class="rehber-sss-item">
            <summary>Site ücretsiz mi, kayıt gerekir mi?</summary>
            <p>Evet, tamamen ücretsiz. Hesap açmanız gerekmez. Reklam ve kişisel takip yoktur.</p>
          </details>
          <details class="rehber-sss-item">
            <summary>Veriler nereden geliyor?</summary>
            <p>YSK (seçim), TÜİK ADNKS (demografi), Resmi Gazete (vekil). Detay: <a href="#/metodoloji">Metodoloji</a>.</p>
          </details>
          <details class="rehber-sss-item">
            <summary>Grafiği habere koyabilir miyim?</summary>
            <p>Trend → Sekme A’da <em>PNG indir</em> (grafik). Tablolar için <em>CSV indir</em> — Trend, Karşılaştırma, Arşiv. Alıntı: <a href="promo/basin-ozeti.html" target="_blank" rel="noopener">Basın özeti</a>.</p>
          </details>
          <details class="rehber-sss-item">
            <summary>Link nasıl paylaşılır?</summary>
            <p>Her modülde sağ üstte <strong>Paylaş</strong> menüsü vardır (WhatsApp, X, link kopyala). Derin link ilgili sayfayı açar.</p>
          </details>
        </div>
      </section>

      <section class="rehber-bolum">
        <h2>Daha fazla bilgi</h2>
        <div class="rehber-kaynaklar">
          <a class="rehber-kaynak-kart focus-ring" href="#/metodoloji">
            <span class="rehber-kaynak-etiket">Şeffaflık</span>
            <span class="rehber-kaynak-baslik">Metodoloji</span>
          </a>
          <a class="rehber-kaynak-kart focus-ring" href="docs/codebook.html" target="_blank" rel="noopener">
            <span class="rehber-kaynak-etiket">Veri</span>
            <span class="rehber-kaynak-baslik">Codebook</span>
          </a>
          <a class="rehber-kaynak-kart focus-ring" href="promo/basin-ozeti.html" target="_blank" rel="noopener">
            <span class="rehber-kaynak-etiket">Basın</span>
            <span class="rehber-kaynak-baslik">Basın özeti</span>
          </a>
          <a class="rehber-kaynak-kart focus-ring" href="#/hakkinda">
            <span class="rehber-kaynak-etiket">Proje</span>
            <span class="rehber-kaynak-baslik">Hakkında</span>
          </a>
        </div>
      </section>

      </div>

      ${renderStiller()}
    `;
  };

  function renderStiller() {
    return `
      <style>
        .rehber-bolum { margin-bottom: var(--space-7); }
        .rehber-bolum h2 {
          font-family: var(--font-display);
          font-size: 20px;
          font-weight: 600;
          margin-bottom: var(--space-4);
          padding-bottom: var(--space-2);
          border-bottom: 1px solid var(--line-soft);
        }
        .rehber-adimlar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: var(--space-4);
        }
        .rehber-adim {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-4) var(--space-5);
        }
        .rehber-adim-num {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 600;
          color: var(--brand-gold);
          opacity: 0.7;
          line-height: 1;
          margin-bottom: var(--space-2);
        }
        .rehber-adim h3 {
          font-size: 16px;
          margin: 0 0 var(--space-2);
        }
        .rehber-adim p {
          font-size: 13.5px;
          line-height: 1.65;
          color: var(--ink-2);
          margin: 0 0 var(--space-3);
        }
        .rehber-link {
          display: inline-block;
          font-size: 13px;
          font-weight: 600;
          color: var(--brand-gold);
          text-decoration: none;
        }
        .rehber-link:hover { text-decoration: underline; }
        .rehber-tablo-wrap { overflow-x: auto; }
        .rehber-tablo { font-size: 13.5px; }
        .rehber-tablo a { color: var(--brand-gold); text-decoration: none; font-weight: 600; }
        .rehber-tablo a:hover { text-decoration: underline; }
        .rehber-sss { display: flex; flex-direction: column; gap: var(--space-2); }
        .rehber-sss-item {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-3) var(--space-4);
        }
        .rehber-sss-item summary {
          font-weight: 600;
          font-size: 14px;
          cursor: pointer;
          color: var(--ink);
        }
        .rehber-sss-item p {
          font-size: 13.5px;
          line-height: 1.65;
          color: var(--ink-2);
          margin: var(--space-3) 0 0;
        }
        .rehber-sss-item a { color: var(--brand-gold); }
        .rehber-kaynaklar {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--space-3);
        }
        .rehber-kaynak-kart {
          display: block;
          text-decoration: none;
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-4);
          text-align: center;
        }
        .rehber-kaynak-kart:hover { border-color: var(--brand-gold); }
        .rehber-kaynak-etiket {
          display: block;
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          color: var(--brand-gold);
          margin-bottom: 4px;
        }
        .rehber-kaynak-baslik {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
        }
      </style>
    `;
  }
})();
