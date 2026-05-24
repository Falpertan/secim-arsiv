/* ─────────────────────────────────────────────────────────
   Bölge Profili module v1 — Bir il/ilçenin tüm dosyası
   
   Tek sayfada şunlar:
     1. Haritada konumu (mini Türkiye haritası)
     2. Özet kutuları (nüfus, ortalama yaş, üni+, 65+)
     3. Nüfus hareketi (2018→2024 çizgi)
     4. Demografi (yıl filtreli yaş piramidi + eğitim)
     5. Seçim tarihi (filtreli, tüm seçimler)
     6. Komşu ilçeler (aynı ildeki diğer ilçeler)
   
   Veri:
     data/aggregates/parti_iller.json
     data/aggregates/parti_ilceler.json
     data/aggregates/meta_iller.json
     data/aggregates/meta_ilceler.json
     data/aggregates/ilce_demografi_ozet.json.gz  (tarayıcıda açılır)
     data/aggregates/tr_demografi_ozet.json
     data/aggregates/demografi_iller_manifest.json
     data/aggregates/iller_demografi/il_<X>.json (lazy)
     data/core/geo.json
     data/core/turkiye_iller.geojson
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // ÖNBELLEK
  // ═══════════════════════════════════════════════════════════════
  const cache = {
    parti_iller: null,
    parti_ilceler: null,
    meta_iller: null,
    meta_ilceler: null,
    ilce_demografi: null,
    tr_demografi: null,
    iller_manifest: null,
    il_demografileri: {},  // lazy load: il_adi → demografi
    geo: null,
    geojson: null,
  };

  const state = {
    kapsam_tipi: 'il',   // 'nuts1', 'nuts2', 'il', 'ilce'
    nuts1_kod: '',
    nuts2_kod: '',
    il: 'ANKARA',
    ilce: '',  // boş = tüm il
    secili_yil: 2024,
    secili_secim_tipi: 'hepsi',  // 'hepsi', 'CB', 'MV', 'yerel'
  };

  // ═══════════════════════════════════════════════════════════════
  // PARTİ NORMALİZASYONU (diğer modüllerle uyumlu)
  // ═══════════════════════════════════════════════════════════════
  const PARTI_NORMALIZE = {
    'HDP': 'DEM/HDP', 'YSP': 'DEM/HDP',
    'YEŞİL SOL PARTİ': 'DEM/HDP', 'YEŞİL SOL PARTI': 'DEM/HDP',
    'DEM Parti': 'DEM/HDP', 'DEM PARTİ': 'DEM/HDP',
    'AKP': 'AK PARTİ', 'AK Parti': 'AK PARTİ',
    'SAADET PARTİSİ': 'SAADET',
    'RECEP TAYYİP ERDOĞAN': 'Erdoğan (CB)',
    'MUHARREM İNCE': 'İnce (CB)',
    'MERAL AKŞENER': 'Akşener (CB)',
    'SELAHATTİN DEMİRTAŞ': 'Demirtaş (CB)',
    'TEMEL KARAMOLLAOĞLU': 'Karamollaoğlu (CB)',
    'DOĞU PERİNÇEK': 'Perinçek (CB)',
    'KEMAL KILIÇDAROĞLU': 'Kılıçdaroğlu (CB)',
    'SİNAN OĞAN': 'Oğan (CB)',
  };

  const PARTI_RENK = {
    'AK PARTİ': '#dda01b', 'CHP': '#c8311a', 'MHP': '#b8281b',
    'İYİ PARTİ': '#3f7eb3', 'DEM/HDP': '#9b3e94', 'SAADET': '#1a5c89',
    'YENİDEN REFAH': '#1f6e3c', 'ZAFER PARTİSİ': '#3a3a3a',
    'TİP': '#a01818', 'HÜDA PAR': '#2a6e3f',
    'DEVA PARTİSİ': '#5a7da0', 'GELECEK PARTİSİ': '#7a5a8c',
    'MEMLEKET': '#6b4a8c', 'BBP': '#2e5494',
    'Erdoğan (CB)': '#a87308', 'Kılıçdaroğlu (CB)': '#8c2715',
    'İnce (CB)': '#d97a4a', 'Akşener (CB)': '#2b5d8c',
    'Demirtaş (CB)': '#6c2a6e', 'Karamollaoğlu (CB)': '#0e466b',
    'Perinçek (CB)': '#555', 'Oğan (CB)': '#5a5a5a',
    'DİĞER': '#888888',
  };

  const SECIM_TIP_MAP = {
    'CB':  'Cumhurbaşkanlığı',
    'CB1': 'Cumhurbaşkanlığı 1. tur',
    'CB2': 'Cumhurbaşkanlığı 2. tur',
    'MV':  'Milletvekili',
    'BBB': 'Büyükşehir Belediye Bşk.',
    'BB':  'Belediye Başkanlığı',
    'IGM': 'İl Genel Meclisi',
    'BM':  'Belediye Meclisi',
  };

  const YAS_KATEGORILERI = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];

  // İl dosyalarında eğitim adları kısaltılmış (build_demografi.py birleştirmiş)
  const EGITIM_KISALT = {
    'okuma_yazma_bilmeyen': 'Okur-yazar değil',
    'okuryazar':            'Okur-yazar (mezun değil)',
    'ilkokul_ortaokul':     'İlkokul/Ortaokul',
    'lise_dengi':           'Lise/Dengi',
    'universite_plus':      'Üniversite +',
    'bilinmeyen':           'Bilinmeyen',
  };

  // Yaş orta noktaları (ortalama yaş hesabı için)
  const YAS_ORTA = {
    '18-24': 21,
    '25-34': 29.5,
    '35-44': 39.5,
    '45-54': 49.5,
    '55-64': 59.5,
    '65+':   72,
  };

  // ═══════════════════════════════════════════════════════════════
  // VERİ YÜKLEME
  // ═══════════════════════════════════════════════════════════════
  async function loadCoreData() {
    if (cache.parti_iller && cache.geo) return;

    const [pIller, pIlceler, mIller, mIlceler, ilceDemografi, trDemografi, illerManifest, geo, geojson] = await Promise.all([
      fetch('data/aggregates/parti_iller.json').then(r => r.ok ? r.json() : Promise.reject('parti_iller.json: ' + r.status)),
      fetch('data/aggregates/parti_ilceler.json').then(r => r.ok ? r.json() : Promise.reject('parti_ilceler.json: ' + r.status)),
      fetch('data/aggregates/meta_iller.json').then(r => r.ok ? r.json() : Promise.reject('meta_iller.json: ' + r.status)),
      fetch('data/aggregates/meta_ilceler.json').then(r => r.ok ? r.json() : Promise.reject('meta_ilceler.json: ' + r.status)),
      window.AT.fetchJSONAuto('data/aggregates/ilce_demografi_ozet.json'),
      fetch('data/aggregates/tr_demografi_ozet.json').then(r => r.ok ? r.json() : Promise.reject('tr_demografi_ozet.json: ' + r.status)),
      fetch('data/aggregates/demografi_iller_manifest.json').then(r => r.ok ? r.json() : Promise.reject('demografi_iller_manifest.json: ' + r.status)),
      fetch('data/core/geo.json').then(r => r.ok ? r.json() : Promise.reject('geo.json: ' + r.status)),
      fetch('data/core/turkiye_iller.geojson').then(r => r.ok ? r.json() : Promise.reject('turkiye_iller.geojson: ' + r.status)),
    ]);

    cache.parti_iller = pIller;
    cache.parti_ilceler = pIlceler;
    cache.meta_iller = mIller;
    cache.meta_ilceler = mIlceler;
    cache.ilce_demografi = ilceDemografi;
    cache.tr_demografi = trDemografi;
    cache.iller_manifest = illerManifest;
    cache.geo = geo;
    cache.geojson = geojson;
  }

  /**
   * Bir ilin demografi dosyasını lazy-load eder.
   * Manifest'te yol doğrudan string olarak verilmiş:
   *   { iller: { "MUĞLA": "data/demografi_iller/il_MUĞLA.json", ... } }
   */
  async function loadIlDemografi(il) {
    if (cache.il_demografileri[il]) return cache.il_demografileri[il];
    const manifest = cache.iller_manifest;
    let yol = manifest?.iller?.[il];
    if (!yol) return null;
    // Manifest'te obje olarak gelirse (ileride değişebilir), 'dosya' alanını kullan
    if (typeof yol === 'object') {
      yol = yol.dosya || yol.path || yol.file;
    }
    if (!yol) return null;
    try {
      const data = await fetch(yol).then(r => r.ok ? r.json() : null);
      if (data) cache.il_demografileri[il] = data;
      return data;
    } catch (e) {
      return null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ANA FONKSIYON
  // ═══════════════════════════════════════════════════════════════
  window.Modules.bolge = async function(container, ctx) {
    container.innerHTML = `<div class="loading">Bölge verisi yükleniyor</div>`;

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
        <span class="eyebrow">Modül · 07</span>
        <h1>Bölge profili</h1>
        <p class="lede">Veri yüklenemedi: ${e}</p>
      </header>
      <div class="panel">
        <p style="color:var(--ink-2);">
          Bu modül için bütün aggregate ve demografi dosyaları gerekli.
          <span class="mono">python tools/build_aggregates.py --all</span> ve
          <span class="mono">python tools/build_demografi.py</span> çalıştırılmış olmalı.
        </p>
      </div>
    `;
  }

  async function renderModule(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Modül · 07 · Tek sayfada her şey</span>
        <h1>Bölge profili</h1>
        <p class="lede">
          Bir bölge, il veya ilçenin <strong>tüm dosyası</strong> tek sayfada:
          haritadaki yeri, nüfus hareketi, demografisi, seçim tarihi ve komşu birimler.
        </p>
      </header>

      <div class="panel" style="margin-bottom: var(--space-5);">
        <div class="panel-title">Bölge seçin</div>
        <div class="bolge-secici">
          <label class="bolge-secici-grup">
            <span class="bolge-secici-lbl">Kapsam tipi</span>
            <select id="bolge-tip" class="bolge-select" style="min-width: 160px;">
              <option value="nuts1" ${state.kapsam_tipi === 'nuts1' ? 'selected' : ''}>NUTS-1 bölgesi</option>
              <option value="nuts2" ${state.kapsam_tipi === 'nuts2' ? 'selected' : ''}>NUTS-2 alt bölgesi</option>
              <option value="il"    ${state.kapsam_tipi === 'il' ? 'selected' : ''}>İl</option>
              <option value="ilce"  ${state.kapsam_tipi === 'ilce' ? 'selected' : ''}>İlçe</option>
            </select>
          </label>
          <div id="bolge-tip-detay" class="bolge-tip-detay"></div>
        </div>
      </div>

      <div id="bolge-icerik"></div>

      ${renderStiller()}
    `;

    renderTipDetay(container);

    container.querySelector('#bolge-tip').addEventListener('change', async (e) => {
      state.kapsam_tipi = e.target.value;
      // Defaults
      if (state.kapsam_tipi === 'nuts1' && !state.nuts1_kod) {
        state.nuts1_kod = Object.keys(cache.geo.nuts1)[0];
      } else if (state.kapsam_tipi === 'nuts2' && !state.nuts2_kod) {
        state.nuts2_kod = Object.keys(cache.geo.nuts2)[0];
      } else if (state.kapsam_tipi === 'ilce' && !state.ilce) {
        state.ilce = ilkIlceyiAl(state.il);
      }
      renderTipDetay(container);
      await renderIcerik(container);
    });

    await renderIcerik(container);
  }

  /**
   * Kapsam tipine göre uygun seçicileri çizer.
   */
  function renderTipDetay(container) {
    const el = container.querySelector('#bolge-tip-detay');
    if (!el) return;

    if (state.kapsam_tipi === 'nuts1') {
      const opts = Object.entries(cache.geo.nuts1).map(([k, info]) =>
        `<option value="${k}" ${k === state.nuts1_kod ? 'selected' : ''}>${k} · ${escapeHtml(info.ad)}</option>`
      ).join('');
      el.innerHTML = `
        <label class="bolge-secici-grup">
          <span class="bolge-secici-lbl">Bölge</span>
          <select id="bolge-nuts1" class="bolge-select" style="min-width: 240px;">${opts}</select>
        </label>
      `;
      el.querySelector('#bolge-nuts1').addEventListener('change', async (e) => {
        state.nuts1_kod = e.target.value;
        await renderIcerik(container);
      });

    } else if (state.kapsam_tipi === 'nuts2') {
      const opts = Object.entries(cache.geo.nuts2).map(([k, info]) =>
        `<option value="${k}" ${k === state.nuts2_kod ? 'selected' : ''}>${k} · ${escapeHtml(info.ad)}</option>`
      ).join('');
      el.innerHTML = `
        <label class="bolge-secici-grup">
          <span class="bolge-secici-lbl">Alt bölge</span>
          <select id="bolge-nuts2" class="bolge-select" style="min-width: 260px;">${opts}</select>
        </label>
      `;
      el.querySelector('#bolge-nuts2').addEventListener('change', async (e) => {
        state.nuts2_kod = e.target.value;
        await renderIcerik(container);
      });

    } else if (state.kapsam_tipi === 'il') {
      const iller = Object.keys(cache.geo.iller).sort((a, b) => a.localeCompare(b, 'tr'));
      const opts = iller.map(il =>
        `<option value="${il}" ${il === state.il ? 'selected' : ''}>${escapeHtml(il)}</option>`
      ).join('');
      el.innerHTML = `
        <label class="bolge-secici-grup">
          <span class="bolge-secici-lbl">İl</span>
          <select id="bolge-il" class="bolge-select">${opts}</select>
        </label>
      `;
      el.querySelector('#bolge-il').addEventListener('change', async (e) => {
        state.il = e.target.value;
        await renderIcerik(container);
      });

    } else if (state.kapsam_tipi === 'ilce') {
      const iller = Object.keys(cache.geo.iller).sort((a, b) => a.localeCompare(b, 'tr'));
      const ilOpts = iller.map(il =>
        `<option value="${il}" ${il === state.il ? 'selected' : ''}>${escapeHtml(il)}</option>`
      ).join('');
      const ilceler = Object.keys(cache.geo.ilceler)
        .filter(k => k.startsWith(state.il + '/'))
        .map(k => k.split('/', 2)[1])
        .sort((a, b) => a.localeCompare(b, 'tr'));
      const ilceOpts = ilceler.map(i =>
        `<option value="${i}" ${i === state.ilce ? 'selected' : ''}>${escapeHtml(i)}</option>`
      ).join('');
      el.innerHTML = `
        <label class="bolge-secici-grup">
          <span class="bolge-secici-lbl">İl</span>
          <select id="bolge-il" class="bolge-select">${ilOpts}</select>
        </label>
        <label class="bolge-secici-grup">
          <span class="bolge-secici-lbl">İlçe</span>
          <select id="bolge-ilce" class="bolge-select">${ilceOpts}</select>
        </label>
      `;
      el.querySelector('#bolge-il').addEventListener('change', async (e) => {
        state.il = e.target.value;
        state.ilce = ilkIlceyiAl(e.target.value);
        renderTipDetay(container);
        await renderIcerik(container);
      });
      el.querySelector('#bolge-ilce').addEventListener('change', async (e) => {
        state.ilce = e.target.value;
        await renderIcerik(container);
      });
    }
  }

  /**
   * Bir ilin alfabetik ilk ilçesini döner.
   */
  function ilkIlceyiAl(il) {
    if (!il) return '';
    const ilceler = Object.keys(cache.geo.ilceler)
      .filter(k => k.startsWith(il + '/'))
      .map(k => k.split('/', 2)[1])
      .sort((a, b) => a.localeCompare(b, 'tr'));
    return ilceler[0] || '';
  }

  /**
   * Seçili kapsama göre il listesi döner.
   * NUTS-1 → o bölgenin illeri
   * NUTS-2 → o alt bölgenin illeri
   * İl    → tek il
   * İlçe  → tek ilin tek ilçesi (özel kullanım)
   */
  function getKapsamIlleri() {
    if (state.kapsam_tipi === 'nuts1') {
      return Object.entries(cache.geo.iller)
        .filter(([_, info]) => info.nuts1 === state.nuts1_kod)
        .map(([il]) => il);
    }
    if (state.kapsam_tipi === 'nuts2') {
      return Object.entries(cache.geo.iller)
        .filter(([_, info]) => info.nuts2 === state.nuts2_kod)
        .map(([il]) => il);
    }
    return [state.il];
  }

  /**
   * Şu anki kapsam için kullanıcıya gösterilen başlık.
   */
  function getKapsamBaslik() {
    if (state.kapsam_tipi === 'nuts1') {
      const info = cache.geo.nuts1[state.nuts1_kod];
      return `${state.nuts1_kod} · ${info?.ad || state.nuts1_kod}`;
    }
    if (state.kapsam_tipi === 'nuts2') {
      const info = cache.geo.nuts2[state.nuts2_kod];
      return `${state.nuts2_kod} · ${info?.ad || state.nuts2_kod}`;
    }
    if (state.kapsam_tipi === 'ilce') {
      return `${state.il} / ${state.ilce}`;
    }
    return state.il;
  }

  function getKapsamAltBaslik() {
    if (state.kapsam_tipi === 'nuts1') {
      const iller = getKapsamIlleri();
      return `NUTS-1 bölgesi · ${iller.length} il · Türkiye`;
    }
    if (state.kapsam_tipi === 'nuts2') {
      const iller = getKapsamIlleri();
      return `NUTS-2 alt bölgesi · ${iller.length} il · Türkiye`;
    }
    if (state.kapsam_tipi === 'ilce') {
      return `${state.il} · Türkiye · İlçe`;
    }
    return `${state.il} · Türkiye · İl bazında`;
  }

  /**
   * Birden çok ilin demografisi gerekiyorsa hepsini paralel yükler.
   */
  async function loadKapsamDemografi() {
    const iller = getKapsamIlleri();
    await Promise.all(iller.map(il => loadIlDemografi(il)));
  }

  // ═══════════════════════════════════════════════════════════════
  // ANA İÇERİK
  // ═══════════════════════════════════════════════════════════════
  async function renderIcerik(container) {
    const el = container.querySelector('#bolge-icerik');
    el.innerHTML = `<div class="loading">İçerik hazırlanıyor</div>`;

    // Kapsamdaki tüm illerin demografisini lazy yükle
    await loadKapsamDemografi();

    const baslik = getKapsamBaslik();
    const altBaslik = getKapsamAltBaslik();

    el.innerHTML = `
      <div class="bolge-section bolge-baslik-sec">
        <h2 class="bolge-buyuk-baslik">${escapeHtml(baslik)}</h2>
        <p class="bolge-alt-baslik">${escapeHtml(altBaslik)}</p>
      </div>

      <div class="bolge-ust-grid">
        <div class="panel bolge-harita-panel">
          <div class="panel-title">Haritada konum</div>
          <div id="bolge-mini-harita"></div>
        </div>

        <div class="bolge-ozet-kolonu">
          <div id="bolge-ozet-kutular"></div>
        </div>
      </div>

      <section class="bolge-section">
        <h2 class="bolge-bolum-baslik">📈 Nüfus hareketi</h2>
        <p class="bolge-bolum-alt">2018-2024 yılları arası 18+ nüfus seyri</p>
        <div class="panel">
          <div id="bolge-nufus-cizgi"></div>
        </div>
      </section>

      <section class="bolge-section">
        <h2 class="bolge-bolum-baslik">👥 Demografi</h2>
        <p class="bolge-bolum-alt">Yaş, cinsiyet, eğitim · yıl filtresi ile</p>
        <div class="panel" style="margin-bottom: var(--space-3);">
          <div class="bolge-secici">
            <label class="bolge-secici-grup">
              <span class="bolge-secici-lbl">Yıl</span>
              <select id="bolge-yil" class="bolge-select" style="min-width: 120px;"></select>
            </label>
          </div>
        </div>
        <div class="bolge-iki-sutun">
          <div class="panel">
            <div class="panel-title">Yaş piramidi</div>
            <div id="bolge-yas-piramidi"></div>
          </div>
          <div class="panel">
            <div class="panel-title">Eğitim dağılımı</div>
            <div id="bolge-egitim"></div>
          </div>
        </div>
      </section>

      <section class="bolge-section">
        <h2 class="bolge-bolum-baslik">🗳️ Seçim tarihi</h2>
        <p class="bolge-bolum-alt">Tüm seçimlerde parti dağılımı · seçim tipi filtreli</p>
        <div class="panel" style="margin-bottom: var(--space-3);">
          <div class="bolge-secici">
            <label class="bolge-secici-grup">
              <span class="bolge-secici-lbl">Seçim tipi</span>
              <select id="bolge-secim-tipi" class="bolge-select">
                <option value="hepsi">Tümü</option>
                <option value="CB">Cumhurbaşkanlığı</option>
                <option value="MV">Milletvekili</option>
                <option value="yerel">Yerel (BBB, BB, IGM, BM)</option>
              </select>
            </label>
          </div>
        </div>
        <div class="panel" style="padding: var(--space-4);">
          <div id="bolge-secim-bar"></div>
        </div>
        <div class="panel" style="margin-top: var(--space-3); padding: var(--space-4);">
          <div class="section-mini">Katılım oranı</div>
          <div id="bolge-katilim-cizgi"></div>
        </div>
      </section>

      <section class="bolge-section">
        <h2 class="bolge-bolum-baslik">🏘️ ${getKomsuBaslik()}</h2>
        <p class="bolge-bolum-alt">${getKomsuAciklama()}</p>
        <div class="panel" style="padding: 0; overflow: hidden;">
          <div id="bolge-komsular"></div>
        </div>
      </section>
    `;

    // Render altı kısım
    renderMiniHarita(container);
    renderOzetKutular(container);
    renderNufusCizgi(container);
    renderYilSecici(container);
    renderYasPiramidi(container);
    renderEgitim(container);
    renderSecimSecici(container);
    renderSecimBar(container);
    renderKatilimCizgi(container);
    renderKomsular(container);
  }

  function getKomsuBaslik() {
    if (state.kapsam_tipi === 'nuts1') return 'Bu bölgedeki iller';
    if (state.kapsam_tipi === 'nuts2') return 'Bu alt bölgedeki iller';
    if (state.kapsam_tipi === 'ilce') return 'Aynı ildeki diğer ilçeler';
    return 'Bu ildeki ilçeler';
  }

  function getKomsuAciklama() {
    if (state.kapsam_tipi === 'nuts1' || state.kapsam_tipi === 'nuts2') {
      return 'Kapsamdaki illerin son seçimde parti tercihi';
    }
    if (state.kapsam_tipi === 'ilce') {
      return `${state.il}'nın diğer ilçeleri (parti tercihi karşılaştırma)`;
    }
    return 'Bu ildeki ilçelerin parti tercihi';
  }

  // ═══════════════════════════════════════════════════════════════
  // 1. MİNİ HARİTA
  // ═══════════════════════════════════════════════════════════════
  function renderMiniHarita(container) {
    const el = container.querySelector('#bolge-mini-harita');
    if (!el) return;
    const geojson = cache.geojson;
    const bbox = computeBbox(geojson);
    const padding = 8;
    const W = 600;
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

    const kapsamIlleri = new Set(getKapsamIlleri());

    const paths = geojson.features.map(feat => {
      const il = feat.properties.geo_il_adi;
      const isSelected = kapsamIlleri.has(il);
      const fill = isSelected ? 'var(--brand-gold)' : '#e8e2d0';
      const stroke = isSelected ? '#7a5a10' : '#fdfaf2';
      const strokeWidth = isSelected ? 1.2 : 0.5;
      const d = geometryToPath(feat.geometry);
      return `<path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"></path>`;
    }).join('');

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 2. ÖZET KUTULAR
  // ═══════════════════════════════════════════════════════════════
  function renderOzetKutular(container) {
    const el = container.querySelector('#bolge-ozet-kutular');
    if (!el) return;
    const fmt = window.AT.fmt;

    // 2024 yılı verisini al
    const dem2024 = getDemografi(2024);
    if (!dem2024) {
      el.innerHTML = '<div class="empty-state">Demografi verisi yok</div>';
      return;
    }

    const t18 = dem2024.toplam_18plus || 0;
    const erkek = dem2024.erkek_18plus || 0;
    const kadin = dem2024.kadin_18plus || 0;

    // Ortalama yaş — yaş kategorilerinin orta noktası ile ağırlıklı
    let ortToplam = 0, ortAgirlik = 0;
    for (const yk of YAS_KATEGORILERI) {
      const ad = dem2024.yas?.[yk]?.toplam || 0;
      ortToplam += ad * YAS_ORTA[yk];
      ortAgirlik += ad;
    }
    const ortalamaYas = ortAgirlik > 0 ? ortToplam / ortAgirlik : 0;

    // 65+ oranı
    const yas65 = dem2024.yas?.['65+']?.toplam || 0;
    const yas65Yzd = t18 > 0 ? (yas65 / t18) * 100 : 0;

    // Genç (18-24) oranı
    const genc = dem2024.yas?.['18-24']?.toplam || 0;
    const gencYzd = t18 > 0 ? (genc / t18) * 100 : 0;

    // Üniversite+ oranı
    const uni = dem2024.egitim?.['universite_plus']?.toplam || 0;
    const uniYzd = t18 > 0 ? (uni / t18) * 100 : 0;

    el.innerHTML = `
      <div class="bolge-ozet-grid">
        <div class="bolge-ozet-tile">
          <div class="ozet-lbl">18+ nüfus (2024)</div>
          <div class="ozet-val">${fmt.n(t18)}</div>
          <div class="ozet-detay">${fmt.n(erkek)} erkek · ${fmt.n(kadin)} kadın</div>
        </div>
        <div class="bolge-ozet-tile">
          <div class="ozet-lbl">Ortalama yaş</div>
          <div class="ozet-val">${fmt.n1(ortalamaYas)}</div>
          <div class="ozet-detay">Kategorilerden hesaplandı</div>
        </div>
        <div class="bolge-ozet-tile">
          <div class="ozet-lbl">Genç (18-24)</div>
          <div class="ozet-val">%${fmt.n1(gencYzd)}</div>
          <div class="ozet-detay">${fmt.n(genc)} kişi</div>
        </div>
        <div class="bolge-ozet-tile">
          <div class="ozet-lbl">Yaşlı (65+)</div>
          <div class="ozet-val">%${fmt.n1(yas65Yzd)}</div>
          <div class="ozet-detay">${fmt.n(yas65)} kişi</div>
        </div>
        <div class="bolge-ozet-tile">
          <div class="ozet-lbl">Üniversite +</div>
          <div class="ozet-val">%${fmt.n1(uniYzd)}</div>
          <div class="ozet-detay">${fmt.n(uni)} kişi</div>
        </div>
      </div>
    `;
  }

  /**
   * Bir yıl için demografi verisini döner.
   * İl dosyaları sadece ilçe verisi içerir; il toplamı ilçelerden hesaplanır.
   * Yıl anahtarları string olarak gelir ("2024").
   */
  function getDemografi(yil) {
    const yilStr = String(yil);

    if (state.kapsam_tipi === 'ilce') {
      const ilDemografi = cache.il_demografileri[state.il];
      const ilceVeri = ilDemografi?.ilceler?.[state.ilce]?.yillar?.[yilStr];
      if (ilceVeri) return ilceVeri;
      // alternatif: ilce_demografi_ozet.json
      const key = `${state.il}/${state.ilce}`;
      const ozetVeri = cache.ilce_demografi?.ilceler?.[key]?.yillar?.[yilStr];
      if (ozetVeri) return ozetVeri;
      return null;
    }

    if (state.kapsam_tipi === 'il') {
      return ilToplami(state.il, yilStr);
    }

    // NUTS-1 veya NUTS-2 → kapsamdaki illerin toplamı
    const iller = getKapsamIlleri();
    return illerToplami(iller, yilStr);
  }

  /**
   * Bir ilin yıllık toplamı — ilçelerden hesaplanır.
   */
  function ilToplami(il, yilStr) {
    const ilDemografi = cache.il_demografileri[il];
    if (!ilDemografi?.ilceler) return null;
    const toplam = bosDemografiKayit();
    let bulundu = false;
    for (const ilceVeri of Object.values(ilDemografi.ilceler)) {
      const v = ilceVeri?.yillar?.[yilStr];
      if (!v) continue;
      bulundu = true;
      ekleDemografiUzerine(toplam, v);
    }
    return bulundu ? toplam : null;
  }

  /**
   * Birden çok ilin aynı yıldaki toplamı — her ilin ilçelerini topla.
   */
  function illerToplami(iller, yilStr) {
    const toplam = bosDemografiKayit();
    let bulundu = false;
    for (const il of iller) {
      const ilT = ilToplami(il, yilStr);
      if (!ilT) continue;
      bulundu = true;
      ekleDemografiUzerine(toplam, ilT);
    }
    return bulundu ? toplam : null;
  }

  /**
   * a += b (yas, egitim, toplam_18plus, vs.)
   */
  function ekleDemografiUzerine(a, b) {
    a.toplam_18plus += b.toplam_18plus || 0;
    a.erkek_18plus  += b.erkek_18plus  || 0;
    a.kadin_18plus  += b.kadin_18plus  || 0;
    a.toplam_tum_yaslar += b.toplam_tum_yaslar || 0;
    for (const yk of YAS_KATEGORILERI) {
      const k = b.yas?.[yk];
      if (!k) continue;
      a.yas[yk].erkek  += k.erkek  || 0;
      a.yas[yk].kadin  += k.kadin  || 0;
      a.yas[yk].toplam += k.toplam || 0;
    }
    for (const ek of Object.keys(EGITIM_KISALT)) {
      const k = b.egitim?.[ek];
      if (!k) continue;
      if (!a.egitim[ek]) a.egitim[ek] = { erkek: 0, kadin: 0, toplam: 0 };
      a.egitim[ek].erkek  += k.erkek  || 0;
      a.egitim[ek].kadin  += k.kadin  || 0;
      a.egitim[ek].toplam += k.toplam || 0;
    }
  }

  function bosDemografiKayit() {
    return {
      toplam_18plus: 0,
      erkek_18plus: 0,
      kadin_18plus: 0,
      toplam_tum_yaslar: 0,
      yas: Object.fromEntries(YAS_KATEGORILERI.map(yk => [yk, { erkek: 0, kadin: 0, toplam: 0 }])),
      egitim: Object.fromEntries(Object.keys(EGITIM_KISALT).map(ek => [ek, { erkek: 0, kadin: 0, toplam: 0 }])),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // 3. NÜFUS ÇİZGİSİ (2018-2024)
  // ═══════════════════════════════════════════════════════════════
  function renderNufusCizgi(container) {
    const el = container.querySelector('#bolge-nufus-cizgi');
    if (!el) return;
    const fmt = window.AT.fmt;

    const yillar = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
    const noktalar = [];
    for (const y of yillar) {
      const d = getDemografi(y);
      if (d) noktalar.push({ yil: y, deger: d.toplam_18plus || 0 });
    }

    if (noktalar.length < 2) {
      el.innerHTML = '<div class="empty-state">Nüfus verisi yetersiz</div>';
      return;
    }

    // İlk ve son
    const ilk = noktalar[0];
    const son = noktalar[noktalar.length - 1];
    const buyuyume = ilk.deger > 0 ? ((son.deger - ilk.deger) / ilk.deger) * 100 : 0;
    const buyuyumeRenk = buyuyume > 0 ? 'var(--signal-green)' : (buyuyume < 0 ? 'var(--signal-red)' : 'var(--ink-3)');
    const buyuyumeIsaret = buyuyume > 0 ? '+' : '';

    // SVG
    const W = 900, H = 240;
    const padL = 95, padR = 60, padT = 30, padB = 50;
    const iw = W - padL - padR;
    const ih = H - padT - padB;

    const minD = Math.min(...noktalar.map(n => n.deger));
    const maxD = Math.max(...noktalar.map(n => n.deger));
    const ymin = Math.max(0, minD - (maxD - minD) * 0.15);
    const ymax = maxD + (maxD - minD) * 0.15;
    const yrange = Math.max(ymax - ymin, 1);

    const xStep = iw / (noktalar.length - 1);
    const npos = noktalar.map((n, i) => ({
      x: padL + i * xStep,
      y: padT + ih - ((n.deger - ymin) / yrange) * ih,
      n,
    }));

    const cizgi = npos.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const noktaSvg = npos.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="var(--brand-gold)" stroke="var(--paper)" stroke-width="2">
        <title>${p.n.yil}: ${fmt.n(p.n.deger)}</title>
      </circle>`
    ).join('');
    const xLabels = npos.map(p =>
      `<text x="${p.x.toFixed(1)}" y="${(H - 18).toFixed(1)}" text-anchor="middle" class="bolge-eksen">${p.n.yil}</text>`
    ).join('');
    const yuzdeLabels = npos.map(p =>
      `<text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" text-anchor="middle" class="bolge-eksen" style="font-weight:600; fill:var(--ink);">${fmt.n(p.n.deger)}</text>`
    ).join('');

    let yEkseni = '';
    for (let i = 0; i <= 4; i++) {
      const val = ymin + (yrange * i / 4);
      const y = padT + ih - ((val - ymin) / yrange) * ih;
      yEkseni += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + iw).toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line-soft)" stroke-width="0.5"/>`;
      yEkseni += `<text x="${(padL - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="bolge-eksen">${fmt.n(val)}</text>`;
    }

    el.innerHTML = `
      <div class="bolge-cizgi-baslik">
        <div>
          <strong>${fmt.n(ilk.deger)}</strong> <span style="color:var(--ink-3); font-size:13px;">→</span>
          <strong>${fmt.n(son.deger)}</strong>
          <span class="bolge-cizgi-buyume" style="color:${buyuyumeRenk};">
            ${buyuyumeIsaret}${fmt.n1(buyuyume)}%
          </span>
        </div>
        <div style="font-size:12px; color:var(--ink-3);">${ilk.yil}'den ${son.yil}'e</div>
      </div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%; height:auto;">
        ${yEkseni}
        <path d="${cizgi}" fill="none" stroke="var(--brand-gold)" stroke-width="2.5"/>
        ${noktaSvg}
        ${yuzdeLabels}
        ${xLabels}
      </svg>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // 4. YIL SEÇICİ
  // ═══════════════════════════════════════════════════════════════
  function renderYilSecici(container) {
    const sel = container.querySelector('#bolge-yil');
    if (!sel) return;
    const yillar = [2018, 2019, 2020, 2021, 2022, 2023, 2024];
    sel.innerHTML = yillar.map(y =>
      `<option value="${y}" ${y === state.secili_yil ? 'selected' : ''}>${y}</option>`
    ).join('');
    sel.addEventListener('change', (e) => {
      state.secili_yil = parseInt(e.target.value, 10);
      renderYasPiramidi(container);
      renderEgitim(container);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 5. YAŞ PIRAMIDI (seçili yıl)
  // ═══════════════════════════════════════════════════════════════
  function renderYasPiramidi(container) {
    const el = container.querySelector('#bolge-yas-piramidi');
    if (!el) return;
    const fmt = window.AT.fmt;

    const d = getDemografi(state.secili_yil);
    if (!d) {
      el.innerHTML = '<div class="empty-state">Veri yok</div>';
      return;
    }

    const toplam = d.toplam_18plus || 1;
    // En büyük yüzde — eksen ölçeği için
    let maxYzd = 0;
    for (const yk of YAS_KATEGORILERI) {
      const ye = (d.yas?.[yk]?.erkek || 0) / toplam * 100;
      const yk_ = (d.yas?.[yk]?.kadin || 0) / toplam * 100;
      maxYzd = Math.max(maxYzd, ye, yk_);
    }
    maxYzd = Math.ceil(maxYzd / 2) * 2 + 1;

    const W = 460, H = 340;
    const midX = W / 2;
    const labelW = 60;
    const barAreaW = (W - 2 * labelW) / 2 - 8;
    const rowH = (H - 30) / YAS_KATEGORILERI.length;

    let satirlar = '';
    YAS_KATEGORILERI.slice().reverse().forEach((yk, i) => {
      const e = (d.yas?.[yk]?.erkek || 0);
      const k = (d.yas?.[yk]?.kadin || 0);
      const eYzd = (e / toplam) * 100;
      const kYzd = (k / toplam) * 100;
      const eW = (eYzd / maxYzd) * barAreaW;
      const kW = (kYzd / maxYzd) * barAreaW;
      const y = 20 + i * rowH;
      const barH = rowH * 0.7;

      // Erkek (sol)
      satirlar += `<rect x="${(midX - labelW/2 - 4 - eW).toFixed(1)}" y="${y.toFixed(1)}" width="${eW.toFixed(1)}" height="${barH.toFixed(1)}" fill="#3f7eb3" opacity="0.85"/>`;
      satirlar += `<text x="${(midX - labelW/2 - 4 - eW - 4).toFixed(1)}" y="${(y + barH/2 + 4).toFixed(1)}" text-anchor="end" class="bolge-eksen" style="font-weight:600;">%${fmt.n1(eYzd)}</text>`;

      // Kadın (sağ)
      satirlar += `<rect x="${(midX + labelW/2 + 4).toFixed(1)}" y="${y.toFixed(1)}" width="${kW.toFixed(1)}" height="${barH.toFixed(1)}" fill="#c8311a" opacity="0.85"/>`;
      satirlar += `<text x="${(midX + labelW/2 + 4 + kW + 4).toFixed(1)}" y="${(y + barH/2 + 4).toFixed(1)}" text-anchor="start" class="bolge-eksen" style="font-weight:600;">%${fmt.n1(kYzd)}</text>`;

      // Yaş etiketi (orta)
      satirlar += `<text x="${midX.toFixed(1)}" y="${(y + barH/2 + 4).toFixed(1)}" text-anchor="middle" class="bolge-eksen" style="font-weight:600; fill:var(--ink-2);">${yk}</text>`;
    });

    el.innerHTML = `
      <div class="bolge-yas-lejant">
        <span><span class="bolge-yas-renk" style="background:#3f7eb3;"></span>Erkek</span>
        <span><span class="bolge-yas-renk" style="background:#c8311a;"></span>Kadın</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%; height:auto;">
        ${satirlar}
      </svg>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // 6. EĞİTİM DAĞILIMI (seçili yıl)
  // ═══════════════════════════════════════════════════════════════
  function renderEgitim(container) {
    const el = container.querySelector('#bolge-egitim');
    if (!el) return;
    const fmt = window.AT.fmt;

    const d = getDemografi(state.secili_yil);
    if (!d) {
      el.innerHTML = '<div class="empty-state">Veri yok</div>';
      return;
    }

    const toplam = d.toplam_18plus || 1;
    const egitim = d.egitim || {};

    // Sıralı kategoriler (azdan çoğa eğitim seviyesi)
    const sira = [
      'okuma_yazma_bilmeyen',
      'okuryazar',
      'ilkokul_ortaokul',
      'lise_dengi',
      'universite_plus',
      'bilinmeyen',
    ];

    const renkler = ['#a04420', '#c46a3a', '#a8b67a', '#7da068', '#3f7eb3', '#999'];

    const satirlar = sira.map((cat, i) => {
      const v = egitim[cat]?.toplam || 0;
      const yzd = (v / toplam) * 100;
      if (yzd < 0.1) return '';
      const renk = renkler[i] || '#888';
      const barW = Math.min(100, yzd * 2);
      return `
        <div class="bolge-egitim-row">
          <div class="bolge-egitim-ad">${escapeHtml(EGITIM_KISALT[cat] || cat)}</div>
          <div class="bolge-egitim-bar">
            <div class="bolge-egitim-fill" style="width:${barW.toFixed(1)}%; background:${renk};"></div>
          </div>
          <div class="bolge-egitim-deg">%${fmt.n1(yzd)}</div>
        </div>
      `;
    }).join('');

    el.innerHTML = `<div class="bolge-egitim-liste">${satirlar}</div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 7. SEÇİM TİPİ FİLTRESİ
  // ═══════════════════════════════════════════════════════════════
  function renderSecimSecici(container) {
    const sel = container.querySelector('#bolge-secim-tipi');
    if (!sel) return;
    sel.value = state.secili_secim_tipi;
    sel.addEventListener('change', (e) => {
      state.secili_secim_tipi = e.target.value;
      renderSecimBar(container);
      renderKatilimCizgi(container);
    });
  }

  // ═══════════════════════════════════════════════════════════════
  // 8. SEÇİM BAR (tüm seçimlerde parti dağılımı)
  // ═══════════════════════════════════════════════════════════════
  function getKapsamSecimleri() {
    const tipFiltre = state.secili_secim_tipi;
    const tumSecimler = Object.keys(cache.parti_iller.secimler);
    if (tipFiltre === 'hepsi') return tumSecimler;
    if (tipFiltre === 'CB') return tumSecimler.filter(s => s.includes('_CB'));
    if (tipFiltre === 'MV') return tumSecimler.filter(s => s.includes('_MV'));
    if (tipFiltre === 'yerel') return tumSecimler.filter(s => s.includes('_BBB') || s.includes('_BB') || s.includes('_IGM') || s.includes('_BM'));
    return tumSecimler;
  }

  function getKapsamParti(secim) {
    // İlçe: doğrudan ilçe verisi
    if (state.kapsam_tipi === 'ilce') {
      const key = `${state.il}/${state.ilce}`;
      const kaynak = cache.parti_ilceler.secimler[secim]?.ilceler?.[key];
      if (!kaynak) return null;
      return normalizePartiOylari(kaynak);
    }

    // İl: doğrudan il verisi
    if (state.kapsam_tipi === 'il') {
      const kaynak = cache.parti_iller.secimler[secim]?.iller?.[state.il];
      if (!kaynak) return null;
      return normalizePartiOylari(kaynak);
    }

    // NUTS-1/NUTS-2: birden çok il topla
    const iller = getKapsamIlleri();
    const sec = cache.parti_iller.secimler[secim];
    if (!sec?.iller) return null;

    const norm = {};
    let toplam = 0;
    for (const il of iller) {
      const ilK = sec.iller[il];
      if (!ilK) continue;
      for (const [p, oy] of Object.entries(ilK)) {
        if (p === 'toplam' || p === 'il_sayisi') continue;
        if (!oy) continue;
        const n = PARTI_NORMALIZE[p] || p;
        norm[n] = (norm[n] || 0) + (oy || 0);
        toplam += (oy || 0);
      }
    }
    if (toplam === 0) return null;
    return { partiler: norm, toplam };
  }

  function normalizePartiOylari(kaynak) {
    const norm = {};
    let toplam = 0;
    for (const [p, oy] of Object.entries(kaynak)) {
      if (p === 'toplam' || p === 'il_sayisi') continue;
      if (!oy) continue;
      const n = PARTI_NORMALIZE[p] || p;
      norm[n] = (norm[n] || 0) + (oy || 0);
      toplam += (oy || 0);
    }
    if (toplam === 0) return null;
    return { partiler: norm, toplam };
  }

  function renderSecimBar(container) {
    const el = container.querySelector('#bolge-secim-bar');
    if (!el) return;
    const fmt = window.AT.fmt;

    const secimler = getKapsamSecimleri().sort();
    const veriler = secimler.map(s => ({ secim: s, kapsam: getKapsamParti(s) })).filter(x => x.kapsam);

    if (veriler.length === 0) {
      el.innerHTML = '<div class="empty-state">Bu kapsam için seçim verisi yok</div>';
      return;
    }

    // En sık partileri bul (sıralama için, ilk 15)
    const partiToplam = {};
    for (const { kapsam } of veriler) {
      for (const [p, oy] of Object.entries(kapsam.partiler)) {
        partiToplam[p] = (partiToplam[p] || 0) + oy;
      }
    }
    const partilerSirali = Object.entries(partiToplam)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([p]) => p);

    let rows = '';
    for (const { secim, kapsam } of veriler) {
      let dilimler = '';
      let digerYzd = 0;
      for (const p of partilerSirali) {
        const oy = kapsam.partiler[p] || 0;
        const yzd = (oy / kapsam.toplam) * 100;
        if (yzd < 0.5) continue;
        const renk = PARTI_RENK[p] || '#888';
        dilimler += `<div class="bolge-dilim" style="width:${yzd.toFixed(2)}%; background:${renk};" title="${escapeHtml(p)}: ${fmt.n1(yzd)}%">
          ${yzd >= 8 ? `<span class="bolge-dilim-text">${fmt.n1(yzd)}%</span>` : ''}
        </div>`;
      }
      for (const [p, oy] of Object.entries(kapsam.partiler)) {
        if (partilerSirali.includes(p)) continue;
        digerYzd += (oy / kapsam.toplam) * 100;
      }
      if (digerYzd > 0.5) {
        dilimler += `<div class="bolge-dilim" style="width:${digerYzd.toFixed(2)}%; background:#aaa;" title="Diğer: ${fmt.n1(digerYzd)}%"></div>`;
      }
      rows += `
        <div class="bolge-secim-row">
          <div class="bolge-secim-ad">${secim.replace('_', ' · ')}</div>
          <div class="bolge-secim-cubuk">${dilimler}</div>
        </div>
      `;
    }

    let lejant = '';
    for (const p of partilerSirali.slice(0, 10)) {
      const renk = PARTI_RENK[p] || '#888';
      lejant += `<span class="bolge-leg"><span class="bolge-leg-renk" style="background:${renk};"></span>${escapeHtml(p)}</span>`;
    }
    lejant += `<span class="bolge-leg"><span class="bolge-leg-renk" style="background:#aaa;"></span>Diğer</span>`;

    el.innerHTML = `<div class="bolge-secim-wrap">${rows}<div class="bolge-secim-lejant">${lejant}</div></div>`;
  }

  // ═══════════════════════════════════════════════════════════════
  // 9. KATILIM ÇİZGİSİ
  // ═══════════════════════════════════════════════════════════════
  function renderKatilimCizgi(container) {
    const el = container.querySelector('#bolge-katilim-cizgi');
    if (!el) return;
    const fmt = window.AT.fmt;

    const secimler = getKapsamSecimleri().sort();
    const veriler = [];
    for (const s of secimler) {
      const kat = getKapsamKatilim(s);
      if (kat === null) continue;
      veriler.push({ secim: s, katilim: kat });
    }

    if (veriler.length === 0) {
      el.innerHTML = '<div class="empty-state">Katılım verisi yok</div>';
      return;
    }

    const W = 900, H = 200;
    const padL = 60, padR = 40, padT = 30, padB = 50;
    const iw = W - padL - padR;
    const ih = H - padT - padB;

    const minK = Math.min(...veriler.map(v => v.katilim));
    const maxK = Math.max(...veriler.map(v => v.katilim));
    const ymin = Math.max(0, Math.floor(minK / 10) * 10 - 5);
    const ymax = Math.min(100, Math.ceil(maxK / 10) * 10 + 5);
    const yrange = Math.max(ymax - ymin, 1);

    const xStep = veriler.length > 1 ? iw / (veriler.length - 1) : iw;
    const np = veriler.map((v, i) => ({
      x: padL + i * xStep,
      y: padT + ih - ((v.katilim - ymin) / yrange) * ih,
      v,
    }));

    const cizgi = np.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const nokta = np.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="var(--brand-gold)" stroke="var(--paper)" stroke-width="1.5">
        <title>${p.v.secim}: %${fmt.n1(p.v.katilim)}</title>
      </circle>`
    ).join('');
    const xLabel = np.map(p =>
      `<text x="${p.x.toFixed(1)}" y="${(H - 16).toFixed(1)}" text-anchor="middle" class="bolge-eksen">${p.v.secim.replace('_', '·')}</text>`
    ).join('');
    const yLabel = np.map(p =>
      `<text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" text-anchor="middle" class="bolge-eksen" style="font-weight:600; fill:var(--ink);">%${fmt.n1(p.v.katilim)}</text>`
    ).join('');

    let yEkseni = '';
    for (let i = 0; i <= 4; i++) {
      const val = ymin + (yrange * i / 4);
      const y = padT + ih - ((val - ymin) / yrange) * ih;
      yEkseni += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + iw).toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line-soft)" stroke-width="0.5"/>`;
      yEkseni += `<text x="${(padL - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="bolge-eksen">%${val.toFixed(0)}</text>`;
    }

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%; height:auto;">${yEkseni}<path d="${cizgi}" fill="none" stroke="var(--brand-gold)" stroke-width="2"/>${nokta}${yLabel}${xLabel}</svg>`;
  }

  /**
   * Bir seçimde kapsamdaki katılım oranı.
   */
  function getKapsamKatilim(secim) {
    if (state.kapsam_tipi === 'ilce') {
      const key = `${state.il}/${state.ilce}`;
      const m = cache.meta_ilceler.secimler[secim]?.ilceler?.[key];
      if (!m || !m.kayitli_secmen) return null;
      return m.katilim_orani ?? ((m.oy_kullanan_secmen / m.kayitli_secmen) * 100);
    }

    // İl/NUTS: kapsamdaki illerin toplam katılımı
    const iller = getKapsamIlleri();
    let kayitli = 0, oy = 0;
    for (const il of iller) {
      const m = cache.meta_iller.secimler[secim]?.iller?.[il];
      if (!m) continue;
      kayitli += m.kayitli_secmen || 0;
      oy += m.oy_kullanan_secmen || 0;
    }
    if (kayitli === 0) return null;
    return (oy / kayitli) * 100;
  }

  // ═══════════════════════════════════════════════════════════════
  // 10. KOMŞU İLÇELER
  // ═══════════════════════════════════════════════════════════════
  function renderKomsular(container) {
    const el = container.querySelector('#bolge-komsular');
    if (!el) return;
    const fmt = window.AT.fmt;

    // Son MV seçimi (yerel değil, sade parti tercihi için)
    const tumSecimler = Object.keys(cache.parti_iller.secimler);
    let karSecim = '2023_MV';
    if (!tumSecimler.includes(karSecim)) {
      karSecim = '2024_BBB';
    }

    // Kapsama göre: il listesi mi, ilçe listesi mi?
    let satirlar = [];

    if (state.kapsam_tipi === 'nuts1' || state.kapsam_tipi === 'nuts2') {
      // Bu bölgenin illeri
      const iller = getKapsamIlleri();
      for (const il of iller) {
        const r = ilOzeti(il, karSecim);
        if (r) satirlar.push(r);
      }
    } else if (state.kapsam_tipi === 'il') {
      // Bu ilin ilçeleri
      const ilceler = Object.keys(cache.geo.ilceler)
        .filter(k => k.startsWith(state.il + '/'))
        .map(k => k.split('/', 2)[1]);
      for (const ilce of ilceler) {
        const r = ilceOzeti(state.il, ilce, karSecim);
        if (r) satirlar.push(r);
      }
    } else if (state.kapsam_tipi === 'ilce') {
      // Aynı ilin diğer ilçeleri
      const ilceler = Object.keys(cache.geo.ilceler)
        .filter(k => k.startsWith(state.il + '/'))
        .map(k => k.split('/', 2)[1]);
      for (const ilce of ilceler) {
        const r = ilceOzeti(state.il, ilce, karSecim);
        if (r) satirlar.push(r);
      }
    }

    if (satirlar.length === 0) {
      el.innerHTML = '<div class="empty-state" style="padding: var(--space-4);">Bu kapsam için liste verisi yok</div>';
      return;
    }

    satirlar.sort((a, b) => b.kayitli - a.kayitli);

    const baslikKolon = (state.kapsam_tipi === 'nuts1' || state.kapsam_tipi === 'nuts2') ? 'İl' : 'İlçe';

    el.innerHTML = `
      <div class="bolge-komsu-baslik">
        <span class="bolge-komsu-not">Son seçim: <strong>${karSecim.replace('_', ' · ')}</strong></span>
      </div>
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">${baslikKolon}</th>
            <th style="text-align:left;">En üst parti</th>
            <th style="text-align:left;">İlk 3</th>
            <th style="text-align:right;">Kayıtlı seçmen</th>
            <th style="text-align:right;">Katılım</th>
          </tr>
        </thead>
        <tbody>
          ${satirlar.map(s => {
            const ustRenk = PARTI_RENK[s.enUstParti] || '#888';
            const ilkUc = s.ilkUc.map(u =>
              `<span style="color:${PARTI_RENK[u.parti] || 'inherit'}; font-weight:500;">${escapeHtml(u.parti)} %${fmt.n1(u.yzd)}</span>`
            ).join(' · ');
            return `
              <tr ${s.secili ? 'style="background: rgba(200, 134, 26, 0.06);"' : ''}>
                <td>
                  <a href="#" class="bolge-komsu-link" data-tip="${escapeHtml(s.tip)}" data-il="${escapeHtml(s.il || '')}" data-ilce="${escapeHtml(s.ilce || '')}" style="font-weight:${s.secili ? '700' : '500'};">
                    ${escapeHtml(s.ad)} ${s.secili ? '<span style="color:var(--brand-gold);">●</span>' : ''}
                  </a>
                </td>
                <td>
                  <div style="display:flex; align-items:center; gap:var(--space-2);">
                    <span style="width:10px;height:10px;background:${ustRenk};border-radius:2px;"></span>
                    <span style="font-weight:600; color:${ustRenk};">${escapeHtml(s.enUstParti)}</span>
                    <span style="color:var(--ink-3);">%${fmt.n1(s.enUstYzd)}</span>
                  </div>
                </td>
                <td style="font-size:11.5px;">${ilkUc}</td>
                <td class="num" style="text-align:right;">${fmt.n(s.kayitli)}</td>
                <td class="num" style="text-align:right;">${s.katilim != null ? '%' + fmt.n1(s.katilim) : '—'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;

    // Link tıklamasında o birime geç
    el.querySelectorAll('.bolge-komsu-link').forEach(a => {
      a.addEventListener('click', async (e) => {
        e.preventDefault();
        const tip = a.dataset.tip;
        if (tip === 'il') {
          state.kapsam_tipi = 'il';
          state.il = a.dataset.il;
        } else if (tip === 'ilce') {
          state.kapsam_tipi = 'ilce';
          state.il = a.dataset.il;
          state.ilce = a.dataset.ilce;
        }
        // Kapsam tipi seçicisini güncelle
        const tipSel = container.querySelector('#bolge-tip');
        if (tipSel) tipSel.value = state.kapsam_tipi;
        renderTipDetay(container);
        await renderIcerik(container);
      });
    });
  }

  function ilOzeti(il, secim) {
    const kaynak = cache.parti_iller.secimler[secim]?.iller?.[il];
    if (!kaynak) return null;
    const o = normalizePartiOylari(kaynak);
    if (!o) return null;
    const sirali = Object.entries(o.partiler).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const m = cache.meta_iller.secimler[secim]?.iller?.[il];
    const kat = m?.katilim_orani || (m?.kayitli_secmen > 0 ? (m.oy_kullanan_secmen / m.kayitli_secmen) * 100 : null);
    return {
      tip: 'il',
      ad: il,
      il,
      enUstParti: sirali[0][0],
      enUstYzd: (sirali[0][1] / o.toplam) * 100,
      ilkUc: sirali.map(([p, oy]) => ({ parti: p, yzd: (oy / o.toplam) * 100 })),
      kayitli: m?.kayitli_secmen || 0,
      katilim: kat,
      secili: false,
    };
  }

  function ilceOzeti(il, ilce, secim) {
    const key = `${il}/${ilce}`;
    const kaynak = cache.parti_ilceler.secimler[secim]?.ilceler?.[key];
    if (!kaynak) return null;
    const o = normalizePartiOylari(kaynak);
    if (!o) return null;
    const sirali = Object.entries(o.partiler).sort((a, b) => b[1] - a[1]).slice(0, 3);
    const m = cache.meta_ilceler.secimler[secim]?.ilceler?.[key];
    const kat = m?.katilim_orani || (m?.kayitli_secmen > 0 ? (m.oy_kullanan_secmen / m.kayitli_secmen) * 100 : null);
    return {
      tip: 'ilce',
      ad: ilce,
      il,
      ilce,
      enUstParti: sirali[0][0],
      enUstYzd: (sirali[0][1] / o.toplam) * 100,
      ilkUc: sirali.map(([p, oy]) => ({ parti: p, yzd: (oy / o.toplam) * 100 })),
      kayitli: m?.kayitli_secmen || 0,
      katilim: kat,
      secili: (state.kapsam_tipi === 'ilce' && ilce === state.ilce),
    };
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
        .bolge-secici {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
          align-items: center;
        }
        .bolge-tip-detay {
          display: flex;
          gap: var(--space-3);
          flex-wrap: wrap;
          align-items: center;
          padding-left: var(--space-3);
          border-left: 2px solid var(--line-soft);
        }
        .bolge-secici-grup {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .bolge-secici-lbl {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .bolge-select {
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

        .bolge-baslik-sec {
          margin-bottom: var(--space-5);
          padding-bottom: var(--space-3);
          border-bottom: 1px solid var(--line);
        }
        .bolge-buyuk-baslik {
          font-family: var(--font-display);
          font-size: 34px;
          font-weight: 500;
          letter-spacing: -0.02em;
          color: var(--ink);
          margin: 0 0 var(--space-2) 0;
        }
        .bolge-alt-baslik {
          font-size: 13.5px;
          color: var(--ink-3);
          margin: 0;
        }

        .bolge-section {
          margin-bottom: var(--space-7);
        }
        .bolge-bolum-baslik {
          font-family: var(--font-display);
          font-size: 22px;
          font-weight: 600;
          color: var(--ink);
          margin: 0 0 var(--space-2) 0;
          letter-spacing: -0.01em;
        }
        .bolge-bolum-alt {
          font-size: 13px;
          color: var(--ink-3);
          margin: 0 0 var(--space-3) 0;
        }

        /* Üst grid: harita + özet kutular */
        .bolge-ust-grid {
          display: grid;
          grid-template-columns: 1.2fr 1.5fr;
          gap: var(--space-4);
          margin-bottom: var(--space-6);
        }
        .bolge-harita-panel {
          padding: var(--space-3) var(--space-4) var(--space-4);
        }
        #bolge-mini-harita {
          width: 100%;
          aspect-ratio: 5 / 3;
          max-height: 300px;
        }
        #bolge-mini-harita svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .bolge-ozet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          gap: var(--space-2);
        }
        .bolge-ozet-tile {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
        }
        .bolge-ozet-tile .ozet-lbl {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--ink-3);
        }
        .bolge-ozet-tile .ozet-val {
          font-family: var(--font-mono);
          font-size: 22px;
          font-weight: 600;
          color: var(--ink);
          margin-top: 2px;
        }
        .bolge-ozet-tile .ozet-detay {
          font-size: 10.5px;
          color: var(--ink-3);
          margin-top: 4px;
        }

        /* Nüfus çizgisi baslık */
        .bolge-cizgi-baslik {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: var(--space-3);
          padding: var(--space-3);
          background: #fdfaf2;
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 14px;
          color: var(--ink-2);
        }
        .bolge-cizgi-buyume {
          margin-left: var(--space-2);
          font-weight: 600;
        }

        /* İki sütun (yaş + eğitim) */
        .bolge-iki-sutun {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .bolge-yas-lejant {
          display: flex;
          gap: var(--space-4);
          justify-content: center;
          font-size: 11.5px;
          color: var(--ink-2);
          margin-bottom: var(--space-2);
        }
        .bolge-yas-lejant span {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .bolge-yas-renk {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        /* Eğitim liste */
        .bolge-egitim-liste {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .bolge-egitim-row {
          display: grid;
          grid-template-columns: 130px 1fr 55px;
          align-items: center;
          gap: var(--space-2);
          font-size: 12px;
        }
        .bolge-egitim-ad {
          color: var(--ink-2);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .bolge-egitim-bar {
          background: var(--paper-2);
          height: 12px;
          border-radius: 2px;
          overflow: hidden;
        }
        .bolge-egitim-fill {
          height: 100%;
        }
        .bolge-egitim-deg {
          font-family: var(--font-mono);
          font-size: 11.5px;
          font-weight: 600;
          text-align: right;
        }

        /* Seçim bar */
        .bolge-secim-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .bolge-secim-row {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: var(--space-3);
          align-items: center;
        }
        .bolge-secim-ad {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-2);
        }
        .bolge-secim-cubuk {
          display: flex;
          height: 26px;
          background: var(--paper-2);
          border-radius: 3px;
          overflow: hidden;
        }
        .bolge-dilim {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .bolge-dilim-text {
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: rgba(255,255,255,0.95);
          font-weight: 600;
          padding: 0 4px;
          white-space: nowrap;
          text-shadow: 0 0 2px rgba(0,0,0,0.4);
        }
        .bolge-secim-lejant {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
          font-size: 11.5px;
          color: var(--ink-2);
        }
        .bolge-leg {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .bolge-leg-renk {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.1);
        }

        /* Komşu ilçeler */
        .bolge-komsu-baslik {
          padding: var(--space-2) var(--space-4);
          background: #fdfaf2;
          border-bottom: 1px solid var(--line);
        }
        .bolge-komsu-not {
          font-size: 12px;
          color: var(--ink-3);
        }
        .bolge-komsu-link {
          color: var(--ink);
          text-decoration: none;
          border-bottom: 1px dotted transparent;
          transition: border-color 100ms ease;
        }
        .bolge-komsu-link:hover {
          border-bottom-color: var(--brand-gold);
          color: var(--brand-gold);
        }

        .section-mini {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-2);
          margin-bottom: var(--space-3);
        }

        .bolge-eksen {
          font-family: var(--font-mono);
          font-size: 11px;
          fill: var(--ink-3);
        }

        .bolge-bos {
          padding: var(--space-4);
          color: var(--ink-3);
          font-style: italic;
          text-align: center;
        }

        @media (max-width: 900px) {
          .bolge-ust-grid {
            grid-template-columns: 1fr;
          }
          .bolge-iki-sutun {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }
})();
