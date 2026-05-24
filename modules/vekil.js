/* ─────────────────────────────────────────────────────────
   Vekil başına seçmen modülü v1 (08)
   
   "Bir vekil kaç seçmeni temsil ediyor?" sorusuna veri tabanlı yanıt.
   
   - 2018 ve 2024 YSK kararlarındaki vekil dağılımı (resmi PDF)
   - Bizim meta_iller.json'dan: kayıtlı seçmen, kullanılan oy
   - 2 mod: Seçmen/vekil ve TÜİK nüfus/vekil
   
   Tarafsızlık:
   - "Adaletsiz" / "eşitsiz" yargılı kelimeler YOK
   - "Anayasal yapıyı veri ile gösterir" çerçevesi
   - Kanun ve hesaplama açıklaması altta
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  const cache = {
    vekil: null,
    meta_iller: null,
    tr_demografi: null,
    geo: null,
    geojson: null,
  };

  const state = {
    secim: '2024_guncel',         // '2018_MV' | '2024_guncel'
    mod: 'secmen',                // 'secmen' (kayıtlı seçmen) | 'nufus' (TÜİK 18+ nüfus)
    sirala: 'desc',               // 'asc' | 'desc'  (Seçmen/vekil oranına göre)
  };

  // ═══════════════════════════════════════════════════════════════
  // VERİ YÜKLEME
  // ═══════════════════════════════════════════════════════════════
  async function loadCoreData() {
    if (cache.vekil && cache.meta_iller) return;

    const [vekil, mIller, trDemografi, geo, geojson] = await Promise.all([
      fetch('data/aggregates/vekil_dagilim.json').then(r => r.ok ? r.json() : Promise.reject('vekil_dagilim.json: ' + r.status)),
      fetch('data/aggregates/meta_iller.json').then(r => r.ok ? r.json() : Promise.reject('meta_iller.json: ' + r.status)),
      fetch('data/aggregates/tr_demografi_ozet.json').then(r => r.ok ? r.json() : Promise.reject('tr_demografi_ozet.json: ' + r.status)),
      fetch('data/core/geo.json').then(r => r.ok ? r.json() : Promise.reject('geo.json: ' + r.status)),
      fetch('data/core/turkiye_iller.geojson').then(r => r.ok ? r.json() : Promise.reject('turkiye_iller.geojson: ' + r.status)),
    ]);

    cache.vekil = vekil;
    cache.meta_iller = mIller;
    cache.tr_demografi = trDemografi;
    cache.geo = geo;
    cache.geojson = geojson;
  }

  // ═══════════════════════════════════════════════════════════════
  // YARDIMCILAR — Veri kompozisyonu
  // ═══════════════════════════════════════════════════════════════

  /**
   * Bir seçim için il bazlı veri tablosu döner.
   * Her satır: { il, vekil, secmen, nufus, secmenPerVekil, nufusPerVekil, secmenOran, nufusOran }
   * Oran: Türkiye ortalamasına göre kat (1.0 = ortalama)
   */
  function getTablo(secim) {
    const vekiller = cache.vekil.secimler[secim]?.iller || {};
    
    // Hangi seçimden seçmen verisi alacağız?
    // 2018_MV -> 2018_MV meta verisi
    // 2024_guncel -> son MV seçimi: 2018_MV (çünkü 2023 hâlâ MV değil bizde)
    // Aslında biz "kayıtlı seçmen" trendini kullanırız. En güncel olanını alalım.
    let secmenSecim;
    if (secim === '2018_MV') {
      secmenSecim = '2018_MV';
    } else {
      // 2024 için en güncel seçim - 2024_BBB'de en taze kayıtlı seçmen var
      secmenSecim = '2024_BB';
      if (!cache.meta_iller.secimler[secmenSecim]) {
        secmenSecim = '2024_BBB';
      }
      if (!cache.meta_iller.secimler[secmenSecim]) {
        secmenSecim = '2023_CB1';
      }
    }
    
    const metaSecim = cache.meta_iller.secimler[secmenSecim];
    const metaIller = metaSecim?.iller || {};

    // Demografi yılı: 2018_MV için 2018, 2024_guncel için 2024
    const demografiYili = secim === '2018_MV' ? 2018 : 2024;
    const trDemografiIller = cache.tr_demografi?.iller || {};

    const satirlar = [];
    let toplamSecmen = 0;
    let toplamNufus = 0;
    let toplamVekil = 0;

    for (const [il, vekil] of Object.entries(vekiller)) {
      const meta = metaIller[il];
      const secmen = meta?.kayitli_secmen || 0;
      const oyKullanan = meta?.oy_kullanan_secmen || 0;
      const katilim = secmen > 0 ? (oyKullanan / secmen) * 100 : 0;

      // 18+ nüfus (TÜİK demografi)
      const demografi = trDemografiIller[il]?.yillar?.[demografiYili];
      const nufus18 = demografi?.toplam_18plus || 0;

      const secmenPerVekil = vekil > 0 ? secmen / vekil : 0;
      const nufusPerVekil = vekil > 0 ? nufus18 / vekil : 0;

      satirlar.push({
        il,
        vekil,
        secmen,
        oyKullanan,
        katilim,
        nufus18,
        secmenPerVekil,
        nufusPerVekil,
      });

      toplamSecmen += secmen;
      toplamNufus += nufus18;
      toplamVekil += vekil;
    }

    // Ortalamalar
    const ortSecmenPerVekil = toplamVekil > 0 ? toplamSecmen / toplamVekil : 0;
    const ortNufusPerVekil = toplamVekil > 0 ? toplamNufus / toplamVekil : 0;

    // Her satıra Türkiye ortalamasına göre oranı ekle
    for (const s of satirlar) {
      s.secmenOran = ortSecmenPerVekil > 0 ? s.secmenPerVekil / ortSecmenPerVekil : 1;
      s.nufusOran = ortNufusPerVekil > 0 ? s.nufusPerVekil / ortNufusPerVekil : 1;
    }

    return {
      satirlar,
      ortSecmenPerVekil,
      ortNufusPerVekil,
      toplamSecmen,
      toplamNufus,
      toplamVekil,
      secmenSecim,  // Hangi seçimden seçmen verisi
      demografiYili,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ANA RENDER
  // ═══════════════════════════════════════════════════════════════
  window.Modules.vekil = async function(container, ctx) {
    container.innerHTML = `<div class="loading">Vekil verisi yükleniyor</div>`;

    try {
      await loadCoreData();
    } catch (e) {
      container.innerHTML = renderHataEkrani(e);
      return;
    }

    renderModule(container);
  };

  function renderHataEkrani(e) {
    return `
      <header class="page-header">
        <span class="eyebrow">Modül · 08</span>
        <h1>Vekil başına seçmen</h1>
        <p class="lede">Veri yüklenemedi: ${e}</p>
      </header>
      <div class="panel">
        <p style="color:var(--ink-2);">
          Bu modül için <span class="mono">vekil_dagilim.json</span>, <span class="mono">meta_iller.json</span>,
          <span class="mono">tr_demografi_ozet.json</span>, <span class="mono">geo.json</span>,
          <span class="mono">turkiye_iller.geojson</span> dosyaları gerekli.
        </p>
        <p style="margin-top: var(--space-3);">
          <span class="mono">vekil_dagilim.json</span> dosyasını <span class="mono">data/aggregates/</span> klasörüne kopyalayın.
        </p>
      </div>
    `;
  }

  function renderModule(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Modül · 08 · Anayasal yapı · veri ile</span>
        <h1>Vekil başına seçmen</h1>
        <p class="lede">
          Bir milletvekili kaç seçmeni temsil ediyor? Türkiye'de bu sayı il bazında <strong>2'den fazla katlık</strong>
          fark gösterir. Bu fark <strong>kanun gereği</strong>dir — her ile en az 1 vekil garantilenir.
        </p>
      </header>

      <div class="vekil-aciklama-kalici">
        <strong>ℹ️ Yargı yok, veri var.</strong> Bu modül anayasal yapının sonuçlarını <strong>betimler</strong>.
        "Adaletli mi?", "değişmeli mi?" sorularına cevap <strong>vermez</strong>. Mevcut sistemin (2839 sayılı kanun)
        küçük illerin temsiline garantili yer sağladığı, büyük illerde ise vekil başına seçmen sayısının arttığı
        bir <strong>tasarım</strong>dır. Yorum okuyucuya bırakılır.
        <div style="margin-top: var(--space-2); padding-top: var(--space-2); border-top: 1px dashed var(--line); font-size: 12px; color: var(--ink-3); line-height: 1.6;">
          <strong>Veri kaynağı:</strong> Vekil sayıları YSK Resmi Gazete kararlarından — 24 Haziran 2018 ve 27 Haziran 2024
          kararı (No. 2024/2712). 14 Mayıs 2023 seçiminde kullanılan ayrı YSK kararı (2023/71) bu modülde yer almaz;
          2024 kararı eldeki en güncel YSK dağıtımıdır.
        </div>
      </div>

      <div class="panel" style="margin-bottom: var(--space-5);">
        <div class="panel-title">Filtreler</div>
        <div class="vekil-filtre">
          <label class="vekil-filtre-grup">
            <span class="vekil-filtre-lbl">YSK Kararı</span>
            <select id="vekil-secim" class="vekil-select">
              <option value="2018_MV" ${state.secim === '2018_MV' ? 'selected' : ''}>2018 — 24 Haziran 2018 seçimi</option>
              <option value="2024_guncel" ${state.secim === '2024_guncel' ? 'selected' : ''}>2024 — YSK güncel kararı</option>
            </select>
          </label>
          <label class="vekil-filtre-grup">
            <span class="vekil-filtre-lbl">Hesaplama temeli</span>
            <select id="vekil-mod" class="vekil-select">
              <option value="secmen" ${state.mod === 'secmen' ? 'selected' : ''}>Kayıtlı seçmen (oy verebilen)</option>
              <option value="nufus" ${state.mod === 'nufus' ? 'selected' : ''}>TÜİK 18+ nüfus (yetişkin)</option>
            </select>
          </label>
        </div>
      </div>

      <div id="vekil-icerik"></div>

      ${renderStiller()}
    `;

    container.querySelector('#vekil-secim').addEventListener('change', (e) => {
      state.secim = e.target.value;
      renderIcerik(container);
    });
    container.querySelector('#vekil-mod').addEventListener('change', (e) => {
      state.mod = e.target.value;
      renderIcerik(container);
    });

    renderIcerik(container);
  }

  function renderIcerik(container) {
    const el = container.querySelector('#vekil-icerik');
    const tablo = getTablo(state.secim);

    el.innerHTML = `
      <div id="vekil-ozet"></div>

      <div class="section-head">
        <h2>Türkiye haritası</h2>
        <span class="eyebrow">Vekil başına ${state.mod === 'secmen' ? 'kayıtlı seçmen' : '18+ nüfus'} — Türkiye ortalamasına göre</span>
      </div>
      <div class="panel" id="vekil-harita-panel" style="padding: var(--space-4); position: relative;">
        <div id="vekil-harita"></div>
        <div id="vekil-tooltip" class="vekil-tooltip" style="display: none;"></div>
        <div class="vekil-lejant" id="vekil-lejant"></div>
      </div>

      <div class="section-head">
        <h2>81 il sıralaması</h2>
        <span class="eyebrow">Türkiye ortalamasına göre kat (1.0 = ortalama)</span>
      </div>
      <div class="panel" style="padding: 0; overflow: hidden;">
        <div id="vekil-tablo"></div>
      </div>

      <div class="section-head">
        <h2>2018 ↔ 2024 değişimi</h2>
        <span class="eyebrow">Hangi ilin vekil sayısı arttı, hangisinin azaldı?</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="vekil-degisim"></div>
      </div>

      <div class="section-head">
        <h2>Nasıl hesaplanıyor?</h2>
        <span class="eyebrow">2839 sayılı Milletvekili Seçimi Kanunu, m.4-5</span>
      </div>
      <div class="panel" style="padding: var(--space-4); background: var(--paper-2);">
        ${renderAciklama(tablo)}
      </div>
    `;

    renderOzetKutular(el, tablo);
    renderHarita(el, tablo);
    renderTablo(el, tablo);
    renderDegisim(el);
  }

  // ─── ÖZET KUTULAR ───
  function renderOzetKutular(el, tablo) {
    const fmt = window.AT.fmt;
    const kutuEl = el.querySelector('#vekil-ozet');
    if (!kutuEl) return;

    const ort = state.mod === 'secmen' ? tablo.ortSecmenPerVekil : tablo.ortNufusPerVekil;
    const alanAd = state.mod === 'secmen' ? 'secmenPerVekil' : 'nufusPerVekil';

    // En yüksek ve en düşük il (sıfır olmayan)
    const gecerli = tablo.satirlar.filter(s => s[alanAd] > 0);
    const enYuksek = gecerli.reduce((a, b) => a[alanAd] > b[alanAd] ? a : b);
    const enDusuk = gecerli.reduce((a, b) => a[alanAd] < b[alanAd] ? a : b);
    const oranFark = enDusuk[alanAd] > 0 ? enYuksek[alanAd] / enDusuk[alanAd] : 0;

    const alanBaslik = state.mod === 'secmen' ? 'seçmen' : '18+ nüfus';

    kutuEl.innerHTML = `
      <div class="vekil-ozet-grid">
        <div class="vekil-ozet-kutu">
          <div class="vekil-ozet-lbl">Toplam vekil</div>
          <div class="vekil-ozet-val">${fmt.n(tablo.toplamVekil)}</div>
          <div class="vekil-ozet-alt">81 il toplamı</div>
        </div>
        <div class="vekil-ozet-kutu">
          <div class="vekil-ozet-lbl">Toplam ${alanBaslik}</div>
          <div class="vekil-ozet-val">${fmt.n(state.mod === 'secmen' ? tablo.toplamSecmen : tablo.toplamNufus)}</div>
          <div class="vekil-ozet-alt">${state.mod === 'secmen' ? `meta verisi: ${tablo.secmenSecim.replace('_', ' · ')}` : `TÜİK ${tablo.demografiYili}`}</div>
        </div>
        <div class="vekil-ozet-kutu vekil-ozet-vurgulu">
          <div class="vekil-ozet-lbl">Türkiye ortalaması</div>
          <div class="vekil-ozet-val">${fmt.n(ort)}</div>
          <div class="vekil-ozet-alt">${alanBaslik} / vekil</div>
        </div>
        <div class="vekil-ozet-kutu">
          <div class="vekil-ozet-lbl">En az ${alanBaslik}/vekil</div>
          <div class="vekil-ozet-val vekil-deg-yesil">${fmt.n(enDusuk[alanAd])}</div>
          <div class="vekil-ozet-alt">${escapeHtml(enDusuk.il)}</div>
        </div>
        <div class="vekil-ozet-kutu">
          <div class="vekil-ozet-lbl">En çok ${alanBaslik}/vekil</div>
          <div class="vekil-ozet-val vekil-deg-kirmizi">${fmt.n(enYuksek[alanAd])}</div>
          <div class="vekil-ozet-alt">${escapeHtml(enYuksek.il)}</div>
        </div>
        <div class="vekil-ozet-kutu vekil-ozet-vurgulu">
          <div class="vekil-ozet-lbl">Oran farkı</div>
          <div class="vekil-ozet-val">${fmt.n1(oranFark)} kat</div>
          <div class="vekil-ozet-alt">${escapeHtml(enDusuk.il)} ↔ ${escapeHtml(enYuksek.il)}</div>
        </div>
      </div>
    `;
  }

  // ─── HARİTA ───
  function renderHarita(el, tablo) {
    const haritaEl = el.querySelector('#vekil-harita');
    const tooltipEl = el.querySelector('#vekil-tooltip');
    const panelEl = el.querySelector('#vekil-harita-panel');
    const lejantEl = el.querySelector('#vekil-lejant');
    if (!haritaEl) return;

    const fmt = window.AT.fmt;
    const geojson = cache.geojson;
    const bbox = computeBbox(geojson);
    const padding = 8;
    const W = 1000;
    const H = Math.round(W * (bbox.maxy - bbox.miny) / (bbox.maxx - bbox.minx) * 0.78);

    function project(lng, lat) {
      const x = ((lng - bbox.minx) / (bbox.maxx - bbox.minx)) * (W - 2*padding) + padding;
      const y = H - (((lat - bbox.miny) / (bbox.maxy - bbox.miny)) * (H - 2*padding) + padding);
      return [x, y];
    }
    function geomPath(geom) {
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

    // İl haritasına göre veri (oran)
    const ilData = {};
    const alanAd = state.mod === 'secmen' ? 'secmenPerVekil' : 'nufusPerVekil';
    const oranAd = state.mod === 'secmen' ? 'secmenOran' : 'nufusOran';

    for (const s of tablo.satirlar) {
      ilData[s.il] = s;
    }

    // Renk fonksiyonu: oran < 1 (az seçmen/vekil) -> mavi
    //                  oran = 1 (ortalama) -> sarı
    //                  oran > 1 (çok seçmen/vekil) -> kırmızı
    function renk(oran) {
      if (oran == null || !isFinite(oran)) return 'var(--paper-3)';
      // 0.5 -> mavi (#2b5d8c)
      // 1.0 -> sarı (#dda01b)
      // 1.5+ -> kırmızı (#a01818)
      if (oran <= 1) {
        const t = Math.max(0, (oran - 0.5) / 0.5);  // 0..1
        return interpoleRGB([43, 93, 140], [221, 160, 27], t);
      } else {
        const t = Math.min(1, (oran - 1) / 0.5);  // 0..1
        return interpoleRGB([221, 160, 27], [160, 24, 24], t);
      }
    }
    function interpoleRGB(c1, c2, t) {
      const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
      const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
      const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
      return `rgb(${r},${g},${b})`;
    }

    const paths = geojson.features.map(feat => {
      const il = feat.properties.geo_il_adi;
      const veri = ilData[il];
      const yoksa = !veri || !veri[alanAd];
      const fill = yoksa ? 'var(--paper-3)' : renk(veri[oranAd]);
      const klass = `vekil-il-path ${yoksa ? 'veri-yok' : ''}`;
      const d = geomPath(feat.geometry);
      return `<path class="${klass}" d="${d}" fill="${fill}" data-il="${escapeHtml(il)}"></path>`;
    }).join('');

    haritaEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;

    // Lejant
    if (lejantEl) {
      lejantEl.innerHTML = `
        <span class="vekil-lej-baslik">Türkiye ortalamasına göre:</span>
        <span class="vekil-lej-item">
          <span class="vekil-lej-renk" style="background:${interpoleRGB([43,93,140], [221,160,27], 0)};"></span>
          0.5× az
        </span>
        <span class="vekil-lej-item">
          <span class="vekil-lej-renk" style="background:${interpoleRGB([43,93,140], [221,160,27], 1)};"></span>
          1.0× ortalama
        </span>
        <span class="vekil-lej-item">
          <span class="vekil-lej-renk" style="background:${interpoleRGB([221,160,27], [160,24,24], 1)};"></span>
          1.5× çok
        </span>
      `;
    }

    // Tooltip
    haritaEl.querySelectorAll('.vekil-il-path').forEach(p => {
      const il = p.dataset.il;
      const veri = ilData[il];

      p.addEventListener('mousemove', (e) => {
        if (!veri || !veri[alanAd]) {
          tooltipEl.innerHTML = `<div class="tt-il">${escapeHtml(il)}</div><div class="tt-sub">Veri yok</div>`;
        } else {
          const oran = veri[oranAd];
          const alanBaslik = state.mod === 'secmen' ? 'seçmen' : '18+ nüfus';
          tooltipEl.innerHTML = `
            <div class="tt-il">${escapeHtml(il)}</div>
            <div class="tt-row">${veri.vekil} vekil</div>
            <div class="tt-row">${fmt.n(state.mod === 'secmen' ? veri.secmen : veri.nufus18)} ${alanBaslik}</div>
            <div class="tt-deger">${fmt.n(veri[alanAd])} ${alanBaslik}/vekil</div>
            <div class="tt-oran">Türkiye ort. × ${fmt.n2(oran)}</div>
          `;
        }
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
    });
  }

  // ─── TABLO (81 il sıralı) ───
  function renderTablo(el, tablo) {
    const fmt = window.AT.fmt;
    const tabloEl = el.querySelector('#vekil-tablo');
    if (!tabloEl) return;

    const alanAd = state.mod === 'secmen' ? 'secmenPerVekil' : 'nufusPerVekil';
    const oranAd = state.mod === 'secmen' ? 'secmenOran' : 'nufusOran';
    const altKolon = state.mod === 'secmen' ? 'secmen' : 'nufus18';
    const altBaslik = state.mod === 'secmen' ? 'Kayıtlı seçmen' : '18+ nüfus';

    const satirlar = [...tablo.satirlar]
      .filter(s => s[alanAd] > 0)
      .sort((a, b) => state.sirala === 'desc' ? b[alanAd] - a[alanAd] : a[alanAd] - b[alanAd]);

    tabloEl.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left; width: 40px;">#</th>
            <th style="text-align:left;">İl</th>
            <th style="text-align:right;">Vekil</th>
            <th style="text-align:right;">${altBaslik}</th>
            <th style="text-align:right; cursor:pointer;" id="vekil-tablo-sirala">
              ${altBaslik}/vekil
              <span style="color:var(--brand-gold);">${state.sirala === 'desc' ? '↓' : '↑'}</span>
            </th>
            <th style="text-align:right;">Tür. ort. × kat</th>
          </tr>
        </thead>
        <tbody>
          ${satirlar.map((s, i) => {
            const oran = s[oranAd];
            // Türkiye ortalamasından sapma rengi
            const sapma = Math.abs(oran - 1);
            let sapmaRenk;
            if (sapma < 0.1) sapmaRenk = 'var(--ink-3)';
            else if (oran < 1) sapmaRenk = 'var(--signal-green)';
            else sapmaRenk = 'var(--signal-red)';

            return `
              <tr>
                <td class="num" style="color:var(--ink-3);">${i + 1}</td>
                <td><span style="font-weight: 500;">${escapeHtml(s.il)}</span></td>
                <td class="num" style="text-align:right;">${s.vekil}</td>
                <td class="num" style="text-align:right;">${fmt.n(s[altKolon])}</td>
                <td class="num" style="text-align:right; font-weight:600;">${fmt.n(s[alanAd])}</td>
                <td class="num" style="text-align:right; color:${sapmaRenk}; font-weight:600;">
                  ${fmt.n2(oran)}×
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    const sirBtn = tabloEl.querySelector('#vekil-tablo-sirala');
    if (sirBtn) {
      sirBtn.addEventListener('click', () => {
        state.sirala = state.sirala === 'desc' ? 'asc' : 'desc';
        renderTablo(el, tablo);
      });
    }
  }

  // ─── 2018 ↔ 2024 değişim tablosu ───
  function renderDegisim(el) {
    const degEl = el.querySelector('#vekil-degisim');
    if (!degEl) return;

    const v2018 = cache.vekil.secimler['2018_MV']?.iller || {};
    const v2024 = cache.vekil.secimler['2024_guncel']?.iller || {};

    const degisimler = [];
    for (const il of Object.keys(v2018)) {
      const ilk = v2018[il];
      const son = v2024[il];
      if (ilk === son) continue;
      degisimler.push({
        il,
        ilk,
        son,
        fark: son - ilk,
      });
    }

    if (degisimler.length === 0) {
      degEl.innerHTML = '<p style="color:var(--ink-3); text-align:center;">Hiçbir ilin vekil sayısı değişmedi.</p>';
      return;
    }

    degisimler.sort((a, b) => b.fark - a.fark);
    const artanlar = degisimler.filter(d => d.fark > 0);
    const azalanlar = degisimler.filter(d => d.fark < 0);

    degEl.innerHTML = `
      <p style="font-size: 13px; color: var(--ink-2); margin-bottom: var(--space-3);">
        2018 seçiminden 2024 kararına geçişte
        <strong style="color:var(--signal-green);">${artanlar.length} ilin</strong> vekil sayısı arttı,
        <strong style="color:var(--signal-red);">${azalanlar.length} ilin</strong> azaldı.
        Bu değişimler nüfus hareketlerinin (göç, doğurganlık) sonucudur.
      </p>
      <div class="vekil-degisim-iki-sutun">
        <div>
          <div class="vekil-degisim-baslik">Artan iller (+)</div>
          <table class="data-table">
            <thead><tr><th style="text-align:left;">İl</th><th style="text-align:right;">2018</th><th style="text-align:right;">2024</th><th style="text-align:right;">Fark</th></tr></thead>
            <tbody>
              ${artanlar.map(d => `
                <tr>
                  <td style="font-weight:500;">${escapeHtml(d.il)}</td>
                  <td class="num" style="text-align:right;">${d.ilk}</td>
                  <td class="num" style="text-align:right; font-weight:600;">${d.son}</td>
                  <td class="num" style="text-align:right; color:var(--signal-green); font-weight:600;">+${d.fark}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
        <div>
          <div class="vekil-degisim-baslik">Azalan iller (−)</div>
          <table class="data-table">
            <thead><tr><th style="text-align:left;">İl</th><th style="text-align:right;">2018</th><th style="text-align:right;">2024</th><th style="text-align:right;">Fark</th></tr></thead>
            <tbody>
              ${azalanlar.map(d => `
                <tr>
                  <td style="font-weight:500;">${escapeHtml(d.il)}</td>
                  <td class="num" style="text-align:right;">${d.ilk}</td>
                  <td class="num" style="text-align:right; font-weight:600;">${d.son}</td>
                  <td class="num" style="text-align:right; color:var(--signal-red); font-weight:600;">${d.fark}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ─── Açıklama (kanun, hesaplama, kaynak) ───
  function renderAciklama(tablo) {
    const fmt = window.AT.fmt;
    const secimAd = cache.vekil.secimler[state.secim]?._baslik || state.secim;
    
    return `
      <h3 style="margin: 0 0 var(--space-3) 0; font-family: var(--font-display); font-size: 16px; font-weight: 600;">Kanun ne diyor?</h3>
      <p style="font-size: 13.5px; line-height: 1.7; color: var(--ink-2);">
        <strong>2839 sayılı Milletvekili Seçimi Kanunu, madde 4-5</strong> gereğince:
      </p>
      <ol style="font-size: 13.5px; line-height: 1.7; color: var(--ink-2); padding-left: var(--space-5);">
        <li><strong>Önce</strong> 600 vekilden her ile <strong>1 vekil garantili</strong> tahsis edilir (81 vekil).</li>
        <li><strong>Sonra</strong> kalan <strong>519 vekil</strong>, Türkiye nüfusunun bu sayıya bölünmesi ile hesaplanan
            "ortalama" baz alınarak <strong>nüfusa göre</strong> illere dağıtılır.</li>
        <li>Bu hesaplamanın sonucu 600'ü bulmadığı durumlarda artık nüfus büyüklüğüne göre kalan vekiller dağıtılır.</li>
        <li>18'e kadar vekil çıkaran iller <strong>bir</strong>, 19-35 arası <strong>iki</strong>, 36+ olan iller
            <strong>üç</strong> seçim çevresine bölünür.</li>
      </ol>

      <h3 style="margin: var(--space-4) 0 var(--space-3) 0; font-family: var(--font-display); font-size: 16px; font-weight: 600;">Bizim hesabımız</h3>
      <p style="font-size: 13.5px; line-height: 1.7; color: var(--ink-2);">
        Kanun <strong>TÜİK toplam nüfus</strong>'a göre dağıtır (bebek/çocuk dahil). Bizim modülümüz iki açı sunar:
      </p>
      <ul style="font-size: 13.5px; line-height: 1.7; color: var(--ink-2); padding-left: var(--space-5);">
        <li><strong>Kayıtlı seçmen / vekil</strong>: oy verebilen kişi başına temsil. Senin asıl
            soruna en yakın hesap. <em>(Kaynak: bizim meta_iller.json, ${tablo.secmenSecim.replace('_', ' · ')})</em></li>
        <li><strong>TÜİK 18+ nüfus / vekil</strong>: yetişkin nüfus başına temsil. <em>(Kaynak: TÜİK demografi, ${tablo.demografiYili})</em></li>
      </ul>
      <p style="font-size: 13.5px; line-height: 1.7; color: var(--ink-2); margin-top: var(--space-3);">
        Bu iki sayı <strong>illerin yaş yapısına göre</strong> farklı çıkabilir: çocuk nüfusu yüksek illerde
        18+ daha küçük olur ama kayıtlı seçmen ise oturma durumu vs.'ye bağlı olur. Eldeki en güvenilir veri kayıtlı
        seçmen verisidir.
      </p>

      <h3 style="margin: var(--space-4) 0 var(--space-3) 0; font-family: var(--font-display); font-size: 16px; font-weight: 600;">Kaynaklar</h3>
      <ul style="font-size: 13px; line-height: 1.8; color: var(--ink-3); padding-left: var(--space-5);">
        <li>YSK 2018 EK (I) Sayılı Cetvel — <span class="mono">ysk.gov.tr</span></li>
        <li>YSK 2024 Resmi Gazete Karar No. 2024/2712 (27 Haziran 2024)</li>
        <li>Kayıtlı seçmen ve oy verisi: YSK il/ilçe sonuçları</li>
        <li>18+ nüfus: TÜİK Adrese Dayalı Nüfus Kayıt Sistemi (ADNKS)</li>
        <li>Kanun metni: <span class="mono">mevzuat.gov.tr</span> → 2839 sayılı Milletvekili Seçimi Kanunu</li>
      </ul>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════
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

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ═══════════════════════════════════════════════════════════════
  // STİLLER
  // ═══════════════════════════════════════════════════════════════
  function renderStiller() {
    return `
      <style>
        .vekil-aciklama-kalici {
          background: var(--paper-2);
          border-left: 4px solid var(--brand-gold);
          border-radius: 0 var(--radius) var(--radius) 0;
          padding: var(--space-4) var(--space-5);
          margin-bottom: var(--space-5);
          font-size: 13.5px;
          line-height: 1.7;
          color: var(--ink-2);
        }

        .vekil-filtre {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
          align-items: center;
        }
        .vekil-filtre-grup {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .vekil-filtre-lbl {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .vekil-select {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--ink);
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-3);
          cursor: pointer;
          min-width: 240px;
        }

        /* Özet kutular */
        .vekil-ozet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: var(--space-3);
          margin-bottom: var(--space-5);
        }
        .vekil-ozet-kutu {
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: var(--space-3) var(--space-4);
        }
        .vekil-ozet-kutu.vekil-ozet-vurgulu {
          background: rgba(200, 134, 26, 0.06);
          border-color: var(--brand-gold);
        }
        .vekil-ozet-lbl {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--ink-3);
          margin-bottom: 4px;
        }
        .vekil-ozet-val {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 600;
          color: var(--ink);
        }
        .vekil-ozet-val.vekil-deg-yesil { color: var(--signal-green); }
        .vekil-ozet-val.vekil-deg-kirmizi { color: var(--signal-red); }
        .vekil-ozet-alt {
          font-size: 11px;
          color: var(--ink-3);
          margin-top: 4px;
        }

        /* Harita */
        #vekil-harita {
          width: 100%;
          aspect-ratio: 5 / 3;
          max-height: 480px;
          overflow: hidden;
        }
        #vekil-harita svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .vekil-il-path {
          stroke: #fdfaf2;
          stroke-width: 0.5;
          cursor: pointer;
          transition: stroke-width 80ms ease;
        }
        .vekil-il-path:hover {
          stroke: var(--ink);
          stroke-width: 1.5;
        }
        .vekil-il-path.veri-yok {
          fill: var(--paper-3);
          opacity: 0.5;
          cursor: default;
        }
        .vekil-tooltip {
          position: absolute;
          pointer-events: none;
          background: var(--ink);
          color: var(--paper);
          padding: var(--space-2) var(--space-3);
          border-radius: var(--radius-sm);
          font-size: 12px;
          line-height: 1.5;
          z-index: 100;
          box-shadow: var(--shadow);
          max-width: 280px;
        }
        .vekil-tooltip .tt-il {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
        }
        .vekil-tooltip .tt-row {
          font-size: 11.5px;
          color: var(--paper-3);
        }
        .vekil-tooltip .tt-deger {
          font-family: var(--font-mono);
          font-weight: 600;
          font-size: 13px;
          margin-top: 4px;
        }
        .vekil-tooltip .tt-oran {
          font-size: 11px;
          color: var(--paper-3);
          margin-top: 2px;
        }
        .vekil-tooltip .tt-sub {
          font-size: 11px;
          color: var(--paper-3);
        }
        .vekil-lejant {
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
        .vekil-lej-baslik {
          font-weight: 600;
          color: var(--ink-2);
        }
        .vekil-lej-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .vekil-lej-renk {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.15);
        }

        /* Değişim tablosu */
        .vekil-degisim-iki-sutun {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        .vekil-degisim-baslik {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--ink-2);
          margin-bottom: var(--space-2);
        }

        @media (max-width: 900px) {
          .vekil-degisim-iki-sutun {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }
})();
