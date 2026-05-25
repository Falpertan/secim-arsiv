/* ─────────────────────────────────────────────────────────
   Trend module v1 — Parti hareketi & koalisyon analizi
   
   A) Parti zaman çizelgesi — yıllar arası parti oy oranı çizgi grafik
   B) Bölgesel ısı haritası — parti × bölge × yıl
   C) Koalisyon analizi — Cumhur, Millet, Emek+Özgürlük bloklarının
                          zamana göre genişlemesi
   
   Veri:
     data/aggregates/parti_turkiye_nuts.json
     data/aggregates/parti_iller.json
     data/aggregates/parti_ilceler.json
     data/core/geo.json
     data/core/turkiye_iller.geojson
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // ÖNBELLEK
  // ═══════════════════════════════════════════════════════════════
  const cache = {
    parti_tr: null,     // parti_turkiye_nuts.json
    parti_iller: null,  // parti_iller.json
    parti_ilceler: null,// parti_ilceler.json
    geo: null,
    geojson: null,
  };

  // ═══════════════════════════════════════════════════════════════
  // DURUM
  // ═══════════════════════════════════════════════════════════════
  const state = {
    sekme: 'A',
    secim_tipi: 'MV',  // 'CB' veya 'MV' — saf parti tercihi olanlar
    katman: 'turkiye',
    katman_deger: '',
    secili_parti: 'AK PARTİ',  // Sekme B için
    fark_modu: false,           // Sekme B için: 2018→2023 fark
  };

  // ═══════════════════════════════════════════════════════════════
  // PARTİ NORMALİZASYONU
  // Tarihsel olarak aynı parti farklı adlarla çıkmış olabilir.
  // CB seçimlerinde adaylar parti kolonu olarak görünür.
  // ═══════════════════════════════════════════════════════════════
  const PARTI_NORMALIZE = {
    // HDP -> YSP/YEŞİL SOL PARTİ -> DEM (aynı politik akım, farklı isim)
    'HDP':              'DEM/HDP',
    'YSP':              'DEM/HDP',
    'YEŞİL SOL PARTİ':  'DEM/HDP',
    'YEŞİL SOL PARTI':  'DEM/HDP',
    'DEM Parti':        'DEM/HDP',
    'DEM PARTİ':        'DEM/HDP',
    // AKP varyantları
    'AKP':       'AK PARTİ',
    'AK Parti':  'AK PARTİ',
    // Saadet
    'SAADET PARTİSİ': 'SAADET',
    // CB 2018 adayları → temsili parti grubu
    'RECEP TAYYİP ERDOĞAN': 'Erdoğan (CB)',
    'MUHARREM İNCE':        'İnce (CB)',
    'MERAL AKŞENER':        'Akşener (CB)',
    'SELAHATTİN DEMİRTAŞ':  'Demirtaş (CB)',
    'TEMEL KARAMOLLAOĞLU':  'Karamollaoğlu (CB)',
    'DOĞU PERİNÇEK':        'Perinçek (CB)',
    // CB 2023 1. tur adayları
    'KEMAL KILIÇDAROĞLU':   'Kılıçdaroğlu (CB)',
    'SİNAN OĞAN':           'Oğan (CB)',
    // Erdoğan zaten yukarıda
  };

  // Ana parti renkleri (görsel tutarlılık için)
  const PARTI_RENK = {
    'AK PARTİ':       '#dda01b',
    'CHP':            '#c8311a',
    'MHP':            '#b8281b',
    'İYİ PARTİ':      '#3f7eb3',
    'DEM/HDP':        '#9b3e94',
    'SAADET':         '#1a5c89',
    'CUMHUR İTTİFAKI':'#d97606',
    'MİLLET İTTİFAKI':'#7c2415',
    'YENİDEN REFAH':  '#1f6e3c',
    'ZAFER PARTİSİ':  '#3a3a3a',
    'TİP':            '#a01818',
    'HÜDA PAR':       '#2a6e3f',
    'DEVA PARTİSİ':   '#5a7da0',
    'GELECEK PARTİSİ':'#7a5a8c',
    'MEMLEKET':       '#6b4a8c',
    'BBP':            '#2e5494',
    // CB adayları — partilerinden ayırt edilsin diye farklı tonlar
    'Erdoğan (CB)':       '#a87308',
    'Kılıçdaroğlu (CB)':  '#8c2715',
    'İnce (CB)':          '#d97a4a',
    'Akşener (CB)':       '#2b5d8c',
    'Demirtaş (CB)':      '#6c2a6e',
    'Karamollaoğlu (CB)': '#0e466b',
    'Perinçek (CB)':      '#555',
    'Oğan (CB)':          '#5a5a5a',
    'DİĞER':              '#888888',
  };

  // Renk havuzu (PARTI_RENK'te olmayan partiler için)
  const RENK_HAVUZU = [
    '#7a8c5a', '#8c5a6e', '#5a6e8c', '#6e8c5a', '#8c6e5a',
    '#5a8c8c', '#8c5a8c', '#5a8c5a', '#8c8c5a', '#5a5a8c',
  ];

  // ═══════════════════════════════════════════════════════════════
  // KOALİSYON TANIMLARI
  // 2023 MV verisinde bazen partiler ayrı kolon, bazen ittifak
  // kolonu olarak gelir. İkisini de dahil ediyoruz.
  // ═══════════════════════════════════════════════════════════════
  const KOALISYON_2023 = {
    'Cumhur İttifakı':  ['AK PARTİ', 'MHP', 'BBP', 'YENİDEN REFAH', 'HÜDA PAR', 'CUMHUR İTTİFAKI', 'Erdoğan (CB)'],
    'Millet İttifakı':  ['CHP', 'İYİ PARTİ', 'SAADET', 'DP', 'DEVA PARTİSİ', 'GELECEK PARTİSİ', 'MİLLET İTTİFAKI', 'Kılıçdaroğlu (CB)'],
    'Emek ve Özgürlük': ['DEM/HDP', 'TİP', 'EMEP', 'SOL PARTİ', 'TKP', 'TKH', 'EMEK VE ÖZGÜRLÜK İTTİFAKI', 'SOSYALİST GÜÇ BİRLİĞİ İTTİFAKI'],
    'ATA İttifakı':     ['ZAFER PARTİSİ', 'ADALET', 'ÜLKEM', 'ATA İTTİFAKI', 'Oğan (CB)'],
  };

  const KOALISYON_2018 = {
    'Cumhur İttifakı':  ['AK PARTİ', 'MHP', 'BBP', 'CUMHUR İTTİFAKI', 'Erdoğan (CB)'],
    'Millet İttifakı':  ['CHP', 'İYİ PARTİ', 'SAADET', 'DP', 'MİLLET İTTİFAKI', 'İnce (CB)', 'Akşener (CB)', 'Karamollaoğlu (CB)'],
    'Emek ve Özgürlük': ['DEM/HDP', 'Demirtaş (CB)'],  // 2018'de HDP bağımsızdı, 2023'te EÖİ; tutarlı çizgi için birleşik
    'Vatan/Perinçek':   ['VATAN PARTİSİ', 'Perinçek (CB)'],
  };
  
  const KOALISYON_RENK = {
    'Cumhur İttifakı':  '#d97606',
    'Millet İttifakı':  '#7c2415',
    'Emek ve Özgürlük': '#9b3e94',
    'ATA İttifakı':     '#3a3a3a',
    'HDP':              '#9b3e94',
    'Diğer':            '#aaaaaa',
  };

  // Aktif olan seçim tipleri (saf parti tercihi)
  const SECIM_TIPLERI = {
    'MV': {
      ad: 'Milletvekili',
      secimler: ['2018_MV', '2023_MV'],
    },
    'CB': {
      ad: 'Cumhurbaşkanlığı',
      secimler: ['2018_CB', '2023_CB1', '2023_CB2'],
    },
  };

  // ═══════════════════════════════════════════════════════════════
  // VERİ YÜKLEME
  // ═══════════════════════════════════════════════════════════════
  async function loadCoreData() {
    if (cache.parti_tr && cache.parti_iller && cache.geo && cache.geojson) return;

    const [pTr, pIller, geo, geojson] = await Promise.all([
      fetch('data/aggregates/parti_turkiye_nuts.json').then(r => {
        if (!r.ok) throw new Error('parti_turkiye_nuts.json yüklenemedi: ' + r.status);
        return r.json();
      }),
      fetch('data/aggregates/parti_iller.json').then(r => {
        if (!r.ok) throw new Error('parti_iller.json yüklenemedi: ' + r.status);
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

    cache.parti_tr = pTr;
    cache.parti_iller = pIller;
    cache.geo = geo;
    cache.geojson = geojson;
  }

  async function loadIlceler() {
    if (cache.parti_ilceler) return;
    cache.parti_ilceler = await fetch('data/aggregates/parti_ilceler.json').then(r => {
      if (!r.ok) throw new Error('parti_ilceler.json yüklenemedi: ' + r.status);
      return r.json();
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // YARDIMCI: Bir seçim + kapsam için parti oy verilerini çek
  // ═══════════════════════════════════════════════════════════════

  /**
   * Bir seçim + coğrafi kapsam için parti oy sayıları döner.
   * Return: { parti_adi: oy_sayisi, ..., _toplam: ... }
   *         Normalize edilmiş parti adlarıyla.
   * 
   * NOT: parti_turkiye_nuts.json'daki "turkiye" alanı META değerler içerir
   * (toplam_sandik, kayitli_secmen vs.), parti oyları DEĞİL.
   * Türkiye geneli parti oyları için illerden toplamalıyız.
   */
  function getPartiOylari(ckey) {
    const sec_tr = cache.parti_tr.secimler[ckey];
    if (!sec_tr) return null;

    if (state.katman === 'turkiye') {
      // Türkiye geneli — illeri topla
      const sec_il = cache.parti_iller.secimler[ckey];
      if (!sec_il || !sec_il.iller) return null;
      const norm = {};
      let toplam = 0;
      for (const ilVeri of Object.values(sec_il.iller)) {
        for (const [p, oy] of Object.entries(ilVeri)) {
          if (p === 'toplam' || p === 'il_sayisi') continue;
          const n = PARTI_NORMALIZE[p] || p;
          norm[n] = (norm[n] || 0) + (oy || 0);
          toplam += (oy || 0);
        }
      }
      if (toplam === 0) return null;
      norm._toplam = toplam;
      return norm;
    }

    let kaynak = null;
    if (state.katman === 'nuts1' && state.katman_deger) {
      kaynak = sec_tr.nuts1?.[state.katman_deger];
    } else if (state.katman === 'nuts2' && state.katman_deger) {
      kaynak = sec_tr.nuts2?.[state.katman_deger];
    } else if (state.katman === 'il' && state.katman_deger) {
      const sec_il = cache.parti_iller.secimler[ckey];
      kaynak = sec_il?.iller?.[state.katman_deger];
    } else if (state.katman === 'ilce' && state.katman_deger) {
      const sec_ilce = cache.parti_ilceler?.secimler?.[ckey];
      kaynak = sec_ilce?.ilceler?.[state.katman_deger];
    }

    if (!kaynak) return null;

    // Normalize edilmiş parti adlarına göre topla
    const normal = {};
    let toplam = 0;
    for (const [p, sayi] of Object.entries(kaynak)) {
      if (p === 'toplam' || p === 'il_sayisi') continue;
      const norm = PARTI_NORMALIZE[p] || p;
      normal[norm] = (normal[norm] || 0) + (sayi || 0);
      toplam += (sayi || 0);
    }
    if (toplam === 0) return null;
    normal._toplam = toplam;
    return normal;
  }

  /**
   * Bir parti için seçim tipi boyunca oy yüzdeleri.
   * Return: [ {ckey, yil, oy, yuzde}, ... ]
   */
  function getPartiZamanCizgisi(parti_norm, secim_tipi) {
    const sonuc = [];
    const secimler = SECIM_TIPLERI[secim_tipi].secimler;
    for (const ckey of secimler) {
      const veri = getPartiOylari(ckey);
      if (!veri) continue;
      const oy = veri[parti_norm] || 0;
      const yuzde = veri._toplam > 0 ? (oy / veri._toplam) * 100 : 0;
      sonuc.push({
        ckey,
        yil: parseInt(ckey.split('_')[0], 10),
        oy,
        yuzde,
      });
    }
    return sonuc;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANA MODÜL FONKSIYONU
  // ═══════════════════════════════════════════════════════════════
  window.Modules.trend = async function(container, ctx) {
    container.innerHTML = `<div class="loading">Trend verisi yükleniyor</div>`;

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
        <span class="eyebrow">Modül · 03</span>
        <h1>Trend analizi</h1>
        <p class="lede">Veri yüklenemedi: ${e.message}</p>
      </header>
      <div class="panel">
        <div class="panel-title">Aggregate dosyaları eksik</div>
        <p style="color:var(--ink-2); line-height:1.6;">
          Bu modül için şu dosyalar gerekli:
          <span class="mono">parti_turkiye_nuts.json</span>,
          <span class="mono">parti_iller.json</span>,
          <span class="mono">parti_ilceler.json</span>,
          <span class="mono">geo.json</span>,
          <span class="mono">turkiye_iller.geojson</span>
        </p>
        <p style="margin-top: var(--space-3);">
          Eksikse: <span class="mono">python tools/build_aggregates.py --all</span>
        </p>
      </div>
    `;
  }

  function renderModule(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Modül · 03 · Tarafsız analiz · 3 perspektif</span>
        <h1>Trend analizi</h1>
        <p class="lede">
          Türkiye'de partilerin oy oranı 2018'den 2023'e nasıl değişti?
          Hangi bölgede kim güçlendi, hangi koalisyon genişledi?
          Yalnızca <strong>Cumhurbaşkanlığı</strong> ve <strong>Milletvekili</strong>
          seçimleri analiz edilir — yerel seçimlerde dinamikler farklıdır.
        </p>
      </header>

      ${window.AT.renderDataFreshness ? window.AT.renderDataFreshness() : ''}
      ${window.AT.renderContextNotice ? window.AT.renderContextNotice('trend') : ''}

      <div class="trend-sekmeler">
        <button class="trend-sekme" data-sekme="A">
          <span class="sekme-num">A</span>
          <span class="sekme-baslik">Parti zaman çizelgesi</span>
          <span class="sekme-sub">Yıllar arası oy hareketi</span>
        </button>
        <button class="trend-sekme" data-sekme="B">
          <span class="sekme-num">B</span>
          <span class="sekme-baslik">Bölgesel ısı haritası</span>
          <span class="sekme-sub">Bir parti nerede güçlendi?</span>
        </button>
        <button class="trend-sekme" data-sekme="C">
          <span class="sekme-num">C</span>
          <span class="sekme-baslik">Koalisyon analizi</span>
          <span class="sekme-sub">Bloklar nasıl değişti?</span>
        </button>
      </div>

      <div id="trend-icerik"></div>

      ${renderStiller()}
    `;

    container.querySelectorAll('.trend-sekme').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sekme = btn.dataset.sekme;
        renderAktifSekme(container);
      });
    });

    renderAktifSekme(container);
  }

  function renderAktifSekme(container) {
    container.querySelectorAll('.trend-sekme').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sekme === state.sekme);
    });

    const icerikEl = container.querySelector('#trend-icerik');
    if (state.sekme === 'A') renderSekmeA(container, icerikEl);
    else if (state.sekme === 'B') renderSekmeB(container, icerikEl);
    else if (state.sekme === 'C') renderSekmeC(container, icerikEl);
  }

  // ═══════════════════════════════════════════════════════════════
  // ORTAK: Filtre paneli
  // ═══════════════════════════════════════════════════════════════
  function renderFiltrePanel(sekme) {
    const geo = cache.geo;
    const tipOpts = Object.entries(SECIM_TIPLERI).map(([k, v]) =>
      `<option value="${k}" ${k === state.secim_tipi ? 'selected' : ''}>${v.ad}</option>`
    ).join('');

    const katmanOpts = [
      ['turkiye', 'Türkiye geneli'],
      ['nuts1',   'NUTS-1 bölge'],
      ['nuts2',   'NUTS-2 alt bölge'],
      ['il',      'İl'],
    ].map(([v, l]) => `<option value="${v}" ${v === state.katman ? 'selected' : ''}>${l}</option>`).join('');

    let katmanDegerOpts = '', katmanDegerVisible = false;
    if (state.katman === 'nuts1') {
      katmanDegerVisible = true;
      const opts = Object.entries(geo.nuts1).map(([k, info]) =>
        `<option value="${k}" ${k === state.katman_deger ? 'selected' : ''}>${k} · ${info.ad}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— bölge seçin —</option>${opts}`;
    } else if (state.katman === 'nuts2') {
      katmanDegerVisible = true;
      const opts = Object.entries(geo.nuts2).map(([k, info]) =>
        `<option value="${k}" ${k === state.katman_deger ? 'selected' : ''}>${k} · ${info.ad}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— alt bölge seçin —</option>${opts}`;
    } else if (state.katman === 'il') {
      katmanDegerVisible = true;
      const iller = Object.keys(geo.iller).sort((a, b) => a.localeCompare(b, 'tr'));
      const opts = iller.map(il =>
        `<option value="${il}" ${il === state.katman_deger ? 'selected' : ''}>${il}</option>`
      ).join('');
      katmanDegerOpts = `<option value="">— il seçin —</option>${opts}`;
    }

    return `
      <div class="panel" style="margin-bottom: var(--space-6);">
        <div class="panel-title">Filtre</div>
        <div class="trend-filtre-row">
          <label class="trend-filtre-grup">
            <span class="trend-filtre-lbl">Seçim tipi</span>
            <select id="trend-tip" class="trend-select">${tipOpts}</select>
          </label>
          <label class="trend-filtre-grup">
            <span class="trend-filtre-lbl">Coğrafi katman</span>
            <select id="trend-katman" class="trend-select">${katmanOpts}</select>
          </label>
          ${katmanDegerVisible ? `
            <label class="trend-filtre-grup">
              <span class="trend-filtre-lbl">Bölge / il</span>
              <select id="trend-katman-deger" class="trend-select">${katmanDegerOpts}</select>
            </label>
          ` : ''}
        </div>
      </div>
    `;
  }

  function bindFiltrePanel(icerikEl, onChange) {
    icerikEl.querySelector('#trend-tip')?.addEventListener('change', e => {
      state.secim_tipi = e.target.value;
      onChange();
    });
    icerikEl.querySelector('#trend-katman')?.addEventListener('change', e => {
      state.katman = e.target.value;
      state.katman_deger = '';
      onChange();
    });
    icerikEl.querySelector('#trend-katman-deger')?.addEventListener('change', e => {
      state.katman_deger = e.target.value;
      onChange();
    });
  }

  function getKapsamBaslik() {
    if (state.katman === 'turkiye') return 'Türkiye geneli';
    if (state.katman === 'nuts1' && state.katman_deger) {
      const ad = cache.geo.nuts1[state.katman_deger]?.ad || state.katman_deger;
      return `${state.katman_deger} · ${ad}`;
    }
    if (state.katman === 'nuts2' && state.katman_deger) {
      const ad = cache.geo.nuts2[state.katman_deger]?.ad || state.katman_deger;
      return `${state.katman_deger} · ${ad}`;
    }
    if (state.katman === 'il' && state.katman_deger) return state.katman_deger;
    return 'Türkiye geneli';
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME A — PARTİ ZAMAN ÇİZELGESİ
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeA(container, icerikEl) {
    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          Her partinin <strong>oy oranının yıllar arası değişimi</strong>. Çizgilerin yatay
          eksenle açısı parti hareketini gösterir: yukarı çıkış = büyüme, düşüş = kayıp.
        </p>
      </div>

      ${renderFiltrePanel('A')}

      <div class="section-head">
        <h2>Parti oy oranları — ${getKapsamBaslik()}</h2>
        <span class="eyebrow">Sadece toplam oyun en az %1'ini alan partiler gösterilir</span>
      </div>
      <div class="panel chart-export-panel" data-chart-export="trend-parti-oranlari" style="padding: var(--space-4);">
        <div id="trendA-grafik"></div>
      </div>

      <div class="section-head">
        <h2>Sayısal değişim tablosu</h2>
        <span class="eyebrow">Önceki seçimden sonrakine fark</span>
      </div>
      <div class="panel" style="padding: 0; overflow: hidden;">
        <div id="trendA-tablo"></div>
      </div>

      ${renderAciklamaA()}
    `;

    bindFiltrePanel(icerikEl, () => renderSekmeA(container, icerikEl));
    renderCizgiGrafik(icerikEl);
    renderDegisimTablosu(icerikEl);
    if (window.AT.enhanceChartExports) window.AT.enhanceChartExports(icerikEl);
  }

  /** Sağ kenar parti etiketlerini çakışmayacak şekilde dikey yay */
  function spreadCizgiEtiketleri(items, minGap, minY, maxY) {
    if (!items.length) return items;
    const sorted = items.map(it => ({ ...it, labelY: it.lineY })).sort((a, b) => a.lineY - b.lineY);

    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].labelY < sorted[i - 1].labelY + minGap) {
        sorted[i].labelY = sorted[i - 1].labelY + minGap;
      }
    }
    if (sorted[sorted.length - 1].labelY > maxY) {
      const shift = sorted[sorted.length - 1].labelY - maxY;
      for (let i = 0; i < sorted.length; i++) sorted[i].labelY -= shift;
    }
    if (sorted[0].labelY < minY) {
      const shift = minY - sorted[0].labelY;
      for (let i = 0; i < sorted.length; i++) sorted[i].labelY += shift;
    }
    for (let i = sorted.length - 2; i >= 0; i--) {
      if (sorted[i + 1].labelY - sorted[i].labelY < minGap) {
        sorted[i].labelY = sorted[i + 1].labelY - minGap;
      }
    }
    return sorted;
  }

  function renderCizgiGrafik(icerikEl) {
    const el = icerikEl.querySelector('#trendA-grafik');
    if (!el) return;
    const fmt = window.AT.fmt;

    const secimler = SECIM_TIPLERI[state.secim_tipi].secimler;
    if (secimler.length < 2) {
      el.innerHTML = '<div class="trend-bos">Bu tip için yeterli seçim yok</div>';
      return;
    }

    // Tüm normalize edilmiş partiler için her seçimdeki yüzde
    const partiler_seti = new Set();
    const veri = {};   // ckey → { parti: yuzde }
    for (const ckey of secimler) {
      const oylar = getPartiOylari(ckey);
      if (!oylar) {
        veri[ckey] = null;
        continue;
      }
      veri[ckey] = {};
      for (const [p, oy] of Object.entries(oylar)) {
        if (p === '_toplam') continue;
        const yuzde = oylar._toplam > 0 ? (oy / oylar._toplam) * 100 : 0;
        veri[ckey][p] = yuzde;
        if (yuzde >= 1) partiler_seti.add(p);  // sadece ≥%1 olanlar
      }
    }

    if (partiler_seti.size === 0) {
      el.innerHTML = '<div class="trend-bos">Bu kapsam için parti verisi yok</div>';
      return;
    }

    // Partileri en son seçimdeki yüzdeye göre sırala (büyükten küçüğe)
    const sonCkey = secimler[secimler.length - 1];
    const sonVeri = veri[sonCkey] || {};
    const partiler = Array.from(partiler_seti).sort((a, b) => (sonVeri[b] || 0) - (sonVeri[a] || 0));

    // SVG ölçüleri
    const W = 900, H = 380;
    const padL = 50, padR = 240, padT = 30, padB = 50;
    const iw = W - padL - padR;
    const ih = H - padT - padB;

    // Y ekseni — 0-100 arası, en yüksek değere göre ölçek
    let yMax = 0;
    for (const ckey of secimler) {
      if (!veri[ckey]) continue;
      for (const p of partiler) {
        yMax = Math.max(yMax, veri[ckey][p] || 0);
      }
    }
    yMax = Math.ceil(yMax / 10) * 10 + 10;  // 10'un katı, biraz pay bırak
    yMax = Math.max(yMax, 20);

    // X ekseni — eşit aralıkla seçimler
    const xStep = secimler.length > 1 ? iw / (secimler.length - 1) : iw;
    const xKonum = (i) => padL + i * xStep;
    const yKonum = (yuzde) => padT + ih - (yuzde / yMax) * ih;

    // Y ekseni çizgileri (5 nokta)
    let yEkseni = '';
    for (let i = 0; i <= 5; i++) {
      const val = (yMax / 5) * i;
      const y = yKonum(val);
      yEkseni += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + iw).toFixed(1)}" y2="${y.toFixed(1)}"
                       stroke="var(--line-soft)" stroke-width="0.5"/>`;
      yEkseni += `<text x="${(padL - 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="trend-eksen">%${val.toFixed(0)}</text>`;
    }

    // X ekseni etiketleri
    let xEkseni = '';
    for (let i = 0; i < secimler.length; i++) {
      const ckey = secimler[i];
      const x = xKonum(i);
      const label = ckey.replace('_', ' · ');
      xEkseni += `<text x="${x.toFixed(1)}" y="${(H - padB + 20).toFixed(1)}" text-anchor="middle" class="trend-eksen">${label}</text>`;
    }

    // Her parti için çizgi + noktalar
    let cizgiler = '';
    const etiketHam = [];
    let etiketSiraNo = 0;
    const chartRight = padL + iw;
    const labelX = chartRight + 10;

    for (const p of partiler) {
      const renk = PARTI_RENK[p] || RENK_HAVUZU[etiketSiraNo % RENK_HAVUZU.length];
      const noktalar = [];
      for (let i = 0; i < secimler.length; i++) {
        const ckey = secimler[i];
        const yuzde = veri[ckey]?.[p] ?? null;
        if (yuzde === null) continue;
        noktalar.push({ x: xKonum(i), y: yKonum(yuzde), yuzde });
      }
      if (noktalar.length < 2) continue;

      const cizgi = noktalar.map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ');
      cizgiler += `<path d="${cizgi}" fill="none" stroke="${renk}" stroke-width="2" opacity="0.85"/>`;
      for (const n of noktalar) {
        cizgiler += `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="4" fill="${renk}" stroke="var(--paper)" stroke-width="1.5"/>`;
      }

      const sonNokta = noktalar[noktalar.length - 1];
      etiketHam.push({
        parti: p,
        renk,
        lineY: sonNokta.y,
        yuzde: sonNokta.yuzde,
      });
      etiketSiraNo++;
    }

    const etiketKonum = spreadCizgiEtiketleri(etiketHam, 15, padT + 8, padT + ih - 8);
    let etiketler = '';
    for (const e of etiketKonum) {
      const dy = Math.abs(e.labelY - e.lineY);
      const leader = dy > 2
        ? `<line x1="${chartRight.toFixed(1)}" y1="${e.lineY.toFixed(1)}" x2="${labelX.toFixed(1)}" y2="${e.labelY.toFixed(1)}" stroke="${e.renk}" stroke-width="1.5" opacity="0.55"/>`
        : '';
      etiketler += `
        <g>
          ${leader}
          <line x1="${labelX.toFixed(1)}" y1="${e.labelY.toFixed(1)}" x2="${(labelX + 6).toFixed(1)}" y2="${e.labelY.toFixed(1)}" stroke="${e.renk}" stroke-width="2"/>
          <text x="${(labelX + 8).toFixed(1)}" y="${(e.labelY + 4).toFixed(1)}" class="trend-parti-etiket" fill="${e.renk}">${escapeHtml(e.parti)} · ${e.yuzde.toFixed(1)}%</text>
        </g>
      `;
    }

    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: auto;">
        ${yEkseni}
        ${cizgiler}
        ${etiketler}
        ${xEkseni}
      </svg>
    `;
  }

  function renderDegisimTablosu(icerikEl) {
    const el = icerikEl.querySelector('#trendA-tablo');
    if (!el) return;
    const fmt = window.AT.fmt;

    const secimler = SECIM_TIPLERI[state.secim_tipi].secimler;
    if (secimler.length < 2) {
      el.innerHTML = '<div class="trend-bos" style="padding: var(--space-4);">Yeterli seçim yok</div>';
      return;
    }

    const oncekiCkey = secimler[0];
    const sonrakiCkey = secimler[secimler.length - 1];
    const oncekiOylar = getPartiOylari(oncekiCkey) || {};
    const sonrakiOylar = getPartiOylari(sonrakiCkey) || {};

    const partilerSeti = new Set();
    for (const p in oncekiOylar) if (p !== '_toplam') partilerSeti.add(p);
    for (const p in sonrakiOylar) if (p !== '_toplam') partilerSeti.add(p);

    const satirlar = [];
    for (const p of partilerSeti) {
      const oOy = oncekiOylar[p] || 0;
      const sOy = sonrakiOylar[p] || 0;
      const oYzd = oncekiOylar._toplam > 0 ? (oOy / oncekiOylar._toplam) * 100 : 0;
      const sYzd = sonrakiOylar._toplam > 0 ? (sOy / sonrakiOylar._toplam) * 100 : 0;
      if (oYzd < 0.5 && sYzd < 0.5) continue;  // çok küçükleri atla
      satirlar.push({
        parti: p,
        oOy, sOy, oYzd, sYzd,
        fark: sYzd - oYzd,
      });
    }

    satirlar.sort((a, b) => b.sYzd - a.sYzd);

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">Parti</th>
            <th style="text-align:right;">${oncekiCkey} oy</th>
            <th style="text-align:right;">${oncekiCkey} %</th>
            <th style="text-align:right;">${sonrakiCkey} oy</th>
            <th style="text-align:right;">${sonrakiCkey} %</th>
            <th style="text-align:right;">Yüzde puan farkı</th>
          </tr>
        </thead>
        <tbody>
          ${satirlar.map(s => {
            const renk = s.fark >= 0 ? 'var(--signal-green)' : 'var(--signal-red)';
            const isaret = s.fark >= 0 ? '+' : '';
            return `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: var(--space-2);">
                    <span style="width: 12px; height: 12px; background: ${PARTI_RENK[s.parti] || '#888'}; border-radius: 2px; flex-shrink: 0;"></span>
                    <span style="font-weight: 500;">${escapeHtml(s.parti)}</span>
                  </div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n(s.oOy)}</td>
                <td class="num" style="text-align:right;">${fmt.n1(s.oYzd)}%</td>
                <td class="num" style="text-align:right;">${fmt.n(s.sOy)}</td>
                <td class="num" style="text-align:right;">${fmt.n1(s.sYzd)}%</td>
                <td class="num" style="text-align:right; color:${renk}; font-weight:600;">
                  ${isaret}${fmt.n1(s.fark)} pp
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function renderAciklamaA() {
    return `
      <div class="panel" style="margin-top: var(--space-6); background: var(--paper-2);">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Trend grafiğini nasıl yorumlamalı?</div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          <li><strong>HDP/YSP/DEM birleşik gösterilir:</strong> Aynı politik akım farklı yasal isimlerle 2018-2024 arası faaliyet gösterdi.</li>
          <li><strong>Yerel seçimler dahil değil:</strong> BB, BBB, IGM, BM seçimlerinde yerel dinamikler partiyi gölgeler.</li>
          <li><strong>"pp" = yüzde puanı:</strong> %25'ten %30'a çıkış +5 pp'dir, +%20 değildir.</li>
          <li><strong>İttifak değişiklikleri:</strong> 2018'de bağımsız çıkan bazı partiler 2023'te koalisyona girmiş olabilir. Bu trendde görülür.</li>
        </ul>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME B — BÖLGESEL ISI HARİTASI
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeB(container, icerikEl) {
    // Parti listesi: son seçimde ≥%2 olanlar
    const secimler = SECIM_TIPLERI[state.secim_tipi].secimler;
    const sonCkey = secimler[secimler.length - 1];

    // Geçici olarak Türkiye katmanına geç (parti listesi çıkarmak için)
    const eskiKatman = state.katman;
    const eskiKatmanDeger = state.katman_deger;
    state.katman = 'turkiye';
    state.katman_deger = '';
    const sonOylar = getPartiOylari(sonCkey);
    state.katman = eskiKatman;
    state.katman_deger = eskiKatmanDeger;

    let partiler = [];
    if (sonOylar) {
      partiler = Object.entries(sonOylar)
        .filter(([p, oy]) => p !== '_toplam' && sonOylar._toplam > 0 && (oy / sonOylar._toplam) >= 0.02)
        .sort((a, b) => b[1] - a[1])
        .map(([p]) => p);
    }

    if (partiler.length > 0 && (!state.secili_parti || !partiler.includes(state.secili_parti))) {
      state.secili_parti = partiler[0];
    }

    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          Bir partinin <strong>illere göre oy oranı</strong> ya da <strong>2018→2023 değişimi</strong>.
          Türkiye'nin parti haritasının bölgesel resmini gösterir.
        </p>
      </div>

      <div class="panel" style="margin-bottom: var(--space-6);">
        <div class="panel-title">Filtre</div>
        <div class="trend-filtre-row">
          <label class="trend-filtre-grup">
            <span class="trend-filtre-lbl">Seçim tipi</span>
            <select id="trendB-tip" class="trend-select">
              ${Object.entries(SECIM_TIPLERI).map(([k, v]) =>
                `<option value="${k}" ${k === state.secim_tipi ? 'selected' : ''}>${v.ad}</option>`
              ).join('')}
            </select>
          </label>
          <label class="trend-filtre-grup">
            <span class="trend-filtre-lbl">Parti</span>
            <select id="trendB-parti" class="trend-select" style="min-width: 220px;">
              ${partiler.map(p =>
                `<option value="${p}" ${p === state.secili_parti ? 'selected' : ''}>${p}</option>`
              ).join('')}
            </select>
          </label>
          <label class="trend-filtre-grup">
            <span class="trend-filtre-lbl">Mod</span>
            <select id="trendB-mod" class="trend-select">
              <option value="yuzde" ${!state.fark_modu ? 'selected' : ''}>Son seçimde oy %</option>
              <option value="fark"  ${state.fark_modu ? 'selected' : ''}>2018 → 2023 değişim (pp)</option>
            </select>
          </label>
        </div>
      </div>

      <div class="section-head">
        <h2>${escapeHtml(state.secili_parti)} — ${state.fark_modu ? 'değişim haritası' : 'oy haritası'}</h2>
        <span class="eyebrow">${state.fark_modu ? '2018→2023 yüzde puan farkı' : `${SECIM_TIPLERI[state.secim_tipi].secimler[1]} oy %`}</span>
      </div>

      <div class="panel" id="trendB-harita-panel" style="padding: var(--space-4); position: relative;">
        <div class="trend-harita-grid">
          <div class="trend-harita-sol">
            <div id="trendB-harita"></div>
          </div>
          <div class="trend-harita-sag">
            <div id="trendB-nuts1"></div>
          </div>
        </div>
        <div id="trendB-tooltip" class="trend-tooltip" style="display: none;"></div>
        <div class="trend-lejant" id="trendB-lejant"></div>
      </div>

      <div class="section-head">
        <h2>İl bazlı sıralama</h2>
        <span class="eyebrow">İlk 20 il</span>
      </div>
      <div class="panel" style="padding: 0; overflow: hidden;">
        <div id="trendB-tablo"></div>
      </div>

      ${renderAciklamaB()}
    `;

    icerikEl.querySelector('#trendB-tip').addEventListener('change', e => {
      state.secim_tipi = e.target.value;
      renderSekmeB(container, icerikEl);
    });
    icerikEl.querySelector('#trendB-parti').addEventListener('change', e => {
      state.secili_parti = e.target.value;
      renderSekmeB(container, icerikEl);
    });
    icerikEl.querySelector('#trendB-mod').addEventListener('change', e => {
      state.fark_modu = e.target.value === 'fark';
      renderSekmeB(container, icerikEl);
    });

    renderHaritaB(icerikEl);
    renderNuts1BarB(icerikEl);
    renderIlTabloB(icerikEl);
  }

  /**
   * Bir il için, seçili parti için: 
   *  - son seçimde yüzdesi (yuzde modu)
   *  - 2018→2023 fark pp (fark modu)
   */
  function getIlPartiYuzdesi(ilAdi, ckey) {
    const sec_il = cache.parti_iller.secimler[ckey];
    const il = sec_il?.iller?.[ilAdi];
    if (!il || !il.toplam) return null;
    // Normalize ederek toplam çıkar
    const norm = {};
    let toplam = 0;
    for (const [p, oy] of Object.entries(il)) {
      if (p === 'toplam' || p === 'il_sayisi') continue;
      const n = PARTI_NORMALIZE[p] || p;
      norm[n] = (norm[n] || 0) + (oy || 0);
      toplam += (oy || 0);
    }
    if (toplam === 0) return null;
    const oy = norm[state.secili_parti] || 0;
    return (oy / toplam) * 100;
  }

  function getIlPartiDeger(ilAdi) {
    const secimler = SECIM_TIPLERI[state.secim_tipi].secimler;
    const oncekiCkey = secimler[0];
    const sonrakiCkey = secimler[secimler.length - 1];

    if (state.fark_modu) {
      const oYzd = getIlPartiYuzdesi(ilAdi, oncekiCkey);
      const sYzd = getIlPartiYuzdesi(ilAdi, sonrakiCkey);
      if (oYzd === null || sYzd === null) return null;
      return { deger: sYzd - oYzd, oncekiYzd: oYzd, sonrakiYzd: sYzd };
    }
    const sYzd = getIlPartiYuzdesi(ilAdi, sonrakiCkey);
    if (sYzd === null) return null;
    return { deger: sYzd, sonrakiYzd: sYzd };
  }

  function renderHaritaB(icerikEl) {
    const il_data = {};
    for (const ilAdi of Object.keys(cache.geo.iller)) {
      const v = getIlPartiDeger(ilAdi);
      if (v !== null) il_data[ilAdi] = v;
    }

    const renkFn = state.fark_modu
      ? (d) => degisimRengi(d.deger)
      : (d) => partiOranRengi(d.deger, state.secili_parti);

    const fmt = window.AT.fmt;
    cizHarita({
      icerikEl,
      haritaId: 'trendB-harita',
      tooltipId: 'trendB-tooltip',
      panelId: 'trendB-harita-panel',
      lejantId: 'trendB-lejant',
      il_data,
      tooltipFn: (il, d) => {
        if (!d) return `<div class="tt-il">${escapeHtml(il)}</div><div class="tt-sub">Veri yok</div>`;
        if (state.fark_modu) {
          const isaret = d.deger > 0 ? '+' : '';
          return `<div class="tt-il">${escapeHtml(il)}</div>
                  <div class="tt-deger">${isaret}${fmt.n1(d.deger)} pp</div>
                  <div class="tt-sub">${fmt.n1(d.oncekiYzd)}% → ${fmt.n1(d.sonrakiYzd)}%</div>`;
        }
        return `<div class="tt-il">${escapeHtml(il)}</div>
                <div class="tt-deger">${fmt.n1(d.deger)}%</div>
                <div class="tt-sub">${escapeHtml(state.secili_parti)}</div>`;
      },
      renkFn,
      onIlClick: () => {},
      lejant: state.fark_modu ? lejantFark() : lejantOran(state.secili_parti),
    });
  }

  function renderNuts1BarB(icerikEl) {
    const el = icerikEl.querySelector('#trendB-nuts1');
    if (!el) return;
    const fmt = window.AT.fmt;
    const sec_tr = cache.parti_tr.secimler[SECIM_TIPLERI[state.secim_tipi].secimler[1]];
    if (!sec_tr || !sec_tr.nuts1) {
      el.innerHTML = '<div class="trend-bos">Veri yok</div>';
      return;
    }

    // Her NUTS-1 için seçili parti yüzdesi (son seçim)
    const veri = [];
    for (const [kod, nuts] of Object.entries(sec_tr.nuts1)) {
      const norm = {};
      let toplam = 0;
      for (const [p, oy] of Object.entries(nuts)) {
        if (p === 'toplam' || p === 'il_sayisi') continue;
        const n = PARTI_NORMALIZE[p] || p;
        norm[n] = (norm[n] || 0) + (oy || 0);
        toplam += (oy || 0);
      }
      if (toplam === 0) continue;
      const oy = norm[state.secili_parti] || 0;
      const yuzde = (oy / toplam) * 100;
      const ad = cache.geo.nuts1[kod]?.ad || kod;
      veri.push({ kod, ad, yuzde });
    }
    veri.sort((a, b) => b.yuzde - a.yuzde);

    const maxYzd = veri.length > 0 ? Math.max(...veri.map(v => v.yuzde)) : 1;

    const satirlar = veri.map(v => {
      const barW = (v.yuzde / maxYzd) * 100;
      const renk = PARTI_RENK[state.secili_parti] || '#888';
      return `
        <div class="trend-nuts-row">
          <div class="trend-nuts-ad">${escapeHtml(v.ad)}</div>
          <div class="trend-nuts-bar">
            <div class="trend-nuts-fill" style="width: ${barW.toFixed(1)}%; background: ${renk};"></div>
          </div>
          <div class="trend-nuts-deger">%${fmt.n1(v.yuzde)}</div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="yan-grafik-blok">
        <div class="yan-grafik-baslik">${escapeHtml(state.secili_parti)} — NUTS-1 bazlı</div>
        <div class="trend-nuts-liste">${satirlar}</div>
      </div>
    `;
  }

  function renderIlTabloB(icerikEl) {
    const el = icerikEl.querySelector('#trendB-tablo');
    if (!el) return;
    const fmt = window.AT.fmt;

    const veriler = [];
    for (const ilAdi of Object.keys(cache.geo.iller)) {
      const v = getIlPartiDeger(ilAdi);
      if (v === null) continue;
      veriler.push({ il: ilAdi, ...v });
    }
    veriler.sort((a, b) => b.deger - a.deger);
    const ilk20 = veriler.slice(0, 20);

    if (ilk20.length === 0) {
      el.innerHTML = '<div class="trend-bos" style="padding: var(--space-4);">Veri yok</div>';
      return;
    }

    const baslik = state.fark_modu ? 'Değişim (pp)' : `${escapeHtml(state.secili_parti)} oy %`;
    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left; width:40px;">#</th>
            <th style="text-align:left;">İl</th>
            ${state.fark_modu ? '<th style="text-align:right;">2018 %</th><th style="text-align:right;">2023 %</th>' : ''}
            <th style="text-align:right;">${baslik}</th>
          </tr>
        </thead>
        <tbody>
          ${ilk20.map((v, i) => {
            const renk = state.fark_modu
              ? (v.deger >= 0 ? 'var(--signal-green)' : 'var(--signal-red)')
              : (PARTI_RENK[state.secili_parti] || 'var(--ink)');
            const isaret = state.fark_modu && v.deger > 0 ? '+' : '';
            return `
              <tr>
                <td><span class="trend-rank">${i + 1}</span></td>
                <td><span style="font-weight: 500;">${escapeHtml(v.il)}</span></td>
                ${state.fark_modu ? `<td class="num" style="text-align:right;">${fmt.n1(v.oncekiYzd)}%</td><td class="num" style="text-align:right;">${fmt.n1(v.sonrakiYzd)}%</td>` : ''}
                <td class="num" style="text-align:right; color:${renk}; font-weight:600;">
                  ${isaret}${fmt.n1(v.deger)}${state.fark_modu ? ' pp' : '%'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function lejantOran(parti) {
    const renk = PARTI_RENK[parti] || '#888';
    return [
      { renk: partiOranRengi(5, parti),  etiket: '%5 altı' },
      { renk: partiOranRengi(15, parti), etiket: '%5-20' },
      { renk: partiOranRengi(30, parti), etiket: '%20-40' },
      { renk: partiOranRengi(50, parti), etiket: '%40-60' },
      { renk: partiOranRengi(70, parti), etiket: '%60 üstü' },
    ];
  }

  function lejantFark() {
    return [
      { renk: degisimRengi(-15), etiket: '-15 pp altı' },
      { renk: degisimRengi(-7),  etiket: '-15 ile -3 pp' },
      { renk: degisimRengi(0),   etiket: '-3 ile +3 pp' },
      { renk: degisimRengi(7),   etiket: '+3 ile +15 pp' },
      { renk: degisimRengi(20),  etiket: '+15 pp üstü' },
    ];
  }

  function renderAciklamaB() {
    return `
      <div class="panel" style="margin-top: var(--space-6); background: var(--paper-2);">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Harita haritalamasını nasıl yorumlamalı?</div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          <li><strong>Oy haritası modu:</strong> Partinin tonunda koyulaşma, daha güçlü oldukları yerleri gösterir.</li>
          <li><strong>Değişim modu:</strong> Yeşil = parti güçlendi, kırmızı = parti kaybetti. Türkiye'nin politik kayma haritası.</li>
          <li><strong>Sadece son seçimde ≥%2 partiler:</strong> Çok küçük partiler liste dışında.</li>
        </ul>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME C — KOALİSYON ANALİZİ
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeC(container, icerikEl) {
    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          Türkiye'nin <strong>politik blok yapısı</strong> 2018'den 2023'e nasıl genişledi/daraldı?
          Cumhur, Millet, Emek+Özgürlük ittifakları ve ATA bloğu.
        </p>
        <p style="font-size: 12px; color: var(--ink-3); margin: var(--space-3) 0 0; line-height: 1.6;">
          <strong>Not:</strong> İttifak yapısı her seçim için farklı olabilir. Bu sayfa
          her seçimdeki <strong>resmi bildirilen ittifak üyelerinin oylarını toplar</strong>.
          2018'de Millet İttifakı'nda DEVA ve GELECEK yoktu (parti olarak yoktular), 2023'te eklendi.
        </p>
      </div>

      ${renderFiltrePanel('C')}

      <div class="section-head">
        <h2>İttifak oyları — ${getKapsamBaslik()}</h2>
        <span class="eyebrow">Her ittifakın seçimdeki toplam oy yüzdesi</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="trendC-grafik"></div>
      </div>

      <div class="section-head">
        <h2>İttifak değişim tablosu</h2>
        <span class="eyebrow">2018'den 2023'e blok hareketi</span>
      </div>
      <div class="panel" style="padding: 0; overflow: hidden;">
        <div id="trendC-tablo"></div>
      </div>

      ${renderAciklamaC()}
    `;

    bindFiltrePanel(icerikEl, () => renderSekmeC(container, icerikEl));
    renderKoalisyonGrafik(icerikEl);
    renderKoalisyonTablo(icerikEl);
  }

  /**
   * Belirli bir seçim + kapsam için her koalisyonun oy yüzdesi.
   * Returns: { koalisyon: yuzde, ..., Diğer: yuzde }
   */
  function getKoalisyonYuzdeleri(ckey) {
    const oylar = getPartiOylari(ckey);
    if (!oylar) return null;

    const yil = parseInt(ckey.split('_')[0], 10);
    const tanim = yil >= 2023 ? KOALISYON_2023 : KOALISYON_2018;

    const sonuc = {};
    let tanimliToplam = 0;
    for (const [koal, partiler] of Object.entries(tanim)) {
      let oy = 0;
      for (const p of partiler) {
        oy += oylar[p] || 0;
      }
      sonuc[koal] = oylar._toplam > 0 ? (oy / oylar._toplam) * 100 : 0;
      tanimliToplam += oy;
    }
    sonuc['Diğer'] = oylar._toplam > 0 ? ((oylar._toplam - tanimliToplam) / oylar._toplam) * 100 : 0;
    return sonuc;
  }

  function renderKoalisyonGrafik(icerikEl) {
    const el = icerikEl.querySelector('#trendC-grafik');
    if (!el) return;
    const fmt = window.AT.fmt;

    const secimler = SECIM_TIPLERI[state.secim_tipi].secimler;
    const veri = {};  // ckey → { koalisyon: yuzde }
    for (const ckey of secimler) {
      veri[ckey] = getKoalisyonYuzdeleri(ckey);
    }

    // Tüm koalisyonları topla
    const koalisyonlar = new Set();
    for (const ckey of secimler) {
      if (!veri[ckey]) continue;
      for (const k of Object.keys(veri[ckey])) {
        koalisyonlar.add(k);
      }
    }
    // "Diğer" sona
    const koalisyonlarSiraliBase = Array.from(koalisyonlar).filter(k => k !== 'Diğer');
    const koalisyonlarSirali = [...koalisyonlarSiraliBase, 'Diğer'];

    // Her seçim için yığılmış bar
    const fmtL = (y) => `<text class="trend-eksen">${y}</text>`;

    let rows = '';
    for (const ckey of secimler) {
      const yuzdeler = veri[ckey] || {};
      const yil = ckey.split('_')[0];
      let bar = '';
      for (const koal of koalisyonlarSirali) {
        const yzd = yuzdeler[koal] || 0;
        if (yzd < 0.5) continue;
        const renk = KOALISYON_RENK[koal] || '#aaa';
        bar += `<div class="trend-koal-dilim" style="width: ${yzd.toFixed(2)}%; background: ${renk};"
                      title="${koal}: ${fmt.n1(yzd)}%">
          ${yzd >= 5 ? `<span class="trend-koal-dilim-text">${fmt.n1(yzd)}%</span>` : ''}
        </div>`;
      }
      rows += `
        <div class="trend-koal-row">
          <div class="trend-koal-yil">${yil}</div>
          <div class="trend-koal-bar">${bar}</div>
        </div>
      `;
    }

    // Lejant
    let lejant = '';
    for (const k of koalisyonlarSirali) {
      const renk = KOALISYON_RENK[k] || '#aaa';
      lejant += `<span class="trend-koal-leg">
        <span class="trend-koal-leg-renk" style="background: ${renk};"></span>
        ${escapeHtml(k)}
      </span>`;
    }

    el.innerHTML = `
      <div class="trend-koal-wrap">
        ${rows}
        <div class="trend-koal-lejant">${lejant}</div>
      </div>
    `;
  }

  function renderKoalisyonTablo(icerikEl) {
    const el = icerikEl.querySelector('#trendC-tablo');
    if (!el) return;
    const fmt = window.AT.fmt;

    const secimler = SECIM_TIPLERI[state.secim_tipi].secimler;
    if (secimler.length < 2) {
      el.innerHTML = '<div class="trend-bos" style="padding: var(--space-4);">Yeterli seçim yok</div>';
      return;
    }
    const oncekiCkey = secimler[0];
    const sonrakiCkey = secimler[secimler.length - 1];
    const onceki = getKoalisyonYuzdeleri(oncekiCkey) || {};
    const sonraki = getKoalisyonYuzdeleri(sonrakiCkey) || {};

    const koalisyonlar = new Set([...Object.keys(onceki), ...Object.keys(sonraki)]);
    const satirlar = [];
    for (const k of koalisyonlar) {
      const oYzd = onceki[k] || 0;
      const sYzd = sonraki[k] || 0;
      if (oYzd < 0.5 && sYzd < 0.5) continue;
      satirlar.push({ koal: k, oYzd, sYzd, fark: sYzd - oYzd });
    }
    satirlar.sort((a, b) => b.sYzd - a.sYzd);

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">İttifak</th>
            <th style="text-align:right;">${oncekiCkey} %</th>
            <th style="text-align:right;">${sonrakiCkey} %</th>
            <th style="text-align:right;">Fark (pp)</th>
          </tr>
        </thead>
        <tbody>
          ${satirlar.map(s => {
            const renk = s.fark >= 0 ? 'var(--signal-green)' : 'var(--signal-red)';
            const isaret = s.fark >= 0 ? '+' : '';
            return `
              <tr>
                <td>
                  <div style="display: flex; align-items: center; gap: var(--space-2);">
                    <span style="width: 12px; height: 12px; background: ${KOALISYON_RENK[s.koal] || '#888'}; border-radius: 2px; flex-shrink: 0;"></span>
                    <span style="font-weight: 500;">${escapeHtml(s.koal)}</span>
                  </div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n1(s.oYzd)}%</td>
                <td class="num" style="text-align:right;">${fmt.n1(s.sYzd)}%</td>
                <td class="num" style="text-align:right; color:${renk}; font-weight:600;">
                  ${isaret}${fmt.n1(s.fark)} pp
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function renderAciklamaC() {
    return `
      <div class="panel" style="margin-top: var(--space-6); background: var(--paper-2);">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Koalisyon analizi notları</div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          <li><strong>İttifak üyelikleri değişebilir:</strong> 2018'de Cumhur (AKP, MHP, BBP), Millet (CHP, İYİ, SP, DP).
              2023'te genişledi (Cumhur'a YENİDEN REFAH ve HÜDA PAR; Millet'e DEVA ve GELECEK).</li>
          <li><strong>HDP/YSP/Emek ve Özgürlük birleşik gösterilir:</strong> 2018'de HDP olarak bağımsız seçime girdi, 2023'te
              Emek ve Özgürlük İttifakı'nın çatısı altında (DEM Parti olarak) yer aldı. Aynı politik akımın trendini görmek için
              <strong>tek kategori olarak izleniyor</strong>.</li>
          <li><strong>"Vatan/Perinçek" 2018'de:</strong> Doğu Perinçek CB oyları + Vatan Partisi MV oyları birleşik. 2023'te marjinal kaldığı için ATA/Diğer'e dağıldı.</li>
        </ul>
        <p class="footnote" style="margin-top: var(--space-4);">
          "pp" = yüzde puanı. Toplam %100'e yakın olmalı; çok düşükse bazı küçük partiler "Diğer"de.
        </p>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // ORTAK HARİTA ÇİZİMİ
  // ═══════════════════════════════════════════════════════════════
  function cizHarita({ icerikEl, haritaId, tooltipId, panelId, lejantId,
                       il_data, tooltipFn, renkFn, onIlClick, lejant }) {
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
      const klass = `trend-il-path ${veri_yok ? 'veri-yok' : ''}`;
      const d = geometryToPath(feat.geometry);
      return `<path class="${klass}" d="${d}" fill="${renk}" data-il="${escapeHtml(il)}"></path>`;
    }).join('');

    haritaEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;

    if (lejantEl) {
      lejantEl.innerHTML = lejant.map(item => `
        <span class="trend-lejant-item">
          <span class="trend-lejant-kutu" style="background:${item.renk}"></span>
          <span>${item.etiket}</span>
        </span>
      `).join('') + `
        <span class="trend-lejant-item" style="margin-left: var(--space-3);">
          <span class="trend-lejant-kutu" style="background:var(--paper-3); opacity:0.5;"></span>
          <span>Veri yok</span>
        </span>
      `;
    }

    haritaEl.querySelectorAll('.trend-il-path').forEach(p => {
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
  // RENK FONKSIYONLARI
  // ═══════════════════════════════════════════════════════════════
  function partiOranRengi(yuzde, parti) {
    // Bir parti için açıktan koyuya geçiş (oran ne kadar yüksekse renk koyu)
    const baseRenk = PARTI_RENK[parti] || '#888888';
    // Açıklık seviyesi: 0% → çok açık, 80%+ → tam parti rengi
    let opacity;
    if (yuzde < 5)       opacity = 0.15;
    else if (yuzde < 15) opacity = 0.30;
    else if (yuzde < 25) opacity = 0.45;
    else if (yuzde < 35) opacity = 0.60;
    else if (yuzde < 50) opacity = 0.75;
    else if (yuzde < 65) opacity = 0.88;
    else                 opacity = 1.0;

    // baseRenk üzerine paper rengi (#fdfaf2) ile karıştır
    return mixColor(baseRenk, '#fdfaf2', opacity);
  }

  function degisimRengi(pp) {
    // -20 ile +20 arası — kırmızı (azalma) - bej (sıfır) - yeşil (artış)
    if (pp < -15) return '#7a1f10';
    if (pp < -7)  return '#b8311a';
    if (pp < -3)  return '#dca858';
    if (pp < 3)   return '#c8c089';
    if (pp < 7)   return '#9eb39b';
    if (pp < 15)  return '#5a8c5a';
    return '#2d6b3f';
  }

  function mixColor(c1, c2, ratio) {
    // c1'in ratio'su, c2'nin (1-ratio)'su
    const p1 = parseHex(c1);
    const p2 = parseHex(c2);
    const r = Math.round(p1[0] * ratio + p2[0] * (1 - ratio));
    const g = Math.round(p1[1] * ratio + p2[1] * (1 - ratio));
    const b = Math.round(p1[2] * ratio + p2[2] * (1 - ratio));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function parseHex(hex) {
    hex = hex.replace('#', '');
    return [parseInt(hex.slice(0,2), 16), parseInt(hex.slice(2,4), 16), parseInt(hex.slice(4,6), 16)];
  }

  // ═══════════════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }

  // ═══════════════════════════════════════════════════════════════
  // STİLLER
  // ═══════════════════════════════════════════════════════════════
  function renderStiller() {
    return `
      <style>
        /* Sekmeler */
        .trend-sekmeler {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
          margin-bottom: var(--space-6);
        }
        .trend-sekme {
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
        .trend-sekme:hover {
          border-color: var(--brand-gold);
          transform: translateY(-1px);
        }
        .trend-sekme.active {
          border-color: var(--brand-gold);
          border-width: 2px;
          padding: calc(var(--space-4) - 1px) calc(var(--space-5) - 1px);
          background: var(--paper-2);
        }
        .trend-sekme .sekme-num {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 500;
          color: var(--brand-gold);
          line-height: 1;
        }
        .trend-sekme .sekme-baslik {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
          margin-top: var(--space-2);
        }
        .trend-sekme .sekme-sub {
          font-size: 12px;
          color: var(--ink-3);
          margin-top: 2px;
        }

        /* Filtre */
        .trend-filtre-row {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-4);
          align-items: flex-end;
        }
        .trend-filtre-grup {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          min-width: 180px;
        }
        .trend-filtre-lbl {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .trend-select {
          font-family: var(--font-body);
          font-size: 13.5px;
          color: var(--ink);
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-3);
          cursor: pointer;
          min-width: 200px;
        }
        .trend-select:focus {
          outline: 2px solid var(--brand-gold);
          outline-offset: -1px;
        }

        /* Çizgi grafik */
        .trend-eksen {
          font-family: var(--font-mono);
          font-size: 11px;
          fill: var(--ink-3);
        }
        .trend-parti-etiket {
          font-family: var(--font-body);
          font-size: 11.5px;
          font-weight: 600;
        }
        .trend-bos {
          padding: var(--space-4);
          color: var(--ink-3);
          font-style: italic;
          text-align: center;
        }
        .trend-rank {
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--ink-4);
        }

        /* Harita grid */
        .trend-harita-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--space-5);
          align-items: stretch;
        }
        .trend-harita-sol { min-width: 0; }
        .trend-harita-sag {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        [id$="-harita-panel"] { position: relative; }
        #trendB-harita {
          width: 100%;
          aspect-ratio: 5 / 3;
          max-height: 380px;
          overflow: hidden;
        }
        #trendB-harita svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .trend-il-path {
          stroke: #fdfaf2;
          stroke-width: 0.5;
          cursor: pointer;
          transition: stroke-width 80ms ease;
        }
        .trend-il-path:hover {
          stroke: var(--ink);
          stroke-width: 1.5;
        }
        .trend-il-path.veri-yok {
          fill: var(--paper-3);
          opacity: 0.5;
          cursor: default;
        }
        .trend-tooltip {
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
        .trend-tooltip .tt-il {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
        }
        .trend-tooltip .tt-deger {
          font-family: var(--font-mono);
          font-weight: 600;
        }
        .trend-tooltip .tt-sub {
          font-size: 11px;
          color: var(--paper-3);
          margin-top: 2px;
        }
        .trend-lejant {
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
        .trend-lejant-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .trend-lejant-kutu {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.15);
        }

        /* NUTS-1 bar listesi (Sekme B) */
        .trend-nuts-liste {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }
        .trend-nuts-row {
          display: grid;
          grid-template-columns: 100px 1fr 50px;
          align-items: center;
          gap: var(--space-2);
          font-size: 11px;
        }
        .trend-nuts-ad {
          color: var(--ink-2);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .trend-nuts-bar {
          background: var(--paper-2);
          height: 10px;
          border-radius: 2px;
          overflow: hidden;
        }
        .trend-nuts-fill { height: 100%; }
        .trend-nuts-deger {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          color: var(--ink);
          text-align: right;
        }

        /* Koalisyon analizi (Sekme C) */
        .trend-koal-wrap {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .trend-koal-row {
          display: grid;
          grid-template-columns: 80px 1fr;
          gap: var(--space-3);
          align-items: center;
        }
        .trend-koal-yil {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
          color: var(--ink-2);
        }
        .trend-koal-bar {
          display: flex;
          height: 32px;
          background: var(--paper-2);
          border-radius: 3px;
          overflow: hidden;
        }
        .trend-koal-dilim {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .trend-koal-dilim-text {
          font-family: var(--font-mono);
          font-size: 12px;
          color: rgba(255,255,255,0.95);
          font-weight: 600;
          padding: 0 6px;
          white-space: nowrap;
          text-shadow: 0 0 2px rgba(0,0,0,0.4);
        }
        .trend-koal-lejant {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          margin-top: var(--space-2);
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
          font-size: 12px;
          color: var(--ink-2);
        }
        .trend-koal-leg {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .trend-koal-leg-renk {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.1);
        }

        /* Mobil */
        @media (max-width: 900px) {
          .trend-harita-grid {
            grid-template-columns: 1fr;
          }
          #trendB-harita {
            aspect-ratio: 16 / 10;
          }
        }
      </style>
    `;
  }
})();
