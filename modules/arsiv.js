/* ─────────────────────────────────────────────────────────
   Arşiv module — seçim detay ekranı
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  window.Modules.arsiv = async function(container, ctx) {
    const m = ctx.state.manifest;
    const fmt = window.AT.fmt;
    const key = ctx.params.key;

    // No key → seçim listesi
    if (!key) {
      renderElectionList(container, m);
      return;
    }

    const electionInfo = m.elections.find(e => e.key === key);
    if (!electionInfo) {
      container.innerHTML = `<div class="page-header"><h1>Seçim bulunamadı</h1></div>`;
      return;
    }

    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">
          <a href="#/arsiv" style="color:inherit;">← Tüm seçimler</a> · 
          ${electionInfo.kategori === 'genel' ? 'Genel seçim' : 'Yerel seçim'}
        </span>
        <h1>${electionInfo.yil} · ${electionInfo.tip}</h1>
        <p class="lede">
          Yükleniyor — bu seçim için ${fmt.n(electionInfo.ilce_count)} ilçe verisi (${fmt.bytes(electionInfo.dashboard_size)}) açılıyor.
        </p>
      </header>
      <div class="loading">Seçim verisi yükleniyor</div>
    `;

    try {
      const [data, meta] = await Promise.all([
        window.AT.loadElection(key),
        window.AT.loadMeta(key),
      ]);

      renderElectionDetail(container, electionInfo, data, meta, fmt);
    } catch (e) {
      container.querySelector('.loading').innerHTML = `<span style="color:var(--signal-red)">Hata: ${e.message}</span>`;
    }
  };

  // ─── Seçim listesi (key olmadan)
  function renderElectionList(container, m) {
    const fmt = window.AT.fmt;
    const sorted = [...m.elections].sort((a, b) => {
      if (a.yil !== b.yil) return b.yil - a.yil;  // en yeniden eskiye
      return a.tip.localeCompare(b.tip, 'tr');
    });

    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Modül · 01</span>
        <h1>Arşiv</h1>
        <p class="lede">
          13 seçimin tamamı il + ilçe bazında detaylı veri içeriyor.
          Aşağıdan bir seçim seçerek başlayın.
        </p>
      </header>

      <div class="election-grid">
        ${sorted.map(e => `
          <button class="election-card" data-key="${e.key}">
            <span class="ec-tag">${e.kategori === 'genel' ? 'Genel' : 'Yerel'}</span>
            <div class="ec-year">${e.yil}</div>
            <div class="ec-tip">${e.tip}</div>
            <div class="ec-stats">
              ${e.il_count} il · ${fmt.n(e.ilce_count)} ilçe · ${e.party_count != null ? e.party_count + ' parti' : '— parti'}
              ${e.toplam_kayitli_secmen ? '<br/>' + fmt.n(e.toplam_kayitli_secmen) + ' kayıtlı seçmen' : ''}
            </div>
          </button>
        `).join('')}
      </div>
    `;

    container.querySelectorAll('.election-card').forEach(card => {
      card.addEventListener('click', () => {
        window.AT.navigate('arsiv', { key: card.dataset.key });
      });
    });
  }

  // ─── Tek bir seçim detayı
  function renderElectionDetail(container, info, data, meta, fmt) {
    const il_meta = meta.IL_META || {};
    const il_data = data.SECIM_IL || {};

    // Türkiye toplamı
    let trKayitli = 0, trOyKullanan = 0, trGecerli = 0, trSandik = 0;
    for (const k of Object.keys(il_meta)) {
      const m = il_meta[k];
      trKayitli += m.kayitli_secmen || 0;
      trOyKullanan += m.oy_kullanan_secmen || 0;
      trGecerli += m.gecerli_oy || 0;
      trSandik += m.toplam_sandik || 0;
    }
    const katilim = trKayitli > 0 ? (trOyKullanan / trKayitli * 100) : 0;

    // En çok ilk 5 parti (Türkiye toplamından)
    const partyTotals = {};
    for (const il of Object.values(il_data)) {
      for (const [p, v] of Object.entries(il.partiler || {})) {
        partyTotals[p] = (partyTotals[p] || 0) + v;
      }
    }
    const totalAllParties = Object.values(partyTotals).reduce((s, v) => s + v, 0);
    const topParties = Object.entries(partyTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8);

    // İl sıralaması (kayıtlı seçmene göre)
    const ilList = Object.keys(il_meta).map(k => ({
      ad: k,
      meta: il_meta[k],
      data: il_data[k] || { partiler: {}, toplam: 0 },
    })).sort((a, b) => (b.meta.kayitli_secmen || 0) - (a.meta.kayitli_secmen || 0));

    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">
          <a href="#/arsiv" style="color:inherit;">← Tüm seçimler</a> · 
          ${info.kategori === 'genel' ? 'Genel seçim' : 'Yerel seçim'}
        </span>
        <h1>${info.yil} · ${info.tip}</h1>
        <p class="lede">
          ${info.il_count} ilde, ${fmt.n(info.ilce_count)} ilçede sandığa gidildi.
          ${info.party_count != null ? info.party_count + ' parti / aday yarıştı.' : ''}
        </p>
      </header>

      <div class="stat-grid">
        <div class="stat-tile">
          <div class="stat-label">Kayıtlı seçmen</div>
          <div class="stat-value num">${fmt.n(trKayitli)}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">Oy kullanan</div>
          <div class="stat-value num">${fmt.n(trOyKullanan)}</div>
          <div class="stat-sub">Katılım %${fmt.n1(katilim)}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">Sandık</div>
          <div class="stat-value num">${fmt.n(trSandik)}</div>
        </div>
        <div class="stat-tile">
          <div class="stat-label">Geçerli oy</div>
          <div class="stat-value num">${fmt.n(trGecerli)}</div>
        </div>
      </div>

      <div class="section-head trend-grafik-baslik">
        <div>
          <h2>Türkiye sıralaması</h2>
          <span class="eyebrow">İlk 8 parti / aday (tabloda); CSV tüm partiler</span>
        </div>
        <button type="button" class="chart-export-btn focus-ring" id="arsiv-csv-parti">CSV indir</button>
      </div>
      <div class="panel">
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align:left">Parti / Aday</th>
              <th style="text-align:right">Oy</th>
              <th style="text-align:right">Pay</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${topParties.map(([p, v]) => {
              const pct = totalAllParties > 0 ? v/totalAllParties*100 : 0;
              return `
                <tr>
                  <td><strong>${escapeHtml(p)}</strong></td>
                  <td class="num" style="text-align:right">${fmt.n(v)}</td>
                  <td class="num" style="text-align:right">${fmt.pct(pct, 2)}</td>
                  <td style="width:140px;padding-left:var(--space-3)">
                    <div class="bar-wrap">
                      <div class="bar" style="width:${Math.min(100, pct).toFixed(2)}%"></div>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <div class="section-head trend-grafik-baslik">
        <div>
          <h2>İl bazında sıralama</h2>
          <span class="eyebrow">Kayıtlı seçmene göre (tabloda 25 il; CSV 81 il)</span>
        </div>
        <button type="button" class="chart-export-btn focus-ring" id="arsiv-csv-il">CSV indir</button>
      </div>
      <div class="panel" style="padding:0;overflow:hidden">
        <table class="data-table">
          <thead>
            <tr>
              <th style="text-align:left">İl</th>
              <th style="text-align:right">Kayıtlı seçmen</th>
              <th style="text-align:right">Oy kullanan</th>
              <th style="text-align:right">Katılım</th>
              <th style="text-align:right">İlçe</th>
            </tr>
          </thead>
          <tbody>
            ${ilList.slice(0, 25).map(il => {
              const k = il.meta.kayitli_secmen || 0;
              const o = il.meta.oy_kullanan_secmen || 0;
              const kat = k > 0 ? o/k*100 : 0;
              const ilceCount = (data.SECIM_ILCE && data.SECIM_ILCE[il.ad]) ? Object.keys(data.SECIM_ILCE[il.ad]).length : 0;
              return `
                <tr>
                  <td><strong>${escapeHtml(il.ad)}</strong></td>
                  <td class="num" style="text-align:right">${fmt.n(k)}</td>
                  <td class="num" style="text-align:right">${fmt.n(o)}</td>
                  <td class="num" style="text-align:right">${fmt.pct(kat, 1)}</td>
                  <td class="num" style="text-align:right">${ilceCount}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ${ilList.length > 25 ? `<div style="padding:var(--space-3) var(--space-5);font-size:12px;color:var(--ink-3);border-top:1px solid var(--line-soft);">… ve ${ilList.length - 25} il daha. Tam liste için arama/filtre özelliği eklenecek.</div>` : ''}
      </div>

      <p class="footnote">
        Veri kaynağı: YSK seçim sonuçları (sonuc.ysk.gov.tr).
        İttifak oyları, ittifaktaki her partinin doğrudan oy oranına göre orantılı dağıtılmıştır.
      </p>
    `;

    if (window.AT.bindRowsCsvExport) {
      window.AT.bindRowsCsvExport(
        container.querySelector('#arsiv-csv-parti'),
        ['Parti / Aday', 'Oy', 'Pay (%)'],
        () => Object.entries(partyTotals)
          .sort((a, b) => b[1] - a[1])
          .map(([p, v]) => [p, v, totalAllParties > 0 ? (v / totalAllParties * 100).toFixed(2) : '0']),
        () => `arsiv-${info.key}-partiler`
      );
      window.AT.bindRowsCsvExport(
        container.querySelector('#arsiv-csv-il'),
        ['Il', 'Kayitli secmen', 'Oy kullanan', 'Katilim (%)', 'Ilce sayisi'],
        () => ilList.map(il => {
          const k = il.meta.kayitli_secmen || 0;
          const o = il.meta.oy_kullanan_secmen || 0;
          const kat = k > 0 ? (o / k * 100).toFixed(1) : '0';
          const ilceCount = (data.SECIM_ILCE && data.SECIM_ILCE[il.ad])
            ? Object.keys(data.SECIM_ILCE[il.ad]).length : 0;
          return [il.ad, k, o, kat, ilceCount];
        }),
        () => `arsiv-${info.key}-iller`
      );
    }
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
})();
