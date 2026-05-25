/* ─────────────────────────────────────────────────────────
   Demografi module v1 — 3 sekmeli demografi gezgini
   
   A) Yaş analizi — yaş piramidi, ortalama yaş, 65+ oranı
   B) Eğitim analizi — eğitim dağılımı, üniversite oranı
   C) Cinsiyet & zaman — cinsiyet oranı, yıllar arası değişim
   
   Veri:
     data/aggregates/tr_demografi_ozet.json  (~95 KB gzip)
     data/aggregates/demografi_iller_manifest.json
     data/demografi_iller/il_<X>.json        (kullanıcı il seçince yüklenir)
     data/core/geo.json
     data/core/turkiye_iller.geojson
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // ÖNBELLEK
  // ═══════════════════════════════════════════════════════════════
  const cache = {
    tr_ozet: null,                  // Türkiye + 81 il özeti
    manifest: null,                 // il → dosya yolu
    geo: null,                      // geo.json
    geojson: null,                  // turkiye_iller.geojson
    il_detaylari: new Map(),        // İhtiyaç oldukça yüklenen il detayları (il_adi → veri)
  };

  // ═══════════════════════════════════════════════════════════════
  // DURUM
  // ═══════════════════════════════════════════════════════════════
  const state = {
    sekme: 'A',  // A | B | C | D
    yil: '2024',
    il: '',           // boş = Türkiye geneli
    ilce: '',         // boş = il geneli (il boşsa anlamsız)
  };

  // ═══════════════════════════════════════════════════════════════
  // RENKLER & ETİKETLER
  // ═══════════════════════════════════════════════════════════════
  const YAS_ETIKET = {
    "18-24": "18-24",
    "25-34": "25-34",
    "35-44": "35-44",
    "45-54": "45-54",
    "55-64": "55-64",
    "65+":   "65+",
  };

  const EGITIM_ETIKET = {
    "okuma_yazma_bilmeyen": "Okur-yazar değil",
    "okuryazar": "Okur-yazar, mezun değil",
    "ilkokul_ortaokul": "İlk/ortaokul",
    "lise_dengi": "Lise/dengi",
    "universite_plus": "Üniversite ve üstü",
    "bilinmeyen": "Bilinmeyen",
  };

  // Yaş kategorisi başına renk (genç → koyu turuncu, yaşlı → koyu mavi)
  const YAS_RENK = {
    "18-24": '#c8861a',
    "25-34": '#dca858',
    "35-44": '#c8c089',
    "45-54": '#9eb39b',
    "55-64": '#5a8094',
    "65+":   '#1f4d6e',
  };

  // Eğitim seviyesi renkleri (düşük → koyu, yüksek → açık)
  const EGITIM_RENK = {
    "okuma_yazma_bilmeyen": '#7a1f10',
    "okuryazar": '#b8311a',
    "ilkokul_ortaokul": '#c8861a',
    "lise_dengi": '#c8c089',
    "universite_plus": '#2d6b3f',
    "bilinmeyen": '#a0a0a0',
  };

  // ═══════════════════════════════════════════════════════════════
  // VERİ YÜKLEME
  // ═══════════════════════════════════════════════════════════════
  async function loadCoreData() {
    if (cache.tr_ozet && cache.manifest && cache.geo && cache.geojson) return;

    const [trOzet, manifest, geo, geojson] = await Promise.all([
      fetch('data/aggregates/tr_demografi_ozet.json').then(r => {
        if (!r.ok) throw new Error('tr_demografi_ozet.json yüklenemedi: ' + r.status);
        return r.json();
      }),
      fetch('data/aggregates/demografi_iller_manifest.json').then(r => {
        if (!r.ok) throw new Error('demografi_iller_manifest.json yüklenemedi: ' + r.status);
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

    cache.tr_ozet = trOzet;
    cache.manifest = manifest;
    cache.geo = geo;
    cache.geojson = geojson;
  }

  async function loadIlDetay(ilAdi) {
    if (cache.il_detaylari.has(ilAdi)) return cache.il_detaylari.get(ilAdi);

    const yol = cache.manifest?.iller?.[ilAdi];
    if (!yol) throw new Error(`İl bulunamadı: ${ilAdi}`);

    const data = await fetch(yol).then(r => {
      if (!r.ok) throw new Error(`İl dosyası yüklenemedi: ${ilAdi}`);
      return r.json();
    });

    cache.il_detaylari.set(ilAdi, data);
    return data;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANA MODÜL FONKSIYONU
  // ═══════════════════════════════════════════════════════════════
  window.Modules.demografi = async function(container, ctx) {
    container.innerHTML = `<div class="loading">Demografi verisi yükleniyor</div>`;

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
        <span class="eyebrow">Modül · 05</span>
        <h1>Demografi gezgini</h1>
        <p class="lede">Veri yüklenemedi: ${e.message}</p>
      </header>
      <div class="panel">
        <div class="panel-title">Aggregate dosyaları eksik</div>
        <p style="color:var(--ink-2); line-height:1.6;">
          Bu modül için şu dosyalar gerekli:
        </p>
        <ul style="color:var(--ink-2); line-height:1.7;">
          <li><span class="mono">data/aggregates/tr_demografi_ozet.json</span></li>
          <li><span class="mono">data/aggregates/demografi_iller_manifest.json</span></li>
          <li><span class="mono">data/demografi_iller/il_*.json</span></li>
          <li><span class="mono">data/core/geo.json</span></li>
          <li><span class="mono">data/core/turkiye_iller.geojson</span></li>
        </ul>
        <p style="color:var(--ink-2); line-height:1.6; margin-top: var(--space-3);">
          Eksikse şu komutu çalıştırın:
          <span class="mono">python tools/build_demografi.py</span>
        </p>
      </div>
    `;
  }

  function renderModule(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Modül · 05 · Tarafsız analiz · 3 perspektif</span>
        <h1>Demografi gezgini</h1>
        <p class="lede">
          Türkiye'deki 81 il ve 973 ilçenin yaş, eğitim ve cinsiyet dağılımını üç farklı pencereden
          inceleyin. Veri TÜİK ADNKS kaynaklı, 18 yaş ve üstü nüfus için.
        </p>
      </header>

      <div class="demografi-sekmeler">
        <button class="demografi-sekme" data-sekme="A">
          <span class="sekme-num">A</span>
          <span class="sekme-baslik">Yaş analizi</span>
          <span class="sekme-sub">Yaş piramidi, ortalama yaş</span>
        </button>
        <button class="demografi-sekme" data-sekme="B">
          <span class="sekme-num">B</span>
          <span class="sekme-baslik">Eğitim analizi</span>
          <span class="sekme-sub">Eğitim seviyesi dağılımı</span>
        </button>
        <button class="demografi-sekme" data-sekme="C">
          <span class="sekme-num">C</span>
          <span class="sekme-baslik">Cinsiyet & zaman</span>
          <span class="sekme-sub">Cinsiyet oranı, yıllar arası</span>
        </button>
        <button class="demografi-sekme" data-sekme="D">
          <span class="sekme-num">D</span>
          <span class="sekme-baslik">Yaşlanma analizi</span>
          <span class="sekme-sub">Türkiye yaşlanıyor mu?</span>
        </button>
      </div>

      <div id="demografi-icerik"></div>

      ${renderStiller()}
    `;

    container.querySelectorAll('.demografi-sekme').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sekme = btn.dataset.sekme;
        renderAktifSekme(container);
      });
    });

    renderAktifSekme(container);
  }

  function renderAktifSekme(container) {
    container.querySelectorAll('.demografi-sekme').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sekme === state.sekme);
    });

    const icerikEl = container.querySelector('#demografi-icerik');
    if (state.sekme === 'A') renderSekmeA(container, icerikEl);
    else if (state.sekme === 'B') renderSekmeB(container, icerikEl);
    else if (state.sekme === 'C') renderSekmeC(container, icerikEl);
    else if (state.sekme === 'D') renderSekmeD(container, icerikEl);
  }

  // ═══════════════════════════════════════════════════════════════
  // ORTAK: Filtre paneli (tüm sekmelerde aynı)
  // ═══════════════════════════════════════════════════════════════
  function renderFiltrePanel(icerikEl, onChange) {
    const yillar = cache.tr_ozet.yillar;
    const iller = Object.keys(cache.manifest.iller).sort((a, b) => a.localeCompare(b, 'tr'));

    const yilOpts = yillar.map(y =>
      `<option value="${y}" ${y === state.yil ? 'selected' : ''}>${y}</option>`
    ).join('');

    const ilOpts = `<option value="" ${!state.il ? 'selected' : ''}>Türkiye geneli</option>` +
      iller.map(il => `<option value="${il}" ${il === state.il ? 'selected' : ''}>${il}</option>`).join('');

    // İlçe listesi: il seçildiyse o ilin ilçeleri, yoksa boş
    let ilceOpts = '<option value="">— il seçin —</option>';
    if (state.il && cache.il_detaylari.has(state.il)) {
      const ilData = cache.il_detaylari.get(state.il);
      const ilceler = Object.keys(ilData.ilceler).sort((a, b) => a.localeCompare(b, 'tr'));
      ilceOpts = `<option value="" ${!state.ilce ? 'selected' : ''}>${state.il} geneli</option>` +
        ilceler.map(i => `<option value="${i}" ${i === state.ilce ? 'selected' : ''}>${i}</option>`).join('');
    }

    return `
      <div class="panel" style="margin-bottom: var(--space-6);">
        <div class="panel-title">
          Filtre
          <span class="panel-meta">${cache.tr_ozet.turkiye.il_sayisi} il · ${cache.tr_ozet.turkiye.ilce_sayisi} ilçe</span>
        </div>
        <div class="demografi-filtre-row">
          <label class="demografi-filtre-grup">
            <span class="demografi-filtre-lbl">Yıl</span>
            <select id="demo-yil" class="demografi-select">${yilOpts}</select>
          </label>
          <label class="demografi-filtre-grup">
            <span class="demografi-filtre-lbl">İl</span>
            <select id="demo-il" class="demografi-select">${ilOpts}</select>
          </label>
          <label class="demografi-filtre-grup">
            <span class="demografi-filtre-lbl">İlçe</span>
            <select id="demo-ilce" class="demografi-select" ${!state.il ? 'disabled' : ''}>${ilceOpts}</select>
          </label>
        </div>
      </div>
    `;
  }

  function bindFiltrePanel(icerikEl, onChange) {
    const yilEl = icerikEl.querySelector('#demo-yil');
    const ilEl = icerikEl.querySelector('#demo-il');
    const ilceEl = icerikEl.querySelector('#demo-ilce');

    yilEl?.addEventListener('change', (e) => {
      state.yil = e.target.value;
      onChange();
    });

    ilEl?.addEventListener('change', async (e) => {
      const yeniIl = e.target.value;
      state.il = yeniIl;
      state.ilce = '';
      if (yeniIl) {
        try {
          await loadIlDetay(yeniIl);
        } catch (err) {
          console.error('İl detayı yüklenemedi:', err);
        }
      }
      onChange();
    });

    ilceEl?.addEventListener('change', (e) => {
      state.ilce = e.target.value;
      onChange();
    });
  }

  /**
   * Belirli yıl + il/ilçe için bir kayıt döner.
   * - il boş → Türkiye geneli
   * - ilçe boş → il geneli
   * - ikisi de dolu → spesifik ilçe
   */
  function getKayit() {
    const yil = state.yil;

    if (!state.il) {
      // Türkiye geneli
      return {
        kayit: cache.tr_ozet.turkiye.yillar[yil],
        baslik: 'Türkiye geneli',
        kapsam: `${cache.tr_ozet.turkiye.il_sayisi} il · ${cache.tr_ozet.turkiye.ilce_sayisi} ilçe`,
      };
    }

    if (!state.ilce) {
      // İl geneli (Türkiye özetinden çek)
      const il = cache.tr_ozet.iller[state.il];
      if (!il) return null;
      return {
        kayit: il.yillar[yil],
        baslik: state.il,
        kapsam: `${il.ilce_sayisi} ilçe`,
      };
    }

    // İlçe — il detayından çek
    const ilData = cache.il_detaylari.get(state.il);
    if (!ilData) return null;
    const ilce = ilData.ilceler[state.ilce];
    if (!ilce) return null;
    return {
      kayit: ilce.yillar[yil],
      baslik: `${state.il} / ${state.ilce}`,
      kapsam: 'İlçe',
    };
  }

  // ═══════════════════════════════════════════════════════════════
  // ORTAK: Özet kutuları (tüm sekmelerde)
  // ═══════════════════════════════════════════════════════════════
  function renderOzetKutulari(kayit, baslik, kapsam, sekme) {
    const fmt = window.AT.fmt;
    if (!kayit) {
      return `<div class="panel" style="margin-bottom: var(--space-5);">Veri yok.</div>`;
    }

    const t = kayit.toplam_18plus;
    const e = kayit.erkek_18plus;
    const k = kayit.kadin_18plus;
    const ortYas = ortalamaYas(kayit);

    // Sekmeye özgü ek metrikler
    let ekMetrikler = '';

    if (sekme === 'A') {
      const yas65 = kayit.yas['65+']?.toplam || 0;
      const yas65Yuzde = t > 0 ? (yas65 / t * 100) : 0;
      const yasGenc = (kayit.yas['18-24']?.toplam || 0) + (kayit.yas['25-34']?.toplam || 0);
      const yasGencYuzde = t > 0 ? (yasGenc / t * 100) : 0;

      ekMetrikler = `
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Ortalama yaş</div>
          <div class="ozet-val">${ortYas.toFixed(1)}</div>
          <div class="ozet-sub">Kategorilerden, 18+</div>
        </div>
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Genç (18-34)</div>
          <div class="ozet-val">%${fmt.n1(yasGencYuzde)}</div>
          <div class="ozet-sub">${fmt.n(yasGenc)}</div>
        </div>
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Yaşlı (65+)</div>
          <div class="ozet-val">%${fmt.n1(yas65Yuzde)}</div>
          <div class="ozet-sub">${fmt.n(yas65)}</div>
        </div>
      `;
    } else if (sekme === 'B') {
      const uni = kayit.egitim['universite_plus']?.toplam || 0;
      const uniYuzde = t > 0 ? (uni / t * 100) : 0;
      const lise = kayit.egitim['lise_dengi']?.toplam || 0;
      const liseYuzde = t > 0 ? (lise / t * 100) : 0;
      const oyB = (kayit.egitim['okuma_yazma_bilmeyen']?.toplam || 0) + (kayit.egitim['okuryazar']?.toplam || 0);
      const oyBYuzde = t > 0 ? (oyB / t * 100) : 0;

      ekMetrikler = `
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Üniversite+</div>
          <div class="ozet-val">%${fmt.n1(uniYuzde)}</div>
          <div class="ozet-sub">${fmt.n(uni)}</div>
        </div>
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Lise/dengi</div>
          <div class="ozet-val">%${fmt.n1(liseYuzde)}</div>
          <div class="ozet-sub">${fmt.n(lise)}</div>
        </div>
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Düşük seviye</div>
          <div class="ozet-val">%${fmt.n1(oyBYuzde)}</div>
          <div class="ozet-sub">Okuryazar/altı</div>
        </div>
      `;
    } else if (sekme === 'C') {
      const eYuzde = t > 0 ? (e / t * 100) : 0;
      const kYuzde = t > 0 ? (k / t * 100) : 0;
      const denge = e - k;

      ekMetrikler = `
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Erkek</div>
          <div class="ozet-val">%${fmt.n1(eYuzde)}</div>
          <div class="ozet-sub">${fmt.n(e)}</div>
        </div>
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Kadın</div>
          <div class="ozet-val">%${fmt.n1(kYuzde)}</div>
          <div class="ozet-sub">${fmt.n(k)}</div>
        </div>
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Cinsiyet dengesi</div>
          <div class="ozet-val">${denge > 0 ? '+' : ''}${fmt.n(denge)}</div>
          <div class="ozet-sub">${denge > 0 ? 'Erkek fazlası' : (denge < 0 ? 'Kadın fazlası' : 'Eşit')}</div>
        </div>
      `;
    }

    return `
      <div class="demografi-ozet-grid">
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Kapsam</div>
          <div class="ozet-val" style="font-size: 16px;">${escapeHtml(baslik)}</div>
          <div class="ozet-sub">${escapeHtml(kapsam)}</div>
        </div>
        <div class="demografi-ozet-tile">
          <div class="ozet-lbl">Toplam 18+</div>
          <div class="ozet-val">${fmt.n(t)}</div>
          <div class="ozet-sub">Yetişkin nüfus</div>
        </div>
        ${ekMetrikler}
      </div>
    `;
  }

  function ortalamaYas(kayit) {
    // Yaş kategorilerinin orta noktalarını kullanarak ağırlıklı ortalama
    const noktalar = {
      "18-24": 21,
      "25-34": 29.5,
      "35-44": 39.5,
      "45-54": 49.5,
      "55-64": 59.5,
      "65+":   72,  // 65+ için yaklaşık ortalama
    };
    let toplam = 0;
    let agirlik = 0;
    for (const [kat, n] of Object.entries(noktalar)) {
      const sayi = kayit.yas?.[kat]?.toplam || 0;
      toplam += sayi * n;
      agirlik += sayi;
    }
    return agirlik > 0 ? toplam / agirlik : 0;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME A — YAŞ ANALİZİ
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeA(container, icerikEl) {
    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          Türkiye'nin <strong>yaş dağılımı</strong>, illere ve ilçelere göre.
          Genç nüfus güneydoğuda, yaşlı nüfus Karadeniz kıyısı ve İç Anadolu'da yoğunlaşır.
        </p>
      </div>

      ${renderFiltrePanel(icerikEl, () => renderSekmeA(container, icerikEl))}

      <div id="demoA-ozet"></div>

      <div class="section-head">
        <h2>Türkiye haritası — yaşlı nüfus oranı (65+)</h2>
        <span class="eyebrow">Koyu = yaşlı oranı yüksek · Açık = genç oranı yüksek</span>
      </div>
      <div class="panel" id="demoA-harita-panel" style="padding: var(--space-4); position: relative;">
        <div class="demografi-harita-grid">
          <div class="demografi-harita-sol">
            <div id="demoA-harita"></div>
          </div>
          <div class="demografi-harita-sag">
            <div id="demoA-piramit"></div>
          </div>
        </div>
        <div id="demoA-tooltip" class="demografi-tooltip" style="display: none;"></div>
        <div class="demografi-lejant" id="demoA-lejant"></div>
      </div>

      <div class="section-head">
        <h2>Yaş kategorilerinin yüzdesi — yıllar arası</h2>
        <span class="eyebrow">Seçili kapsam için ${cache.tr_ozet.yillar[0]} - ${cache.tr_ozet.yillar[cache.tr_ozet.yillar.length-1]}</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demoA-zaman"></div>
      </div>

      ${renderAciklamaA()}
    `;

    bindFiltrePanel(icerikEl, () => renderSekmeA(container, icerikEl));

    const data = getKayit();
    icerikEl.querySelector('#demoA-ozet').innerHTML = renderOzetKutulari(
      data?.kayit, data?.baslik || 'Veri yok', data?.kapsam || '', 'A'
    );

    renderHaritaA(icerikEl);
    renderPiramit(icerikEl.querySelector('#demoA-piramit'), data?.kayit, data?.baslik || '');
    renderZamanGrafigiA(icerikEl);
  }

  function renderHaritaA(icerikEl) {
    // Her il için 65+ yüzdesi hesapla
    const ilData = {};
    const yil = state.yil;
    for (const [ilAdi, il] of Object.entries(cache.tr_ozet.iller)) {
      const k = il.yillar[yil];
      if (!k || !k.toplam_18plus) continue;
      const yas65 = k.yas['65+']?.toplam || 0;
      const oran = (yas65 / k.toplam_18plus) * 100;
      ilData[ilAdi] = {
        oran,
        toplam: k.toplam_18plus,
        yas65,
      };
    }

    cizHarita({
      icerikEl,
      haritaId: 'demoA-harita',
      tooltipId: 'demoA-tooltip',
      panelId: 'demoA-harita-panel',
      lejantId: 'demoA-lejant',
      il_data: ilData,
      secili_il: state.il || null,
      tooltipFn: (il, d) => {
        if (!d) return `<div class="tt-il">${escapeHtml(il)}</div><div class="tt-sub">Veri yok</div>`;
        return `<div class="tt-il">${escapeHtml(il)}</div>
                <div class="tt-deger">%${window.AT.fmt.n1(d.oran)} yaşlı (65+)</div>
                <div class="tt-sub">${window.AT.fmt.n(d.yas65)} / ${window.AT.fmt.n(d.toplam)}</div>`;
      },
      renkFn: (d) => yasRengi(d.oran),
      onIlClick: async (il) => {
        state.il = il;
        state.ilce = '';
        try { await loadIlDetay(il); } catch (e) {}
        const cont = icerikEl.closest('.main') || document;
        renderSekmeA(cont, icerikEl);
      },
      lejant: [
        { renk: yasRengi(5),  etiket: '%5 altı (genç)' },
        { renk: yasRengi(10), etiket: '%5-10' },
        { renk: yasRengi(15), etiket: '%10-15' },
        { renk: yasRengi(20), etiket: '%15-20' },
        { renk: yasRengi(25), etiket: '%20 üstü (yaşlı)' },
      ],
    });
  }

  /**
   * Klasik yaş piramidi — sol erkek, sağ kadın
   */
  function renderPiramit(el, kayit, baslik) {
    if (!el) return;
    if (!kayit) {
      el.innerHTML = '<div style="padding: var(--space-4); color: var(--ink-3); font-style: italic;">Veri yok</div>';
      return;
    }

    const fmt = window.AT.fmt;
    const kategoriler = Object.keys(YAS_ETIKET);

    // Maks değer (sol veya sağ tarafta) — bar normalizasyonu için
    let maxDeger = 0;
    for (const kat of kategoriler) {
      const e = kayit.yas[kat]?.erkek || 0;
      const k = kayit.yas[kat]?.kadin || 0;
      maxDeger = Math.max(maxDeger, e, k);
    }
    if (maxDeger === 0) maxDeger = 1;

    const toplam = kayit.toplam_18plus || 1;

    const satirlar = [...kategoriler].reverse().map(kat => {
      const erkek = kayit.yas[kat]?.erkek || 0;
      const kadin = kayit.yas[kat]?.kadin || 0;
      const eYuzde = (erkek / toplam) * 100;
      const kYuzde = (kadin / toplam) * 100;
      const eBarW = (erkek / maxDeger) * 100;
      const kBarW = (kadin / maxDeger) * 100;
      const renk = YAS_RENK[kat];

      return `
        <div class="piramit-row">
          <div class="piramit-sol">
            <span class="piramit-yuzde">${fmt.n1(eYuzde)}%</span>
            <div class="piramit-bar-track piramit-bar-sol">
              <div class="piramit-bar-fill" style="width: ${eBarW.toFixed(1)}%; background: ${renk};"></div>
            </div>
          </div>
          <div class="piramit-kat">${kat}</div>
          <div class="piramit-sag">
            <div class="piramit-bar-track piramit-bar-sag">
              <div class="piramit-bar-fill" style="width: ${kBarW.toFixed(1)}%; background: ${renk};"></div>
            </div>
            <span class="piramit-yuzde">${fmt.n1(kYuzde)}%</span>
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="yan-grafik-blok">
        <div class="yan-grafik-baslik">Yaş piramidi — ${escapeHtml(baslik)}</div>
        <div class="piramit-baslik">
          <span class="piramit-cinsiyet">Erkek</span>
          <span></span>
          <span class="piramit-cinsiyet">Kadın</span>
        </div>
        <div class="piramit-govde">
          ${satirlar}
        </div>
      </div>
    `;
  }

  function renderZamanGrafigiA(icerikEl) {
    const el = icerikEl.querySelector('#demoA-zaman');
    if (!el) return;

    // Yıllar boyunca yaş kategorilerinin yüzdesi (kayda göre)
    const yillar = cache.tr_ozet.yillar;
    const kategoriler = Object.keys(YAS_ETIKET);

    // Filtreye göre kayıtları topla
    const yil_kayit = {};
    for (const yil of yillar) {
      const eskiYil = state.yil;
      state.yil = yil;
      const d = getKayit();
      yil_kayit[yil] = d?.kayit || null;
      state.yil = eskiYil;
    }

    cizYatayBarYillar(el, yillar, kategoriler, yil_kayit, YAS_ETIKET, YAS_RENK, 'yas');
  }

  function renderAciklamaA() {
    return `
      <div class="panel panel-muted">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Yaş dağılımını nasıl yorumlamalı?</div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          <li><strong>Genç ağırlıklı bölgeler:</strong> Güneydoğu Anadolu (Şanlıurfa, Mardin), İstanbul, Adana — yüksek doğum oranı + iç göç.</li>
          <li><strong>Yaşlı ağırlıklı bölgeler:</strong> Karadeniz kıyısı (Sinop, Kastamonu, Rize) ve İç Anadolu kırsalı — gençler göç ediyor.</li>
          <li><strong>Yaş piramidi şekilleri:</strong> Geniş tabanlı = genç nüfus, dar tabanlı = yaşlı/dengeli.</li>
          <li><strong>Ortalama yaş:</strong> Kategorinin orta noktasından hesaplanır; kategorilerden türetilmiş yaklaşık bir değerdir.</li>
        </ul>
        <p class="footnote" style="margin-top: var(--space-4);">
          Kaynak: TÜİK ADNKS. 18 yaş ve üstü için, beş yıllık kategorilerle.
        </p>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME B — EĞİTİM ANALİZİ
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeB(container, icerikEl) {
    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          Türkiye'nin <strong>eğitim dağılımı</strong>, illere ve ilçelere göre.
          Üniversite mezunluğu büyük şehirlerde ve batı sahilinde yoğunlaşır.
        </p>
      </div>

      ${renderFiltrePanel(icerikEl, () => renderSekmeB(container, icerikEl))}

      <div id="demoB-ozet"></div>

      <div class="section-head">
        <h2>Türkiye haritası — üniversite ve üstü oranı</h2>
        <span class="eyebrow">Koyu yeşil = üniversite mezunu oranı yüksek</span>
      </div>
      <div class="panel" id="demoB-harita-panel" style="padding: var(--space-4); position: relative;">
        <div class="demografi-harita-grid">
          <div class="demografi-harita-sol">
            <div id="demoB-harita"></div>
          </div>
          <div class="demografi-harita-sag">
            <div id="demoB-dagilim"></div>
          </div>
        </div>
        <div id="demoB-tooltip" class="demografi-tooltip" style="display: none;"></div>
        <div class="demografi-lejant" id="demoB-lejant"></div>
      </div>

      <div class="section-head">
        <h2>Eğitim seviyesi yüzdesi — yıllar arası</h2>
        <span class="eyebrow">Seçili kapsam için ${cache.tr_ozet.yillar[0]} - ${cache.tr_ozet.yillar[cache.tr_ozet.yillar.length-1]}</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demoB-zaman"></div>
      </div>

      <div class="section-head">
        <h2>Eğitim seviyesine göre cinsiyet dağılımı</h2>
        <span class="eyebrow">Her seviyede kadın ve erkek nasıl dağılıyor?</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demoB-cinsiyet-egitim"></div>
      </div>

      <div class="section-head">
        <h2>Yaş × eğitim çaprazı — kuşaklar arası fark</h2>
        <span class="eyebrow">Her yaş grubunda eğitim seviyesi dağılımı · 65+'tan 18-24'e ilerleyişe bak</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demoB-yas-egitim"></div>
      </div>

      ${renderAciklamaB()}
    `;

    bindFiltrePanel(icerikEl, () => renderSekmeB(container, icerikEl));

    const data = getKayit();
    icerikEl.querySelector('#demoB-ozet').innerHTML = renderOzetKutulari(
      data?.kayit, data?.baslik || 'Veri yok', data?.kapsam || '', 'B'
    );

    renderHaritaB(icerikEl);
    renderEgitimDagilim(icerikEl.querySelector('#demoB-dagilim'), data?.kayit, data?.baslik || '');
    renderZamanGrafigiB(icerikEl);
    renderCinsiyetEgitimZitBar(icerikEl.querySelector('#demoB-cinsiyet-egitim'), data?.kayit, data?.baslik || '');
    renderYasEgitimCapraz(icerikEl.querySelector('#demoB-yas-egitim'), data?.kayit, data?.baslik || '');
  }

  function renderHaritaB(icerikEl) {
    const ilData = {};
    const yil = state.yil;
    for (const [ilAdi, il] of Object.entries(cache.tr_ozet.iller)) {
      const k = il.yillar[yil];
      if (!k || !k.toplam_18plus) continue;
      const uni = k.egitim['universite_plus']?.toplam || 0;
      const oran = (uni / k.toplam_18plus) * 100;
      ilData[ilAdi] = {
        oran,
        toplam: k.toplam_18plus,
        uni,
      };
    }

    cizHarita({
      icerikEl,
      haritaId: 'demoB-harita',
      tooltipId: 'demoB-tooltip',
      panelId: 'demoB-harita-panel',
      lejantId: 'demoB-lejant',
      il_data: ilData,
      secili_il: state.il || null,
      tooltipFn: (il, d) => {
        if (!d) return `<div class="tt-il">${escapeHtml(il)}</div><div class="tt-sub">Veri yok</div>`;
        return `<div class="tt-il">${escapeHtml(il)}</div>
                <div class="tt-deger">%${window.AT.fmt.n1(d.oran)} üniversite+</div>
                <div class="tt-sub">${window.AT.fmt.n(d.uni)} / ${window.AT.fmt.n(d.toplam)}</div>`;
      },
      renkFn: (d) => egitimRengi(d.oran),
      onIlClick: async (il) => {
        state.il = il;
        state.ilce = '';
        try { await loadIlDetay(il); } catch (e) {}
        const cont = icerikEl.closest('.main') || document;
        renderSekmeB(cont, icerikEl);
      },
      lejant: [
        { renk: egitimRengi(5),  etiket: '%5 altı' },
        { renk: egitimRengi(10), etiket: '%5-10' },
        { renk: egitimRengi(15), etiket: '%10-15' },
        { renk: egitimRengi(20), etiket: '%15-20' },
        { renk: egitimRengi(30), etiket: '%20-30' },
        { renk: egitimRengi(40), etiket: '%30 üstü' },
      ],
    });
  }

  function renderEgitimDagilim(el, kayit, baslik) {
    if (!el) return;
    if (!kayit) {
      el.innerHTML = '<div style="padding: var(--space-4); color: var(--ink-3); font-style: italic;">Veri yok</div>';
      return;
    }

    const fmt = window.AT.fmt;
    const t = kayit.toplam_18plus || 1;

    // 'bilinmeyen' ve diğer kategoriler ayrı
    const kategoriler = ['universite_plus', 'lise_dengi', 'ilkokul_ortaokul', 'okuryazar', 'okuma_yazma_bilmeyen'];

    const satirlar = kategoriler.map(kat => {
      const sayi = kayit.egitim[kat]?.toplam || 0;
      const yuzde = (sayi / t) * 100;
      const barW = Math.min(100, yuzde * 2); // 50% = full bar
      const renk = EGITIM_RENK[kat];
      return `
        <div class="dagilim-row">
          <div class="dagilim-etiket">${escapeHtml(EGITIM_ETIKET[kat] || kat)}</div>
          <div class="dagilim-bar-track">
            <div class="dagilim-bar-fill" style="width: ${barW.toFixed(1)}%; background: ${renk};"></div>
          </div>
          <div class="dagilim-deger">${fmt.n1(yuzde)}%</div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="yan-grafik-blok">
        <div class="yan-grafik-baslik">Eğitim dağılımı — ${escapeHtml(baslik)}</div>
        <div class="dagilim-govde">
          ${satirlar}
        </div>
      </div>
    `;
  }

  function renderZamanGrafigiB(icerikEl) {
    const el = icerikEl.querySelector('#demoB-zaman');
    if (!el) return;

    const yillar = cache.tr_ozet.yillar;
    const kategoriler = ['okuma_yazma_bilmeyen', 'okuryazar', 'ilkokul_ortaokul', 'lise_dengi', 'universite_plus'];

    const yil_kayit = {};
    for (const yil of yillar) {
      const eskiYil = state.yil;
      state.yil = yil;
      const d = getKayit();
      yil_kayit[yil] = d?.kayit || null;
      state.yil = eskiYil;
    }

    cizYatayBarYillar(el, yillar, kategoriler, yil_kayit, EGITIM_ETIKET, EGITIM_RENK, 'egitim');
  }

  function renderAciklamaB() {
    return `
      <div class="panel panel-muted">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Eğitim dağılımını nasıl yorumlamalı?</div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          <li><strong>"Üniversite+":</strong> Yüksekokul, lisans, yüksek lisans, doktora dahil toplam.</li>
          <li><strong>Yüksek üniversite oranı:</strong> Ankara, İstanbul, Çankaya, Beşiktaş, Eskişehir merkez.</li>
          <li><strong>"Okuryazar değil":</strong> Hiç okula gitmemiş kişiler. Yaşlı kuşakta ve doğuda daha yüksek.</li>
          <li><strong>Yıllar arası eğilim:</strong> Türkiye genelinde okur-yazarlık ve üniversite oranı düzenli artıyor.</li>
        </ul>
        <p class="footnote" style="margin-top: var(--space-4);">
          Kaynak: TÜİK ADNKS. "Bilinmeyen" kategorisi grafiklerden çıkarıldı ama özet sayıma dahildir.
        </p>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME C — CİNSİYET & ZAMAN
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeC(container, icerikEl) {
    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          Türkiye'nin <strong>cinsiyet dengesi</strong> ve <strong>nüfusun yıllar içindeki değişimi</strong>.
          Doğal denge %50/%50'ye yakındır; iç göç bunu bozar.
        </p>
      </div>

      ${renderFiltrePanel(icerikEl, () => renderSekmeC(container, icerikEl))}

      <div id="demoC-ozet"></div>

      <div class="section-head">
        <h2>Türkiye haritası — erkek/kadın dengesi</h2>
        <span class="eyebrow">Mavi = erkek fazlası · Kırmızı = kadın fazlası</span>
      </div>
      <div class="panel" id="demoC-harita-panel" style="padding: var(--space-4); position: relative;">
        <div class="demografi-harita-grid">
          <div class="demografi-harita-sol">
            <div id="demoC-harita"></div>
          </div>
          <div class="demografi-harita-sag">
            <div id="demoC-zaman-buyume"></div>
          </div>
        </div>
        <div id="demoC-tooltip" class="demografi-tooltip" style="display: none;"></div>
        <div class="demografi-lejant" id="demoC-lejant"></div>
      </div>

      <div class="section-head">
        <h2>Cinsiyet × yaş dağılımı — yıl bazlı</h2>
        <span class="eyebrow">Erkek ve kadın nüfusunun yaş kategorilerine göre değişimi</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demoC-cinsiyet-yas"></div>
      </div>

      <div class="section-head">
        <h2>Cinsiyet × eğitim — yan yana karşılaştırma</h2>
        <span class="eyebrow">Erkek ve kadın grupları kendi içinde eğitim seviyelerine nasıl dağılıyor?</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demoC-cinsiyet-egitim"></div>
      </div>

      <div class="section-head">
        <h2>Yaş × cinsiyet × eğitim — üç boyutlu çapraz</h2>
        <span class="eyebrow">Sol: erkek, sağ: kadın. Üstten alta (yaşlıdan gence) eğitim seviyesinin değişimi</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demoC-uc-boyutlu"></div>
      </div>

      ${renderAciklamaC()}
    `;

    bindFiltrePanel(icerikEl, () => renderSekmeC(container, icerikEl));

    const data = getKayit();
    icerikEl.querySelector('#demoC-ozet').innerHTML = renderOzetKutulari(
      data?.kayit, data?.baslik || 'Veri yok', data?.kapsam || '', 'C'
    );

    renderHaritaC(icerikEl);
    renderBuyumeCizgisi(icerikEl.querySelector('#demoC-zaman-buyume'), data?.baslik || '');
    renderCinsiyetYasGrafik(icerikEl);
    renderCinsiyetEgitimYigilmis(icerikEl.querySelector('#demoC-cinsiyet-egitim'), data?.kayit, data?.baslik || '');
    renderUcBoyutluCapraz(icerikEl.querySelector('#demoC-uc-boyutlu'), data?.kayit, data?.baslik || '');
  }

  function renderHaritaC(icerikEl) {
    const ilData = {};
    const yil = state.yil;
    for (const [ilAdi, il] of Object.entries(cache.tr_ozet.iller)) {
      const k = il.yillar[yil];
      if (!k || !k.toplam_18plus) continue;
      const eYuzde = (k.erkek_18plus / k.toplam_18plus) * 100;
      ilData[ilAdi] = {
        eYuzde,
        toplam: k.toplam_18plus,
        erkek: k.erkek_18plus,
        kadin: k.kadin_18plus,
      };
    }

    cizHarita({
      icerikEl,
      haritaId: 'demoC-harita',
      tooltipId: 'demoC-tooltip',
      panelId: 'demoC-harita-panel',
      lejantId: 'demoC-lejant',
      il_data: ilData,
      secili_il: state.il || null,
      tooltipFn: (il, d) => {
        if (!d) return `<div class="tt-il">${escapeHtml(il)}</div><div class="tt-sub">Veri yok</div>`;
        return `<div class="tt-il">${escapeHtml(il)}</div>
                <div class="tt-deger">%${window.AT.fmt.n1(d.eYuzde)} erkek</div>
                <div class="tt-sub">E: ${window.AT.fmt.n(d.erkek)} · K: ${window.AT.fmt.n(d.kadin)}</div>`;
      },
      renkFn: (d) => cinsiyetRengi(d.eYuzde),
      onIlClick: async (il) => {
        state.il = il;
        state.ilce = '';
        try { await loadIlDetay(il); } catch (e) {}
        const cont = icerikEl.closest('.main') || document;
        renderSekmeC(cont, icerikEl);
      },
      lejant: [
        { renk: cinsiyetRengi(47), etiket: '%47 altı (kadın fazlası)' },
        { renk: cinsiyetRengi(49), etiket: '%47-49' },
        { renk: cinsiyetRengi(50), etiket: '%49-51 (denge)' },
        { renk: cinsiyetRengi(52), etiket: '%51-53' },
        { renk: cinsiyetRengi(55), etiket: '%53 üstü (erkek fazlası)' },
      ],
    });
  }

  function renderBuyumeCizgisi(el, baslik) {
    if (!el) return;
    const fmt = window.AT.fmt;
    const yillar = cache.tr_ozet.yillar;

    // Filtreye göre yıllar boyunca toplam nüfus
    const veri = [];
    for (const yil of yillar) {
      const eskiYil = state.yil;
      state.yil = yil;
      const d = getKayit();
      const t = d?.kayit?.toplam_18plus || 0;
      veri.push({ yil, toplam: t });
      state.yil = eskiYil;
    }

    if (veri.every(v => v.toplam === 0)) {
      el.innerHTML = '<div style="padding: var(--space-4); color: var(--ink-3); font-style: italic;">Veri yok</div>';
      return;
    }

    // SVG çizgi grafik
    const w = 280, h = 200, padL = 50, padR = 16, padT = 16, padB = 32;
    const iw = w - padL - padR;
    const ih = h - padT - padB;

    const maxT = Math.max(...veri.map(v => v.toplam));
    const minT = Math.min(...veri.filter(v => v.toplam > 0).map(v => v.toplam));
    const rangeT = Math.max(maxT - minT, 1);
    // Eksen alt min'i biraz aşağıda başlatmak için
    const yMin = Math.max(0, minT - rangeT * 0.1);
    const yMax = maxT + rangeT * 0.1;
    const yRange = Math.max(yMax - yMin, 1);

    const xStep = veri.length > 1 ? iw / (veri.length - 1) : iw;
    const noktalar = veri.map((v, i) => {
      const x = padL + i * xStep;
      const y = padT + ih - ((v.toplam - yMin) / yRange) * ih;
      return { x, y, v };
    });

    const cizgi = noktalar.map((n, i) => `${i === 0 ? 'M' : 'L'}${n.x.toFixed(1)},${n.y.toFixed(1)}`).join(' ');
    const noktaCizimi = noktalar.map(n =>
      `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="3.5" fill="var(--brand-gold)" stroke="var(--paper)" stroke-width="1.5"/>`
    ).join('');

    // X-axis etiketleri
    const xEtiketler = noktalar.map(n =>
      `<text x="${n.x.toFixed(1)}" y="${(h - 12).toFixed(1)}" text-anchor="middle" class="cizgi-eksen">${n.v.yil}</text>`
    ).join('');

    // Y-axis: min ve max
    const yEtiketler = `
      <text x="${(padL - 6).toFixed(1)}" y="${(padT + 4).toFixed(1)}" text-anchor="end" class="cizgi-eksen">${kisaltSayi(yMax)}</text>
      <text x="${(padL - 6).toFixed(1)}" y="${(padT + ih).toFixed(1)}" text-anchor="end" class="cizgi-eksen">${kisaltSayi(yMin)}</text>
    `;

    // Taban çizgisi
    const tabanY = padT + ih;
    const tabanLine = `<line x1="${padL}" y1="${tabanY}" x2="${(padL + iw).toFixed(1)}" y2="${tabanY}" stroke="var(--line)" stroke-width="0.8"/>`;

    // Büyüme yüzdesi
    const ilk = veri.find(v => v.toplam > 0);
    const son = [...veri].reverse().find(v => v.toplam > 0);
    let buyume = '';
    if (ilk && son && ilk !== son && ilk.toplam > 0) {
      const yuzde = ((son.toplam - ilk.toplam) / ilk.toplam) * 100;
      buyume = `<div class="buyume-not">${ilk.yil}'dan ${son.yil}'a değişim: <strong>${yuzde > 0 ? '+' : ''}${fmt.n1(yuzde)}%</strong></div>`;
    }

    el.innerHTML = `
      <div class="yan-grafik-blok">
        <div class="yan-grafik-baslik">18+ nüfus — yıllar arası</div>
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" style="width: 100%; height: auto;">
          ${tabanLine}
          ${yEtiketler}
          <path d="${cizgi}" fill="none" stroke="var(--brand-gold)" stroke-width="1.5"/>
          ${noktaCizimi}
          ${xEtiketler}
        </svg>
        ${buyume}
      </div>
    `;
  }

  function renderCinsiyetYasGrafik(icerikEl) {
    const el = icerikEl.querySelector('#demoC-cinsiyet-yas');
    if (!el) return;

    const fmt = window.AT.fmt;
    const data = getKayit();
    if (!data?.kayit) {
      el.innerHTML = '<div style="padding: var(--space-4); color: var(--ink-3); font-style: italic;">Veri yok</div>';
      return;
    }

    const k = data.kayit;
    const kategoriler = Object.keys(YAS_ETIKET);
    const t = k.toplam_18plus || 1;

    // Yıllar arası — her yaş kategorisinin yıllar arası değişimi
    const yillar = cache.tr_ozet.yillar;

    // Format: { kat: { yil: { erkek, kadın } } }
    const veri = {};
    for (const kat of kategoriler) {
      veri[kat] = {};
      for (const yil of yillar) {
        const eskiYil = state.yil;
        state.yil = yil;
        const d = getKayit();
        veri[kat][yil] = {
          erkek: d?.kayit?.yas[kat]?.erkek || 0,
          kadin: d?.kayit?.yas[kat]?.kadin || 0,
        };
        state.yil = eskiYil;
      }
    }

    // 6 satır × yıl_sayısı × 2 cinsiyet bar grafik (yatay)
    let html = '<div class="cinsiyet-yas-grid">';
    html += `<div class="cinsiyet-yas-header">
      <div class="cyh-kat">Yaş</div>
      ${yillar.map(y => `<div class="cyh-yil">${y}</div>`).join('')}
    </div>`;

    for (const kat of kategoriler) {
      html += `<div class="cinsiyet-yas-row">
        <div class="cyr-kat">${kat}</div>
        ${yillar.map(y => {
          const v = veri[kat][y];
          const toplamKat = v.erkek + v.kadin;
          const eYuzde = toplamKat > 0 ? (v.erkek / toplamKat) * 100 : 50;
          const kYuzde = 100 - eYuzde;
          return `<div class="cyr-cell" title="${y} · ${kat} · E: ${fmt.n(v.erkek)} · K: ${fmt.n(v.kadin)}">
            <div class="cyr-bar">
              <div class="cyr-bar-e" style="width: ${eYuzde.toFixed(1)}%;"></div>
              <div class="cyr-bar-k" style="width: ${kYuzde.toFixed(1)}%;"></div>
            </div>
            <div class="cyr-rakam">${fmt.n1(eYuzde)}% / ${fmt.n1(kYuzde)}%</div>
          </div>`;
        }).join('')}
      </div>`;
    }
    html += '</div>';

    html += `<div class="cinsiyet-yas-legend">
      <span class="cyl-item"><span class="cyl-renk cyl-e"></span>Erkek</span>
      <span class="cyl-item"><span class="cyl-renk cyl-k"></span>Kadın</span>
    </div>`;

    el.innerHTML = html;
  }

  function renderAciklamaC() {
    return `
      <div class="panel panel-muted">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Cinsiyet dengesi ve zaman değişimi nasıl yorumlanmalı?</div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          <li><strong>%50/%50 yakını:</strong> Doğal denge. Türkiye geneli buna yakındır.</li>
          <li><strong>Erkek fazlası (%52+):</strong> Sanayi, askeri tesis, taş ocağı gibi erkek işgücü ağırlıklı bölgeler.</li>
          <li><strong>Kadın fazlası (%52+ kadın):</strong> Genç erkeklerin çalışmaya gittiği ilçeler — kırsal Karadeniz, İç Anadolu köyleri.</li>
          <li><strong>Yıllar arası nüfus değişimi:</strong> Pozitif büyüme = doğum + göç alıyor; negatif = göç veriyor.</li>
        </ul>
        <p class="footnote" style="margin-top: var(--space-4);">
          Kaynak: TÜİK ADNKS, 18+ nüfus. Askeri personel ve cezaevi nüfusu özel haneler kategorisinde sayılır.
        </p>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // CİNSİYET × EĞİTİM — iki farklı görsel
  // ═══════════════════════════════════════════════════════════════

  /**
   * Sekme B için: Her eğitim seviyesinde KADIN ve ERKEK nasıl dağılıyor?
   * Yatay zıt bar — sol kadın, sağ erkek
   * Eksen ekseni: o seviyedeki toplam kişinin %'si
   */
  function renderCinsiyetEgitimZitBar(el, kayit, baslik) {
    if (!el) return;
    if (!kayit) {
      el.innerHTML = '<div style="padding: var(--space-4); color: var(--ink-3); font-style: italic;">Veri yok</div>';
      return;
    }

    const fmt = window.AT.fmt;
    const kategoriler = ['universite_plus', 'lise_dengi', 'ilkokul_ortaokul', 'okuryazar', 'okuma_yazma_bilmeyen'];

    // Her seviyede toplam erkek/kadın
    const satirlar = kategoriler.map(kat => {
      const erkek = kayit.egitim[kat]?.erkek || 0;
      const kadin = kayit.egitim[kat]?.kadin || 0;
      const toplam = erkek + kadin;
      const eYuzde = toplam > 0 ? (erkek / toplam) * 100 : 50;
      const kYuzde = toplam > 0 ? (kadin / toplam) * 100 : 50;
      const etiket = EGITIM_ETIKET[kat] || kat;

      // Asimetri vurgusu (50/50'den uzaklık)
      const asimetri = Math.abs(eYuzde - 50);
      const asimetriCls = asimetri > 15 ? ' yuksek-asimetri' : (asimetri > 5 ? ' orta-asimetri' : '');

      return `
        <div class="zitbar-row${asimetriCls}">
          <div class="zitbar-etiket">${escapeHtml(etiket)}</div>
          <div class="zitbar-sol">
            <span class="zitbar-yuzde">%${fmt.n1(kYuzde)}</span>
            <div class="zitbar-bar-track sol-track">
              <div class="zitbar-bar-fill zitbar-kadin" style="width: ${kYuzde.toFixed(1)}%;"></div>
            </div>
          </div>
          <div class="zitbar-sag">
            <div class="zitbar-bar-track sag-track">
              <div class="zitbar-bar-fill zitbar-erkek" style="width: ${eYuzde.toFixed(1)}%;"></div>
            </div>
            <span class="zitbar-yuzde">%${fmt.n1(eYuzde)}</span>
          </div>
          <div class="zitbar-toplam" title="Toplam ${fmt.n(toplam)} kişi">${fmt.n(toplam)}</div>
        </div>
      `;
    }).join('');

    el.innerHTML = `
      <div class="zitbar-wrap">
        <div class="zitbar-header">
          <div class="zitbar-etiket-h">Eğitim seviyesi</div>
          <div class="zitbar-cinsiyet-h zitbar-kadin-h">← Kadın</div>
          <div class="zitbar-cinsiyet-h zitbar-erkek-h">Erkek →</div>
          <div class="zitbar-toplam-h">Toplam</div>
        </div>
        <div class="zitbar-govde">
          ${satirlar}
        </div>
        <div class="zitbar-aciklama">
          Türkiye genelinde, eğitim seviyesi düştükçe <strong>kadın oranı</strong> artar.
          Doğal cinsiyet dengesi %50/%50; ondan uzaklık tarihsel eğitim erişimini yansıtır.
        </div>
      </div>
    `;
  }

  /**
   * Sekme C için: Erkek ve kadın grupları kendi içlerinde eğitim seviyelerine nasıl dağılıyor?
   * İki yatay yığılmış bar (erkek, kadın), her bar 100%
   */
  function renderCinsiyetEgitimYigilmis(el, kayit, baslik) {
    if (!el) return;
    if (!kayit) {
      el.innerHTML = '<div style="padding: var(--space-4); color: var(--ink-3); font-style: italic;">Veri yok</div>';
      return;
    }

    const fmt = window.AT.fmt;
    const kategoriler = ['universite_plus', 'lise_dengi', 'ilkokul_ortaokul', 'okuryazar', 'okuma_yazma_bilmeyen'];

    // Erkek ve kadın için toplam
    const erkekToplam = kategoriler.reduce((s, kat) => s + (kayit.egitim[kat]?.erkek || 0), 0);
    const kadinToplam = kategoriler.reduce((s, kat) => s + (kayit.egitim[kat]?.kadin || 0), 0);

    function barIcerik(cinsiyetAlan, toplam) {
      if (toplam === 0) return '<div class="cyig-bos">Veri yok</div>';
      let html = '';
      for (const kat of kategoriler) {
        const sayi = kayit.egitim[kat]?.[cinsiyetAlan] || 0;
        const yuzde = (sayi / toplam) * 100;
        if (yuzde < 0.3) continue;
        const renk = EGITIM_RENK[kat];
        const etiket = EGITIM_ETIKET[kat] || kat;
        html += `<div class="cyig-dilim" style="width: ${yuzde.toFixed(2)}%; background: ${renk};"
                      title="${etiket}: ${fmt.n1(yuzde)}% (${fmt.n(sayi)})">
          ${yuzde >= 6 ? `<span class="cyig-dilim-text">${fmt.n1(yuzde)}%</span>` : ''}
        </div>`;
      }
      return html;
    }

    // Kategoriler için lejant
    let lejant = '';
    for (const kat of kategoriler) {
      const renk = EGITIM_RENK[kat];
      const etiket = EGITIM_ETIKET[kat] || kat;
      lejant += `<span class="cyig-leg-item">
        <span class="cyig-leg-renk" style="background: ${renk};"></span>
        ${escapeHtml(etiket)}
      </span>`;
    }

    el.innerHTML = `
      <div class="cyig-wrap">
        <div class="cyig-row">
          <div class="cyig-label">
            <span class="cyig-label-baslik">Erkek</span>
            <span class="cyig-label-toplam">${fmt.n(erkekToplam)}</span>
          </div>
          <div class="cyig-bar">${barIcerik('erkek', erkekToplam)}</div>
        </div>
        <div class="cyig-row">
          <div class="cyig-label">
            <span class="cyig-label-baslik">Kadın</span>
            <span class="cyig-label-toplam">${fmt.n(kadinToplam)}</span>
          </div>
          <div class="cyig-bar">${barIcerik('kadin', kadinToplam)}</div>
        </div>
        <div class="cyig-legend">${lejant}</div>
        <div class="cyig-aciklama">
          Her bar %100'dür. Erkek ve kadın gruplarının kendi içindeki dağılımı yan yana karşılaştırılır.
        </div>
      </div>
    `;
  }

  /**
   * Yaş × eğitim çaprazı — her yaş grubu için yığılmış bar.
   * Kuşaklar arası eğitim sıçramasını gösterir.
   */
  function renderYasEgitimCapraz(el, kayit, baslik) {
    if (!el) return;
    if (!kayit || !kayit.yas_egitim) {
      el.innerHTML = `
        <div style="padding: var(--space-4); color: var(--ink-3); font-style: italic;">
          Yaş × eğitim çaprazı bu kapsamda henüz hazır değil.
          Aggregate'leri yeniden üretmeniz gerekebilir:
          <span class="mono">python tools/build_aggregates.py --all</span> ve
          <span class="mono">python tools/build_demografi.py</span>
        </div>
      `;
      return;
    }

    const fmt = window.AT.fmt;
    const yasKategorileri = Object.keys(YAS_ETIKET);
    // En yaşlıdan en gence sırala (yığılmış barda en üstte yaşlılar olur, kuşak akışı görünür)
    const yasSirali = [...yasKategorileri].reverse();
    const egitimKategorileri = ['universite_plus', 'lise_dengi', 'ilkokul_ortaokul', 'okuryazar', 'okuma_yazma_bilmeyen'];

    function barIcerik(yasKat) {
      const yasData = kayit.yas_egitim[yasKat];
      if (!yasData) return '<div class="cyig-bos">Veri yok</div>';

      const toplam = egitimKategorileri.reduce((s, ek) => s + (yasData[ek]?.toplam || 0), 0);
      if (toplam === 0) return '<div class="cyig-bos">Veri yok</div>';

      let html = '';
      for (const ek of egitimKategorileri) {
        const sayi = yasData[ek]?.toplam || 0;
        const yuzde = (sayi / toplam) * 100;
        if (yuzde < 0.3) continue;
        const renk = EGITIM_RENK[ek];
        const etiket = EGITIM_ETIKET[ek] || ek;
        html += `<div class="cyig-dilim" style="width: ${yuzde.toFixed(2)}%; background: ${renk};"
                      title="${yasKat} · ${etiket}: ${fmt.n1(yuzde)}% (${fmt.n(sayi)})">
          ${yuzde >= 6 ? `<span class="cyig-dilim-text">${fmt.n1(yuzde)}%</span>` : ''}
        </div>`;
      }
      return html;
    }

    // Her satır = bir yaş grubu
    let rows = '';
    for (const yk of yasSirali) {
      const yasData = kayit.yas_egitim[yk] || {};
      const toplam = egitimKategorileri.reduce((s, ek) => s + (yasData[ek]?.toplam || 0), 0);
      rows += `
        <div class="cyig-row">
          <div class="cyig-label">
            <span class="cyig-label-baslik">${yk}</span>
            <span class="cyig-label-toplam">${fmt.n(toplam)}</span>
          </div>
          <div class="cyig-bar">${barIcerik(yk)}</div>
        </div>
      `;
    }

    // Lejant (eğitim renkleri)
    let lejant = '';
    for (const ek of egitimKategorileri) {
      const renk = EGITIM_RENK[ek];
      const etiket = EGITIM_ETIKET[ek] || ek;
      lejant += `<span class="cyig-leg-item">
        <span class="cyig-leg-renk" style="background: ${renk};"></span>
        ${escapeHtml(etiket)}
      </span>`;
    }

    el.innerHTML = `
      <div class="cyig-wrap">
        ${rows}
        <div class="cyig-legend">${lejant}</div>
        <div class="cyig-aciklama">
          Her satır o yaş grubundaki kişilerin eğitim dağılımıdır (her bar %100).
          Üstten alta (yaşlıdan gence) ilerledikçe yüksek eğitim (yeşil) artar, düşük eğitim (kırmızı) azalır —
          Türkiye'nin <strong>kuşaklar arası eğitim sıçraması</strong>.
        </div>
        <div class="cyig-aciklama-not">
          <strong>Önemli not — 18-24 yaş grubu hakkında:</strong>
          Bu yaş grubunun büyük kısmı hâlâ <strong>eğitim sürecinde</strong>dir.
          TÜİK verisinde kişiler <strong>tamamladığı en son eğitim seviyesi</strong>ne göre sayılır.
          Üniversite öğrencileri henüz mezun olmadığı için <strong>"Lise/dengi" kategorisinde</strong> görünür.
          Bu yüzden 18-24 yaş grubunda lise oranı yüksek, üniversite oranı düşük gözükür —
          bu bir veri tanım özelliğidir, gerçek eğitim açığı değildir.
        </div>
      </div>
    `;
  }

  /**
   * 3 boyutlu çapraz: yaş × cinsiyet × eğitim.
   * Sol erkek, sağ kadın. Her yaş grubu için yan yana iki yığılmış bar.
   * Kuşaklar arası eğitim sıçramasını ve cinsiyet farkını aynı görselde gösterir.
   */
  function renderUcBoyutluCapraz(el, kayit, baslik) {
    if (!el) return;
    if (!kayit || !kayit.yas_egitim) {
      el.innerHTML = `
        <div style="padding: var(--space-4); color: var(--ink-3); font-style: italic;">
          Yaş × cinsiyet × eğitim çaprazı bu kapsamda henüz hazır değil.
          Aggregate'leri yeniden üretmeniz gerekebilir:
          <span class="mono">python tools/build_aggregates.py --all</span> ve
          <span class="mono">python tools/build_demografi.py</span>
        </div>
      `;
      return;
    }

    const fmt = window.AT.fmt;
    const yasKategorileri = Object.keys(YAS_ETIKET);
    // En yaşlıdan en gence (kuşak akışını yukarıdan aşağıya göster)
    const yasSirali = [...yasKategorileri].reverse();
    const egitimKategorileri = ['universite_plus', 'lise_dengi', 'ilkokul_ortaokul', 'okuryazar', 'okuma_yazma_bilmeyen'];

    /**
     * Bir cinsiyet+yaş için yığılmış bar HTML'i üretir.
     * yon: 'sol' (erkek, sağdan sola dolan) veya 'sag' (kadın, soldan sağa dolan)
     */
    function tekBar(yasKat, cinsiyetAlan, yon) {
      const yasData = kayit.yas_egitim[yasKat];
      if (!yasData) return '<div class="ucb-bos">Veri yok</div>';

      const toplam = egitimKategorileri.reduce((s, ek) => s + (yasData[ek]?.[cinsiyetAlan] || 0), 0);
      if (toplam === 0) return '<div class="ucb-bos">–</div>';

      // Sol bar için: en yüksek eğitim önce → sağdan sola yığılma için ters çevir
      // Sağ bar için: en yüksek eğitim önce → soldan sağa yığılma normal
      const sirali = yon === 'sol' ? [...egitimKategorileri].reverse() : egitimKategorileri;

      let html = '';
      for (const ek of sirali) {
        const sayi = yasData[ek]?.[cinsiyetAlan] || 0;
        const yuzde = (sayi / toplam) * 100;
        if (yuzde < 0.2) continue;
        const renk = EGITIM_RENK[ek];
        const etiket = EGITIM_ETIKET[ek] || ek;
        html += `<div class="ucb-dilim" style="width: ${yuzde.toFixed(2)}%; background: ${renk};"
                      title="${yasKat} · ${etiket}: ${fmt.n1(yuzde)}% (${fmt.n(sayi)})">
          ${yuzde >= 8 ? `<span class="ucb-dilim-text">${fmt.n1(yuzde)}%</span>` : ''}
        </div>`;
      }
      return html;
    }

    let rows = '';
    for (const yk of yasSirali) {
      const yasData = kayit.yas_egitim[yk] || {};
      const erkekToplam = egitimKategorileri.reduce((s, ek) => s + (yasData[ek]?.erkek || 0), 0);
      const kadinToplam = egitimKategorileri.reduce((s, ek) => s + (yasData[ek]?.kadin || 0), 0);

      rows += `
        <div class="ucb-row">
          <div class="ucb-toplam ucb-toplam-sol">${fmt.n(erkekToplam)}</div>
          <div class="ucb-bar ucb-bar-sol">${tekBar(yk, 'erkek', 'sol')}</div>
          <div class="ucb-yas-etiket">${yk}</div>
          <div class="ucb-bar ucb-bar-sag">${tekBar(yk, 'kadin', 'sag')}</div>
          <div class="ucb-toplam ucb-toplam-sag">${fmt.n(kadinToplam)}</div>
        </div>
      `;
    }

    // Lejant
    let lejant = '';
    for (const ek of egitimKategorileri) {
      const renk = EGITIM_RENK[ek];
      const etiket = EGITIM_ETIKET[ek] || ek;
      lejant += `<span class="cyig-leg-item">
        <span class="cyig-leg-renk" style="background: ${renk};"></span>
        ${escapeHtml(etiket)}
      </span>`;
    }

    el.innerHTML = `
      <div class="ucb-wrap">
        <div class="ucb-header">
          <div class="ucb-h-cinsiyet ucb-h-erkek">Erkek</div>
          <div class="ucb-h-orta">Yaş</div>
          <div class="ucb-h-cinsiyet ucb-h-kadin">Kadın</div>
        </div>
        <div class="ucb-govde">
          ${rows}
        </div>
        <div class="cyig-legend">${lejant}</div>
        <div class="cyig-aciklama">
          Her satır bir yaş grubu. Sol erkek, sağ kadın — iki çubuk da kendi içinde %100'dür.
          Üstten alta (yaşlıdan gence) ilerledikçe <strong>her iki tarafta da yüksek eğitim genişler</strong>.
          Eğer sol-sağ asimetri varsa, o yaş grubundaki kuşağın cinsiyet eşitsizliğini gösterir.
        </div>
        <div class="cyig-aciklama-not">
          <strong>Önemli not — 18-24 yaş grubu hakkında:</strong>
          Bu yaş grubunun büyük kısmı hâlâ <strong>eğitim sürecinde</strong>dir.
          TÜİK verisinde kişiler <strong>tamamladığı en son eğitim seviyesi</strong>ne göre sayılır.
          Üniversite öğrencileri henüz mezun olmadığı için <strong>"Lise/dengi" kategorisinde</strong> görünür.
          Bu yüzden 18-24 yaş grubunda lise oranı yüksek, üniversite oranı düşük gözükür —
          bu bir veri tanım özelliğidir, gerçek eğitim açığı değildir.
        </div>
      </div>
    `;
  }


  // ═══════════════════════════════════════════════════════════════
  // ORTAK: Yatay bar grafiği (yıllar boyunca dağılım)
  // ═══════════════════════════════════════════════════════════════
  function cizYatayBarYillar(el, yillar, kategoriler, yil_kayit, etiketMap, renkMap, alan) {
    const fmt = window.AT.fmt;

    if (yillar.every(y => !yil_kayit[y])) {
      el.innerHTML = '<div style="padding: var(--space-4); color: var(--ink-3); font-style: italic;">Veri yok</div>';
      return;
    }

    let html = '<div class="zaman-bar-grid">';

    // Header
    html += `<div class="zaman-bar-header">
      <div class="zbh-yil">Yıl</div>
      <div class="zbh-bar">Yüzde dağılımı (100%)</div>
    </div>`;

    for (const yil of yillar) {
      const k = yil_kayit[yil];
      if (!k) {
        html += `<div class="zaman-bar-row"><div class="zbr-yil">${yil}</div><div class="zbr-bar zbr-bos">Veri yok</div></div>`;
        continue;
      }
      const t = k.toplam_18plus || 1;
      let dilimler = '';
      for (const kat of kategoriler) {
        const sayi = k[alan]?.[kat]?.toplam || 0;
        const yuzde = (sayi / t) * 100;
        if (yuzde < 0.3) continue;
        const renk = renkMap[kat];
        const etiket = etiketMap[kat] || kat;
        dilimler += `<div class="zbr-dilim" style="width: ${yuzde.toFixed(2)}%; background: ${renk};" title="${etiket}: ${fmt.n1(yuzde)}% (${fmt.n(sayi)})">
          ${yuzde >= 5 ? `<span class="zbr-dilim-text">${fmt.n1(yuzde)}%</span>` : ''}
        </div>`;
      }
      html += `<div class="zaman-bar-row">
        <div class="zbr-yil">${yil}</div>
        <div class="zbr-bar">${dilimler}</div>
      </div>`;
    }
    html += '</div>';

    // Lejant
    html += '<div class="zaman-bar-legend">';
    for (const kat of kategoriler) {
      const renk = renkMap[kat];
      const etiket = etiketMap[kat] || kat;
      html += `<span class="zbl-item">
        <span class="zbl-renk" style="background: ${renk};"></span>
        ${escapeHtml(etiket)}
      </span>`;
    }
    html += '</div>';

    el.innerHTML = html;
  }

  // ═══════════════════════════════════════════════════════════════
  // ORTAK HARİTA ÇİZİMİ (uyumsuzluk modülünden alındı)
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
      const klass = `demografi-il-path ${veri_yok ? 'veri-yok' : ''} ${il === secili_il ? 'selected' : ''}`;
      const d = geometryToPath(feat.geometry);
      return `<path class="${klass}" d="${d}" fill="${renk}" data-il="${escapeHtml(il)}"></path>`;
    }).join('');

    haritaEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;

    if (lejantEl) {
      lejantEl.innerHTML = lejant.map(item => `
        <span class="demografi-lejant-item">
          <span class="demografi-lejant-kutu" style="background:${item.renk}"></span>
          <span>${item.etiket}</span>
        </span>
      `).join('') + `
        <span class="demografi-lejant-item" style="margin-left: var(--space-3);">
          <span class="demografi-lejant-kutu" style="background:var(--paper-3); opacity:0.5;"></span>
          <span>Veri yok</span>
        </span>
      `;
    }

    haritaEl.querySelectorAll('.demografi-il-path').forEach(p => {
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
  function yasRengi(yas65Yuzde) {
    // Düşük = açık (genç), yüksek = koyu (yaşlı)
    if (yas65Yuzde < 5)  return '#dca858';
    if (yas65Yuzde < 10) return '#c8c089';
    if (yas65Yuzde < 13) return '#9eb39b';
    if (yas65Yuzde < 16) return '#5a8094';
    if (yas65Yuzde < 20) return '#3a5d75';
    return '#1f4d6e';
  }

  function egitimRengi(uniYuzde) {
    if (uniYuzde < 5)  return '#7a1f10';
    if (uniYuzde < 10) return '#b8311a';
    if (uniYuzde < 15) return '#c8861a';
    if (uniYuzde < 20) return '#c8c089';
    if (uniYuzde < 30) return '#7ba383';
    if (uniYuzde < 40) return '#2d6b3f';
    return '#1a4d2e';
  }

  function cinsiyetRengi(eYuzde) {
    if (eYuzde < 47)   return '#b8311a';   // kadın fazlası
    if (eYuzde < 49)   return '#c8861a';
    if (eYuzde < 51)   return '#c8c089';   // denge
    if (eYuzde < 53)   return '#5a8094';
    return '#1f4d6e';                      // erkek fazlası
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME D — YAŞLANMA ANALİZİ
  // "Türkiye yaşlanıyor mu?" sorusuna veri tabanlı yaklaşım
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeD(container, icerikEl) {
    const yillar = cache.tr_ozet.yillar;
    const ilkYil = yillar[0];
    const sonYil = yillar[yillar.length - 1];

    icerikEl.innerHTML = `
      <div class="demografi-tarafsizlik-uyari callout callout-warn">
        <div class="uyari-baslik callout-title">⏳ Öngörü değildir — trend göstergesidir</div>
        <p>
          Bu sekme <strong>${ilkYil}-${sonYil} arası gerçek verilerin</strong> nasıl değiştiğini
          gösterir. Geleceğe dair öngörü <strong>içermez</strong>. "Eğer mevcut trend devam
          ederse" türündeki yorumlar, kullanıcının kendi çıkarımıdır.
        </p>
      </div>

      ${renderFiltrePanel(icerikEl, () => renderSekmeD(container, icerikEl))}

      <div id="demD-ozet-kutular"></div>

      <div class="section-head" style="margin-top: var(--space-6);">
        <h2>7 yıllık değişim · ortalama yaş ve 65+ oranı</h2>
        <span class="eyebrow">Yıllık ortalama hız ile birlikte</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demD-cizgi-grafik"></div>
      </div>

      <div class="section-head">
        <h2>Yaş gruplarının zaman serisi</h2>
        <span class="eyebrow">Hangi grup büyüyor, hangisi küçülüyor?</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demD-yas-trend"></div>
      </div>

      <div class="section-head">
        <h2>En hızlı yaşlanan iller · ${ilkYil}-${sonYil}</h2>
        <span class="eyebrow">65+ oranındaki yüzde puanı artış</span>
      </div>
      <div class="panel" style="padding: 0; overflow: hidden;">
        <div id="demD-il-tablo"></div>
      </div>

      <div class="section-head">
        <h2>TÜİK projeksiyonu</h2>
        <span class="eyebrow">Kaynak: TÜİK Nüfus Projeksiyonları</span>
      </div>
      <div class="panel" style="padding: var(--space-4);">
        <div id="demD-tuik"></div>
      </div>

      ${renderAciklamaD()}
    `;

    bindFiltrePanel(icerikEl, () => renderSekmeD(container, icerikEl));

    renderOzetKutularD(icerikEl);
    renderCizgiGrafikD(icerikEl);
    renderYasTrendD(icerikEl);
    renderIlTabloD(icerikEl);
    renderTuikProjeksiyonD(icerikEl);
  }

  // Ortalama yaş — yaş kategorilerinin orta noktası ile ağırlıklı
  function hesaplaOrtalamaYas(kayit) {
    if (!kayit?.yas) return null;
    const yasOrta = { '18-24': 21, '25-34': 29.5, '35-44': 39.5, '45-54': 49.5, '55-64': 59.5, '65+': 72 };
    let toplam = 0, agirlik = 0;
    for (const [yk, ad] of Object.entries(kayit.yas)) {
      const sayi = ad.toplam || 0;
      toplam += sayi * (yasOrta[yk] || 0);
      agirlik += sayi;
    }
    return agirlik > 0 ? toplam / agirlik : null;
  }

  function get65PlusOrani(kayit) {
    if (!kayit?.yas?.['65+'] || !kayit.toplam_18plus) return null;
    return (kayit.yas['65+'].toplam / kayit.toplam_18plus) * 100;
  }

  // Seçili kapsam için belirli bir yılın kaydını al
  // Mevcut getKayit() benzeri ama yılı parametre olarak alır
  function getKayitYil(yil) {
    if (!state.il) {
      // Türkiye geneli
      return cache.tr_ozet.turkiye?.yillar?.[yil] || null;
    }
    if (!state.ilce) {
      // İl geneli
      const il = cache.tr_ozet.iller?.[state.il];
      return il?.yillar?.[yil] || null;
    }
    // İlçe — il detayından çek
    const ilData = cache.il_detaylari?.get?.(state.il);
    if (!ilData) return null;
    const ilce = ilData.ilceler?.[state.ilce];
    return ilce?.yillar?.[yil] || null;
  }

  function renderOzetKutularD(icerikEl) {
    const el = icerikEl.querySelector('#demD-ozet-kutular');
    if (!el) return;
    const fmt = window.AT.fmt;
    const yillar = cache.tr_ozet.yillar;
    const ilkYil = yillar[0];
    const sonYil = yillar[yillar.length - 1];
    const farkYil = sonYil - ilkYil;

    const ilkK = getKayitYil(ilkYil);
    const sonK = getKayitYil(sonYil);

    if (!ilkK || !sonK) {
      el.innerHTML = '<div class="panel"><p style="padding: var(--space-4); color: var(--ink-3); text-align:center;">Bu kapsam için zaman serisi verisi yok</p></div>';
      return;
    }

    const ortalamaYasIlk = hesaplaOrtalamaYas(ilkK);
    const ortalamaYasSon = hesaplaOrtalamaYas(sonK);
    const ortFark = ortalamaYasIlk != null && ortalamaYasSon != null ? ortalamaYasSon - ortalamaYasIlk : null;

    const yas65Ilk = get65PlusOrani(ilkK);
    const yas65Son = get65PlusOrani(sonK);
    const yas65Fark = yas65Ilk != null && yas65Son != null ? yas65Son - yas65Ilk : null;

    const t18Ilk = ilkK.toplam_18plus || 0;
    const t18Son = sonK.toplam_18plus || 0;
    const t18FarkYzd = t18Ilk > 0 ? ((t18Son - t18Ilk) / t18Ilk) * 100 : null;

    const genc18Ilk = ((ilkK.yas?.['18-24']?.toplam || 0) / t18Ilk) * 100;
    const genc18Son = ((sonK.yas?.['18-24']?.toplam || 0) / t18Son) * 100;
    const gencFark = genc18Son - genc18Ilk;

    el.innerHTML = `
      <div class="demD-ozet-grid">
        ${kutuD(
          'Ortalama yaş',
          ortalamaYasIlk != null ? fmt.n1(ortalamaYasIlk) : '—',
          ortalamaYasSon != null ? fmt.n1(ortalamaYasSon) : '—',
          ortFark != null ? (ortFark >= 0 ? '+' : '') + fmt.n1(ortFark) + ' yıl' : '—',
          ortFark != null ? (ortFark >= 0 ? 'pozitif' : 'negatif') : '',
          farkYil > 0 && ortFark != null ? `~${fmt.n2(ortFark / farkYil)} yıl/yıl` : ''
        )}
        ${kutuD(
          'Yaşlı (65+) oranı',
          yas65Ilk != null ? '%' + fmt.n1(yas65Ilk) : '—',
          yas65Son != null ? '%' + fmt.n1(yas65Son) : '—',
          yas65Fark != null ? (yas65Fark >= 0 ? '+' : '') + fmt.n1(yas65Fark) + ' pp' : '—',
          yas65Fark != null ? (yas65Fark >= 0 ? 'pozitif' : 'negatif') : '',
          farkYil > 0 && yas65Fark != null ? `~${fmt.n2(yas65Fark / farkYil)} pp/yıl` : ''
        )}
        ${kutuD(
          'Genç (18-24) oranı',
          '%' + fmt.n1(genc18Ilk),
          '%' + fmt.n1(genc18Son),
          (gencFark >= 0 ? '+' : '') + fmt.n1(gencFark) + ' pp',
          gencFark >= 0 ? 'pozitif' : 'negatif',
          farkYil > 0 ? `~${fmt.n2(gencFark / farkYil)} pp/yıl` : ''
        )}
        ${kutuD(
          '18+ nüfus büyümesi',
          fmt.n(t18Ilk),
          fmt.n(t18Son),
          t18FarkYzd != null ? (t18FarkYzd >= 0 ? '+' : '') + fmt.n1(t18FarkYzd) + '%' : '—',
          t18FarkYzd != null && t18FarkYzd >= 0 ? 'pozitif' : 'negatif',
          farkYil > 0 && t18FarkYzd != null ? `~${fmt.n2(t18FarkYzd / farkYil)}%/yıl` : ''
        )}
      </div>
    `;
  }

  function kutuD(baslik, ilk, son, fark, sinif, hiz) {
    const stacked = String(ilk).length > 11 || String(son).length > 11;
    const akisHtml = stacked ? `
        <div class="demD-ozet-akis demD-ozet-akis-stack">
          <span class="demD-ozet-deger">${ilk}</span>
          <span class="demD-ozet-ok" aria-hidden="true">→</span>
          <span class="demD-ozet-deger demD-ozet-vurgulu">${son}</span>
        </div>` : `
        <div class="demD-ozet-akis">
          <span class="demD-ozet-deger">${ilk}</span>
          <span class="demD-ozet-ok" aria-hidden="true">→</span>
          <span class="demD-ozet-deger demD-ozet-vurgulu">${son}</span>
        </div>`;
    return `
      <div class="demD-ozet-kutu">
        <div class="demD-ozet-baslik">${escapeHtml(baslik)}</div>
        ${akisHtml}
        <div class="demD-ozet-fark demD-${sinif}">${fark}</div>
        ${hiz ? `<div class="demD-ozet-hiz">${hiz}</div>` : ''}
      </div>
    `;
  }

  // ─── Çizgi grafik: ortalama yaş + 65+ oranı zaman serisi ───
  function renderCizgiGrafikD(icerikEl) {
    const el = icerikEl.querySelector('#demD-cizgi-grafik');
    if (!el) return;
    const fmt = window.AT.fmt;
    const yillar = cache.tr_ozet.yillar;

    const seri = yillar.map(yil => {
      const k = getKayitYil(yil);
      return {
        yil,
        ortalamaYas: k ? hesaplaOrtalamaYas(k) : null,
        yas65: k ? get65PlusOrani(k) : null,
      };
    }).filter(s => s.ortalamaYas != null);

    if (seri.length < 2) {
      el.innerHTML = '<div class="demD-bos">Yeterli veri yok</div>';
      return;
    }

    const W = 900, H = 320;
    const padL = 60, padR = 60, padT = 30, padB = 50;
    const iw = W - padL - padR;
    const ih = H - padT - padB;

    // 2 ekseni var: sol = ortalama yaş, sağ = 65+ %
    const ortMin = Math.min(...seri.map(s => s.ortalamaYas));
    const ortMax = Math.max(...seri.map(s => s.ortalamaYas));
    const yasMin = Math.min(...seri.map(s => s.yas65));
    const yasMax = Math.max(...seri.map(s => s.yas65));

    const ortYMin = Math.floor((ortMin - 1) * 2) / 2;
    const ortYMax = Math.ceil((ortMax + 1) * 2) / 2;
    const ortRange = Math.max(ortYMax - ortYMin, 0.5);

    const yasYMin = Math.max(0, Math.floor(yasMin - 0.5));
    const yasYMax = Math.ceil(yasMax + 0.5);
    const yasRange = Math.max(yasYMax - yasYMin, 0.5);

    const xStep = iw / (seri.length - 1);

    // İki seri için path
    const ortNoktalar = seri.map((s, i) => ({
      x: padL + i * xStep,
      y: padT + ih - ((s.ortalamaYas - ortYMin) / ortRange) * ih,
      val: s.ortalamaYas,
    }));
    const yasNoktalar = seri.map((s, i) => ({
      x: padL + i * xStep,
      y: padT + ih - ((s.yas65 - yasYMin) / yasRange) * ih,
      val: s.yas65,
    }));

    const ortPath = ortNoktalar.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const yasPath = yasNoktalar.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

    const ortRenk = '#d97606';
    const yasRenk = '#7c2415';

    const ortNokta = ortNoktalar.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${ortRenk}" stroke="var(--paper)" stroke-width="1.5"/>`
    ).join('');
    const yasNokta = yasNoktalar.map(p =>
      `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="4" fill="${yasRenk}" stroke="var(--paper)" stroke-width="1.5"/>`
    ).join('');

    // X etiketi
    const xLabel = ortNoktalar.map((p, i) =>
      `<text x="${p.x.toFixed(1)}" y="${(H - 16).toFixed(1)}" text-anchor="middle" class="demD-eksen">${seri[i].yil}</text>`
    ).join('');

    // Sol Y ekseni (ortalama yaş)
    let solY = '';
    for (let i = 0; i <= 4; i++) {
      const val = ortYMin + (ortRange * i / 4);
      const y = padT + ih - ((val - ortYMin) / ortRange) * ih;
      solY += `<text x="${(padL - 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="demD-eksen" style="fill:${ortRenk};">${val.toFixed(1)}</text>`;
      solY += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + iw).toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line-soft)" stroke-width="0.4"/>`;
    }

    // Sağ Y ekseni (65+ %)
    let sagY = '';
    for (let i = 0; i <= 4; i++) {
      const val = yasYMin + (yasRange * i / 4);
      const y = padT + ih - ((val - yasYMin) / yasRange) * ih;
      sagY += `<text x="${(padL + iw + 8).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="start" class="demD-eksen" style="fill:${yasRenk};">%${val.toFixed(1)}</text>`;
    }

    el.innerHTML = `
      <div class="demD-lejant" style="margin-bottom: var(--space-2);">
        <span class="demD-leg"><span class="demD-leg-renk" style="background:${ortRenk};"></span>Ortalama yaş (sol)</span>
        <span class="demD-leg"><span class="demD-leg-renk" style="background:${yasRenk};"></span>65+ oranı (sağ)</span>
      </div>
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%; height:auto;">
        ${solY}
        ${sagY}
        <path d="${ortPath}" fill="none" stroke="${ortRenk}" stroke-width="2.5"/>
        <path d="${yasPath}" fill="none" stroke="${yasRenk}" stroke-width="2.5"/>
        ${ortNokta}
        ${yasNokta}
        ${xLabel}
      </svg>
    `;
  }

  // ─── Yaş gruplarının zaman serisi (yığılmış değil, ayrı çizgiler) ───
  function renderYasTrendD(icerikEl) {
    const el = icerikEl.querySelector('#demD-yas-trend');
    if (!el) return;
    const fmt = window.AT.fmt;
    const yillar = cache.tr_ozet.yillar;
    const yasKats = ['18-24', '25-34', '35-44', '45-54', '55-64', '65+'];
    const renkler = {
      '18-24': '#3f7eb3',
      '25-34': '#5a9ec9',
      '35-44': '#7ab5a8',
      '45-54': '#c8a04e',
      '55-64': '#c46a3a',
      '65+':   '#7c2415',
    };

    // Her yaş kategorisi için yıllar arasında yüzde
    const series = {};
    for (const yk of yasKats) series[yk] = [];
    let bulundu = false;

    for (const yil of yillar) {
      const k = getKayitYil(yil);
      if (!k || !k.toplam_18plus) {
        for (const yk of yasKats) series[yk].push(null);
        continue;
      }
      bulundu = true;
      for (const yk of yasKats) {
        const ad = k.yas?.[yk]?.toplam || 0;
        series[yk].push((ad / k.toplam_18plus) * 100);
      }
    }

    if (!bulundu) {
      el.innerHTML = '<div class="demD-bos">Veri yok</div>';
      return;
    }

    const W = 900, H = 280;
    const padL = 50, padR = 130, padT = 30, padB = 50;
    const iw = W - padL - padR;
    const ih = H - padT - padB;

    // Y ekseni: tüm değerlerin max'ı
    let yMax = 0;
    for (const yk of yasKats) {
      for (const v of series[yk]) {
        if (v != null && v > yMax) yMax = v;
      }
    }
    yMax = Math.ceil(yMax / 5) * 5 + 5;

    const xStep = iw / (yillar.length - 1);

    let cizgiler = '';
    const labelMeta = [];
    const labelX = padL + iw + 8;
    const LABEL_GAP = 17;

    for (const yk of yasKats) {
      const noktalar = [];
      for (let i = 0; i < yillar.length; i++) {
        const v = series[yk][i];
        if (v == null) continue;
        noktalar.push({
          x: padL + i * xStep,
          y: padT + ih - (v / yMax) * ih,
          val: v,
        });
      }
      if (noktalar.length < 2) continue;
      const path = noktalar.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
      const renk = renkler[yk];
      cizgiler += `<path d="${path}" fill="none" stroke="${renk}" stroke-width="2" opacity="0.9"/>`;
      for (const p of noktalar) {
        cizgiler += `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="3" fill="${renk}"/>`;
      }
      const sonNokta = noktalar[noktalar.length - 1];
      labelMeta.push({ yk, renk, val: sonNokta.val, anchorX: sonNokta.x, anchorY: sonNokta.y });
    }

    // Sağ etiketler — çakışmayı önle (sıkışık yüzdeler için)
    labelMeta.sort((a, b) => a.anchorY - b.anchorY);
    for (let i = 0; i < labelMeta.length; i++) {
      labelMeta[i].labelY = labelMeta[i].anchorY;
      if (i > 0 && labelMeta[i].labelY - labelMeta[i - 1].labelY < LABEL_GAP) {
        labelMeta[i].labelY = labelMeta[i - 1].labelY + LABEL_GAP;
      }
    }
    const maxLabelY = padT + ih - 2;
    const minLabelY = padT + 10;
    if (labelMeta.length && labelMeta[labelMeta.length - 1].labelY > maxLabelY) {
      const shift = labelMeta[labelMeta.length - 1].labelY - maxLabelY;
      for (const lb of labelMeta) lb.labelY -= shift;
    }
    if (labelMeta.length && labelMeta[0].labelY < minLabelY) {
      const shift = minLabelY - labelMeta[0].labelY;
      for (const lb of labelMeta) lb.labelY += shift;
    }

    let etiketler = '';
    for (const lb of labelMeta) {
      const lx = labelX;
      const ay = lb.anchorY.toFixed(1);
      const ly = lb.labelY.toFixed(1);
      etiketler += `
        <path d="M ${lb.anchorX.toFixed(1)} ${ay} H ${(lx - 4).toFixed(1)} V ${ly}" fill="none" stroke="${lb.renk}" stroke-width="1" opacity="0.45"/>
        <circle cx="${lb.anchorX.toFixed(1)}" cy="${ay}" r="2.5" fill="${lb.renk}"/>
        <text x="${(lx + 4).toFixed(1)}" y="${(lb.labelY + 4).toFixed(1)}" class="demD-yas-label" fill="${lb.renk}">${lb.yk} · ${fmt.n1(lb.val)}%</text>
      `;
    }

    // X etiketleri
    let xLabel = '';
    for (let i = 0; i < yillar.length; i++) {
      const x = padL + i * xStep;
      xLabel += `<text x="${x.toFixed(1)}" y="${(H - 16).toFixed(1)}" text-anchor="middle" class="demD-eksen">${yillar[i]}</text>`;
    }

    // Y ekseni
    let yEkseni = '';
    for (let i = 0; i <= 5; i++) {
      const val = (yMax / 5) * i;
      const y = padT + ih - (val / yMax) * ih;
      yEkseni += `<line x1="${padL}" y1="${y.toFixed(1)}" x2="${(padL + iw).toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--line-soft)" stroke-width="0.4"/>`;
      yEkseni += `<text x="${(padL - 6).toFixed(1)}" y="${(y + 4).toFixed(1)}" text-anchor="end" class="demD-eksen">%${val.toFixed(0)}</text>`;
    }

    el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%; height:auto;">${yEkseni}${cizgiler}${etiketler}${xLabel}</svg>`;
  }

  // ─── En hızlı yaşlanan iller tablosu ───
  function renderIlTabloD(icerikEl) {
    const el = icerikEl.querySelector('#demD-il-tablo');
    if (!el) return;
    const fmt = window.AT.fmt;
    const yillar = cache.tr_ozet.yillar;
    const ilkYil = yillar[0];
    const sonYil = yillar[yillar.length - 1];

    const veriler = [];
    for (const [ilAdi, il] of Object.entries(cache.tr_ozet.iller || {})) {
      const ilkK = il.yillar?.[ilkYil];
      const sonK = il.yillar?.[sonYil];
      if (!ilkK || !sonK) continue;
      const ilk65 = get65PlusOrani(ilkK);
      const son65 = get65PlusOrani(sonK);
      if (ilk65 == null || son65 == null) continue;
      veriler.push({
        il: ilAdi,
        ilk: ilk65,
        son: son65,
        fark: son65 - ilk65,
      });
    }

    if (veriler.length === 0) {
      el.innerHTML = '<div class="demD-bos" style="padding: var(--space-4);">İl verisi yok</div>';
      return;
    }

    // İki tablo: en hızlı yaşlanan (artış) + en yavaş yaşlanan / gençleşen
    veriler.sort((a, b) => b.fark - a.fark);
    const enHizli = veriler.slice(0, 10);
    const enYavas = veriler.slice(-10).reverse();

    function tabloSatir(v, vurgu) {
      const renk = v.fark >= 0 ? 'var(--signal-amber)' : 'var(--signal-green)';
      const isaret = v.fark >= 0 ? '+' : '';
      return `
        <tr>
          <td><span style="font-weight: 500;">${escapeHtml(v.il)}</span></td>
          <td class="num" style="text-align:right;">${fmt.n1(v.ilk)}%</td>
          <td class="num" style="text-align:right;">${fmt.n1(v.son)}%</td>
          <td class="num" style="text-align:right; color:${renk}; font-weight:600;">${isaret}${fmt.n1(v.fark)} pp</td>
        </tr>
      `;
    }

    el.innerHTML = `
      <div class="demD-iki-tablo">
        <div>
          <div class="demD-tablo-baslik">En hızlı yaşlanan 10 il</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="text-align:left;">İl</th>
                <th style="text-align:right;">${ilkYil}</th>
                <th style="text-align:right;">${sonYil}</th>
                <th style="text-align:right;">Fark</th>
              </tr>
            </thead>
            <tbody>${enHizli.map(v => tabloSatir(v)).join('')}</tbody>
          </table>
        </div>
        <div>
          <div class="demD-tablo-baslik">En az değişen / gençleşen 10 il</div>
          <table class="data-table">
            <thead>
              <tr>
                <th style="text-align:left;">İl</th>
                <th style="text-align:right;">${ilkYil}</th>
                <th style="text-align:right;">${sonYil}</th>
                <th style="text-align:right;">Fark</th>
              </tr>
            </thead>
            <tbody>${enYavas.map(v => tabloSatir(v)).join('')}</tbody>
          </table>
        </div>
      </div>
    `;
  }

  // ─── TÜİK projeksiyonu (statik bilgi, alıntı) ───
  function renderTuikProjeksiyonD(icerikEl) {
    const el = icerikEl.querySelector('#demD-tuik');
    if (!el) return;

    el.innerHTML = `
      <div class="demD-tuik-icerik">
        <p style="margin: 0 0 var(--space-3) 0; font-size: 13.5px; color: var(--ink-2); line-height: 1.7;">
          Aşağıdaki rakamlar <strong>bizim hesabımız değildir</strong> — TÜİK'in
          <em>Nüfus Projeksiyonları (2023-2100)</em> raporundan alıntıdır. Kaynak gösterilerek
          paylaşılmıştır.
        </p>

        <div class="demD-tuik-grid">
          <div class="demD-tuik-kart">
            <div class="demD-tuik-yil">2030</div>
            <div class="demD-tuik-icerik-text">
              Türkiye nüfusu: <strong>~88 milyon</strong><br/>
              65+ oranı: <strong>~%13</strong>
            </div>
          </div>
          <div class="demD-tuik-kart">
            <div class="demD-tuik-yil">2050</div>
            <div class="demD-tuik-icerik-text">
              Türkiye nüfusu: <strong>~95 milyon</strong><br/>
              65+ oranı: <strong>~%21</strong>
            </div>
          </div>
          <div class="demD-tuik-kart">
            <div class="demD-tuik-yil">2080</div>
            <div class="demD-tuik-icerik-text">
              Türkiye nüfusu: <strong>~94 milyon</strong> (azalma)<br/>
              65+ oranı: <strong>~%27</strong>
            </div>
          </div>
        </div>

        <p style="margin: var(--space-4) 0 0 0; font-size: 12px; color: var(--ink-3); line-height: 1.6;">
          <strong>Kaynak:</strong> TÜİK, Nüfus Projeksiyonları, 2023.
          Resmi raporlar için <a href="https://www.tuik.gov.tr" target="_blank" rel="noopener" style="color: var(--brand-gold);">tuik.gov.tr</a> adresini ziyaret edin.
          Rakamlar yuvarlatılmıştır. Projeksiyonlar göç, doğurganlık ve ölüm oranlarına dair
          varsayımlara dayanır; gerçek sonuçlar bu varsayımlardan sapabilir.
        </p>
      </div>
    `;
  }

  function renderAciklamaD() {
    return `
      <div class="panel panel-muted">
        <div class="panel-title" style="margin-bottom: var(--space-3);">Yorum notu</div>
        <ul style="font-size:13.5px; line-height:1.7; color:var(--ink-2);">
          <li><strong>Ortalama yaş yaklaşık bir değerdir:</strong> Yaş kategorilerinin (örn. 18-24)
              orta noktası kullanılarak hesaplanır; kategorilerden türetilmiştir. Gerçek ortalama yaş için TÜİK'in tek-yıl
              tabloları gerekir.</li>
          <li><strong>"Yaşlanma" göreceli kavramdır:</strong> 65+ oranı artıyorsa nüfus
              yaşlanıyor; aynı zamanda doğurganlık düşüyor da olabilir. Tek başına bir hızlı
              karara götürmez.</li>
          <li><strong>Bölgesel farklılık yüksek:</strong> Üst tabloda Sinop, Çankırı gibi iller
              en hızlı yaşlanan iller olabilir; Şanlıurfa, Hakkari gibi iller daha genç kalır.
              Sebepleri arasında göç, doğurganlık ve istihdam yer alır.</li>
          <li><strong>TÜİK projeksiyonu birden fazla senaryo içerir:</strong> Burada gösterilen
              rakamlar "temel senaryo"ya aittir. Yüksek/düşük doğurganlık senaryoları için
              TÜİK raporlarına bakın.</li>
        </ul>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // YARDIMCILAR
  // ═══════════════════════════════════════════════════════════════
  function kisaltSayi(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return Math.round(n / 1000) + 'K';
    return Math.round(n).toString();
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
        /* === Sekme D — Yaşlanma analizi === */
        .demografi-tarafsizlik-uyari {
          background: rgba(200, 134, 26, 0.08);
          border-left: 4px solid var(--signal-amber);
          border-radius: 0 var(--radius) var(--radius) 0;
          padding: var(--space-4) var(--space-5);
          margin-bottom: var(--space-5);
        }
        .demografi-tarafsizlik-uyari .uyari-baslik {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: var(--space-2);
        }
        .demografi-tarafsizlik-uyari p {
          font-size: 13.5px;
          line-height: 1.7;
          color: var(--ink-2);
          margin: 0;
        }

        .demD-ozet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: var(--space-3);
          margin-top: var(--space-5);
        }
        .demD-ozet-kutu {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-4);
          min-width: 0;
        }
        .demD-ozet-baslik {
          font-size: 11.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--ink-3);
          margin-bottom: var(--space-3);
        }
        .demD-ozet-akis {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: var(--space-1) var(--space-2);
          margin-bottom: var(--space-2);
          max-width: 100%;
        }
        .demD-ozet-akis-stack {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--space-1);
        }
        .demD-ozet-akis-stack .demD-ozet-ok {
          align-self: flex-start;
          padding-left: 2px;
          font-size: 12px;
          line-height: 1;
        }
        .demD-ozet-deger {
          font-family: var(--font-mono);
          font-size: clamp(13px, 2.4vw, 16px);
          font-weight: 500;
          color: var(--ink-3);
          line-height: 1.3;
          min-width: 0;
          max-width: 100%;
        }
        .demD-ozet-deger.demD-ozet-vurgulu {
          font-size: clamp(15px, 2.8vw, 20px);
          color: var(--ink);
        }
        .demD-ozet-akis-stack .demD-ozet-deger.demD-ozet-vurgulu {
          font-size: clamp(14px, 2.5vw, 18px);
        }
        .demD-ozet-ok {
          color: var(--ink-4);
          font-size: 14px;
        }
        .demD-ozet-fark {
          font-family: var(--font-mono);
          font-size: 14px;
          font-weight: 600;
        }
        .demD-ozet-fark.demD-pozitif { color: var(--signal-amber); }
        .demD-ozet-fark.demD-negatif { color: var(--signal-green); }
        .demD-ozet-hiz {
          font-size: 11px;
          color: var(--ink-3);
          margin-top: 4px;
        }

        .demD-eksen {
          font-family: var(--font-mono);
          font-size: 11px;
          fill: var(--ink-3);
        }
        .demD-yas-label {
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 600;
        }
        .demD-bos {
          padding: var(--space-4);
          color: var(--ink-3);
          font-style: italic;
          text-align: center;
        }
        .demD-lejant {
          display: flex;
          gap: var(--space-4);
          font-size: 12.5px;
          color: var(--ink-2);
        }
        .demD-leg {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .demD-leg-renk {
          width: 14px;
          height: 14px;
          border-radius: 2px;
        }

        .demD-iki-tablo {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
        }
        @media (max-width: 900px) {
          .demD-iki-tablo {
            grid-template-columns: 1fr;
          }
        }
        .demD-tablo-baslik {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-2);
          padding: var(--space-3) var(--space-4);
          background: #fdfaf2;
          border-bottom: 1px solid var(--line);
        }

        .demD-tuik-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
          margin: var(--space-3) 0;
        }
        @media (max-width: 700px) {
          .demD-tuik-grid {
            grid-template-columns: 1fr;
          }
        }
        .demD-tuik-kart {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-4);
          text-align: center;
        }
        .demD-tuik-yil {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 500;
          color: var(--brand-gold);
          margin-bottom: var(--space-2);
        }
        .demD-tuik-icerik-text {
          font-size: 13.5px;
          color: var(--ink-2);
          line-height: 1.7;
        }

        /* Sekmeler */
        .demografi-sekmeler {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: var(--space-3);
          margin-bottom: var(--space-6);
        }
        @media (max-width: 900px) {
          .demografi-sekmeler {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        .demografi-sekme {
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
        .demografi-sekme:hover {
          border-color: var(--brand-gold);
          transform: translateY(-1px);
        }
        .demografi-sekme.active {
          border-color: var(--brand-gold);
          border-width: 2px;
          padding: calc(var(--space-4) - 1px) calc(var(--space-5) - 1px);
          background: var(--paper-2);
        }
        .demografi-sekme .sekme-num {
          font-family: var(--font-display);
          font-size: 28px;
          font-weight: 500;
          color: var(--brand-gold);
          line-height: 1;
        }
        .demografi-sekme .sekme-baslik {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--ink);
          margin-top: var(--space-2);
        }
        .demografi-sekme .sekme-sub {
          font-size: 12px;
          color: var(--ink-3);
          margin-top: 2px;
        }

        /* Filtre */
        .demografi-filtre-row {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-4);
          align-items: flex-end;
        }
        .demografi-filtre-grup {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
          min-width: 180px;
        }
        .demografi-filtre-lbl {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .demografi-select {
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
        .demografi-select:focus {
          outline: 2px solid var(--brand-gold);
          outline-offset: -1px;
        }
        .demografi-select:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Özet kutuları */
        .demografi-ozet-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: var(--space-3);
          margin-bottom: var(--space-5);
        }
        .demografi-ozet-tile {
          background: #fdfaf2;
          border: 1px solid var(--line);
          border-radius: var(--radius);
          padding: var(--space-3) var(--space-4);
        }
        .demografi-ozet-tile .ozet-lbl {
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .demografi-ozet-tile .ozet-val {
          font-family: var(--font-mono);
          font-size: 20px;
          font-weight: 600;
          color: var(--ink);
          margin-top: 2px;
        }
        .demografi-ozet-tile .ozet-sub {
          font-size: 11.5px;
          color: var(--ink-3);
          margin-top: 2px;
        }

        /* Harita grid */
        .demografi-harita-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: var(--space-5);
          align-items: stretch;
        }
        .demografi-harita-sol { min-width: 0; }
        .demografi-harita-sag {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        [id$="-harita-panel"] { position: relative; }
        [id$="-harita"]:not([id*="-yan-"]):not([id*="-zaman"]):not([id*="-piramit"]):not([id*="-dagilim"]):not([id*="-buyume"]):not([id*="-cinsiyet-yas"]) {
          width: 100%;
          aspect-ratio: 5 / 3;
          max-height: 380px;
          overflow: hidden;
        }
        [id^="demoA-harita"] svg, [id^="demoB-harita"] svg, [id^="demoC-harita"] svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .demografi-il-path {
          stroke: #fdfaf2;
          stroke-width: 0.5;
          cursor: pointer;
          transition: stroke-width 80ms ease, opacity 80ms ease;
        }
        .demografi-il-path:hover {
          stroke: var(--ink);
          stroke-width: 1.5;
        }
        .demografi-il-path.selected {
          stroke: var(--ink);
          stroke-width: 2;
        }
        .demografi-il-path.veri-yok {
          fill: var(--paper-3);
          opacity: 0.5;
          cursor: default;
        }
        .demografi-tooltip {
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
        .demografi-tooltip .tt-il {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
        }
        .demografi-tooltip .tt-deger {
          font-family: var(--font-mono);
          font-weight: 600;
        }
        .demografi-tooltip .tt-sub {
          font-size: 11px;
          color: var(--paper-3);
          margin-top: 2px;
        }
        .demografi-lejant {
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
        .demografi-lejant-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .demografi-lejant-kutu {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.15);
        }

        /* Yan grafik blokları */
        .yan-grafik-blok {
          background: var(--paper);
          border: 1px solid var(--line-soft);
          border-radius: var(--radius-sm);
          padding: var(--space-3);
        }
        .yan-grafik-baslik {
          font-family: var(--font-display);
          font-size: 13px;
          font-weight: 600;
          color: var(--ink-2);
          margin-bottom: var(--space-3);
          letter-spacing: -0.01em;
        }

        /* Yaş piramidi */
        .piramit-baslik {
          display: grid;
          grid-template-columns: 1fr 56px 1fr;
          align-items: center;
          margin-bottom: 6px;
          font-size: 11px;
          font-weight: 600;
          color: var(--ink-3);
        }
        .piramit-baslik .piramit-cinsiyet:first-child { text-align: right; padding-right: 4px; }
        .piramit-baslik .piramit-cinsiyet:last-child  { text-align: left;  padding-left: 4px; }
        .piramit-govde {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .piramit-row {
          display: grid;
          grid-template-columns: 1fr 56px 1fr;
          align-items: center;
          gap: 4px;
        }
        .piramit-sol, .piramit-sag {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .piramit-sol { justify-content: flex-end; }
        .piramit-sag { justify-content: flex-start; }
        .piramit-kat {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          color: var(--ink-2);
          text-align: center;
          background: var(--paper-2);
          border-radius: 3px;
          padding: 2px 0;
        }
        .piramit-yuzde {
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: var(--ink-3);
          min-width: 34px;
        }
        .piramit-sol .piramit-yuzde { text-align: right; }
        .piramit-bar-track {
          flex: 1;
          background: var(--paper-2);
          height: 14px;
          border-radius: 2px;
          overflow: hidden;
          display: flex;
        }
        .piramit-bar-sol { justify-content: flex-end; }
        .piramit-bar-sag { justify-content: flex-start; }
        .piramit-bar-fill {
          height: 100%;
        }

        /* Eğitim dağılımı */
        .dagilim-govde {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .dagilim-row {
          display: grid;
          grid-template-columns: 1fr 1.5fr 50px;
          align-items: center;
          gap: var(--space-2);
          font-size: 11.5px;
        }
        .dagilim-etiket {
          color: var(--ink-2);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .dagilim-bar-track {
          background: var(--paper-2);
          height: 12px;
          border-radius: 2px;
          overflow: hidden;
        }
        .dagilim-bar-fill { height: 100%; }
        .dagilim-deger {
          font-family: var(--font-mono);
          font-size: 11.5px;
          font-weight: 600;
          color: var(--ink);
          text-align: right;
        }

        /* Zaman içinde dağılım (yatay yığılmış bar) */
        .zaman-bar-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .zaman-bar-header {
          display: grid;
          grid-template-columns: 60px 1fr;
          gap: var(--space-3);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--ink-3);
          padding-bottom: 4px;
          border-bottom: 1px solid var(--line-soft);
        }
        .zaman-bar-row {
          display: grid;
          grid-template-columns: 60px 1fr;
          gap: var(--space-3);
          align-items: center;
        }
        .zbr-yil {
          font-family: var(--font-mono);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink-2);
        }
        .zbr-bar {
          display: flex;
          height: 22px;
          background: var(--paper-2);
          border-radius: 3px;
          overflow: hidden;
        }
        .zbr-bos {
          color: var(--ink-3);
          font-style: italic;
          padding-left: var(--space-2);
          font-size: 11.5px;
          align-items: center;
          display: flex;
        }
        .zbr-dilim {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          position: relative;
        }
        .zbr-dilim-text {
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: rgba(255,255,255,0.95);
          font-weight: 600;
          padding: 0 4px;
          white-space: nowrap;
          text-shadow: 0 0 2px rgba(0,0,0,0.4);
        }
        .zaman-bar-legend {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
          font-size: 11px;
          color: var(--ink-3);
        }
        .zbl-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .zbl-renk {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.1);
        }

        /* Çizgi grafik (büyüme) */
        .cizgi-eksen {
          font-family: var(--font-mono);
          font-size: 10px;
          fill: var(--ink-3);
        }
        .buyume-not {
          margin-top: var(--space-2);
          padding-top: var(--space-2);
          border-top: 1px solid var(--line-soft);
          font-size: 11.5px;
          color: var(--ink-2);
        }

        /* Cinsiyet × yaş grid */
        .cinsiyet-yas-grid {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .cinsiyet-yas-header {
          display: grid;
          grid-template-columns: 60px repeat(${cache.tr_ozet ? cache.tr_ozet.yillar.length : 7}, 1fr);
          gap: 4px;
          padding-bottom: 4px;
          border-bottom: 1px solid var(--line-soft);
          font-size: 10.5px;
          font-weight: 600;
          color: var(--ink-3);
        }
        .cyh-kat { padding-left: 4px; }
        .cyh-yil {
          text-align: center;
          font-family: var(--font-mono);
        }
        .cinsiyet-yas-row {
          display: grid;
          grid-template-columns: 60px repeat(${cache.tr_ozet ? cache.tr_ozet.yillar.length : 7}, 1fr);
          gap: 4px;
          align-items: center;
        }
        .cyr-kat {
          font-family: var(--font-mono);
          font-size: 11.5px;
          font-weight: 600;
          color: var(--ink-2);
          padding-left: 4px;
        }
        .cyr-cell {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .cyr-bar {
          display: flex;
          height: 16px;
          background: var(--paper-2);
          border-radius: 2px;
          overflow: hidden;
        }
        .cyr-bar-e { background: #5a8094; height: 100%; }
        .cyr-bar-k { background: #c8861a; height: 100%; }
        .cyr-rakam {
          font-family: var(--font-mono);
          font-size: 9.5px;
          color: var(--ink-3);
          text-align: center;
        }
        .cinsiyet-yas-legend {
          display: flex;
          gap: var(--space-4);
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
          font-size: 11.5px;
          color: var(--ink-2);
        }
        .cyl-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .cyl-renk {
          width: 14px;
          height: 14px;
          border-radius: 2px;
        }
        .cyl-e { background: #5a8094; }
        .cyl-k { background: #c8861a; }

        /* Cinsiyet × eğitim zıt bar (Sekme B) */
        .zitbar-wrap {
          display: flex;
          flex-direction: column;
        }
        .zitbar-header {
          display: grid;
          grid-template-columns: 140px 1fr 1fr 70px;
          gap: var(--space-2);
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--ink-3);
          padding-bottom: 6px;
          border-bottom: 1px solid var(--line-soft);
          align-items: end;
        }
        .zitbar-cinsiyet-h {
          font-family: var(--font-display);
          font-size: 12px;
          letter-spacing: 0;
          text-transform: none;
          font-weight: 600;
        }
        .zitbar-kadin-h { text-align: right; padding-right: 8px; color: #b8311a; }
        .zitbar-erkek-h { text-align: left; padding-left: 8px; color: #1f4d6e; }
        .zitbar-etiket-h, .zitbar-toplam-h { font-family: var(--font-body); font-size: 10.5px; }
        .zitbar-toplam-h { text-align: right; }
        .zitbar-govde {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-top: 6px;
        }
        .zitbar-row {
          display: grid;
          grid-template-columns: 140px 1fr 1fr 70px;
          gap: var(--space-2);
          align-items: center;
          padding: 4px 0;
        }
        .zitbar-row.orta-asimetri {
          background: rgba(168, 120, 32, 0.04);
          border-radius: 3px;
        }
        .zitbar-row.yuksek-asimetri {
          background: rgba(168, 120, 32, 0.09);
          border-radius: 3px;
        }
        .zitbar-etiket {
          font-size: 12px;
          color: var(--ink-2);
          font-weight: 500;
          padding-left: 4px;
        }
        .zitbar-sol, .zitbar-sag {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .zitbar-sol { justify-content: flex-end; }
        .zitbar-sag { justify-content: flex-start; }
        .zitbar-yuzde {
          font-family: var(--font-mono);
          font-size: 11px;
          font-weight: 600;
          color: var(--ink-2);
          min-width: 42px;
        }
        .zitbar-sol .zitbar-yuzde { text-align: right; color: #b8311a; }
        .zitbar-sag .zitbar-yuzde { text-align: left; color: #1f4d6e; }
        .zitbar-bar-track {
          flex: 1;
          background: var(--paper-2);
          height: 14px;
          border-radius: 2px;
          overflow: hidden;
          display: flex;
        }
        .sol-track { justify-content: flex-end; }
        .sag-track { justify-content: flex-start; }
        .zitbar-bar-fill { height: 100%; }
        .zitbar-kadin { background: #b8311a; }
        .zitbar-erkek { background: #1f4d6e; }
        .zitbar-toplam {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--ink-3);
          text-align: right;
          padding-right: 4px;
        }
        .zitbar-aciklama {
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
          font-size: 12px;
          line-height: 1.6;
          color: var(--ink-3);
        }

        /* Cinsiyet × eğitim yığılmış bar (Sekme C) */
        .cyig-wrap {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }
        .cyig-row {
          display: grid;
          grid-template-columns: 120px 1fr;
          gap: var(--space-3);
          align-items: center;
        }
        .cyig-label {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding-left: 4px;
        }
        .cyig-label-baslik {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
          color: var(--ink);
        }
        .cyig-label-toplam {
          font-family: var(--font-mono);
          font-size: 11px;
          color: var(--ink-3);
        }
        .cyig-bar {
          display: flex;
          height: 28px;
          background: var(--paper-2);
          border-radius: 3px;
          overflow: hidden;
        }
        .cyig-dilim {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .cyig-dilim-text {
          font-family: var(--font-mono);
          font-size: 11px;
          color: rgba(255,255,255,0.95);
          font-weight: 600;
          padding: 0 4px;
          white-space: nowrap;
          text-shadow: 0 0 2px rgba(0,0,0,0.4);
        }
        .cyig-bos {
          padding: 0 var(--space-3);
          color: var(--ink-3);
          font-size: 11.5px;
          font-style: italic;
          align-items: center;
          display: flex;
        }
        .cyig-legend {
          display: flex;
          flex-wrap: wrap;
          gap: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
          font-size: 11px;
          color: var(--ink-3);
        }
        .cyig-leg-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .cyig-leg-renk {
          width: 12px;
          height: 12px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.1);
        }
        .cyig-aciklama {
          font-size: 12px;
          line-height: 1.6;
          color: var(--ink-3);
          margin-top: var(--space-2);
        }
        .cyig-aciklama-not {
          margin-top: var(--space-3);
          padding: var(--space-3);
          background: rgba(200, 134, 26, 0.06);
          border-left: 3px solid var(--signal-amber);
          border-radius: 3px;
          font-size: 12px;
          line-height: 1.7;
          color: var(--ink-2);
        }
        .cyig-aciklama-not strong {
          color: var(--ink);
        }

        /* 3 boyutlu çapraz: yaş × cinsiyet × eğitim (Sekme C) */
        .ucb-wrap {
          display: flex;
          flex-direction: column;
        }
        .ucb-header {
          display: grid;
          grid-template-columns: 1fr 70px 1fr;
          align-items: center;
          padding-bottom: 8px;
          margin-bottom: 8px;
          border-bottom: 1px solid var(--line-soft);
        }
        .ucb-h-cinsiyet {
          font-family: var(--font-display);
          font-size: 14px;
          font-weight: 600;
        }
        .ucb-h-erkek {
          text-align: right;
          padding-right: 8px;
          color: #1f4d6e;
        }
        .ucb-h-kadin {
          text-align: left;
          padding-left: 8px;
          color: #b8311a;
        }
        .ucb-h-orta {
          text-align: center;
          font-size: 10.5px;
          font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--ink-3);
        }
        .ucb-govde {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .ucb-row {
          display: grid;
          grid-template-columns: 64px 1fr 70px 1fr 64px;
          align-items: center;
          gap: 6px;
          padding: 4px 0;
        }
        .ucb-toplam {
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: var(--ink-3);
        }
        .ucb-toplam-sol { text-align: right; padding-right: 4px; }
        .ucb-toplam-sag { text-align: left; padding-left: 4px; }
        .ucb-yas-etiket {
          font-family: var(--font-mono);
          font-size: 12.5px;
          font-weight: 600;
          color: var(--ink-2);
          text-align: center;
          background: var(--paper-2);
          border-radius: 3px;
          padding: 4px 0;
        }
        .ucb-bar {
          display: flex;
          height: 24px;
          background: var(--paper-2);
          border-radius: 3px;
          overflow: hidden;
        }
        .ucb-bar-sol {
          flex-direction: row;
          justify-content: flex-end;
        }
        .ucb-bar-sag {
          flex-direction: row;
          justify-content: flex-start;
        }
        .ucb-dilim {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .ucb-dilim-text {
          font-family: var(--font-mono);
          font-size: 10.5px;
          color: rgba(255,255,255,0.95);
          font-weight: 600;
          padding: 0 4px;
          white-space: nowrap;
          text-shadow: 0 0 2px rgba(0,0,0,0.4);
        }
        .ucb-bos {
          padding: 0 var(--space-3);
          color: var(--ink-3);
          font-size: 11px;
          font-style: italic;
          align-items: center;
          display: flex;
        }

        /* Mobil */
        @media (max-width: 900px) {
          .demografi-harita-grid {
            grid-template-columns: 1fr;
          }
          [id^="demoA-harita"]:not([id*="-yan-"]):not([id*="-zaman"]):not([id*="-piramit"]):not([id*="-dagilim"]):not([id*="-buyume"]):not([id*="-cinsiyet-yas"]),
          [id^="demoB-harita"]:not([id*="-yan-"]):not([id*="-zaman"]):not([id*="-piramit"]):not([id*="-dagilim"]):not([id*="-buyume"]):not([id*="-cinsiyet-yas"]),
          [id^="demoC-harita"]:not([id*="-yan-"]):not([id*="-zaman"]):not([id*="-piramit"]):not([id*="-dagilim"]):not([id*="-buyume"]):not([id*="-cinsiyet-yas"]) {
            aspect-ratio: 16 / 10;
          }
        }
      </style>
    `;
  }
})();
