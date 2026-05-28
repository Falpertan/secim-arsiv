/* ─────────────────────────────────────────────────────────
   Home module — landing page
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  window.Modules.home = async function(container, ctx) {
    const m = ctx.state.manifest;
    const fmt = window.AT.fmt;

    // Stats: en güncel seçim, toplam ilçe sayısı, kapsam
    const son2024 = m.elections.filter(e => e.yil === 2024);
    const son2024_kayitli = Math.max(...son2024.map(e => e.toplam_kayitli_secmen || 0));
    const tarih_2018 = m.elections.find(e => e.key === '2018_CB');
    const ilkayitli = tarih_2018?.toplam_kayitli_secmen || 0;
    const buyume = ilkayitli > 0 ? ((son2024_kayitli / ilkayitli - 1) * 100) : 0;

    // Render
    container.innerHTML = `
      <div class="home-page">
      <img class="home-siluet" src="assets/turkiye-siluet.png?v=1" alt="" aria-hidden="true" width="520" height="520">

      <header class="page-header">
        <span class="eyebrow">Açık seçim arşivi · 2018 — 2024</span>
        <h1>Türkiye'nin son 13 seçimini<br/>tek bir arşivde inceleyin.</h1>
        <p class="lede">
          81 il, 973 ilçe, 7 yıl. Cumhurbaşkanlığından mahalli idarelere kadar
          her bir oyun ve seçmenin izini sürmek için tasarlandı. Veriler doğrudan
          YSK ve TÜİK kaynaklarından toplandı; her sonuç çapraz doğrulandı.
        </p>
      </header>

      <a class="rehber-teaser focus-ring" href="#/baslangic">
        <span class="rehber-teaser-etiket">İlk ziyaret</span>
        <span class="rehber-teaser-metin">Siteye yeni misiniz? <strong>5 dakikalık başlangıç rehberi</strong> — hangi modülden başlayacağınızı gösterir.</span>
        <span class="rehber-teaser-ok">→</span>
      </a>

      <a class="rehber-teaser focus-ring" href="#/anket" style="margin-top:var(--space-3)">
        <span class="rehber-teaser-etiket">Yeni modül</span>
        <span class="rehber-teaser-metin"><strong>Anket firmaları</strong> — seçim öncesi paylaşımları YSK sonuçlarıyla karşılaştırın; TV, YouTube ve haber kaynaklarına tıklayarak gidin.</span>
        <span class="rehber-teaser-ok">→</span>
      </a>

      <div class="stat-grid">
        <div class="stat-tile">
          <div class="stat-label">Seçim</div>
          <div class="stat-value num">${m.elections.length}</div>
          <div class="stat-sub">2018'den 2024'e arşivlendi</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">İl × İlçe</div>
          <div class="stat-value num">81 · 973</div>
          <div class="stat-sub">tüm ülke düzeyi kapsamı</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">2024 kayıtlı seçmen</div>
          <div class="stat-value num">${fmt.n(son2024_kayitli)}</div>
          <div class="stat-sub">2018'e göre %${fmt.n1(buyume)} artış</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">Demografik kayıt</div>
          <div class="stat-value num">${m.demografi.ilce_count} × ${m.demografi.years.length}</div>
          <div class="stat-sub">ilçe × yıl, TÜİK detay verisi</div>
        </div>
      </div>

      <div class="section-head">
        <h2>Seçim arşivi</h2>
        <span class="eyebrow">Her seçim · sandıktan ülke düzeyine</span>
      </div>
      <div class="election-grid" id="election-grid"></div>

      <div class="section-head">
        <h2>Doğrulanmış uyumsuzluk bulguları</h2>
        <span class="eyebrow">Ön inceleme · detay 02 uyumsuzluk tespiti</span>
      </div>
      <div class="panel">
        <div class="panel-title">
          Sistemik patternler — kayıtlı seçmen artışı / 18+ nüfus artışı uyumsuzluğu
          <span class="panel-meta">2019 → 2024</span>
        </div>
        <ul class="anomaly-list">
          <li>
            <span class="a-loc">RİZE / GÜNEYSU</span>
            <span class="a-desc">Seçmen +%76, nüfus neredeyse sabit. Türkiye'deki en uçtaki vaka.</span>
            <span class="a-val">+76%</span>
          </li>
          <li>
            <span class="a-loc">ÇANKIRI</span>
            <span class="a-desc">5 kırsal ilçede aynı pattern (BAYRAMÖREN, ORTA, ATKARACALAR, KORGUN, ŞABANÖZÜ). Tesadüfi değil — sistemik.</span>
            <span class="a-val">+17–41%</span>
          </li>
          <li>
            <span class="a-loc">HATAY / YAYLADAĞI</span>
            <span class="a-desc">Aynı yüksek oran üç farklı seçimde de görünüyor (BB, BBB, CB).</span>
            <span class="a-val">+15–18%</span>
          </li>
          <li>
            <span class="a-loc">ANKARA kırsalı</span>
            <span class="a-desc">BALA, HAYMANA, ÇAMLIDERE — ilçenin nüfusuna göre orantısız seçmen artışı.</span>
            <span class="a-val">+16–26%</span>
          </li>
          <li>
            <span class="a-loc">ŞANLIURFA / KARAKÖPRÜ</span>
            <span class="a-desc">5 yılda 53.000 yeni seçmen. 116K → 170K.</span>
            <span class="a-val">+46%</span>
          </li>
          <li>
            <span class="a-loc">SAKARYA / FERİZLİ</span>
            <span class="a-desc">Tersine işaret: yeni yerleşim, kayıt güncellenmemiş. Olası eksik kayıt.</span>
            <span class="a-val green">−25%</span>
          </li>
        </ul>
      </div>

      <p class="footnote">
        Bu rapor, hile iddiası taşımaz. İstatistiksel uyumsuzlukları işaretler ve nedenlerini
        sorgulamaya açar. Bazı bölgelerdeki yüksek oranlar gerçek nüfus hareketinden
        (iç göç, mezraların ilçeye dönmesi, deprem sonrası kayıt değişikliği) kaynaklanabilir.
      </p>
      </div>
    `;

    // Render election grid
    const grid = container.querySelector('#election-grid');
    const sortedElections = [...m.elections].sort((a, b) => {
      if (a.yil !== b.yil) return a.yil - b.yil;
      return a.tip.localeCompare(b.tip, 'tr');
    });

    grid.innerHTML = sortedElections.map(e => `
      <button class="election-card" data-key="${e.key}">
        <span class="ec-tag">${e.kategori === 'genel' ? 'Genel' : 'Yerel'}</span>
        <div class="ec-year">${e.yil}</div>
        <div class="ec-tip">${e.tip}</div>
        <div class="ec-stats">
          ${e.il_count} il · ${fmt.n(e.ilce_count)} ilçe · ${e.party_count != null ? e.party_count + ' parti' : '— parti'}
          ${e.toplam_kayitli_secmen ? '<br/>' + fmt.n(e.toplam_kayitli_secmen) + ' kayıtlı seçmen' : ''}
        </div>
      </button>
    `).join('');

    grid.querySelectorAll('.election-card').forEach(card => {
      card.addEventListener('click', () => {
        window.AT.navigate('arsiv', { key: card.dataset.key });
      });
    });
  };
})();
