/* ─────────────────────────────────────────────────────────
   Uyumsuzluk module v3 — 3 sekmeli analiz
   
   A) Demografi uyumsuzluğu — kayıtlı seçmen / 18+ nüfus
      (Sadece ilçe geneli kapsayan seçimler: CB, MV, IGM, BBB)
   
   B) Zamansal değişim — aynı tip seçimde önceki/sonraki kayıt farkı
      (Tüm seçim tipleri, beklenen %5-10)
   
   C) Tip tutarsızlığı — aynı yıl IGM vs BB seçmen oranı
      (Belediye sınırı içi seçmen oranı)
   
   Veri: data/aggregates/secmen_vs_18plus.json (her 3 analizi içerir)
         data/core/geo.json
         data/core/turkiye_iller.geojson
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  const cache = {
    data: null,    // secmen_vs_18plus.json (3 analizi de içeriyor)
    geo: null,
    geojson: null,
    metaIlceler: null,
  };

  async function loadUyumsuzlukData() {
    if (cache.data && cache.geo && cache.geojson) return;

    const [data, geo, geojson] = await Promise.all([
      fetch('data/aggregates/secmen_vs_18plus.json').then(r => {
        if (!r.ok) throw new Error('secmen_vs_18plus.json yüklenemedi: ' + r.status);
        return r.json();
      }),
      fetch('data/core/geo.json').then(r => {
        if (!r.ok) throw new Error('geo.json yüklenemedi: ' + r.status);
        return r.json();
      }),
      fetch('data/core/turkiye_iller.geojson').then(r => {
        if (!r.ok) throw new Error('turkiye_iller.geojson yüklenemedi: ' + r.status);
        return r.json();
      }),
    ]);

    cache.data = data;
    cache.geo = geo;
    cache.geojson = geojson;
  }

  async function loadMetaIlceler() {
    if (cache.metaIlceler) return;
    const r = await fetch('data/aggregates/meta_ilceler.json');
    if (!r.ok) throw new Error('meta_ilceler.json yüklenemedi: ' + r.status);
    cache.metaIlceler = await r.json();
  }

  // Modül durumu — aktif sekme + her sekmenin kendi UI durumu
  const state = {
    sekme: 'A',  // A | B | C | D
    A: {
      secim: '2024_BBB',
      katman: 'turkiye',
      katman_deger: '',
      esik: 100,
      siralama: 'desc',
      arama: '',
    },
    B: {
      cift: '2019_BBB_to_2024_BBB',
      katman: 'turkiye',
      katman_deger: '',
      esik: 20,  // %20+ artış varsayılan
      siralama: 'desc',
    },
    C: {
      cift: '2024_BB_vs_2024_IGM',
      katman: 'turkiye',
      katman_deger: '',
      siralama: 'asc',  // düşük kapsam = belde/köy ağırlıklı
    },
    D: {
      secim: '2024_BBB',
      arama: '',
      siralama: 'desc',
    },
    sayfa_boyut: 50,
  };

  window.Modules.uyumsuzluk = async function(container, ctx) {
    container.innerHTML = `<div class="loading">Uyumsuzluk verisi yükleniyor</div>`;

    try {
      await loadUyumsuzlukData();
    } catch (e) {
      container.innerHTML = renderHataEkrani(e);
      return;
    }

    renderModule(container);
  };

  function renderHataEkrani(e) {
    return `
      <header class="page-header">
        <span class="eyebrow">Modül · 02</span>
        <h1>Uyumsuzluk tespiti</h1>
        <p class="lede">Veri yüklenemedi: ${e.message}</p>
      </header>
      <div class="panel">
        <div class="panel-title">Aggregate dosyaları eksik</div>
        <p style="color:var(--ink-2); line-height:1.6;">
          Bu modül için şu dosyalar gerekli:
        </p>
        <ul style="color:var(--ink-2); line-height:1.7;">
          <li><span class="mono">data/aggregates/secmen_vs_18plus.json</span></li>
          <li><span class="mono">data/core/geo.json</span></li>
          <li><span class="mono">data/core/turkiye_iller.geojson</span></li>
        </ul>
      </div>
    `;
  }

  function renderModule(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Modül · 02 · Tarafsız analiz · 4 perspektif</span>
        <h1>Uyumsuzluk atlası</h1>
        <p class="lede">
          Türkiye'deki 973 ilçenin seçmen kaydı ve nüfus verileri arasındaki uyumsuzlukları
          dört farklı pencereden gözlemleyin. Her pencere farklı bir gerçeği gösterir,
          hiçbiri tek başına suçlayıcı yargı taşımaz.
        </p>
      </header>

      ${window.AT.renderDataFreshness ? window.AT.renderDataFreshness() : ''}
      ${window.AT.renderContextNotice ? window.AT.renderContextNotice('uyumsuzluk') : ''}

      <div class="uyumsuzluk-sekmeler">
        <button class="uyumsuzluk-sekme" data-sekme="A">
          <span class="sekme-num">A</span>
          <span class="sekme-baslik">Demografi karşılaştırması</span>
          <span class="sekme-sub">Kayıtlı seçmen / 18+ nüfus</span>
        </button>
        <button class="uyumsuzluk-sekme" data-sekme="B">
          <span class="sekme-num">B</span>
          <span class="sekme-baslik">Zamansal değişim</span>
          <span class="sekme-sub">Önceki seçimle fark</span>
        </button>
        <button class="uyumsuzluk-sekme" data-sekme="C">
          <span class="sekme-num">C</span>
          <span class="sekme-baslik">Seçim tipi tutarsızlığı</span>
          <span class="sekme-sub">BB vs IGM kapsam oranı</span>
        </button>
        <button class="uyumsuzluk-sekme" data-sekme="D">
          <span class="sekme-num">D</span>
          <span class="sekme-baslik">İstatistiksel göstergeler</span>
          <span class="sekme-sub">Katılım · geçersiz oy · büyüme</span>
        </button>
      </div>

      <div id="uyumsuzluk-icerik"></div>

      ${renderStiller()}
    `;

    // Sekme tıklama
    container.querySelectorAll('.uyumsuzluk-sekme').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sekme = btn.dataset.sekme;
        renderAktifSekme(container);
      });
    });

    renderAktifSekme(container);
  }

  function renderAktifSekme(container) {
    // Aktif sekme stilini güncelle
    container.querySelectorAll('.uyumsuzluk-sekme').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sekme === state.sekme);
    });

    if (state.sekme === 'A') renderSekmeA(container);
    else if (state.sekme === 'B') renderSekmeB(container);
    else if (state.sekme === 'C') renderSekmeC(container);
    else if (state.sekme === 'D') renderSekmeD(container);
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME A — Demografi karşılaştırması
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeA(container) {
    const icerikEl = container.querySelector('#uyumsuzluk-icerik');
    const data = cache.data;

    // Bu sekme için uygun seçimleri tespit et (demografi_uygun: true olanlar)
    const uygunSecimler = new Set();
    for (const ilce of Object.values(data.ilceler)) {
      for (const [k, v] of Object.entries(ilce.secimler)) {
        if (v.demografi_uygun) uygunSecimler.add(k);
      }
    }
    const secimListesi = Array.from(uygunSecimler).sort().reverse();

    if (!uygunSecimler.has(state.A.secim) && secimListesi.length) {
      state.A.secim = secimListesi[0];
    }

    icerikEl.innerHTML = `
      <div class="panel panel-spaced">
        <p class="lede panel-lede">
          Bir ilçenin <strong>kayıtlı seçmen sayısı, o tarihte 18+ nüfusunu aşıyorsa</strong> uyumsuzluk vardır.
          Bu, kesin bir uygunsuzluk iddiası değildir — demografik kayma, göç, ADNKS gecikmesi gibi doğal sebepleri olabilir.
        </p>
        <p class="panel-note">
          <strong>Not:</strong> Yalnızca ilçe geneli kapsayan seçimler (CB, MV, IGM, BBB) gösterilir.
          BB ve BM seçimleri sadece belediye sınırı içini kapsadığından demografi karşılaştırması yanıltıcı olur — bu yüzden listede yok.
        </p>
      </div>

      <div class="panel panel-spaced-lg">
        <div class="panel-title">
          Filtre
          <span class="panel-meta">${secimListesi.length} uygun seçim · ${Object.keys(data.ilceler).length} ilçe</span>
        </div>
        <div id="sekmeA-filtre" class="uyumsuzluk-filtre"></div>
      </div>

      <div id="sekmeA-ozet"></div>

      <div class="section-head">
        <h2>Türkiye haritası — il bazlı ortalama</h2>
        <span class="eyebrow">İle tıklayın · içindeki ilçeler tabloda açılır</span>
      </div>
      <div class="panel" id="sekmeA-harita-panel" style="padding: var(--space-4); position: relative;">
        <div id="sekmeA-harita"></div>
        <div id="sekmeA-tooltip" class="uyumsuzluk-tooltip" style="display: none;"></div>
        <div class="uyumsuzluk-lejant" id="sekmeA-lejant"></div>
      </div>

      <div class="section-head">
        <h2 id="sekmeA-tablo-baslik">İlçe sıralaması</h2>
        <span class="eyebrow" id="sekmeA-tablo-meta"></span>
      </div>
      <div class="panel panel-flush">
        <div id="sekmeA-tablo"></div>
      </div>

      ${renderAciklamaA()}
    `;

    renderFiltreA(icerikEl, secimListesi);
    renderTabloA(icerikEl);
    renderHaritaA(icerikEl);
  }

  function renderFiltreA(icerikEl, secimListesi) {
    const fEl = icerikEl.querySelector('#sekmeA-filtre');
    const u = state.A;
    const geo = cache.geo;

    const secimOpts = secimListesi.map(k =>
      `<option value="${k}" ${k === u.secim ? 'selected' : ''}>${secimAdi(k)}</option>`
    ).join('');

    const katmanOpts = [
      ['turkiye', 'Türkiye geneli'],
      ['nuts1',   'NUTS-1 bölge'],
      ['nuts2',   'NUTS-2 alt bölge'],
      ['il',      'İl'],
    ].map(([v, l]) => `<option value="${v}" ${v === u.katman ? 'selected' : ''}>${l}</option>`).join('');

    let katmanDegerOpts = '', katmanDegerVisible = false;
    if (u.katman === 'nuts1') {
      katmanDegerVisible = true;
      const opts = Object.entries(geo.nuts1).map(([k, info]) =>
        `<option value="${k}" ${k === u.katman_deger ? 'selected' : ''}>${k} · ${info.ad}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— bölge seçin —</option>${opts}`;
    } else if (u.katman === 'nuts2') {
      katmanDegerVisible = true;
      const opts = Object.entries(geo.nuts2).map(([k, info]) =>
        `<option value="${k}" ${k === u.katman_deger ? 'selected' : ''}>${k} · ${info.ad}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— alt bölge seçin —</option>${opts}`;
    } else if (u.katman === 'il') {
      katmanDegerVisible = true;
      const iller = Object.keys(geo.iller).sort((a, b) => a.localeCompare(b, 'tr'));
      const opts = iller.map(il =>
        `<option value="${il}" ${il === u.katman_deger ? 'selected' : ''}>${il}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— il seçin —</option>${opts}`;
    }

    fEl.innerHTML = `
      <div class="uyumsuzluk-filtre-row">
        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Seçim</span>
          <select id="A-secim" class="uyumsuzluk-select">${secimOpts}</select>
        </label>

        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Coğrafi katman</span>
          <select id="A-katman" class="uyumsuzluk-select">${katmanOpts}</select>
        </label>

        ${katmanDegerVisible ? `
          <label class="uyumsuzluk-filtre-grup">
            <span class="uyumsuzluk-filtre-lbl">Bölge / il</span>
            <select id="A-katman-deger" class="uyumsuzluk-select">${katmanDegerOpts}</select>
          </label>
        ` : ''}

        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Eşik (% üstü)</span>
          <select id="A-esik" class="uyumsuzluk-select">
            <option value="0"   ${u.esik === 0   ? 'selected' : ''}>Hepsi</option>
            <option value="100" ${u.esik === 100 ? 'selected' : ''}>%100 üstü</option>
            <option value="105" ${u.esik === 105 ? 'selected' : ''}>%105 üstü</option>
            <option value="110" ${u.esik === 110 ? 'selected' : ''}>%110 üstü</option>
            <option value="-90" ${u.esik === -90 ? 'selected' : ''}>%90 altı (göç işareti)</option>
            <option value="-50" ${u.esik === -50 ? 'selected' : ''}>%50 altı (yoğun göç)</option>
          </select>
        </label>

        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Sıralama</span>
          <select id="A-siralama" class="uyumsuzluk-select">
            <option value="desc" ${u.siralama === 'desc' ? 'selected' : ''}>Yüksekten düşüğe</option>
            <option value="asc"  ${u.siralama === 'asc'  ? 'selected' : ''}>Düşükten yükseğe</option>
          </select>
        </label>

        <label class="uyumsuzluk-filtre-grup" style="min-width: 220px;">
          <span class="uyumsuzluk-filtre-lbl">İlçe ara</span>
          <input id="A-arama" type="search" class="uyumsuzluk-select" placeholder="İl veya ilçe adı…" value="${escapeHtml(u.arama || '')}">
        </label>
      </div>
    `;

    fEl.querySelector('#A-secim').addEventListener('change', e => {
      u.secim = e.target.value;
      renderTabloA(icerikEl);
      renderHaritaA(icerikEl);
    });
    fEl.querySelector('#A-katman').addEventListener('change', e => {
      u.katman = e.target.value;
      u.katman_deger = '';
      renderFiltreA(icerikEl, secimListesi);
      renderTabloA(icerikEl);
      renderHaritaA(icerikEl);
    });
    const kdEl = fEl.querySelector('#A-katman-deger');
    if (kdEl) {
      kdEl.addEventListener('change', e => {
        u.katman_deger = e.target.value;
        renderTabloA(icerikEl);
        renderHaritaA(icerikEl);
      });
    }
    fEl.querySelector('#A-esik').addEventListener('change', e => {
      u.esik = parseInt(e.target.value, 10);
      renderTabloA(icerikEl);
    });
    fEl.querySelector('#A-siralama').addEventListener('change', e => {
      u.siralama = e.target.value;
      renderTabloA(icerikEl);
    });
    const aramaEl = fEl.querySelector('#A-arama');
    if (aramaEl) {
      aramaEl.addEventListener('input', e => {
        u.arama = e.target.value;
        renderTabloA(icerikEl);
      });
    }
  }

  function renderTabloA(icerikEl) {
    const fmt = window.AT.fmt;
    const u = state.A;
    const data = cache.data;
    const geo = cache.geo;

    let ilceleriFiltre = () => true;
    if (u.katman === 'nuts1' && u.katman_deger) {
      const iller = new Set(geo.nuts1[u.katman_deger]?.iller || []);
      ilceleriFiltre = (geoKey) => iller.has(data.ilceler[geoKey].il);
    } else if (u.katman === 'nuts2' && u.katman_deger) {
      const iller = new Set(geo.nuts2[u.katman_deger]?.iller || []);
      ilceleriFiltre = (geoKey) => iller.has(data.ilceler[geoKey].il);
    } else if (u.katman === 'il' && u.katman_deger) {
      ilceleriFiltre = (geoKey) => data.ilceler[geoKey].il === u.katman_deger;
    }

    const kayitlar = [];
    for (const [geoKey, ilce] of Object.entries(data.ilceler)) {
      const sec = ilce.secimler[u.secim];
      if (!sec || !sec.oran_yuzde || !sec.demografi_uygun) continue;
      if (!ilceleriFiltre(geoKey)) continue;
      kayitlar.push({
        geoKey,
        il: ilce.il,
        ad: ilce.ad,
        kayitli: sec.kayitli_secmen,
        n18plus: sec.n18plus,
        oran: sec.oran_yuzde,
      });
    }

    let filtreli = kayitlar;
    if (u.esik === 100) filtreli = kayitlar.filter(k => k.oran > 100);
    else if (u.esik === 105) filtreli = kayitlar.filter(k => k.oran > 105);
    else if (u.esik === 110) filtreli = kayitlar.filter(k => k.oran > 110);
    else if (u.esik === -90) filtreli = kayitlar.filter(k => k.oran < 90);
    else if (u.esik === -50) filtreli = kayitlar.filter(k => k.oran < 50);

    if (u.arama && u.arama.trim()) {
      const q = aramaNormalize(u.arama.trim());
      filtreli = filtreli.filter(k =>
        aramaNormalize(k.il).includes(q) || aramaNormalize(k.ad).includes(q)
      );
    }

    filtreli.sort((a, b) => u.siralama === 'desc' ? b.oran - a.oran : a.oran - b.oran);

    renderOzetA(icerikEl, kayitlar);

    const baslik = icerikEl.querySelector('#sekmeA-tablo-baslik');
    const meta = icerikEl.querySelector('#sekmeA-tablo-meta');
    baslik.textContent = filtreli.length
      ? `İlçe sıralaması — ${secimAdi(u.secim)}`
      : 'Filtreyle eşleşen ilçe bulunamadı';
    meta.textContent = filtreli.length ? `${fmt.n(filtreli.length)} ilçe gösteriliyor` : '';

    const tEl = icerikEl.querySelector('#sekmeA-tablo');
    if (!filtreli.length) {
      tEl.innerHTML = renderBosTablo();
      return;
    }

    const goster = filtreli.slice(0, state.sayfa_boyut);
    tEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left; width:36px;">#</th>
            <th style="text-align:left;">İlçe</th>
            <th style="text-align:right;">Kayıtlı seçmen</th>
            <th style="text-align:right;">18+ nüfus</th>
            <th style="text-align:right;">Oran</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${goster.map((k, i) => {
            const sinif = oranSinifi(k.oran);
            const barWidth = Math.min(100, (k.oran / 130) * 100);
            const cizgi100 = (100 / 130) * 100;
            return `
              <tr>
                <td><span class="uyumsuzluk-rank">${i + 1}</span></td>
                <td>
                  <div class="uyumsuzluk-loc">${escapeHtml(k.ad)}</div>
                  <div class="uyumsuzluk-loc-il">${escapeHtml(k.il)}</div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n(k.kayitli)}</td>
                <td class="num" style="text-align:right;">${fmt.n(k.n18plus)}</td>
                <td class="num" style="text-align:right; color:${sinifRengi(sinif)}; font-weight:600;">
                  ${fmt.n1(k.oran)}%
                </td>
                <td class="uyumsuzluk-bar-cell">
                  <div class="uyumsuzluk-bar-track">
                    <div class="uyumsuzluk-bar-fill ${sinif}" style="width:${barWidth.toFixed(2)}%"></div>
                    <div class="uyumsuzluk-100-line" style="left:${cizgi100.toFixed(2)}%"></div>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ${filtreli.length > state.sayfa_boyut ? renderTabloAlt(filtreli.length) : ''}
    `;
  }

  function renderOzetA(icerikEl, kayitlar) {
    const fmt = window.AT.fmt;
    const ozetEl = icerikEl.querySelector('#sekmeA-ozet');
    const tum = kayitlar.length;
    const ust100 = kayitlar.filter(k => k.oran > 100).length;
    const ust105 = kayitlar.filter(k => k.oran > 105).length;
    const ust110 = kayitlar.filter(k => k.oran > 110).length;
    const alt90 = kayitlar.filter(k => k.oran < 90).length;
    const ortalama = tum > 0 ? kayitlar.reduce((s, k) => s + k.oran, 0) / tum : 0;
    const baslikText = state.A.katman === 'turkiye' ? 'Türkiye geneli' :
      state.A.katman_deger ? state.A.katman_deger : 'Tüm ilçeler';

    ozetEl.innerHTML = `
      <div class="uyumsuzluk-ozet-grid">
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">Kapsanan ilçe</div>
          <div class="ozet-val">${fmt.n(tum)}</div>
          <div class="ozet-sub">${baslikText}</div>
        </div>
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">Ortalama oran</div>
          <div class="ozet-val">${fmt.n1(ortalama)}%</div>
          <div class="ozet-sub">Kayıtlı / 18+ nüfus</div>
        </div>
        <div class="uyumsuzluk-ozet-tile amber">
          <div class="ozet-lbl">%100 üstü</div>
          <div class="ozet-val">${fmt.n(ust100)}</div>
          <div class="ozet-sub">Sorgulamaya açar</div>
        </div>
        <div class="uyumsuzluk-ozet-tile kirmizi">
          <div class="ozet-lbl">%105 üstü</div>
          <div class="ozet-val">${fmt.n(ust105)}</div>
          <div class="ozet-sub">Belirgin uyumsuzluk</div>
        </div>
        <div class="uyumsuzluk-ozet-tile kirmizi">
          <div class="ozet-lbl">%110 üstü</div>
          <div class="ozet-val">${fmt.n(ust110)}</div>
          <div class="ozet-sub">Yüksek uyumsuzluk</div>
        </div>
        <div class="uyumsuzluk-ozet-tile mavi">
          <div class="ozet-lbl">%90 altı</div>
          <div class="ozet-val">${fmt.n(alt90)}</div>
          <div class="ozet-sub">Olası göç bölgesi</div>
        </div>
      </div>
    `;
  }

  function renderHaritaA(icerikEl) {
    const u = state.A;
    const data = cache.data;

    // Her il için ortalama oran hesapla (sadece demografi_uygun olan)
    const il_ozet = {};
    for (const ilce of Object.values(data.ilceler)) {
      const sec = ilce.secimler[u.secim];
      if (!sec || !sec.oran_yuzde || !sec.demografi_uygun) continue;
      if (!il_ozet[ilce.il]) il_ozet[ilce.il] = { oranlar: [], ust100: 0 };
      il_ozet[ilce.il].oranlar.push(sec.oran_yuzde);
      if (sec.oran_yuzde > 100) il_ozet[ilce.il].ust100++;
    }
    for (const il in il_ozet) {
      const o = il_ozet[il];
      o.ortalama = o.oranlar.reduce((s, v) => s + v, 0) / o.oranlar.length;
      o.ilce_sayisi = o.oranlar.length;
    }

    const secili_il = u.katman === 'il' ? u.katman_deger : null;

    cizHarita({
      icerikEl,
      haritaId: 'sekmeA-harita',
      tooltipId: 'sekmeA-tooltip',
      panelId: 'sekmeA-harita-panel',
      lejantId: 'sekmeA-lejant',
      il_data: il_ozet,
      secili_il,
      tooltipFn: (il, ozet) => {
        if (!ozet) return `<div class="tt-il">${escapeHtml(il)}</div><div class="tt-sub">Bu seçim için veri yok</div>`;
        return `<div class="tt-il">${escapeHtml(il)}</div>
                <div class="tt-deger">${window.AT.fmt.n1(ozet.ortalama)}%</div>
                <div class="tt-sub">${ozet.ilce_sayisi} ilçe · ${ozet.ust100} ilçe %100 üstü</div>`;
      },
      renkFn: (ozet) => haritaRengiOran(ozet.ortalama),
      onIlClick: (il) => {
        u.katman = 'il';
        u.katman_deger = il;
        renderSekmeA(icerikEl.parentElement);
        const tabloHead = icerikEl.querySelector('#sekmeA-tablo-baslik');
        if (tabloHead) tabloHead.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      lejant: lejantA(),
    });
  }

  function lejantA() {
    return [
      { renk: haritaRengiOran(50),  etiket: '%70 altı (göç)' },
      { renk: haritaRengiOran(85),  etiket: '%70-95' },
      { renk: haritaRengiOran(98),  etiket: '%95-100' },
      { renk: haritaRengiOran(102), etiket: '%100-105' },
      { renk: haritaRengiOran(108), etiket: '%105 üstü' },
    ];
  }

  function renderAciklamaA() {
    return `
      <div class="panel panel-muted">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Yüksek oranlar ne anlama gelir?</div>
        <div style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          Bir ilçede <strong>kayıtlı seçmen sayısı, o ilçedeki 18+ nüfusu geçiyorsa</strong>,
          birkaç doğal açıklaması olabilir:
        </div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2); margin-top:var(--space-3);">
          <li><strong>Demografi gecikmesi:</strong> TÜİK ADNKS yıl sonu yayınlanır;
              seçim tarihinde 18'i dolduran gençler henüz kayıtlarda görünmüyor olabilir.</li>
          <li><strong>Genç nüfus + yüksek doğum oranı:</strong> Doğu ve Güneydoğu Anadolu'daki ilçelerde
              nüfus piramidi geniş — beklenen bir orandır.</li>
          <li><strong>Göç edilen yer / çift kayıt:</strong> İlçeden başka şehirlere göç eden kişiler
              seçmen kayıtlarını taşımamış olabilir.</li>
          <li><strong>Veri toplama yöntem farkı:</strong> YSK seçmen kütüğü ile TÜİK ADNKS verisi
              farklı zamanlarda ve farklı tanımlarla toplanır.</li>
        </ul>
        <p class="footnote" style="margin-top: var(--space-4);">
          Bu modül uyumsuzluğu işaretler, sebebini yorumlamaz.
        </p>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME B — Zamansal değişim
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeB(container) {
    const icerikEl = container.querySelector('#uyumsuzluk-icerik');
    const data = cache.data;
    const ciftler = data.zamansal_degisim?.ciftler || [];

    icerikEl.innerHTML = `
      <div class="panel panel-spaced">
        <p class="lede panel-lede">
          Bir ilçenin <strong>aynı seçim tipinde</strong> önceki seçime göre kayıtlı seçmen sayısı ne kadar değişmiş?
          Beklenen artış %5-10 (nüfus artışı + yaşa gelen yeni seçmenler).
          %20'yi aşan artışlar veya negatif değişimler açıklamayı hak eder.
        </p>
      </div>

      <div class="panel panel-spaced-lg">
        <div class="panel-title">Filtre</div>
        <div id="sekmeB-filtre" class="uyumsuzluk-filtre"></div>
      </div>

      <div id="sekmeB-ozet"></div>

      <div class="section-head">
        <h2>Türkiye haritası — il bazlı ortalama değişim</h2>
        <span class="eyebrow">İle tıklayın · içindeki ilçeler tabloda açılır</span>
      </div>
      <div class="panel" id="sekmeB-harita-panel" style="padding: var(--space-4); position: relative;">
        <div id="sekmeB-harita"></div>
        <div id="sekmeB-tooltip" class="uyumsuzluk-tooltip" style="display: none;"></div>
        <div class="uyumsuzluk-lejant" id="sekmeB-lejant"></div>
      </div>

      <div class="section-head">
        <h2 id="sekmeB-tablo-baslik">İlçe sıralaması</h2>
        <span class="eyebrow" id="sekmeB-tablo-meta"></span>
      </div>
      <div class="panel panel-flush">
        <div id="sekmeB-tablo"></div>
      </div>

      ${renderAciklamaB()}
    `;

    renderFiltreB(icerikEl, ciftler);
    renderTabloB(icerikEl);
    renderHaritaB(icerikEl);
  }

  function renderFiltreB(icerikEl, ciftler) {
    const fEl = icerikEl.querySelector('#sekmeB-filtre');
    const u = state.B;
    const geo = cache.geo;

    const ciftOpts = ciftler.map(c => {
      const cKey = `${c.onceki}_to_${c.sonraki}`;
      const lbl = `${secimAdi(c.onceki)} → ${secimAdi(c.sonraki)}`;
      return `<option value="${cKey}" ${cKey === u.cift ? 'selected' : ''}>${lbl}</option>`;
    }).join('');

    const katmanOpts = [
      ['turkiye', 'Türkiye geneli'],
      ['nuts1',   'NUTS-1 bölge'],
      ['nuts2',   'NUTS-2 alt bölge'],
      ['il',      'İl'],
    ].map(([v, l]) => `<option value="${v}" ${v === u.katman ? 'selected' : ''}>${l}</option>`).join('');

    let katmanDegerOpts = '', katmanDegerVisible = false;
    if (u.katman === 'nuts1') {
      katmanDegerVisible = true;
      const opts = Object.entries(geo.nuts1).map(([k, info]) =>
        `<option value="${k}" ${k === u.katman_deger ? 'selected' : ''}>${k} · ${info.ad}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— bölge seçin —</option>${opts}`;
    } else if (u.katman === 'nuts2') {
      katmanDegerVisible = true;
      const opts = Object.entries(geo.nuts2).map(([k, info]) =>
        `<option value="${k}" ${k === u.katman_deger ? 'selected' : ''}>${k} · ${info.ad}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— alt bölge seçin —</option>${opts}`;
    } else if (u.katman === 'il') {
      katmanDegerVisible = true;
      const iller = Object.keys(geo.iller).sort((a, b) => a.localeCompare(b, 'tr'));
      const opts = iller.map(il =>
        `<option value="${il}" ${il === u.katman_deger ? 'selected' : ''}>${il}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— il seçin —</option>${opts}`;
    }

    fEl.innerHTML = `
      <div class="uyumsuzluk-filtre-row">
        <label class="uyumsuzluk-filtre-grup" style="min-width: 320px;">
          <span class="uyumsuzluk-filtre-lbl">Karşılaştırılan seçimler</span>
          <select id="B-cift" class="uyumsuzluk-select" style="min-width: 280px;">${ciftOpts}</select>
        </label>

        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Coğrafi katman</span>
          <select id="B-katman" class="uyumsuzluk-select">${katmanOpts}</select>
        </label>

        ${katmanDegerVisible ? `
          <label class="uyumsuzluk-filtre-grup">
            <span class="uyumsuzluk-filtre-lbl">Bölge / il</span>
            <select id="B-katman-deger" class="uyumsuzluk-select">${katmanDegerOpts}</select>
          </label>
        ` : ''}

        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Eşik (% değişim)</span>
          <select id="B-esik" class="uyumsuzluk-select">
            <option value="0"   ${u.esik === 0   ? 'selected' : ''}>Hepsi</option>
            <option value="20"  ${u.esik === 20  ? 'selected' : ''}>+%20 üstü artış</option>
            <option value="40"  ${u.esik === 40  ? 'selected' : ''}>+%40 üstü artış</option>
            <option value="-10" ${u.esik === -10 ? 'selected' : ''}>%10 altı azalma</option>
            <option value="-30" ${u.esik === -30 ? 'selected' : ''}>%30 altı azalma</option>
          </select>
        </label>

        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Sıralama</span>
          <select id="B-siralama" class="uyumsuzluk-select">
            <option value="desc" ${u.siralama === 'desc' ? 'selected' : ''}>Yüksekten düşüğe</option>
            <option value="asc"  ${u.siralama === 'asc'  ? 'selected' : ''}>Düşükten yükseğe</option>
          </select>
        </label>
      </div>
    `;

    fEl.querySelector('#B-cift').addEventListener('change', e => {
      u.cift = e.target.value;
      renderTabloB(icerikEl);
      renderHaritaB(icerikEl);
    });
    fEl.querySelector('#B-katman').addEventListener('change', e => {
      u.katman = e.target.value;
      u.katman_deger = '';
      renderFiltreB(icerikEl, ciftler);
      renderTabloB(icerikEl);
      renderHaritaB(icerikEl);
    });
    const kdEl = fEl.querySelector('#B-katman-deger');
    if (kdEl) {
      kdEl.addEventListener('change', e => {
        u.katman_deger = e.target.value;
        renderTabloB(icerikEl);
        renderHaritaB(icerikEl);
      });
    }
    fEl.querySelector('#B-esik').addEventListener('change', e => {
      u.esik = parseInt(e.target.value, 10);
      renderTabloB(icerikEl);
    });
    fEl.querySelector('#B-siralama').addEventListener('change', e => {
      u.siralama = e.target.value;
      renderTabloB(icerikEl);
    });
  }

  function renderTabloB(icerikEl) {
    const fmt = window.AT.fmt;
    const u = state.B;
    const data = cache.data;
    const geo = cache.geo;
    const zaman = data.zamansal_degisim?.ilceler || {};

    let ilceleriFiltre = () => true;
    if (u.katman === 'nuts1' && u.katman_deger) {
      const iller = new Set(geo.nuts1[u.katman_deger]?.iller || []);
      ilceleriFiltre = (geoKey) => iller.has(zaman[geoKey].il);
    } else if (u.katman === 'nuts2' && u.katman_deger) {
      const iller = new Set(geo.nuts2[u.katman_deger]?.iller || []);
      ilceleriFiltre = (geoKey) => iller.has(zaman[geoKey].il);
    } else if (u.katman === 'il' && u.katman_deger) {
      ilceleriFiltre = (geoKey) => zaman[geoKey].il === u.katman_deger;
    }

    const kayitlar = [];
    for (const [geoKey, ilce] of Object.entries(zaman)) {
      const cift = ilce.ciftler[u.cift];
      if (!cift || cift.fark_yuzde == null) continue;
      if (!ilceleriFiltre(geoKey)) continue;
      kayitlar.push({
        geoKey,
        il: ilce.il,
        ad: ilce.ad,
        onceki: cift.onceki_kayitli,
        sonraki: cift.sonraki_kayitli,
        fark: cift.fark,
        fark_yuzde: cift.fark_yuzde,
      });
    }

    let filtreli = kayitlar;
    if (u.esik === 20)       filtreli = kayitlar.filter(k => k.fark_yuzde > 20);
    else if (u.esik === 40)  filtreli = kayitlar.filter(k => k.fark_yuzde > 40);
    else if (u.esik === -10) filtreli = kayitlar.filter(k => k.fark_yuzde < -10);
    else if (u.esik === -30) filtreli = kayitlar.filter(k => k.fark_yuzde < -30);

    filtreli.sort((a, b) => u.siralama === 'desc' ? b.fark_yuzde - a.fark_yuzde : a.fark_yuzde - b.fark_yuzde);

    renderOzetB(icerikEl, kayitlar);

    const baslik = icerikEl.querySelector('#sekmeB-tablo-baslik');
    const meta = icerikEl.querySelector('#sekmeB-tablo-meta');
    const ciftAd = ciftAdiB(u.cift);
    baslik.textContent = filtreli.length ? `İlçe sıralaması — ${ciftAd}` : 'Filtreyle eşleşen ilçe bulunamadı';
    meta.textContent = filtreli.length ? `${fmt.n(filtreli.length)} ilçe gösteriliyor` : '';

    const tEl = icerikEl.querySelector('#sekmeB-tablo');
    if (!filtreli.length) {
      tEl.innerHTML = renderBosTablo();
      return;
    }

    const goster = filtreli.slice(0, state.sayfa_boyut);
    tEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left; width:36px;">#</th>
            <th style="text-align:left;">İlçe</th>
            <th style="text-align:right;">Önceki</th>
            <th style="text-align:right;">Sonraki</th>
            <th style="text-align:right;">Fark</th>
            <th style="text-align:right;">Yüzde</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${goster.map((k, i) => {
            const sinif = degisimSinifi(k.fark_yuzde);
            // Bar -50 ile +100 arasında çiziyor, sıfır çizgisi ortada
            const min = -50, max = 100;
            const sifirX = (-min / (max - min)) * 100;
            const barW = Math.min(100, Math.abs(k.fark_yuzde) / Math.max(Math.abs(min), max) * 50);
            const barLeft = k.fark_yuzde >= 0 ? sifirX : sifirX - barW;
            return `
              <tr>
                <td><span class="uyumsuzluk-rank">${i + 1}</span></td>
                <td>
                  <div class="uyumsuzluk-loc">${escapeHtml(k.ad)}</div>
                  <div class="uyumsuzluk-loc-il">${escapeHtml(k.il)}</div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n(k.onceki)}</td>
                <td class="num" style="text-align:right;">${fmt.n(k.sonraki)}</td>
                <td class="num" style="text-align:right; color:${sinifRengi(sinif)};">${k.fark > 0 ? '+' : ''}${fmt.n(k.fark)}</td>
                <td class="num" style="text-align:right; color:${sinifRengi(sinif)}; font-weight:600;">
                  ${k.fark_yuzde > 0 ? '+' : ''}${fmt.n1(k.fark_yuzde)}%
                </td>
                <td class="uyumsuzluk-bar-cell">
                  <div class="uyumsuzluk-bar-track">
                    <div class="uyumsuzluk-bar-fill ${sinif}" style="position:absolute; left:${barLeft.toFixed(2)}%; width:${barW.toFixed(2)}%"></div>
                    <div class="uyumsuzluk-100-line" style="left:${sifirX}%"></div>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ${filtreli.length > state.sayfa_boyut ? renderTabloAlt(filtreli.length) : ''}
    `;
  }

  function renderOzetB(icerikEl, kayitlar) {
    const fmt = window.AT.fmt;
    const ozetEl = icerikEl.querySelector('#sekmeB-ozet');
    const tum = kayitlar.length;
    const ust20 = kayitlar.filter(k => k.fark_yuzde > 20).length;
    const ust40 = kayitlar.filter(k => k.fark_yuzde > 40).length;
    const alt0 = kayitlar.filter(k => k.fark_yuzde < 0).length;
    const alt10 = kayitlar.filter(k => k.fark_yuzde < -10).length;
    const ortalama = tum > 0 ? kayitlar.reduce((s, k) => s + k.fark_yuzde, 0) / tum : 0;
    const baslikText = state.B.katman === 'turkiye' ? 'Türkiye geneli' :
      state.B.katman_deger ? state.B.katman_deger : 'Tüm ilçeler';

    ozetEl.innerHTML = `
      <div class="uyumsuzluk-ozet-grid">
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">Kapsanan ilçe</div>
          <div class="ozet-val">${fmt.n(tum)}</div>
          <div class="ozet-sub">${baslikText}</div>
        </div>
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">Ortalama değişim</div>
          <div class="ozet-val">${ortalama > 0 ? '+' : ''}${fmt.n1(ortalama)}%</div>
          <div class="ozet-sub">Beklenen %5-10</div>
        </div>
        <div class="uyumsuzluk-ozet-tile amber">
          <div class="ozet-lbl">+%20 üstü</div>
          <div class="ozet-val">${fmt.n(ust20)}</div>
          <div class="ozet-sub">Açıklanması gereken</div>
        </div>
        <div class="uyumsuzluk-ozet-tile kirmizi">
          <div class="ozet-lbl">+%40 üstü</div>
          <div class="ozet-val">${fmt.n(ust40)}</div>
          <div class="ozet-sub">Belirgin uyumsuzluk</div>
        </div>
        <div class="uyumsuzluk-ozet-tile mavi">
          <div class="ozet-lbl">Azalan</div>
          <div class="ozet-val">${fmt.n(alt0)}</div>
          <div class="ozet-sub">Göç işareti</div>
        </div>
        <div class="uyumsuzluk-ozet-tile mavi">
          <div class="ozet-lbl">%10+ azalan</div>
          <div class="ozet-val">${fmt.n(alt10)}</div>
          <div class="ozet-sub">Belirgin göç</div>
        </div>
      </div>
    `;
  }

  function renderHaritaB(icerikEl) {
    const u = state.B;
    const data = cache.data;
    const zaman = data.zamansal_degisim?.ilceler || {};

    const il_ozet = {};
    for (const ilce of Object.values(zaman)) {
      const cift = ilce.ciftler[u.cift];
      if (!cift || cift.fark_yuzde == null) continue;
      if (!il_ozet[ilce.il]) il_ozet[ilce.il] = { degisimler: [] };
      il_ozet[ilce.il].degisimler.push(cift.fark_yuzde);
    }
    for (const il in il_ozet) {
      const o = il_ozet[il];
      o.ortalama = o.degisimler.reduce((s, v) => s + v, 0) / o.degisimler.length;
      o.ilce_sayisi = o.degisimler.length;
    }

    const secili_il = u.katman === 'il' ? u.katman_deger : null;

    cizHarita({
      icerikEl,
      haritaId: 'sekmeB-harita',
      tooltipId: 'sekmeB-tooltip',
      panelId: 'sekmeB-harita-panel',
      lejantId: 'sekmeB-lejant',
      il_data: il_ozet,
      secili_il,
      tooltipFn: (il, ozet) => {
        if (!ozet) return `<div class="tt-il">${escapeHtml(il)}</div><div class="tt-sub">Bu seçim çifti için veri yok</div>`;
        const ort = ozet.ortalama;
        return `<div class="tt-il">${escapeHtml(il)}</div>
                <div class="tt-deger">${ort > 0 ? '+' : ''}${window.AT.fmt.n1(ort)}%</div>
                <div class="tt-sub">${ozet.ilce_sayisi} ilçe ortalama değişimi</div>`;
      },
      renkFn: (ozet) => haritaRengiDegisim(ozet.ortalama),
      onIlClick: (il) => {
        u.katman = 'il';
        u.katman_deger = il;
        renderSekmeB(icerikEl.parentElement);
        const tabloHead = icerikEl.querySelector('#sekmeB-tablo-baslik');
        if (tabloHead) tabloHead.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      lejant: lejantB(),
    });
  }

  function lejantB() {
    return [
      { renk: haritaRengiDegisim(-30), etiket: '-%20 ve altı' },
      { renk: haritaRengiDegisim(-5),  etiket: '-%10 ile 0' },
      { renk: haritaRengiDegisim(5),   etiket: '0 ile +%10' },
      { renk: haritaRengiDegisim(15),  etiket: '+%10 ile +%20' },
      { renk: haritaRengiDegisim(30),  etiket: '+%20 üstü' },
      { renk: haritaRengiDegisim(60),  etiket: '+%40 üstü' },
    ];
  }

  function renderAciklamaB() {
    return `
      <div class="panel panel-muted">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Yüksek artış / büyük azalma ne anlama gelir?</div>
        <div style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          İlçeler arasında <strong>aynı seçim tipinde</strong> 5 yıllık dönemde kayıtlı seçmen değişimine bakıyoruz.
          Beklenen aralık <strong>%5-10 artış</strong>tır (doğum, 18 yaşına gelenler, sınırlı göç).
        </div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2); margin-top:var(--space-3);">
          <li><strong>+%20 üstü artış:</strong> Yeni yerleşim, kentleşme, taşıma kayıt veya açıklanması gereken bir hareket olabilir.</li>
          <li><strong>+%40 üstü artış:</strong> Çok ender doğal süreçle açıklanabilir. Sistemli sorgulamayı hak eder.</li>
          <li><strong>Negatif değişim:</strong> Ekonomik göç, deprem veya kentsel dönüşüm. Doğu Karadeniz ve İç Anadolu'da yaygın.</li>
          <li><strong>%10+ azalma:</strong> Yoğun göç. Genellikle kayıt taşınmamış olur — bu ilçenin nüfusunda gerçek azalma olduğunu işaret eder.</li>
        </ul>
        <p class="footnote" style="margin-top: var(--space-4);">
          BB ve BM seçimleri yalnızca belediye sınırı içini kapsadığından, küçük belde belediyelerinde
          yerel sınır değişiklikleri büyük yüzdesel değişim gösterebilir. Bu yapısal bir veri özelliğidir.
        </p>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME C — Tip tutarsızlığı
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeC(container) {
    const icerikEl = container.querySelector('#uyumsuzluk-icerik');
    const data = cache.data;
    const ciftler = data.tip_tutarsizligi?.ciftler || [];

    icerikEl.innerHTML = `
      <div class="panel panel-spaced">
        <p class="lede panel-lede">
          Aynı yılda yapılan farklı seçimlerde aynı ilçenin <strong>kayıtlı seçmen sayısı tutarlı mı?</strong>
          IGM (İl Genel Meclisi) ilçenin tüm seçmenlerini, BB (Belediye Başkanlığı) sadece belediye sınırı içindekileri kapsar.
          BB / IGM oranı <strong>belediye sınırı içindeki seçmen yüzdesi</strong>ni verir.
        </p>
        <p class="panel-note">
          <strong>Beklenen:</strong> Büyükşehirlerde %95-100 (tüm ilçe büyükşehir sınırı içinde),
          küçük ilçelerde %30-70 (köyler ve beldeler dışarıda).
          Çok düşük oran (%10 altı) şüpheli olabilir.
        </p>
      </div>

      <div class="panel panel-spaced-lg">
        <div class="panel-title">Filtre</div>
        <div id="sekmeC-filtre" class="uyumsuzluk-filtre"></div>
      </div>

      <div id="sekmeC-ozet"></div>

      <div class="section-head">
        <h2>Türkiye haritası — il bazlı belediye sınırı kapsamı</h2>
        <span class="eyebrow">Yüksek = ilçenin çoğu belediye içinde · Düşük = köylerde dağılmış</span>
      </div>
      <div class="panel" id="sekmeC-harita-panel" style="padding: var(--space-4); position: relative;">
        <div id="sekmeC-harita"></div>
        <div id="sekmeC-tooltip" class="uyumsuzluk-tooltip" style="display: none;"></div>
        <div class="uyumsuzluk-lejant" id="sekmeC-lejant"></div>
      </div>

      <div class="section-head">
        <h2 id="sekmeC-tablo-baslik">İlçe sıralaması</h2>
        <span class="eyebrow" id="sekmeC-tablo-meta"></span>
      </div>
      <div class="panel panel-flush">
        <div id="sekmeC-tablo"></div>
      </div>

      ${renderAciklamaC()}
    `;

    renderFiltreC(icerikEl, ciftler);
    renderTabloC(icerikEl);
    renderHaritaC(icerikEl);
  }

  function renderFiltreC(icerikEl, ciftler) {
    const fEl = icerikEl.querySelector('#sekmeC-filtre');
    const u = state.C;
    const geo = cache.geo;

    const ciftOpts = ciftler.map(c => {
      const cKey = `${c.kucuk}_vs_${c.buyuk}`;
      const lbl = `${secimAdi(c.kucuk)} / ${secimAdi(c.buyuk)}`;
      return `<option value="${cKey}" ${cKey === u.cift ? 'selected' : ''}>${lbl}</option>`;
    }).join('');

    const katmanOpts = [
      ['turkiye', 'Türkiye geneli'],
      ['nuts1',   'NUTS-1 bölge'],
      ['nuts2',   'NUTS-2 alt bölge'],
      ['il',      'İl'],
    ].map(([v, l]) => `<option value="${v}" ${v === u.katman ? 'selected' : ''}>${l}</option>`).join('');

    let katmanDegerOpts = '', katmanDegerVisible = false;
    if (u.katman === 'nuts1') {
      katmanDegerVisible = true;
      const opts = Object.entries(geo.nuts1).map(([k, info]) =>
        `<option value="${k}" ${k === u.katman_deger ? 'selected' : ''}>${k} · ${info.ad}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— bölge seçin —</option>${opts}`;
    } else if (u.katman === 'nuts2') {
      katmanDegerVisible = true;
      const opts = Object.entries(geo.nuts2).map(([k, info]) =>
        `<option value="${k}" ${k === u.katman_deger ? 'selected' : ''}>${k} · ${info.ad}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— alt bölge seçin —</option>${opts}`;
    } else if (u.katman === 'il') {
      katmanDegerVisible = true;
      const iller = Object.keys(geo.iller).sort((a, b) => a.localeCompare(b, 'tr'));
      const opts = iller.map(il =>
        `<option value="${il}" ${il === u.katman_deger ? 'selected' : ''}>${il}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— il seçin —</option>${opts}`;
    }

    fEl.innerHTML = `
      <div class="uyumsuzluk-filtre-row">
        <label class="uyumsuzluk-filtre-grup" style="min-width: 280px;">
          <span class="uyumsuzluk-filtre-lbl">Karşılaştırılan seçimler (BB / IGM)</span>
          <select id="C-cift" class="uyumsuzluk-select" style="min-width: 260px;">${ciftOpts}</select>
        </label>

        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Coğrafi katman</span>
          <select id="C-katman" class="uyumsuzluk-select">${katmanOpts}</select>
        </label>

        ${katmanDegerVisible ? `
          <label class="uyumsuzluk-filtre-grup">
            <span class="uyumsuzluk-filtre-lbl">Bölge / il</span>
            <select id="C-katman-deger" class="uyumsuzluk-select">${katmanDegerOpts}</select>
          </label>
        ` : ''}

        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Sıralama</span>
          <select id="C-siralama" class="uyumsuzluk-select">
            <option value="asc"  ${u.siralama === 'asc'  ? 'selected' : ''}>Düşük kapsamdan başla (köyler ağırlıklı)</option>
            <option value="desc" ${u.siralama === 'desc' ? 'selected' : ''}>Yüksek kapsamdan başla (belediye ağırlıklı)</option>
          </select>
        </label>
      </div>
    `;

    fEl.querySelector('#C-cift').addEventListener('change', e => {
      u.cift = e.target.value;
      renderTabloC(icerikEl);
      renderHaritaC(icerikEl);
    });
    fEl.querySelector('#C-katman').addEventListener('change', e => {
      u.katman = e.target.value;
      u.katman_deger = '';
      renderFiltreC(icerikEl, ciftler);
      renderTabloC(icerikEl);
      renderHaritaC(icerikEl);
    });
    const kdEl = fEl.querySelector('#C-katman-deger');
    if (kdEl) {
      kdEl.addEventListener('change', e => {
        u.katman_deger = e.target.value;
        renderTabloC(icerikEl);
        renderHaritaC(icerikEl);
      });
    }
    fEl.querySelector('#C-siralama').addEventListener('change', e => {
      u.siralama = e.target.value;
      renderTabloC(icerikEl);
    });
  }

  function renderTabloC(icerikEl) {
    const fmt = window.AT.fmt;
    const u = state.C;
    const data = cache.data;
    const geo = cache.geo;
    const tutarsizlik = data.tip_tutarsizligi?.ilceler || {};

    let ilceleriFiltre = () => true;
    if (u.katman === 'nuts1' && u.katman_deger) {
      const iller = new Set(geo.nuts1[u.katman_deger]?.iller || []);
      ilceleriFiltre = (geoKey) => iller.has(tutarsizlik[geoKey].il);
    } else if (u.katman === 'nuts2' && u.katman_deger) {
      const iller = new Set(geo.nuts2[u.katman_deger]?.iller || []);
      ilceleriFiltre = (geoKey) => iller.has(tutarsizlik[geoKey].il);
    } else if (u.katman === 'il' && u.katman_deger) {
      ilceleriFiltre = (geoKey) => tutarsizlik[geoKey].il === u.katman_deger;
    }

    const kayitlar = [];
    for (const [geoKey, ilce] of Object.entries(tutarsizlik)) {
      const cift = ilce.ciftler[u.cift];
      if (!cift || cift.kapsam_yuzde == null) continue;
      if (!ilceleriFiltre(geoKey)) continue;
      kayitlar.push({
        geoKey,
        il: ilce.il,
        ad: ilce.ad,
        buyuk: cift.buyuk_kayitli,
        kucuk: cift.kucuk_kayitli,
        fark: cift.fark,
        kapsam: cift.kapsam_yuzde,
      });
    }

    kayitlar.sort((a, b) => u.siralama === 'desc' ? b.kapsam - a.kapsam : a.kapsam - b.kapsam);

    renderOzetC(icerikEl, kayitlar);

    const baslik = icerikEl.querySelector('#sekmeC-tablo-baslik');
    const meta = icerikEl.querySelector('#sekmeC-tablo-meta');
    baslik.textContent = kayitlar.length ? 'İlçe sıralaması — Belediye sınırı kapsam oranı' : 'Veri bulunamadı';
    meta.textContent = kayitlar.length ? `${fmt.n(kayitlar.length)} ilçe gösteriliyor` : '';

    const tEl = icerikEl.querySelector('#sekmeC-tablo');
    if (!kayitlar.length) {
      tEl.innerHTML = renderBosTablo();
      return;
    }

    const goster = kayitlar.slice(0, state.sayfa_boyut);
    tEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left; width:36px;">#</th>
            <th style="text-align:left;">İlçe</th>
            <th style="text-align:right;">İlçe geneli (IGM)</th>
            <th style="text-align:right;">Belediye (BB)</th>
            <th style="text-align:right;">Belediye dışı</th>
            <th style="text-align:right;">Kapsam</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${goster.map((k, i) => {
            const sinif = kapsamSinifi(k.kapsam);
            const barW = Math.min(100, k.kapsam);
            return `
              <tr>
                <td><span class="uyumsuzluk-rank">${i + 1}</span></td>
                <td>
                  <div class="uyumsuzluk-loc">${escapeHtml(k.ad)}</div>
                  <div class="uyumsuzluk-loc-il">${escapeHtml(k.il)}</div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n(k.buyuk)}</td>
                <td class="num" style="text-align:right;">${fmt.n(k.kucuk)}</td>
                <td class="num" style="text-align:right; color: var(--ink-3);">${fmt.n(k.fark)}</td>
                <td class="num" style="text-align:right; color:${sinifRengi(sinif)}; font-weight:600;">
                  ${fmt.n1(k.kapsam)}%
                </td>
                <td class="uyumsuzluk-bar-cell">
                  <div class="uyumsuzluk-bar-track">
                    <div class="uyumsuzluk-bar-fill ${sinif}" style="width:${barW.toFixed(2)}%"></div>
                  </div>
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ${kayitlar.length > state.sayfa_boyut ? renderTabloAlt(kayitlar.length) : ''}
    `;
  }

  function renderOzetC(icerikEl, kayitlar) {
    const fmt = window.AT.fmt;
    const ozetEl = icerikEl.querySelector('#sekmeC-ozet');
    const tum = kayitlar.length;
    const kapsam95 = kayitlar.filter(k => k.kapsam >= 95).length;
    const kapsam70_95 = kayitlar.filter(k => k.kapsam >= 70 && k.kapsam < 95).length;
    const kapsam30_70 = kayitlar.filter(k => k.kapsam >= 30 && k.kapsam < 70).length;
    const kapsam10_30 = kayitlar.filter(k => k.kapsam >= 10 && k.kapsam < 30).length;
    const kapsam_alt10 = kayitlar.filter(k => k.kapsam < 10).length;
    const ortalama = tum > 0 ? kayitlar.reduce((s, k) => s + k.kapsam, 0) / tum : 0;
    const baslikText = state.C.katman === 'turkiye' ? 'Türkiye geneli' :
      state.C.katman_deger ? state.C.katman_deger : 'Tüm ilçeler';

    ozetEl.innerHTML = `
      <div class="uyumsuzluk-ozet-grid">
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">Kapsanan ilçe</div>
          <div class="ozet-val">${fmt.n(tum)}</div>
          <div class="ozet-sub">${baslikText}</div>
        </div>
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">Ortalama kapsam</div>
          <div class="ozet-val">${fmt.n1(ortalama)}%</div>
          <div class="ozet-sub">Belediye / ilçe geneli</div>
        </div>
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">≥%95 (büyükşehir)</div>
          <div class="ozet-val">${fmt.n(kapsam95)}</div>
          <div class="ozet-sub">Belediye = ilçe</div>
        </div>
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">%70-95</div>
          <div class="ozet-val">${fmt.n(kapsam70_95)}</div>
          <div class="ozet-sub">Az köy/belde</div>
        </div>
        <div class="uyumsuzluk-ozet-tile amber">
          <div class="ozet-lbl">%30-70</div>
          <div class="ozet-val">${fmt.n(kapsam30_70)}</div>
          <div class="ozet-sub">Yarı kırsal</div>
        </div>
        <div class="uyumsuzluk-ozet-tile kirmizi">
          <div class="ozet-lbl">%30 altı</div>
          <div class="ozet-val">${fmt.n(kapsam10_30 + kapsam_alt10)}</div>
          <div class="ozet-sub">Köy ağırlıklı</div>
        </div>
      </div>
    `;
  }

  function renderHaritaC(icerikEl) {
    const u = state.C;
    const data = cache.data;
    const tutarsizlik = data.tip_tutarsizligi?.ilceler || {};

    const il_ozet = {};
    for (const ilce of Object.values(tutarsizlik)) {
      const cift = ilce.ciftler[u.cift];
      if (!cift || cift.kapsam_yuzde == null) continue;
      if (!il_ozet[ilce.il]) il_ozet[ilce.il] = { kapsamlar: [] };
      il_ozet[ilce.il].kapsamlar.push(cift.kapsam_yuzde);
    }
    for (const il in il_ozet) {
      const o = il_ozet[il];
      o.ortalama = o.kapsamlar.reduce((s, v) => s + v, 0) / o.kapsamlar.length;
      o.ilce_sayisi = o.kapsamlar.length;
    }

    const secili_il = u.katman === 'il' ? u.katman_deger : null;

    cizHarita({
      icerikEl,
      haritaId: 'sekmeC-harita',
      tooltipId: 'sekmeC-tooltip',
      panelId: 'sekmeC-harita-panel',
      lejantId: 'sekmeC-lejant',
      il_data: il_ozet,
      secili_il,
      tooltipFn: (il, ozet) => {
        if (!ozet) return `<div class="tt-il">${escapeHtml(il)}</div><div class="tt-sub">Bu seçim çifti için veri yok</div>`;
        return `<div class="tt-il">${escapeHtml(il)}</div>
                <div class="tt-deger">${window.AT.fmt.n1(ozet.ortalama)}% kapsam</div>
                <div class="tt-sub">${ozet.ilce_sayisi} ilçe ortalama</div>`;
      },
      renkFn: (ozet) => haritaRengiKapsam(ozet.ortalama),
      onIlClick: (il) => {
        u.katman = 'il';
        u.katman_deger = il;
        renderSekmeC(icerikEl.parentElement);
        const tabloHead = icerikEl.querySelector('#sekmeC-tablo-baslik');
        if (tabloHead) tabloHead.scrollIntoView({ behavior: 'smooth', block: 'start' });
      },
      lejant: lejantC(),
    });
  }

  function lejantC() {
    return [
      { renk: haritaRengiKapsam(5),  etiket: '%10 altı (köyler)' },
      { renk: haritaRengiKapsam(20), etiket: '%10-30' },
      { renk: haritaRengiKapsam(50), etiket: '%30-70' },
      { renk: haritaRengiKapsam(80), etiket: '%70-95' },
      { renk: haritaRengiKapsam(98), etiket: '%95 üstü (büyükşehir)' },
    ];
  }

  function renderAciklamaC() {
    return `
      <div class="panel panel-muted">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Bu oran ne anlama gelir?</div>
        <div style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          BB seçiminde sadece <strong>belediye sınırı içinde yaşayan</strong> seçmenler oy kullanır.
          IGM seçiminde ise <strong>ilçenin tüm sakinleri</strong> (köyler ve beldeler dahil) oy kullanır.
          BB / IGM oranı, ilçenin ne kadar belediye sınırı içinde yaşadığını gösterir:
        </div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2); margin-top:var(--space-3);">
          <li><strong>%95+ kapsam:</strong> Büyükşehir merkez ilçeleri (Çankaya, Kadıköy gibi). Tüm ilçe büyükşehir sınırı içinde.</li>
          <li><strong>%70-95:</strong> Şehir merkezi olan ilçeler. Az sayıda köy var.</li>
          <li><strong>%30-70:</strong> Yarı kırsal ilçeler. Belediye ile köyler dengeli.</li>
          <li><strong>%30 altı:</strong> Çok küçük belediye + büyük köy alanı. Doğal bir yapısal özellik.</li>
        </ul>
        <p class="footnote" style="margin-top: var(--space-4);">
          Bu sekme bir uyumsuzluk değil, <strong>idari yapı haritası</strong>dır.
          BB seçiminin demografi karşılaştırması (Sekme A) için neden uygun olmadığını anlamak için faydalıdır.
        </p>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // ORTAK HARİTA ÇİZİMİ
  // ═══════════════════════════════════════════════════════════════
  function cizHarita({ icerikEl, haritaId, tooltipId, panelId, lejantId,
                       il_data, secili_il, tooltipFn, renkFn, onIlClick, lejant }) {
    const geojson = cache.geojson;
    const haritaEl = icerikEl.querySelector('#' + haritaId);
    const tooltipEl = icerikEl.querySelector('#' + tooltipId);
    const panelEl = icerikEl.querySelector('#' + panelId);
    const lejantEl = icerikEl.querySelector('#' + lejantId);

    if (!haritaEl) return;

    const bbox = computeBbox(geojson);
    const padding = 8;
    const W = 1000;
    const H = Math.round(W * (bbox.maxy - bbox.miny) / (bbox.maxx - bbox.minx) * 0.78);

    function project(lng, lat) {
      const x = ((lng - bbox.minx) / (bbox.maxx - bbox.minx)) * (W - 2*padding) + padding;
      const y = H - (((lat - bbox.miny) / (bbox.maxy - bbox.miny)) * (H - 2*padding) + padding);
      return [x, y];
    }

    function geometryToPath(geom) {
      let d = '';
      const polygons = geom.type === 'MultiPolygon' ? geom.coordinates :
                       geom.type === 'Polygon' ? [geom.coordinates] : [];
      for (const polygon of polygons) {
        for (const ring of polygon) {
          ring.forEach((coord, i) => {
            const [x, y] = project(coord[0], coord[1]);
            d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1);
          });
          d += 'Z';
        }
      }
      return d;
    }

    const paths = geojson.features.map(feat => {
      const il = feat.properties.geo_il_adi;
      const ozet = il_data[il];
      const veri_yok = !ozet;
      const renk = veri_yok ? 'var(--paper-3)' : renkFn(ozet);
      const klass = `uyumsuzluk-il-path ${veri_yok ? 'veri-yok' : ''} ${il === secili_il ? 'selected' : ''}`;
      const d = geometryToPath(feat.geometry);
      return `<path class="${klass}"
                    d="${d}"
                    fill="${renk}"
                    data-il="${escapeHtml(il)}"></path>`;
    }).join('');

    haritaEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;

    if (lejantEl) {
      lejantEl.innerHTML = lejant.map(item => `
        <span class="uyumsuzluk-lejant-item">
          <span class="uyumsuzluk-lejant-kutu" style="background:${item.renk}"></span>
          <span>${item.etiket}</span>
        </span>
      `).join('') + `
        <span class="uyumsuzluk-lejant-item" style="margin-left: var(--space-3);">
          <span class="uyumsuzluk-lejant-kutu" style="background:var(--paper-3); opacity:0.5;"></span>
          <span>Veri yok</span>
        </span>
      `;
    }

    haritaEl.querySelectorAll('.uyumsuzluk-il-path').forEach(p => {
      const il = p.dataset.il;
      const ozet = il_data[il];

      p.addEventListener('mousemove', (e) => {
        tooltipEl.innerHTML = tooltipFn(il, ozet);
        const rect = panelEl.getBoundingClientRect();
        const x = e.clientX - rect.left + 12;
        const y = e.clientY - rect.top + 12;
        tooltipEl.style.left = x + 'px';
        tooltipEl.style.top = y + 'px';
        tooltipEl.style.display = 'block';
      });
      p.addEventListener('mouseleave', () => {
        tooltipEl.style.display = 'none';
      });
      p.addEventListener('click', () => {
        if (!ozet) return;
        onIlClick(il);
      });
    });
  }

  function computeBbox(geojson) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    function visit(coords) {
      if (typeof coords[0] === 'number') {
        if (coords[0] < minx) minx = coords[0];
        if (coords[0] > maxx) maxx = coords[0];
        if (coords[1] < miny) miny = coords[1];
        if (coords[1] > maxy) maxy = coords[1];
      } else {
        for (const c of coords) visit(c);
      }
    }
    for (const f of geojson.features) visit(f.geometry.coordinates);
    return { minx, miny, maxx, maxy };
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME D — İstatistiksel göstergeler (tespit motoru)
  // ═══════════════════════════════════════════════════════════════
  async function renderSekmeD(container) {
    const icerikEl = container.querySelector('#uyumsuzluk-icerik');
    icerikEl.innerHTML = `<div class="loading">İstatistiksel göstergeler yükleniyor</div>`;

    try {
      await loadMetaIlceler();
    } catch (e) {
      icerikEl.innerHTML = renderHataEkrani(e);
      return;
    }

    const secimListesi = Object.keys(cache.metaIlceler.secimler || {}).sort().reverse();
    if (!secimListesi.includes(state.D.secim) && secimListesi.length) {
      state.D.secim = secimListesi[0];
    }

    icerikEl.innerHTML = `
      <div class="panel panel-spaced">
        <p class="lede panel-lede">
          İlçe bazında <strong>katılım oranı</strong>, <strong>geçersiz oy payı</strong> ve
          <strong>seçmen–nüfus büyüme farkı</strong> için IQR×1.5 dışı değerler işaretlenir.
          Her gösterge tek başına bir sonuç kanıtlamaz; alternatif açıklamalar (göç, kampanya,
          demografik kayma) her zaman mümkündür.
        </p>
        <p class="panel-note">
          <strong>Not:</strong> Sandık düzeyinde oy dağılımı (Benford analizi) için arşivde
          sandık bazlı oy verisi bulunmuyor; bu sekme ilçe özet metrikleriyle sınırlıdır.
        </p>
      </div>

      <div class="panel panel-spaced-lg">
        <div class="panel-title">
          Filtre
          <span class="panel-meta">${secimListesi.length} seçim · IQR tabanlı göstergeler</span>
        </div>
        <div id="sekmeD-filtre" class="uyumsuzluk-filtre"></div>
      </div>

      <div id="sekmeD-ozet"></div>

      <div class="section-head">
        <h2 id="sekmeD-tablo-baslik">İlçe göstergeleri</h2>
        <span class="eyebrow" id="sekmeD-tablo-meta"></span>
      </div>
      <div class="panel panel-flush">
        <div id="sekmeD-tablo"></div>
      </div>

      ${renderAciklamaD()}
    `;

    renderFiltreD(icerikEl, secimListesi);
    renderTabloD(icerikEl);
  }

  function renderFiltreD(icerikEl, secimListesi) {
    const fEl = icerikEl.querySelector('#sekmeD-filtre');
    const u = state.D;

    const secimOpts = secimListesi.map(k =>
      `<option value="${k}" ${k === u.secim ? 'selected' : ''}>${secimAdi(k)}</option>`
    ).join('');

    fEl.innerHTML = `
      <div class="uyumsuzluk-filtre-row">
        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Seçim</span>
          <select id="D-secim" class="uyumsuzluk-select">${secimOpts}</select>
        </label>
        <label class="uyumsuzluk-filtre-grup">
          <span class="uyumsuzluk-filtre-lbl">Sıralama</span>
          <select id="D-siralama" class="uyumsuzluk-select">
            <option value="desc" ${u.siralama === 'desc' ? 'selected' : ''}>Gösterge sayısı (yüksek)</option>
            <option value="asc"  ${u.siralama === 'asc'  ? 'selected' : ''}>Gösterge sayısı (düşük)</option>
          </select>
        </label>
        <label class="uyumsuzluk-filtre-grup" style="min-width: 220px;">
          <span class="uyumsuzluk-filtre-lbl">İlçe ara</span>
          <input id="D-arama" type="search" class="uyumsuzluk-select" placeholder="İl veya ilçe adı…" value="${escapeHtml(u.arama || '')}">
        </label>
      </div>
    `;

    fEl.querySelector('#D-secim').addEventListener('change', e => {
      u.secim = e.target.value;
      renderTabloD(icerikEl);
    });
    fEl.querySelector('#D-siralama').addEventListener('change', e => {
      u.siralama = e.target.value;
      renderTabloD(icerikEl);
    });
    fEl.querySelector('#D-arama').addEventListener('input', e => {
      u.arama = e.target.value;
      renderTabloD(icerikEl);
    });
  }

  function renderTabloD(icerikEl) {
    const fmt = window.AT.fmt;
    const u = state.D;
    const kayitlar = hesaplaMotorKayitlari(u.secim);

    let filtreli = kayitlar;
    if (u.arama && u.arama.trim()) {
      const q = aramaNormalize(u.arama.trim());
      filtreli = kayitlar.filter(k =>
        aramaNormalize(k.il).includes(q) || aramaNormalize(k.ad).includes(q)
      );
    }

    filtreli.sort((a, b) => u.siralama === 'desc'
      ? b.gosterge_sayisi - a.gosterge_sayisi || b.katilim - a.katilim
      : a.gosterge_sayisi - b.gosterge_sayisi || a.katilim - b.katilim);

    renderOzetD(icerikEl, kayitlar, filtreli);

    const baslik = icerikEl.querySelector('#sekmeD-tablo-baslik');
    const meta = icerikEl.querySelector('#sekmeD-tablo-meta');
    baslik.textContent = filtreli.length
      ? `İlçe göstergeleri — ${secimAdi(u.secim)}`
      : 'Filtreyle eşleşen ilçe bulunamadı';
    meta.textContent = filtreli.length ? `${fmt.n(filtreli.length)} ilçe` : '';

    const tEl = icerikEl.querySelector('#sekmeD-tablo');
    if (!filtreli.length) {
      tEl.innerHTML = renderBosTablo();
      return;
    }

    const goster = filtreli.slice(0, state.sayfa_boyut);
    tEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left; width:36px;">#</th>
            <th style="text-align:left;">İlçe</th>
            <th style="text-align:right;">Katılım</th>
            <th style="text-align:right;">Geçersiz oy</th>
            <th style="text-align:right;">Büyüme farkı</th>
            <th style="text-align:right;">Gösterge</th>
            <th style="text-align:left;">Alternatif açıklamalar</th>
          </tr>
        </thead>
        <tbody>
          ${goster.map((k, i) => `
            <tr>
              <td><span class="uyumsuzluk-rank">${i + 1}</span></td>
              <td>
                <div class="uyumsuzluk-loc">${escapeHtml(k.ad)}</div>
                <div class="uyumsuzluk-loc-il">${escapeHtml(k.il)}</div>
              </td>
              <td class="num" style="text-align:right; color:${k.katilim_outlier ? 'var(--signal-red)' : 'inherit'};">
                ${fmt.n1(k.katilim)}%${k.katilim_outlier ? ' ⚑' : ''}
              </td>
              <td class="num" style="text-align:right; color:${k.gecersiz_outlier ? 'var(--signal-red)' : 'inherit'};">
                ${fmt.n2(k.gecersiz_oran)}%${k.gecersiz_outlier ? ' ⚑' : ''}
              </td>
              <td class="num" style="text-align:right; color:${k.buyume_outlier ? 'var(--signal-amber)' : 'inherit'};">
                ${k.buyume_farki == null ? '—' : fmt.n1(k.buyume_farki) + ' puan'}${k.buyume_outlier ? ' ⚑' : ''}
              </td>
              <td class="num" style="text-align:right; font-weight:600;">${k.gosterge_sayisi}/3</td>
              <td style="font-size:12px; color:var(--ink-3); max-width:240px;">${escapeHtml(k.alternatifler.join(' · '))}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      ${filtreli.length > state.sayfa_boyut ? renderTabloAlt(filtreli.length) : ''}
    `;
  }

  function renderOzetD(icerikEl, tum, filtreli) {
    const fmt = window.AT.fmt;
    const ozetEl = icerikEl.querySelector('#sekmeD-ozet');
    const enAzBir = tum.filter(k => k.gosterge_sayisi > 0).length;
    const ucUzeri = tum.filter(k => k.gosterge_sayisi >= 2).length;

    ozetEl.innerHTML = `
      <div class="uyumsuzluk-ozet-grid">
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">Kapsanan ilçe</div>
          <div class="ozet-val">${fmt.n(tum.length)}</div>
          <div class="ozet-sub">${secimAdi(state.D.secim)}</div>
        </div>
        <div class="uyumsuzluk-ozet-tile amber">
          <div class="ozet-lbl">En az 1 gösterge</div>
          <div class="ozet-val">${fmt.n(enAzBir)}</div>
          <div class="ozet-sub">IQR dışı değer</div>
        </div>
        <div class="uyumsuzluk-ozet-tile kirmizi">
          <div class="ozet-lbl">2+ gösterge</div>
          <div class="ozet-val">${fmt.n(ucUzeri)}</div>
          <div class="ozet-sub">Çoklu uyumsuzluk</div>
        </div>
        <div class="uyumsuzluk-ozet-tile">
          <div class="ozet-lbl">Listelenen</div>
          <div class="ozet-val">${fmt.n(filtreli.length)}</div>
          <div class="ozet-sub">Filtre sonrası</div>
        </div>
      </div>
    `;
  }

  function renderAciklamaD() {
    return `
      <div class="panel panel-muted">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Metrikler nasıl hesaplanır?</div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          <li><strong>Katılım sıçraması:</strong> İlçenin katılım oranı, aynı seçimdeki tüm ilçelerin IQR×1.5 aralığının dışındaysa işaretlenir (olağandışı yüksek/düşük katılım).</li>
          <li><strong>Geçersiz oy oranı:</strong> Geçersiz oy / oy kullanan oranı benzer şekilde IQR dışındaysa işaretlenir.</li>
          <li><strong>Büyüme farkı:</strong> Önceki eşdeğer seçime göre kayıtlı seçmen artış yüzdesi ile 18+ nüfus artış yüzdesi arasındaki fark (puan). Büyük fark göç, kayıt güncellemesi veya ADNKS gecikmesiyle açıklanabilir.</li>
          <li><strong>Benford yasası:</strong> Sandık bazında ilk basamak dağılımı için sandık düzeyinde oy verisi gerekir; bu sürümde yalnızca ilçe özetleri kullanılır.</li>
        </ul>
      </div>
    `;
  }

  function hesaplaMotorKayitlari(secim) {
    const metaSecim = cache.metaIlceler?.secimler?.[secim];
    if (!metaSecim) return [];

    const ciftKey = secimdenCiftKey(secim);
    const ham = [];

    for (const [geoKey, row] of Object.entries(metaSecim.ilceler)) {
      const slash = geoKey.indexOf('/');
      const il = slash >= 0 ? geoKey.slice(0, slash) : row.il || '';
      const ad = slash >= 0 ? geoKey.slice(slash + 1) : row.ad || geoKey;
      const katilim = row.katilim_orani || 0;
      const gecersizOran = row.oy_kullanan_secmen > 0
        ? (row.gecersiz_oy / row.oy_kullanan_secmen) * 100 : 0;

      let buyumeFarki = null;
      const ilceDem = cache.data?.ilceler?.[geoKey];
      const zIlce = cache.data?.zamansal_degisim?.ilceler?.[geoKey];
      if (ciftKey && ilceDem && zIlce?.ciftler?.[ciftKey]) {
        const cift = zIlce.ciftler[ciftKey];
        const onceki = ilceDem.secimler?.[cift.onceki_secim];
        const sonraki = ilceDem.secimler?.[cift.sonraki_secim];
        if (onceki?.n18plus > 0 && sonraki?.n18plus > 0) {
          const nufusBuyume = ((sonraki.n18plus - onceki.n18plus) / onceki.n18plus) * 100;
          buyumeFarki = cift.fark_yuzde - nufusBuyume;
        }
      }

      ham.push({ geoKey, il, ad, katilim, gecersiz_oran: gecersizOran, buyume_farki: buyumeFarki });
    }

    const katilimOut = iqrOutlierSet(ham.map(h => h.katilim));
    const gecersizOut = iqrOutlierSet(ham.map(h => h.gecersiz_oran));
    const buyumeVals = ham.map(h => h.buyume_farki).filter(v => v != null);
    const buyumeOut = buyumeVals.length ? iqrOutlierSet(buyumeVals) : new Set();

    return ham.map(h => {
      const katilim_outlier = katilimOut.has(h.katilim);
      const gecersiz_outlier = gecersizOut.has(h.gecersiz_oran);
      const buyume_outlier = h.buyume_farki != null && buyumeOut.has(h.buyume_farki);
      const alternatifler = [];
      if (katilim_outlier) alternatifler.push('kampanya yoğunluğu', 'hava/ulaşım', 'bölgesel katılım geleneği');
      if (gecersiz_outlier) alternatifler.push('parti sayısı', 'seçmen eğitimi', 'baskılı oy kullanımı');
      if (buyume_outlier) alternatifler.push('iç göç', 'ADNKS gecikmesi', 'kayıt güncellemesi');
      if (!alternatifler.length) alternatifler.push('—');

      const gosterge_sayisi = (katilim_outlier ? 1 : 0) + (gecersiz_outlier ? 1 : 0) + (buyume_outlier ? 1 : 0);

      return {
        ...h,
        katilim_outlier,
        gecersiz_outlier,
        buyume_outlier,
        gosterge_sayisi,
        alternatifler,
      };
    });
  }

  function secimdenCiftKey(secim) {
    const map = {
      '2023_CB1': '2018_CB_to_2023_CB1',
      '2023_CB2': '2023_CB1_to_2023_CB2',
      '2023_MV': '2018_MV_to_2023_MV',
      '2024_BBB': '2019_BBB_to_2024_BBB',
      '2024_BB': '2019_BB_to_2024_BB',
      '2024_IGM': '2019_IGM_to_2024_IGM',
      '2024_BM': '2019_BM_to_2024_BM',
    };
    return map[secim] || null;
  }

  function iqrOutlierSet(values) {
    const nums = values.filter(v => Number.isFinite(v)).sort((a, b) => a - b);
    if (nums.length < 4) return new Set();
    const q1 = yuzdelik(nums, 0.25);
    const q3 = yuzdelik(nums, 0.75);
    const iqr = q3 - q1;
    const low = q1 - 1.5 * iqr;
    const high = q3 + 1.5 * iqr;
    const out = new Set();
    for (const v of nums) {
      if (v < low || v > high) out.add(v);
    }
    return out;
  }

  function yuzdelik(sorted, p) {
    const pos = (sorted.length - 1) * p;
    const base = Math.floor(pos);
    const rest = pos - base;
    if (sorted[base + 1] !== undefined) {
      return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
    }
    return sorted[base];
  }

  function aramaNormalize(s) {
    return String(s).toLocaleLowerCase('tr')
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
  }

  // ═══════════════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════
  function oranSinifi(oran) {
    if (oran > 105) return 'uyumsuz';
    if (oran > 100) return 'dikkat';
    if (oran < 70)  return 'dusuk';
    return 'uyum';
  }

  function degisimSinifi(yuzde) {
    if (yuzde > 40)  return 'uyumsuz';
    if (yuzde > 20)  return 'dikkat';
    if (yuzde < -10) return 'dusuk';
    return 'uyum';
  }

  function kapsamSinifi(kapsam) {
    if (kapsam < 10) return 'dusuk';   // mavi
    if (kapsam < 30) return 'dikkat';  // amber
    if (kapsam > 95) return 'uyum';    // yeşil
    return 'uyum';
  }

  function sinifRengi(sinif) {
    return {
      'uyumsuz': 'var(--signal-red)',
      'dikkat':  'var(--signal-amber)',
      'uyum':    'var(--signal-green)',
      'dusuk':   'var(--signal-blue)',
    }[sinif] || 'var(--ink)';
  }

  function haritaRengiOran(oran) {
    if (oran < 70)   return '#1f4d6e';
    if (oran < 90)   return '#5a8094';
    if (oran < 95)   return '#9eb39b';
    if (oran < 100)  return '#c8c089';
    if (oran < 102)  return '#dca858';
    if (oran < 105)  return '#c8861a';
    if (oran < 110)  return '#b8311a';
    return '#7a1f10';
  }

  function haritaRengiDegisim(yuzde) {
    if (yuzde < -20) return '#1f4d6e';   // koyu mavi (büyük azalma)
    if (yuzde < -10) return '#5a8094';   // mavi-gri
    if (yuzde < 0)   return '#9eb39b';   // soluk yeşil
    if (yuzde < 10)  return '#c8c089';   // bej (normal aralık)
    if (yuzde < 20)  return '#dca858';   // açık amber
    if (yuzde < 40)  return '#c8861a';   // amber (artış)
    return '#b8311a';                     // kırmızı (büyük artış)
  }

  function haritaRengiKapsam(kapsam) {
    // Düşük = mavi, yüksek = yeşil
    if (kapsam < 10)  return '#1f4d6e';
    if (kapsam < 30)  return '#5a8094';
    if (kapsam < 50)  return '#9eb39b';
    if (kapsam < 70)  return '#c8c089';
    if (kapsam < 95)  return '#7ba383';
    return '#2d6b3f';  // koyu yeşil (tam kapsam)
  }

  function secimAdi(key) {
    const [yil, tip] = key.split('_');
    const tipMap = {
      'CB':  'Cumhurbaşkanlığı',
      'CB1': 'Cumhurbaşkanlığı 1. tur',
      'CB2': 'Cumhurbaşkanlığı 2. tur',
      'MV':  'Milletvekili',
      'BBB': 'Büyükşehir BB',
      'BB':  'Belediye Bşk.',
      'IGM': 'İl Genel Meclisi',
      'BM':  'Belediye Meclisi',
      'AY':  'Anayasa halk oylaması',
    };
    return `${yil} · ${tipMap[tip] || tip}`;
  }

  function ciftAdiB(ciftKey) {
    // 2019_BBB_to_2024_BBB → "2019 → 2024 BBB"
    const parts = ciftKey.split('_to_');
    if (parts.length !== 2) return ciftKey;
    return `${secimAdi(parts[0])} → ${secimAdi(parts[1])}`;
  }

  function renderBosTablo() {
    return `
      <div style="padding: var(--space-7); text-align: center; color: var(--ink-3); font-style: italic; font-family: var(--font-display);">
        Bu kombinasyonla eşleşen ilçe bulunamadı.<br/>
        Eşik veya katman seçimini değiştirmeyi deneyin.
      </div>
    `;
  }

  function renderTabloAlt(toplam) {
    return `
      <div style="padding: var(--space-3) var(--space-5); font-size: 12px; color: var(--ink-3); border-top: 1px solid var(--line-soft);">
        İlk ${state.sayfa_boyut} satır gösteriliyor. Toplam: ${window.AT.fmt.n(toplam)} ilçe.
      </div>
    `;
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ═══════════════════════════════════════════════════════════════
  // STİLLER
  // ═══════════════════════════════════════════════════════════════
  function renderStiller() {
    return `
      <style>
        .uyumsuzluk-sekmeler {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-3);
          margin-bottom: var(--space-6);
        }
        @media (max-width: 960px) {
          .uyumsuzluk-sekmeler {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 640px) {
          .uyumsuzluk-sekmeler {
            grid-template-columns: 1fr;
          }
        }
        .uyumsuzluk-sekme {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: var(--space-4) var(--space-5);
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          cursor: pointer;
          text-align: left;
          transition: border-color 120ms ease, transform 120ms ease;
          font-family: inherit;
        }
        .uyumsuzluk-sekme:hover {
          border-color: var(--brand-gold);
          transform: translateY(-1px);
        }
        .uyumsuzluk-sekme.active {
          border-color: var(--brand-gold);
          border-width: 2px;
          padding: calc(var(--space-4) - 1px) calc(var(--space-5) - 1px);
          background: var(--paper-2);
        }
        .uyumsuzluk-sekme .sekme-num {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 500;
          color: var(--brand-gold);
          line-height: 1;
        }
        .uyumsuzluk-sekme .sekme-baslik {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
          margin-top: var(--space-2);
        }
        .uyumsuzluk-sekme .sekme-sub {
          font-size: 12px;
          color: var(--ink-3);
          margin-top: 2px;
        }

        .uyumsuzluk-filtre-row {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-4);
          align-items: flex-end;
        }
        .uyumsuzluk-filtre-grup {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          min-width: 160px;
        }
        .uyumsuzluk-filtre-lbl {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .uyumsuzluk-select {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--ink);
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-3);
          cursor: pointer;
          min-width: 180px;
        }
        .uyumsuzluk-select:focus {
          outline: 2px solid var(--brand-gold);
          outline-offset: -1px;
        }

        .uyumsuzluk-ozet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: var(--space-3);
          margin-bottom: var(--space-5);
        }
        .uyumsuzluk-ozet-tile {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-3) var(--space-4);
        }
        .uyumsuzluk-ozet-tile .ozet-lbl {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .uyumsuzluk-ozet-tile .ozet-val {
          font-family: var(--font-mono);
          font-size: 20px;
          font-weight: 600;
          color: var(--ink);
          margin-top: 2px;
        }
        .uyumsuzluk-ozet-tile .ozet-sub {
          font-size: 11.5px;
          color: var(--ink-3);
          margin-top: 2px;
        }
        .uyumsuzluk-ozet-tile.kirmizi .ozet-val { color: var(--signal-red); }
        .uyumsuzluk-ozet-tile.amber  .ozet-val { color: var(--signal-amber); }
        .uyumsuzluk-ozet-tile.mavi   .ozet-val { color: var(--signal-blue); }

        .uyumsuzluk-bar-cell { width: 140px; padding-left: var(--space-3); position: relative; }
        .uyumsuzluk-bar-track {
          position: relative;
          background: var(--paper-2);
          height: 8px;
          border-radius: 4px;
          overflow: hidden;
        }
        .uyumsuzluk-bar-fill {
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          background: var(--brand-gold);
        }
        .uyumsuzluk-bar-fill.uyum { background: var(--signal-green); }
        .uyumsuzluk-bar-fill.dikkat { background: var(--signal-amber); }
        .uyumsuzluk-bar-fill.uyumsuz { background: var(--signal-red); }
        .uyumsuzluk-bar-fill.dusuk { background: var(--signal-blue); }
        .uyumsuzluk-100-line {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 1px;
          background: var(--ink-3);
          opacity: 0.5;
        }
        .uyumsuzluk-rank {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--ink-4);
          width: 36px;
        }
        .uyumsuzluk-loc {
          font-weight: 500;
          color: var(--ink);
        }
        .uyumsuzluk-loc-il {
          font-size: 11.5px;
          color: var(--ink-3);
          font-weight: 400;
        }

        /* Harita */
        [id$="-harita-panel"] { position: relative; }
        [id$="-harita"] {
          width: 100%;
          aspect-ratio: 16 / 7;
          max-height: 560px;
          overflow: hidden;
        }
        [id$="-harita"] svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .uyumsuzluk-il-path {
          stroke: #fdfaf2;
          stroke-width: 0.5;
          cursor: pointer;
          transition: stroke-width 80ms ease, opacity 80ms ease;
        }
        .uyumsuzluk-il-path:hover {
          stroke: var(--ink);
          stroke-width: 1.5;
        }
        .uyumsuzluk-il-path.selected {
          stroke: var(--ink);
          stroke-width: 2;
        }
        .uyumsuzluk-il-path.veri-yok {
          fill: var(--paper-3);
          opacity: 0.5;
          cursor: default;
        }
        .uyumsuzluk-tooltip {
          position: absolute;
          pointer-events: none;
          background: var(--ink);
          color: var(--paper);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          font-size: 12px;
          line-height: 1.45;
          z-index: 100;
          box-shadow: var(--shadow);
          max-width: 240px;
        }
        .uyumsuzluk-tooltip .tt-il {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
        }
        .uyumsuzluk-tooltip .tt-deger {
          font-family: var(--font-mono);
          font-weight: 600;
        }
        .uyumsuzluk-tooltip .tt-sub {
          font-size: 11px;
          color: var(--paper-3);
          margin-top: 2px;
        }
        .uyumsuzluk-lejant {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
          font-size: 11.5px;
          color: var(--ink-3);
          align-items: center;
        }
        .uyumsuzluk-lejant-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .uyumsuzluk-lejant-kutu {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.15);
        }
      </style>
    `;
  }
})();
