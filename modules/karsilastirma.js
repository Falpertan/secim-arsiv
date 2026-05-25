/* ─────────────────────────────────────────────────────────
   Karşılaştırma module v1 — Yan yana inceleme aracı
   
   A) İki ilçe karşılaştırması (aynı seçim)
   B) İki seçim karşılaştırması (aynı yer)
   C) Tek ilçenin tüm seçimlerdeki tablosu
   
   Veri:
     data/aggregates/parti_iller.json
     data/aggregates/parti_ilceler.json
     data/aggregates/meta_iller.json
     data/aggregates/meta_ilceler.json
     data/aggregates/tr_demografi_ozet.json (Sekme A için demografi)
     data/core/geo.json
     manifest.json
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
    tr_demografi: null,
    geo: null,
    manifest: null,
  };

  // Sekme durumları (her sekmenin kendi state'i var)
  const state = {
    sekme: 'A',
    A: { secim: '2023_MV', il1: 'ANKARA', ilce1: 'ÇANKAYA', il2: 'ANKARA', ilce2: 'KEÇİÖREN' },
    B: { katman: 'turkiye', katman_deger: '', secim1: '2018_MV', secim2: '2023_MV' },
    C: { il: 'ANKARA', ilce: 'ÇANKAYA' },
  };

  // ═══════════════════════════════════════════════════════════════
  // PARTİ NORMALİZASYONU (trend.js ile uyumlu)
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
    // CB adayları — partilerinden ayırt edilsin diye farklı tonlar
    'Erdoğan (CB)':       '#a87308',  // Cumhur tonu, AK PARTİ'den koyu
    'Kılıçdaroğlu (CB)':  '#8c2715',  // Millet tonu, CHP'den koyu
    'İnce (CB)':          '#d97a4a',  // CHP'den ayrılırken daha turuncu/açık
    'Akşener (CB)':       '#2b5d8c',  // İYİ'den koyu
    'Demirtaş (CB)':      '#6c2a6e',  // DEM/HDP'den koyu
    'Karamollaoğlu (CB)': '#0e466b',  // SAADET'ten koyu
    'Perinçek (CB)':      '#555',
    'Oğan (CB)':          '#5a5a5a',  // ATA, koyu gri
    'DİĞER': '#888888',
  };

  // ═══════════════════════════════════════════════════════════════
  // VERİ YÜKLEME
  // ═══════════════════════════════════════════════════════════════
  async function loadCoreData() {
    if (cache.parti_iller && cache.geo) return;

    const [pIller, pIlceler, mIller, mIlceler, trDemografi, geo] = await Promise.all([
      fetch('data/aggregates/parti_iller.json').then(r => r.ok ? r.json() : Promise.reject('parti_iller.json: ' + r.status)),
      fetch('data/aggregates/parti_ilceler.json').then(r => r.ok ? r.json() : Promise.reject('parti_ilceler.json: ' + r.status)),
      fetch('data/aggregates/meta_iller.json').then(r => r.ok ? r.json() : Promise.reject('meta_iller.json: ' + r.status)),
      fetch('data/aggregates/meta_ilceler.json').then(r => r.ok ? r.json() : Promise.reject('meta_ilceler.json: ' + r.status)),
      fetch('data/aggregates/tr_demografi_ozet.json').then(r => r.ok ? r.json() : Promise.reject('tr_demografi_ozet.json: ' + r.status)),
      fetch('data/core/geo.json').then(r => r.ok ? r.json() : Promise.reject('geo.json: ' + r.status)),
    ]);

    cache.parti_iller = pIller;
    cache.parti_ilceler = pIlceler;
    cache.meta_iller = mIller;
    cache.meta_ilceler = mIlceler;
    cache.tr_demografi = trDemografi;
    cache.geo = geo;

    // Manifest yerine seçim listesini parti_iller'den çıkar
    const SECIM_TIP_MAP = {
      'CB':  'Cumhurbaşkanlığı',
      'CB1': 'Cumhurbaşkanlığı 1. tur',
      'CB2': 'Cumhurbaşkanlığı 2. tur',
      'MV':  'Milletvekili',
      'BBB': 'Büyükşehir Belediye Bşk.',
      'BB':  'Belediye Başkanlığı',
      'IGM': 'İl Genel Meclisi',
      'BM':  'Belediye Meclisi',
      'AY':  'Referandum',
    };
    const secimKeys = Object.keys(pIller.secimler || {});
    cache.manifest = {
      elections: secimKeys.sort().map(k => {
        const [yil, tipKodu] = k.split('_');
        return {
          key: k,
          yil: parseInt(yil, 10),
          tip: SECIM_TIP_MAP[tipKodu] || tipKodu,
          kisa: k.replace('_', ' '),
        };
      }),
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ANA FONKSİYON
  // ═══════════════════════════════════════════════════════════════
  window.Modules.karsilastirma = async function(container, ctx) {
    container.innerHTML = `<div class="loading">Veri yükleniyor</div>`;

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
        <span class="eyebrow">Modül · 04</span>
        <h1>Karşılaştırma</h1>
        <p class="lede">Veri yüklenemedi: ${e}</p>
      </header>
      <div class="panel">
        <p style="color:var(--ink-2);">
          Şu dosyalar eksik veya hatalı olabilir:
          <span class="mono">parti_iller.json</span>,
          <span class="mono">parti_ilceler.json</span>,
          <span class="mono">meta_iller.json</span>,
          <span class="mono">meta_ilceler.json</span>,
          <span class="mono">tr_demografi_ozet.json</span>,
          <span class="mono">geo.json</span>,
          <span class="mono">manifest.json</span>.
        </p>
        <p style="margin-top: var(--space-3);">
          <span class="mono">python tools/build_aggregates.py --all</span>
        </p>
      </div>
    `;
  }

  function renderModule(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Modül · 04 · Yan yana inceleme</span>
        <h1>Karşılaştırma</h1>
        <p class="lede">
          İki ilçeyi, iki seçimi veya tek bir ilçenin yıllar içindeki seçim tablosunu yan yana görerek
          değişimleri ve farkları açığa çıkarın.
        </p>
      </header>

      <div class="kars-sekmeler">
        <button class="kars-sekme" data-sekme="A">
          <span class="sekme-num">A</span>
          <span class="sekme-baslik">İki ilçe</span>
          <span class="sekme-sub">Aynı seçim, farklı yerler</span>
        </button>
        <button class="kars-sekme" data-sekme="B">
          <span class="sekme-num">B</span>
          <span class="sekme-baslik">İki seçim</span>
          <span class="sekme-sub">Aynı yer, farklı zaman</span>
        </button>
        <button class="kars-sekme" data-sekme="C">
          <span class="sekme-num">C</span>
          <span class="sekme-baslik">Tek ilçenin geçmişi</span>
          <span class="sekme-sub">Tüm seçimlerde tablo</span>
        </button>
      </div>

      <div id="kars-icerik"></div>

      ${renderStiller()}
    `;

    container.querySelectorAll('.kars-sekme').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sekme = btn.dataset.sekme;
        renderAktifSekme(container);
      });
    });

    renderAktifSekme(container);
  }

  function renderAktifSekme(container) {
    container.querySelectorAll('.kars-sekme').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sekme === state.sekme);
    });

    const icerikEl = container.querySelector('#kars-icerik');
    if (state.sekme === 'A') renderSekmeA(container, icerikEl);
    else if (state.sekme === 'B') renderSekmeB(container, icerikEl);
    else if (state.sekme === 'C') renderSekmeC(container, icerikEl);
  }

  // ═══════════════════════════════════════════════════════════════
  // YARDIMCI: Bir ilçe + seçim için verileri al
  // ═══════════════════════════════════════════════════════════════
  function getIlceVerisi(il, ilce, secim) {
    if (!il || !ilce || !secim) return null;
    const key = `${il}/${ilce}`;

    const partiSec = cache.parti_ilceler.secimler[secim];
    const metaSec = cache.meta_ilceler.secimler[secim];

    const partiKayit = partiSec?.ilceler?.[key];
    const metaKayit = metaSec?.ilceler?.[key];

    if (!partiKayit && !metaKayit) return null;

    // Parti oylarını normalize et
    const partiler = {};
    let toplamOy = 0;
    if (partiKayit) {
      for (const [p, oy] of Object.entries(partiKayit)) {
        if (p === 'toplam' || p === 'il_sayisi') continue;
        if (!oy) continue;
        const n = PARTI_NORMALIZE[p] || p;
        partiler[n] = (partiler[n] || 0) + (oy || 0);
        toplamOy += (oy || 0);
      }
    }

    return {
      il, ilce, secim, key,
      meta: metaKayit || null,
      partiler,
      toplamOy,
    };
  }

  function getIlVerisi(il, secim) {
    if (!il || !secim) return null;

    const partiSec = cache.parti_iller.secimler[secim];
    const metaSec = cache.meta_iller.secimler[secim];

    const partiKayit = partiSec?.iller?.[il];
    const metaKayit = metaSec?.iller?.[il];

    if (!partiKayit && !metaKayit) return null;

    const partiler = {};
    let toplamOy = 0;
    if (partiKayit) {
      for (const [p, oy] of Object.entries(partiKayit)) {
        if (p === 'toplam' || p === 'il_sayisi') continue;
        if (!oy) continue;
        const n = PARTI_NORMALIZE[p] || p;
        partiler[n] = (partiler[n] || 0) + (oy || 0);
        toplamOy += (oy || 0);
      }
    }

    return {
      il, secim,
      meta: metaKayit || null,
      partiler,
      toplamOy,
    };
  }

  function getTurkiyeVerisi(secim) {
    if (!secim) return null;
    const partiSec = cache.parti_iller.secimler[secim];
    if (!partiSec || !partiSec.iller) return null;

    const partiler = {};
    let toplamOy = 0;
    let toplamSandik = 0;
    let toplamKayitli = 0;
    let toplamOyKullanan = 0;
    let toplamGecerli = 0;
    let toplamGecersiz = 0;

    for (const ilVeri of Object.values(partiSec.iller)) {
      for (const [p, oy] of Object.entries(ilVeri)) {
        if (p === 'toplam' || p === 'il_sayisi') continue;
        if (!oy) continue;
        const n = PARTI_NORMALIZE[p] || p;
        partiler[n] = (partiler[n] || 0) + (oy || 0);
        toplamOy += (oy || 0);
      }
    }

    const metaSec = cache.meta_iller.secimler[secim];
    if (metaSec?.iller) {
      for (const ilMeta of Object.values(metaSec.iller)) {
        toplamSandik += ilMeta.toplam_sandik || 0;
        toplamKayitli += ilMeta.kayitli_secmen || 0;
        toplamOyKullanan += ilMeta.oy_kullanan_secmen || 0;
        toplamGecerli += ilMeta.gecerli_oy || 0;
        toplamGecersiz += ilMeta.gecersiz_oy || 0;
      }
    }

    return {
      secim,
      meta: {
        toplam_sandik: toplamSandik,
        kayitli_secmen: toplamKayitli,
        oy_kullanan_secmen: toplamOyKullanan,
        gecerli_oy: toplamGecerli,
        gecersiz_oy: toplamGecersiz,
        katilim_orani: toplamKayitli > 0 ? (toplamOyKullanan / toplamKayitli) * 100 : 0,
      },
      partiler,
      toplamOy,
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ORTAK: Seçim ve ilçe seçici
  // ═══════════════════════════════════════════════════════════════
  function renderSecimSecici(id, secili) {
    const secimler = cache.manifest.elections || [];
    const opts = secimler.map(s =>
      `<option value="${s.key}" ${s.key === secili ? 'selected' : ''}>${s.key.replace('_', ' · ')} — ${escapeHtml(s.tip)}</option>`
    ).join('');
    return `<select id="${id}" class="kars-select">${opts}</select>`;
  }

  function renderIlSecici(id, secili) {
    const iller = Object.keys(cache.geo.iller).sort((a, b) => a.localeCompare(b, 'tr'));
    const opts = iller.map(il =>
      `<option value="${il}" ${il === secili ? 'selected' : ''}>${escapeHtml(il)}</option>`
    ).join('');
    return `<select id="${id}" class="kars-select">${opts}</select>`;
  }

  function renderIlceSecici(id, il, secili) {
    if (!il) return `<select id="${id}" class="kars-select" disabled><option>— il seçin —</option></select>`;
    const ilceler = Object.keys(cache.geo.ilceler)
      .filter(k => k.startsWith(il + '/'))
      .map(k => k.split('/', 2)[1])
      .sort((a, b) => a.localeCompare(b, 'tr'));
    const opts = ilceler.map(i =>
      `<option value="${i}" ${i === secili ? 'selected' : ''}>${escapeHtml(i)}</option>`
    ).join('');
    return `<select id="${id}" class="kars-select">${opts}</select>`;
  }

  /**
   * Bir ilin alfabetik ilk ilçesini döner.
   * İl değiştirildiğinde yeni ilin ilçesi otomatik seçilmesi için.
   */
  function ilkIlceyiAl(il) {
    if (!il) return '';
    const ilceler = Object.keys(cache.geo.ilceler)
      .filter(k => k.startsWith(il + '/'))
      .map(k => k.split('/', 2)[1])
      .sort((a, b) => a.localeCompare(b, 'tr'));
    return ilceler[0] || '';
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME A — İKİ İLÇE KARŞILAŞTIRMASI
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeA(container, icerikEl) {
    const s = state.A;

    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          Aynı seçimde <strong>iki ilçenin</strong> seçim sonuçlarını ve demografisini yan yana
          görün. Komşu ilçeler arasındaki farklar dikkat çekici olabilir.
        </p>
      </div>

      <div class="panel" style="margin-bottom: var(--space-5);">
        <div class="panel-title">Seçim</div>
        <div class="kars-filtre">
          ${renderSecimSecici('karsA-secim', s.secim)}
        </div>
      </div>

      <div class="kars-iki-sutun">
        <div class="panel">
          <div class="panel-title">İlçe 1</div>
          <div class="kars-filtre" style="margin-bottom: var(--space-3);">
            ${renderIlSecici('karsA-il1', s.il1)}
            ${renderIlceSecici('karsA-ilce1', s.il1, s.ilce1)}
          </div>
          <div id="karsA-icerik1"></div>
        </div>

        <div class="panel">
          <div class="panel-title">İlçe 2</div>
          <div class="kars-filtre" style="margin-bottom: var(--space-3);">
            ${renderIlSecici('karsA-il2', s.il2)}
            ${renderIlceSecici('karsA-ilce2', s.il2, s.ilce2)}
          </div>
          <div id="karsA-icerik2"></div>
        </div>
      </div>

      <div class="section-head trend-grafik-baslik" style="margin-top: var(--space-6);">
        <div>
          <h2>Parti karşılaştırma tablosu</h2>
          <span class="eyebrow">İki ilçe arası yüzde puanı fark</span>
        </div>
        <button type="button" class="chart-export-btn focus-ring" id="karsA-csv-btn">CSV indir</button>
      </div>
      <div class="panel" style="padding: 0; overflow: hidden;">
        <div id="karsA-tablo"></div>
      </div>
    `;

    // Olay dinleyicileri
    icerikEl.querySelector('#karsA-secim').addEventListener('change', e => {
      s.secim = e.target.value;
      renderSekmeA(container, icerikEl);
    });
    icerikEl.querySelector('#karsA-il1').addEventListener('change', e => {
      s.il1 = e.target.value;
      s.ilce1 = ilkIlceyiAl(e.target.value);
      renderSekmeA(container, icerikEl);
    });
    icerikEl.querySelector('#karsA-ilce1').addEventListener('change', e => {
      s.ilce1 = e.target.value;
      renderSekmeA(container, icerikEl);
    });
    icerikEl.querySelector('#karsA-il2').addEventListener('change', e => {
      s.il2 = e.target.value;
      s.ilce2 = ilkIlceyiAl(e.target.value);
      renderSekmeA(container, icerikEl);
    });
    icerikEl.querySelector('#karsA-ilce2').addEventListener('change', e => {
      s.ilce2 = e.target.value;
      renderSekmeA(container, icerikEl);
    });

    // İçerik
    const v1 = getIlceVerisi(s.il1, s.ilce1, s.secim);
    const v2 = getIlceVerisi(s.il2, s.ilce2, s.secim);

    renderIlcePanel(icerikEl.querySelector('#karsA-icerik1'), v1, s.il1, s.ilce1);
    renderIlcePanel(icerikEl.querySelector('#karsA-icerik2'), v2, s.il2, s.ilce2);
    renderIkiIlceFarkTablosu(icerikEl.querySelector('#karsA-tablo'), v1, v2);
    bindKarsCsv(icerikEl, '#karsA-csv-btn', '#karsA-tablo table', () =>
      `karsilastirma-ilce-${s.secim}-${s.il1}-${s.ilce1}-vs-${s.il2}-${s.ilce2}`);
  }

  function renderIlcePanel(el, v, il, ilce) {
    if (!el) return;
    if (!v) {
      el.innerHTML = `<div class="kars-bos">${(il && ilce) ? 'Bu seçimde veri yok' : 'Lütfen ilçe seçin'}</div>`;
      return;
    }

    const fmt = window.AT.fmt;
    const m = v.meta;

    let metaHTML = '';
    if (m) {
      const kat = m.katilim_orani ?? (m.kayitli_secmen > 0 ? (m.oy_kullanan_secmen / m.kayitli_secmen) * 100 : 0);
      metaHTML = `
        <div class="kars-meta-grid">
          <div class="kars-meta-tile">
            <div class="ozet-lbl">Kayıtlı seçmen</div>
            <div class="ozet-val">${fmt.n(m.kayitli_secmen)}</div>
          </div>
          <div class="kars-meta-tile">
            <div class="ozet-lbl">Katılım</div>
            <div class="ozet-val">%${fmt.n1(kat)}</div>
          </div>
          <div class="kars-meta-tile">
            <div class="ozet-lbl">Geçerli oy</div>
            <div class="ozet-val">${fmt.n(m.gecerli_oy)}</div>
          </div>
          <div class="kars-meta-tile">
            <div class="ozet-lbl">Sandık</div>
            <div class="ozet-val">${fmt.n(m.toplam_sandik)}</div>
          </div>
        </div>
      `;
    }

    // Parti dağılımı — yığılmış bar
    const partiSatirlari = partilerSiraliYuzdeliBar(v.partiler, v.toplamOy);

    el.innerHTML = `
      ${metaHTML}
      <div class="section-mini" style="margin-top: var(--space-4);">Parti dağılımı</div>
      <div class="kars-parti-liste">
        ${partiSatirlari}
      </div>
    `;
  }

  function partilerSiraliYuzdeliBar(partiler, toplamOy) {
    const fmt = window.AT.fmt;
    if (toplamOy === 0 || !Object.keys(partiler).length) {
      return '<div class="kars-bos">Parti verisi yok</div>';
    }

    const sirali = Object.entries(partiler).sort((a, b) => b[1] - a[1]);
    return sirali.slice(0, 10).map(([p, oy]) => {
      const yzd = (oy / toplamOy) * 100;
      if (yzd < 0.2) return '';
      const renk = PARTI_RENK[p] || '#888';
      const barW = Math.min(100, yzd * 1.8);
      return `
        <div class="kars-parti-row">
          <div class="kars-parti-ad">
            <span class="kars-parti-nokta" style="background:${renk};"></span>
            ${escapeHtml(p)}
          </div>
          <div class="kars-parti-bar">
            <div class="kars-parti-fill" style="width:${barW.toFixed(1)}%; background:${renk};"></div>
          </div>
          <div class="kars-parti-deg">%${fmt.n1(yzd)}</div>
          <div class="kars-parti-sayi">${fmt.n(oy)}</div>
        </div>
      `;
    }).join('');
  }

  function renderIkiIlceFarkTablosu(el, v1, v2) {
    if (!el) return;
    if (!v1 || !v2) {
      el.innerHTML = `<div class="kars-bos" style="padding: var(--space-4);">İki ilçe de seçilmelidir</div>`;
      return;
    }
    const fmt = window.AT.fmt;

    const partilerSet = new Set([...Object.keys(v1.partiler), ...Object.keys(v2.partiler)]);
    const satirlar = [];
    for (const p of partilerSet) {
      const o1 = v1.partiler[p] || 0;
      const o2 = v2.partiler[p] || 0;
      const y1 = v1.toplamOy > 0 ? (o1 / v1.toplamOy) * 100 : 0;
      const y2 = v2.toplamOy > 0 ? (o2 / v2.toplamOy) * 100 : 0;
      if (y1 < 0.5 && y2 < 0.5) continue;
      satirlar.push({ parti: p, y1, y2, fark: y2 - y1 });
    }
    satirlar.sort((a, b) => Math.max(b.y1, b.y2) - Math.max(a.y1, a.y2));

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">Parti</th>
            <th style="text-align:right;">${escapeHtml(v1.ilce)}</th>
            <th style="text-align:right;">${escapeHtml(v2.ilce)}</th>
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
                  <div style="display:flex; align-items:center; gap:var(--space-2);">
                    <span style="width:12px;height:12px;background:${PARTI_RENK[s.parti] || '#888'};border-radius:2px;"></span>
                    <span style="font-weight:500;">${escapeHtml(s.parti)}</span>
                  </div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n1(s.y1)}%</td>
                <td class="num" style="text-align:right;">${fmt.n1(s.y2)}%</td>
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

  // ═══════════════════════════════════════════════════════════════
  // SEKME B — İKİ SEÇİM KARŞILAŞTIRMASI
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeB(container, icerikEl) {
    const s = state.B;

    // Kapsam seçici
    const katmanOpts = [
      ['turkiye', 'Türkiye geneli'],
      ['il',      'İl'],
      ['ilce',    'İlçe'],
    ].map(([v, l]) => `<option value="${v}" ${v === s.katman ? 'selected' : ''}>${l}</option>`).join('');

    let kapsamDetay = '';
    if (s.katman === 'il') {
      kapsamDetay = renderIlSecici('karsB-kapsam-il', s.katman_deger);
    } else if (s.katman === 'ilce') {
      // ilce için il + ilçe gerek; katman_deger "İL/İLÇE" formatında tutulur
      const [il_, ilce_] = (s.katman_deger || '').split('/');
      kapsamDetay = `${renderIlSecici('karsB-kapsam-il', il_ || '')}${renderIlceSecici('karsB-kapsam-ilce', il_, ilce_)}`;
    }

    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          Aynı yerin <strong>iki seçimdeki</strong> sonuçlarını yan yana görün. Parti hareketlerini
          ve katılım değişimini ortaya çıkarır.
        </p>
      </div>

      <div class="panel" style="margin-bottom: var(--space-5);">
        <div class="panel-title">Kapsam</div>
        <div class="kars-filtre">
          <select id="karsB-katman" class="kars-select">${katmanOpts}</select>
          ${kapsamDetay}
        </div>
      </div>

      <div class="kars-iki-sutun">
        <div class="panel">
          <div class="panel-title">Seçim 1</div>
          <div class="kars-filtre" style="margin-bottom: var(--space-3);">
            ${renderSecimSecici('karsB-secim1', s.secim1)}
          </div>
          <div id="karsB-icerik1"></div>
        </div>

        <div class="panel">
          <div class="panel-title">Seçim 2</div>
          <div class="kars-filtre" style="margin-bottom: var(--space-3);">
            ${renderSecimSecici('karsB-secim2', s.secim2)}
          </div>
          <div id="karsB-icerik2"></div>
        </div>
      </div>

      <div class="section-head trend-grafik-baslik" style="margin-top: var(--space-6);">
        <div>
          <h2>Parti hareketi tablosu</h2>
          <span class="eyebrow">İki seçim arası fark (yüzde puanı)</span>
        </div>
        <button type="button" class="chart-export-btn focus-ring" id="karsB-csv-btn">CSV indir</button>
      </div>
      <div class="panel" style="padding: 0; overflow: hidden;">
        <div id="karsB-tablo"></div>
      </div>
    `;

    // Olaylar
    icerikEl.querySelector('#karsB-katman').addEventListener('change', e => {
      s.katman = e.target.value;
      s.katman_deger = '';
      renderSekmeB(container, icerikEl);
    });
    const kapsamIl = icerikEl.querySelector('#karsB-kapsam-il');
    if (kapsamIl) {
      kapsamIl.addEventListener('change', e => {
        if (s.katman === 'il') s.katman_deger = e.target.value;
        else if (s.katman === 'ilce') {
          const ilkIlce = ilkIlceyiAl(e.target.value);
          s.katman_deger = `${e.target.value}/${ilkIlce}`;
        }
        renderSekmeB(container, icerikEl);
      });
    }
    const kapsamIlce = icerikEl.querySelector('#karsB-kapsam-ilce');
    if (kapsamIlce) {
      kapsamIlce.addEventListener('change', e => {
        const [il_,] = (s.katman_deger || '').split('/');
        s.katman_deger = `${il_}/${e.target.value}`;
        renderSekmeB(container, icerikEl);
      });
    }
    icerikEl.querySelector('#karsB-secim1').addEventListener('change', e => {
      s.secim1 = e.target.value;
      renderSekmeB(container, icerikEl);
    });
    icerikEl.querySelector('#karsB-secim2').addEventListener('change', e => {
      s.secim2 = e.target.value;
      renderSekmeB(container, icerikEl);
    });

    // Verileri al
    const v1 = getKapsamVerisi(s.katman, s.katman_deger, s.secim1);
    const v2 = getKapsamVerisi(s.katman, s.katman_deger, s.secim2);

    renderSecimPanel(icerikEl.querySelector('#karsB-icerik1'), v1);
    renderSecimPanel(icerikEl.querySelector('#karsB-icerik2'), v2);
    renderIkiSecimFarkTablosu(icerikEl.querySelector('#karsB-tablo'), v1, v2, s.secim1, s.secim2);
    bindKarsCsv(icerikEl, '#karsB-csv-btn', '#karsB-tablo table', () =>
      `karsilastirma-secim-${s.katman}-${s.secim1}-vs-${s.secim2}`);
  }

  function getKapsamVerisi(katman, katman_deger, secim) {
    if (katman === 'turkiye') return getTurkiyeVerisi(secim);
    if (katman === 'il' && katman_deger) return getIlVerisi(katman_deger, secim);
    if (katman === 'ilce' && katman_deger) {
      const [il, ilce] = katman_deger.split('/');
      return getIlceVerisi(il, ilce, secim);
    }
    return null;
  }

  function renderSecimPanel(el, v) {
    if (!el) return;
    if (!v) {
      el.innerHTML = `<div class="kars-bos">Bu kapsam ve seçim için veri yok</div>`;
      return;
    }
    const fmt = window.AT.fmt;
    const m = v.meta;

    let metaHTML = '';
    if (m) {
      const kat = m.katilim_orani ?? (m.kayitli_secmen > 0 ? (m.oy_kullanan_secmen / m.kayitli_secmen) * 100 : 0);
      metaHTML = `
        <div class="kars-meta-grid">
          <div class="kars-meta-tile">
            <div class="ozet-lbl">Kayıtlı seçmen</div>
            <div class="ozet-val">${fmt.n(m.kayitli_secmen)}</div>
          </div>
          <div class="kars-meta-tile">
            <div class="ozet-lbl">Katılım</div>
            <div class="ozet-val">%${fmt.n1(kat)}</div>
          </div>
          <div class="kars-meta-tile">
            <div class="ozet-lbl">Geçerli oy</div>
            <div class="ozet-val">${fmt.n(m.gecerli_oy)}</div>
          </div>
          <div class="kars-meta-tile">
            <div class="ozet-lbl">Sandık</div>
            <div class="ozet-val">${fmt.n(m.toplam_sandik)}</div>
          </div>
        </div>
      `;
    }

    el.innerHTML = `
      ${metaHTML}
      <div class="section-mini" style="margin-top: var(--space-4);">Parti dağılımı</div>
      <div class="kars-parti-liste">
        ${partilerSiraliYuzdeliBar(v.partiler, v.toplamOy)}
      </div>
    `;
  }

  function renderIkiSecimFarkTablosu(el, v1, v2, secim1, secim2) {
    if (!el) return;
    if (!v1 || !v2) {
      el.innerHTML = `<div class="kars-bos" style="padding: var(--space-4);">İki seçim için de veri olmalı</div>`;
      return;
    }
    const fmt = window.AT.fmt;

    const partilerSet = new Set([...Object.keys(v1.partiler), ...Object.keys(v2.partiler)]);
    const satirlar = [];
    for (const p of partilerSet) {
      const o1 = v1.partiler[p] || 0;
      const o2 = v2.partiler[p] || 0;
      const y1 = v1.toplamOy > 0 ? (o1 / v1.toplamOy) * 100 : 0;
      const y2 = v2.toplamOy > 0 ? (o2 / v2.toplamOy) * 100 : 0;
      if (y1 < 0.5 && y2 < 0.5) continue;
      satirlar.push({ parti: p, y1, y2, fark: y2 - y1 });
    }
    satirlar.sort((a, b) => Math.max(b.y1, b.y2) - Math.max(a.y1, a.y2));

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">Parti</th>
            <th style="text-align:right;">${secim1}</th>
            <th style="text-align:right;">${secim2}</th>
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
                  <div style="display:flex; align-items:center; gap:var(--space-2);">
                    <span style="width:12px;height:12px;background:${PARTI_RENK[s.parti] || '#888'};border-radius:2px;"></span>
                    <span style="font-weight:500;">${escapeHtml(s.parti)}</span>
                  </div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n1(s.y1)}%</td>
                <td class="num" style="text-align:right;">${fmt.n1(s.y2)}%</td>
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

  // ═══════════════════════════════════════════════════════════════
  // SEKME C — TEK İLÇENİN GEÇMİŞİ
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeC(container, icerikEl) {
    const s = state.C;

    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          Bir ilçenin <strong>tüm seçimlerdeki</strong> parti dağılımını ve katılım oranını
          tek tabloda görün. Yıllar arasındaki kayışı net ortaya çıkarır.
        </p>
      </div>

      <div class="panel" style="margin-bottom: var(--space-5);">
        <div class="panel-title">İlçe seçin</div>
        <div class="kars-filtre">
          ${renderIlSecici('karsC-il', s.il)}
          ${renderIlceSecici('karsC-ilce', s.il, s.ilce)}
        </div>
      </div>

      <div class="section-head">
        <h2>Tüm seçimlerde parti dağılımı — ${escapeHtml(s.il)}${s.ilce ? ' / ' + escapeHtml(s.ilce) : ''}</h2>
        <span class="eyebrow">Her bar %100, partiler renk dilimi olarak</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="karsC-zaman"></div>
      </div>

      <div class="section-head">
        <h2>Katılım oranı çizgisi</h2>
        <span class="eyebrow">Yıllar arası katılım değişimi</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="karsC-katilim"></div>
      </div>

      <div class="section-head trend-grafik-baslik">
        <div>
          <h2>Seçim seçim detay tablo</h2>
          <span class="eyebrow">Her seçimde en çok oy alan partiler</span>
        </div>
        <button type="button" class="chart-export-btn focus-ring" id="karsC-csv-btn">CSV indir</button>
      </div>
      <div class="panel" style="padding: 0; overflow: hidden;">
        <div id="karsC-detay-tablo"></div>
      </div>
    `;

    icerikEl.querySelector('#karsC-il').addEventListener('change', e => {
      s.il = e.target.value;
      s.ilce = ilkIlceyiAl(e.target.value);
      renderSekmeC(container, icerikEl);
    });
    icerikEl.querySelector('#karsC-ilce').addEventListener('change', e => {
      s.ilce = e.target.value;
      renderSekmeC(container, icerikEl);
    });

    renderCSekmesiZaman(icerikEl);
    renderCSekmesiKatilim(icerikEl);
    renderCSekmesiDetayTablo(icerikEl);
    bindKarsCsv(icerikEl, '#karsC-csv-btn', '#karsC-detay-tablo table', () =>
      `karsilastirma-gecmis-${s.il}-${s.ilce}`);
  }

  function bindKarsCsv(icerikEl, btnSel, tableSel, filenameFn) {
    const btn = icerikEl.querySelector(btnSel);
    const table = () => icerikEl.querySelector(tableSel);
    if (btn) btn.disabled = !table();
    if (window.AT.bindCsvExport) window.AT.bindCsvExport(btn, table, filenameFn);
  }

  function renderCSekmesiZaman(icerikEl) {
    const el = icerikEl.querySelector('#karsC-zaman');
    if (!el) return;
    const s = state.C;
    if (!s.il || !s.ilce) {
      el.innerHTML = '<div class="kars-bos">Lütfen ilçe seçin</div>';
      return;
    }

    const fmt = window.AT.fmt;
    const secimler = cache.manifest.elections || [];

    // Tüm seçimlerden bu ilçeyi topla
    const veriler = secimler.map(s_ => ({
      secim: s_.key,
      veri: getIlceVerisi(s.il, s.ilce, s_.key),
    })).filter(x => x.veri && x.veri.toplamOy > 0);

    if (veriler.length === 0) {
      el.innerHTML = '<div class="kars-bos">Bu ilçe için seçim verisi yok</div>';
      return;
    }

    // En sık görülen partileri bul (sıralama için)
    const partiToplamlari = {};
    for (const { veri } of veriler) {
      for (const [p, oy] of Object.entries(veri.partiler)) {
        partiToplamlari[p] = (partiToplamlari[p] || 0) + oy;
      }
    }
    const partilerSirali = Object.entries(partiToplamlari)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([p]) => p);

    let rows = '';
    for (const { secim, veri } of veriler) {
      let dilimler = '';
      let digerYzd = 0;
      for (const p of partilerSirali) {
        const oy = veri.partiler[p] || 0;
        const yzd = (oy / veri.toplamOy) * 100;
        if (yzd < 0.5) continue;
        const renk = PARTI_RENK[p] || '#888';
        dilimler += `<div class="karsC-dilim" style="width:${yzd.toFixed(2)}%; background:${renk};" title="${escapeHtml(p)}: ${fmt.n1(yzd)}%">
          ${yzd >= 8 ? `<span class="karsC-dilim-text">${fmt.n1(yzd)}%</span>` : ''}
        </div>`;
      }
      // Diğer
      for (const [p, oy] of Object.entries(veri.partiler)) {
        if (partilerSirali.includes(p)) continue;
        digerYzd += (oy / veri.toplamOy) * 100;
      }
      if (digerYzd > 0.5) {
        dilimler += `<div class="karsC-dilim" style="width:${digerYzd.toFixed(2)}%; background:#aaa;" title="Diğer: ${fmt.n1(digerYzd)}%"></div>`;
      }
      rows += `
        <div class="karsC-row">
          <div class="karsC-secim">${secim.replace('_', ' · ')}</div>
          <div class="karsC-bar">${dilimler}</div>
        </div>
      `;
    }

    // Lejant
    let lejant = '';
    for (const p of partilerSirali.slice(0, 10)) {
      const renk = PARTI_RENK[p] || '#888';
      lejant += `<span class="karsC-leg">
        <span class="karsC-leg-renk" style="background:${renk};"></span>
        ${escapeHtml(p)}
      </span>`;
    }
    lejant += `<span class="karsC-leg">
      <span class="karsC-leg-renk" style="background:#aaa;"></span>
      Diğer
    </span>`;

    el.innerHTML = `
      <div class="karsC-wrap">
        ${rows}
        <div class="karsC-lejant">${lejant}</div>
      </div>
    `;
  }

  function renderCSekmesiKatilim(icerikEl) {
    const el = icerikEl.querySelector('#karsC-katilim');
    if (!el) return;
    const s = state.C;
    if (!s.il || !s.ilce) {
      el.innerHTML = '<div class="kars-bos">Lütfen ilçe seçin</div>';
      return;
    }
    const fmt = window.AT.fmt;

    const secimler = cache.manifest.elections || [];
    const veriler = [];
    for (const sm of secimler) {
      const key = `${s.il}/${s.ilce}`;
      const metaSec = cache.meta_ilceler.secimler[sm.key];
      const m = metaSec?.ilceler?.[key];
      if (!m || !m.kayitli_secmen) continue;
      const katilim = m.katilim_orani ?? ((m.oy_kullanan_secmen / m.kayitli_secmen) * 100);
      veriler.push({ secim: sm.key, katilim, kayitli: m.kayitli_secmen, oykullanan: m.oy_kullanan_secmen });
    }

    if (veriler.length === 0) {
      el.innerHTML = '<div class="kars-bos">Bu ilçe için katılım verisi yok</div>';
      return;
    }

    // SVG çizgi grafik
    const w = 900, h = 220;
    const padL = 60, padR = 60, padT = 30, padB = 50;
    const iw = w - padL - padR;
    const ih = h - padT - padB;

    const minK = Math.min(...veriler.map(v => v.katilim));
    const maxK = Math.max(...veriler.map(v => v.katilim));
    // Y ekseni — 0-100, ama min'in altında pay bırak
    const yMin = Math.max(0, Math.floor(minK / 10) * 10 - 5);
    const yMax = Math.min(100, Math.ceil(maxK / 10) * 10 + 5);
    const yRange = Math.max(yMax - yMin, 1);

    const xStep = veriler.length > 1 ? iw / (veriler.length - 1) : iw;
    const noktalar = veriler.map((v, i) => ({
      x: padL + i * xStep,
      y: padT + ih - ((v.katilim - yMin) / yRange) * ih,
      v,
    }));

    const cizgi = noktalar.map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ');
    const noktaCizimi = noktalar.map(n =>
      `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="4.5" fill="var(--brand-gold)" stroke="var(--paper)" stroke-width="1.5">
        <title>${n.v.secim}: %${fmt.n1(n.v.katilim)}</title>
      </circle>`
    ).join('');

    // X etiketleri
    const xEtiket = noktalar.map(n =>
      `<text x="${n.x.toFixed(1)}" y="${(h - 16).toFixed(1)}" text-anchor="middle" class="kars-eksen">${n.v.secim.replace('_', '·')}</text>`
    ).join('');
    // Yüzde değerleri
    const yuzdeEtiket = noktalar.map(n =>
      `<text x="${n.x.toFixed(1)}" y="${(n.y - 9).toFixed(1)}" text-anchor="middle" class="kars-eksen" style="font-weight:600; fill:var(--ink);">%${fmt.n1(n.v.katilim)}</text>`
    ).join('');

    // Y ekseni
    let yEkseni = '';
    for (let i = 0; i <= 4; i++) {
      const val = yMin + (yRange * i / 4);
      const y = padT + ih - ((val - yMin) / yRange) * ih;
      yEkseni += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + iw).toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line-soft)" stroke-width="0.5"/>`;
      yEkseni += `<text x="${(padL - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="kars-eksen">%${val.toFixed(0)}</text>`;
    }

    el.innerHTML = `
      <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="width:100%; height:auto;">
        ${yEkseni}
        <path d="${cizgi}" fill="none" stroke="var(--brand-gold)" stroke-width="2"/>
        ${noktaCizimi}
        ${yuzdeEtiket}
        ${xEtiket}
      </svg>
    `;
  }

  function renderCSekmesiDetayTablo(icerikEl) {
    const el = icerikEl.querySelector('#karsC-detay-tablo');
    if (!el) return;
    const s = state.C;
    if (!s.il || !s.ilce) {
      el.innerHTML = '<div class="kars-bos" style="padding: var(--space-4);">Lütfen ilçe seçin</div>';
      return;
    }
    const fmt = window.AT.fmt;
    const secimler = cache.manifest.elections || [];

    const rows = [];
    for (const sm of secimler) {
      const veri = getIlceVerisi(s.il, s.ilce, sm.key);
      if (!veri || !veri.toplamOy) continue;
      const enUst = Object.entries(veri.partiler)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3);
      const yzdLi = enUst.map(([p, oy]) => `<span style="color:${PARTI_RENK[p] || 'inherit'}; font-weight:600;">${escapeHtml(p)}</span> %${fmt.n1((oy/veri.toplamOy)*100)}`).join(' · ');
      rows.push({ secim: sm.key, tip: sm.tip, yzdLi, toplam: veri.toplamOy });
    }

    if (rows.length === 0) {
      el.innerHTML = '<div class="kars-bos" style="padding: var(--space-4);">Veri yok</div>';
      return;
    }

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">Seçim</th>
            <th style="text-align:left;">İlk 3 parti</th>
            <th style="text-align:right;">Toplam oy</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td>
                <div style="font-weight:500;">${r.secim.replace('_', ' · ')}</div>
                <div style="font-size:11.5px; color:var(--ink-3);">${escapeHtml(r.tip)}</div>
              </td>
              <td>${r.yzdLi}</td>
              <td class="num" style="text-align:right;">${fmt.n(r.toplam)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
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
        .kars-sekmeler {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
          margin-bottom: var(--space-6);
        }
        .kars-sekme {
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
        .kars-sekme:hover { border-color: var(--brand-gold); transform: translateY(-1px); }
        .kars-sekme.active {
          border-color: var(--brand-gold);
          border-width: 2px;
          padding: calc(var(--space-4) - 1px) calc(var(--space-5) - 1px);
          background: var(--paper-2);
        }
        .kars-sekme .sekme-num {
          font-family: var(--font-display);
          font-size: 28px; font-weight: 500;
          color: var(--brand-gold); line-height: 1;
        }
        .kars-sekme .sekme-baslik {
          font-family: var(--font-display);
          font-size: 16px; font-weight: 600;
          color: var(--ink); margin-top: var(--space-2);
        }
        .kars-sekme .sekme-sub {
          font-size: 12px; color: var(--ink-3); margin-top: 2px;
        }

        .kars-iki-sutun {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }

        .kars-filtre {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          align-items: center;
        }
        .kars-select {
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
        .kars-select:focus {
          outline: 2px solid var(--brand-gold);
          outline-offset: -1px;
        }
        .kars-select:disabled {
          opacity: 0.5; cursor: not-allowed;
        }

        .kars-meta-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: var(--space-2);
        }
        .kars-meta-tile {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-3);
        }
        .kars-meta-tile .ozet-lbl {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--ink-3);
        }
        .kars-meta-tile .ozet-val {
          font-family: var(--font-mono);
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
          margin-top: 1px;
        }

        .section-mini {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-2);
          letter-spacing: -0.01em;
          margin-bottom: var(--space-2);
        }

        .kars-parti-liste {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .kars-parti-row {
          display: grid;
          grid-template-columns: 1.3fr 1.4fr 50px 80px;
          align-items: center;
          gap: var(--space-2);
          font-size: 12px;
        }
        .kars-parti-ad {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          color: var(--ink-2);
          font-weight: 500;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .kars-parti-nokta {
          width: 10px; height: 10px;
          border-radius: 2px;
          flex-shrink: 0;
        }
        .kars-parti-bar {
          background: var(--paper-2);
          height: 12px;
          border-radius: 2px;
          overflow: hidden;
        }
        .kars-parti-fill { height: 100%; }
        .kars-parti-deg {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          color: var(--ink);
          text-align: right;
        }
        .kars-parti-sayi {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--ink-3);
          text-align: right;
        }

        .kars-bos {
          padding: var(--space-4);
          color: var(--ink-3);
          font-style: italic;
          text-align: center;
        }

        /* Sekme C — tüm seçimlerde dağılım */
        .karsC-wrap {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .karsC-row {
          display: grid;
          grid-template-columns: 110px 1fr;
          gap: var(--space-3);
          align-items: center;
        }
        .karsC-secim {
          font-family: var(--font-mono);
          font-size: 12px;
          font-weight: 600;
          color: var(--ink-2);
        }
        .karsC-bar {
          display: flex;
          height: 26px;
          background: var(--paper-2);
          border-radius: 3px;
          overflow: hidden;
        }
        .karsC-dilim {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .karsC-dilim-text {
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: rgba(255,255,255,0.95);
          font-weight: 600;
          padding: 0 4px;
          white-space: nowrap;
          text-shadow: 0 0 2px rgba(0,0,0,0.4);
        }
        .karsC-lejant {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
          font-size: 11.5px;
          color: var(--ink-2);
        }
        .karsC-leg {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .karsC-leg-renk {
          width: 12px; height: 12px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.1);
        }

        .kars-eksen {
          font-family: var(--font-mono);
          font-size: 11px;
          fill: var(--ink-3);
        }

        @media (max-width: 900px) {
          .kars-iki-sutun {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }
})();
