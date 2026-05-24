/* ─────────────────────────────────────────────────────────
   Senaryo module v1 — Tarafsız varsayım/simülasyon aracı
   
   ÖNEMLİ: Bu modül "TAHMİN" değildir.
   Kullanıcının kendi varsayımlarıyla ne olabileceğini görselleştirir.
   "Eğer böyle olursa böyle olur" mantığıyla çalışır.
   
   A) Sürgü modeli — partilere uniform puan ekle/çıkar, sonucu gör
   B) Bölgesel kayma — bir bölgede parti transferi varsay [SONRA]
   C) Katılım senaryosu — katılım düşerse hangi parti etkilenir [SONRA]
   
   Veri:
     data/aggregates/parti_iller.json
     data/aggregates/parti_ilceler.json
     data/aggregates/meta_iller.json
     data/core/geo.json
     data/core/turkiye_iller.geojson
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  // ═══════════════════════════════════════════════════════════════
  // ORTAK YARDIMCILAR (app.js'ten)
  // ═══════════════════════════════════════════════════════════════
  const fmt = window.AT.fmt;

  // ═══════════════════════════════════════════════════════════════
  // ÖNBELLEK
  // ═══════════════════════════════════════════════════════════════
  const cache = {
    parti_iller: null,
    parti_ilceler: null,
    meta_iller: null,
    geo: null,
    geojson: null,
  };

  // ═══════════════════════════════════════════════════════════════
  // DURUM
  // ═══════════════════════════════════════════════════════════════
  const state = {
    sekme: 'A',
    A: {
      taban_secim: '2023_MV',
      kaymalar: {},  // parti_adi → pp değişim (örn. 'AK PARTİ': -5)
    },
    B: {
      taban_secim: '2023_MV',
      bolge: '',
      kaynak_parti: '',
      hedef_parti: '',
      transfer_pp: 0,
    },
    C: {
      taban_secim: '2023_MV',
      yeni_katilim: 88,
      parti_kayip_oranlari: {},  // parti_adi → % oranı (0-100)
    },
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
    'Erdoğan (CB)': '#a87308',
    'Kılıçdaroğlu (CB)': '#8c2715',
    'İnce (CB)': '#d97a4a',
    'Akşener (CB)': '#2b5d8c',
    'Demirtaş (CB)': '#6c2a6e',
    'Karamollaoğlu (CB)': '#0e466b',
    'Perinçek (CB)': '#555',
    'Oğan (CB)': '#5a5a5a',
    'DİĞER': '#888888',
  };

  // Bu modülde sadece saf parti tercihi olan seçimler
  const KULLANILABILIR_SECIMLER = ['2018_MV', '2023_MV', '2018_CB', '2023_CB1', '2023_CB2'];

  // ═══════════════════════════════════════════════════════════════
  // VERİ YÜKLEME
  // ═══════════════════════════════════════════════════════════════
  async function loadCoreData() {
    if (cache.parti_iller && cache.geo) return;

    const [pIller, pIlceler, mIller, geo, geojson] = await Promise.all([
      fetch('data/aggregates/parti_iller.json').then(r => r.ok ? r.json() : Promise.reject('parti_iller.json: ' + r.status)),
      fetch('data/aggregates/parti_ilceler.json').then(r => r.ok ? r.json() : Promise.reject('parti_ilceler.json: ' + r.status)),
      fetch('data/aggregates/meta_iller.json').then(r => r.ok ? r.json() : Promise.reject('meta_iller.json: ' + r.status)),
      fetch('data/core/geo.json').then(r => r.ok ? r.json() : Promise.reject('geo.json: ' + r.status)),
      fetch('data/core/turkiye_iller.geojson').then(r => r.ok ? r.json() : Promise.reject('turkiye_iller.geojson: ' + r.status)),
    ]);

    cache.parti_iller = pIller;
    cache.parti_ilceler = pIlceler;
    cache.meta_iller = mIller;
    cache.geo = geo;
    cache.geojson = geojson;
  }

  // ═══════════════════════════════════════════════════════════════
  // YARDIMCI: Parti oylarını normalize ederek topla
  // ═══════════════════════════════════════════════════════════════
  function normalizeOylar(kayit) {
    const norm = {};
    let toplam = 0;
    for (const [p, oy] of Object.entries(kayit)) {
      if (p === 'toplam' || p === 'il_sayisi') continue;
      if (!oy) continue;
      const n = PARTI_NORMALIZE[p] || p;
      norm[n] = (norm[n] || 0) + (oy || 0);
      toplam += (oy || 0);
    }
    return { partiler: norm, toplam };
  }

  /**
   * Türkiye geneli veya il bazında bir seçimin parti yüzdelerini döner.
   * Return: { 'AK PARTİ': 35.1, 'CHP': 25.3, ..., _toplam_oy: 52628178 }
   */
  function getTurkiyeYuzdeleri(secim) {
    const sec = cache.parti_iller.secimler[secim];
    if (!sec || !sec.iller) return null;

    const partiler = {};
    let toplamOy = 0;

    for (const ilVeri of Object.values(sec.iller)) {
      for (const [p, oy] of Object.entries(ilVeri)) {
        if (p === 'toplam' || p === 'il_sayisi') continue;
        if (!oy) continue;
        const n = PARTI_NORMALIZE[p] || p;
        partiler[n] = (partiler[n] || 0) + (oy || 0);
        toplamOy += (oy || 0);
      }
    }

    if (toplamOy === 0) return null;

    const yuzdeler = {};
    for (const [p, oy] of Object.entries(partiler)) {
      yuzdeler[p] = (oy / toplamOy) * 100;
    }
    yuzdeler._toplam_oy = toplamOy;
    return yuzdeler;
  }

  /**
   * İl bazında parti yüzdeleri.
   * Return: { 'İSTANBUL': { 'AK PARTİ': 36.7, 'CHP': 24.1, ..., _toplam: 7500000 }, ... }
   */
  function getIlYuzdeleri(secim) {
    const sec = cache.parti_iller.secimler[secim];
    if (!sec || !sec.iller) return null;

    const sonuc = {};
    for (const [ilAdi, kayit] of Object.entries(sec.iller)) {
      const { partiler, toplam } = normalizeOylar(kayit);
      if (toplam === 0) continue;
      const yzd = {};
      for (const [p, oy] of Object.entries(partiler)) {
        yzd[p] = (oy / toplam) * 100;
      }
      yzd._toplam = toplam;
      sonuc[ilAdi] = yzd;
    }
    return sonuc;
  }

  // ═══════════════════════════════════════════════════════════════
  // ANA FONKSIYON
  // ═══════════════════════════════════════════════════════════════
  window.Modules.senaryo = async function(container, ctx) {
    container.innerHTML = `<div class="loading">Senaryo verisi yükleniyor</div>`;

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
        <span class="eyebrow">Modül · 06</span>
        <h1>Senaryo modelleri</h1>
        <p class="lede">Veri yüklenemedi: ${e}</p>
      </header>
      <div class="panel">
        <p style="color:var(--ink-2);">
          Bu modül için <span class="mono">parti_iller.json</span>, <span class="mono">parti_ilceler.json</span>,
          <span class="mono">meta_iller.json</span>, <span class="mono">geo.json</span>,
          <span class="mono">turkiye_iller.geojson</span> dosyaları gerekli.
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
        <span class="eyebrow">Modül · 06 · Tarafsız varsayım aracı · 3 perspektif</span>
        <h1>Senaryo modelleri</h1>
        <p class="lede">
          Mevcut seçim verisi üzerinde <strong>kendi varsayımlarınızı</strong> deneyin. Sonuçlar
          anında hesaplanır ve harita üzerinde gösterilir.
        </p>
      </header>

      <!-- KRİTİK UYARI -->
      <div class="senaryo-uyari-kritik">
        <div class="senaryo-uyari-baslik">⚠️ Bu bir tahmin değildir</div>
        <p>
          Bu modül <strong>kullanıcı varsayımlarının</strong> görselleştirilmesidir.
          "Bu parti şu kadar oy alır" anlamı taşımaz. Bilimsel anket değil,
          <strong>"eğer şöyle olursa, sonuç böyle olur"</strong> tipi bir senaryo aracıdır.
          Geleceğe dair hiçbir iddia içermez.
        </p>
      </div>

      <div class="senaryo-sekmeler">
        <button class="senaryo-sekme" data-sekme="A">
          <span class="sekme-num">A</span>
          <span class="sekme-baslik">Sürgü modeli</span>
          <span class="sekme-sub">Türkiye genelinde puan değişimi</span>
        </button>
        <button class="senaryo-sekme" data-sekme="B">
          <span class="sekme-num">B</span>
          <span class="sekme-baslik">Bölgesel kayma</span>
          <span class="sekme-sub">Sadece bir bölgede transfer</span>
        </button>
        <button class="senaryo-sekme" data-sekme="C">
          <span class="sekme-num">C</span>
          <span class="sekme-baslik">Katılım senaryosu</span>
          <span class="sekme-sub">Katılım düşerse ne olur?</span>
        </button>
      </div>

      <div id="senaryo-icerik"></div>

      ${renderStiller()}
    `;

    container.querySelectorAll('.senaryo-sekme').forEach(btn => {
      btn.addEventListener('click', () => {
        state.sekme = btn.dataset.sekme;
        renderAktifSekme(container);
      });
    });

    renderAktifSekme(container);
  }

  function renderAktifSekme(container) {
    container.querySelectorAll('.senaryo-sekme').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.sekme === state.sekme);
    });

    const icerikEl = container.querySelector('#senaryo-icerik');
    if (state.sekme === 'A') renderSekmeA(container, icerikEl);
    else if (state.sekme === 'B') renderSekmeB(container, icerikEl);
    else if (state.sekme === 'C') renderSekmeC(container, icerikEl);
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME A — SÜRGÜ MODELİ
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeA(container, icerikEl) {
    const s = state.A;

    // Taban verisini al
    const tabanYzd = getTurkiyeYuzdeleri(s.taban_secim);
    if (!tabanYzd) {
      icerikEl.innerHTML = '<div class="panel"><p>Seçim verisi yok</p></div>';
      return;
    }

    // ≥%1 partileri al, sürgüler için
    const partilerSirali = Object.entries(tabanYzd)
      .filter(([p, y]) => p !== '_toplam_oy' && y >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);

    const secimOpts = KULLANILABILIR_SECIMLER.map(k =>
      `<option value="${k}" ${k === s.taban_secim ? 'selected' : ''}>${k.replace('_', ' · ')}</option>`
    ).join('');

    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          <strong>Sürgü modeli:</strong> Türkiye genelinde her partinin oy oranına ekle/çıkar.
          Aynı miktar her ilde uygulanır (uniform). Yeni harita ve sonuç tablosu otomatik
          hesaplanır.
        </p>
      </div>

      <div class="panel" style="margin-bottom: var(--space-5);">
        <div class="panel-title">Taban seçim</div>
        <div class="senaryo-filtre">
          <select id="senA-taban" class="senaryo-select">${secimOpts}</select>
          <button class="senaryo-sifirla" id="senA-sifirla">Sürgüleri sıfırla</button>
        </div>
      </div>

      <div class="senaryo-iki-sutun">
        <div class="panel">
          <div class="panel-title">Sürgüler (yüzde puanı değişim)</div>
          <div id="senA-surgu-liste"></div>
          <div id="senA-toplam-kontrol"></div>
        </div>

        <div class="panel">
          <div class="panel-title">Sonuç tablosu</div>
          <div id="senA-sonuc-tablo"></div>
        </div>
      </div>

      <div class="section-head">
        <h2>Senaryo haritası — kim önde?</h2>
        <span class="eyebrow">Her ilde en çok oy alan parti</span>
      </div>
      <div class="panel" id="senA-harita-panel" style="padding: var(--space-4); position: relative;">
        <div id="senA-harita"></div>
        <div id="senA-tooltip" class="senaryo-tooltip" style="display: none;"></div>
        <div class="senaryo-lejant" id="senA-lejant"></div>
      </div>

      <div class="panel panel-muted">
        <p style="font-size: 13px; color: var(--ink-3); line-height: 1.6; margin: 0;">
          <strong>Nasıl çalışıyor?</strong> Sürgülerle Türkiye genelinde her partiye
          eklediğin/çıkardığın puan, <strong>her ilçeye aynen uygulanır</strong>. Yani AKP'yi -5 yaparsan,
          81 il de AKP'nin oyundan 5pp düşülür. Bu basit bir varsayım; gerçek seçimde
          bölgesel davranış farklı olur.
        </p>
      </div>
    `;

    // Olaylar
    icerikEl.querySelector('#senA-taban').addEventListener('change', e => {
      s.taban_secim = e.target.value;
      s.kaymalar = {};
      renderSekmeA(container, icerikEl);
    });
    icerikEl.querySelector('#senA-sifirla').addEventListener('click', () => {
      s.kaymalar = {};
      renderSekmeAIcerik(icerikEl, tabanYzd, partilerSirali);
    });

    renderSekmeAIcerik(icerikEl, tabanYzd, partilerSirali);
  }

  function renderSekmeAIcerik(icerikEl, tabanYzd, partilerSirali) {
    renderSurguListesi(icerikEl, tabanYzd, partilerSirali);
    renderSonucTablosu(icerikEl, tabanYzd, partilerSirali);
    renderSekmeAHarita(icerikEl, tabanYzd);
  }

  function renderSurguListesi(icerikEl, tabanYzd, partilerSirali) {
    const el = icerikEl.querySelector('#senA-surgu-liste');
    if (!el) return;
    const s = state.A;
    const fmt = window.AT.fmt;

    const satirlar = partilerSirali.map(p => {
      const tabanYzd_p = tabanYzd[p] || 0;
      const kayma = s.kaymalar[p] || 0;
      const yeniYzd = Math.max(0, tabanYzd_p + kayma);
      const renk = PARTI_RENK[p] || '#888';
      const kaymaIsaret = kayma > 0 ? '+' : '';
      const kaymaRenk = kayma > 0 ? 'var(--signal-green)' : (kayma < 0 ? 'var(--signal-red)' : 'var(--ink-3)');

      return `
        <div class="surgu-row">
          <div class="surgu-parti">
            <span class="surgu-nokta" style="background:${renk};"></span>
            <span>${escapeHtml(p)}</span>
          </div>
          <div class="surgu-kontrol">
            <div class="surgu-rakamlar">
              <span class="surgu-taban">%${fmt.n1(tabanYzd_p)}</span>
              <span class="surgu-ok">→</span>
              <span class="surgu-yeni">%${fmt.n1(yeniYzd)}</span>
              <span class="surgu-kayma" style="color:${kaymaRenk};">
                ${kaymaIsaret}${fmt.n1(kayma)} pp
              </span>
            </div>
            <input type="range" min="-15" max="15" step="0.5" value="${kayma}"
                   data-parti="${escapeHtml(p)}" class="surgu-input">
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = satirlar;

    // Slider olayları
    el.querySelectorAll('.surgu-input').forEach(inp => {
      inp.addEventListener('input', e => {
        const parti = e.target.dataset.parti;
        const val = parseFloat(e.target.value);
        if (val === 0) {
          delete s.kaymalar[parti];
        } else {
          s.kaymalar[parti] = val;
        }
        renderSurguListesi(icerikEl, tabanYzd, partilerSirali);
        renderSonucTablosu(icerikEl, tabanYzd, partilerSirali);
        renderSekmeAHarita(icerikEl, tabanYzd);
      });
    });

    // Toplam kontrolü
    renderToplamKontrol(icerikEl, partilerSirali);
  }

  function renderToplamKontrol(icerikEl, partilerSirali) {
    const el = icerikEl.querySelector('#senA-toplam-kontrol');
    if (!el) return;
    const s = state.A;

    let toplamKayma = 0;
    for (const p of Object.keys(s.kaymalar)) {
      toplamKayma += s.kaymalar[p];
    }

    let mesaj, klass;
    if (Math.abs(toplamKayma) < 0.1) {
      mesaj = '✓ Toplam değişim dengeli (0 pp)';
      klass = 'dengeli';
    } else if (toplamKayma > 0) {
      mesaj = `⚠ Toplam değişim +${toplamKayma.toFixed(1)} pp — varsayımınız %100'ü aşıyor`;
      klass = 'pozitif';
    } else {
      mesaj = `⚠ Toplam değişim ${toplamKayma.toFixed(1)} pp — varsayımınız %100'ün altında`;
      klass = 'negatif';
    }

    el.innerHTML = `
      <div class="senaryo-toplam-kontrol ${klass}">
        ${mesaj}
        ${Math.abs(toplamKayma) > 0.1 ? '<div class="senaryo-toplam-not">Toplam %100\'e yakın olması mantıklı bir senaryodur. "Diğer" kategorisine sürgü uygulanmadığı için dengesizlik kalabilir.</div>' : ''}
      </div>
    `;
  }

  function renderSonucTablosu(icerikEl, tabanYzd, partilerSirali) {
    const el = icerikEl.querySelector('#senA-sonuc-tablo');
    if (!el) return;
    const s = state.A;
    const fmt = window.AT.fmt;

    // Sıralı satırlar (yeni yüzdeye göre)
    const satirlar = partilerSirali.map(p => ({
      parti: p,
      tabanYzd: tabanYzd[p] || 0,
      kayma: s.kaymalar[p] || 0,
      yeniYzd: Math.max(0, (tabanYzd[p] || 0) + (s.kaymalar[p] || 0)),
    })).sort((a, b) => b.yeniYzd - a.yeniYzd);

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">Parti</th>
            <th style="text-align:right;">Taban</th>
            <th style="text-align:right;">Yeni</th>
            <th style="text-align:right;">Fark</th>
          </tr>
        </thead>
        <tbody>
          ${satirlar.map(s_ => {
            const renk = s_.kayma > 0 ? 'var(--signal-green)' : (s_.kayma < 0 ? 'var(--signal-red)' : 'var(--ink-3)');
            const isaret = s_.kayma > 0 ? '+' : '';
            return `
              <tr>
                <td>
                  <div style="display:flex; align-items:center; gap:var(--space-2);">
                    <span style="width:10px;height:10px;background:${PARTI_RENK[s_.parti] || '#888'};border-radius:2px;"></span>
                    <span style="font-weight:500;">${escapeHtml(s_.parti)}</span>
                  </div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n1(s_.tabanYzd)}%</td>
                <td class="num" style="text-align:right; font-weight:600;">${fmt.n1(s_.yeniYzd)}%</td>
                <td class="num" style="text-align:right; color:${renk}; font-weight:600;">
                  ${Math.abs(s_.kayma) < 0.05 ? '—' : isaret + fmt.n1(s_.kayma) + ' pp'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  /**
   * Senaryo haritası: her ilde "yeni" yüzdelere göre kim önde?
   * Mantık: ilçenin tabanYzd'sine uniform kayma ekle, yeni partilerden en yüksek olan ilin kazananı olur.
   */
  function renderSekmeAHarita(icerikEl, tabanYzd) {
    const s = state.A;
    const ilYzdeleri = getIlYuzdeleri(s.taban_secim);
    if (!ilYzdeleri) return;

    // Her il için "kazanan partiyi" hesapla
    const il_data = {};
    for (const [ilAdi, yzdMap] of Object.entries(ilYzdeleri)) {
      // Yeni yüzdeler: her partiye kayma uygulanır (sadece veride olan partiler)
      const yeni = {};
      for (const [p, yzd] of Object.entries(yzdMap)) {
        if (p === '_toplam') continue;
        const kayma = s.kaymalar[p] || 0;
        yeni[p] = Math.max(0, yzd + kayma);
      }
      // En yüksek olan parti
      let max = -1, kazanan = null;
      for (const [p, y] of Object.entries(yeni)) {
        if (y > max) { max = y; kazanan = p; }
      }
      if (kazanan) {
        il_data[ilAdi] = { kazanan, yuzde: max, tum: yeni };
      }
    }

    // Harita çizimi
    cizSenaryoHarita(icerikEl, 'senA-harita', 'senA-tooltip', 'senA-harita-panel', 'senA-lejant', il_data);
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME B — BÖLGESEL KAYMA
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeB(container, icerikEl) {
    const s = state.B;

    // Taban Türkiye yüzdelerini al (parti listesi için)
    const tabanYzd = getTurkiyeYuzdeleri(s.taban_secim);
    if (!tabanYzd) {
      icerikEl.innerHTML = '<div class="panel"><p>Seçim verisi yok</p></div>';
      return;
    }

    // ≥%1 partileri al
    const partilerSirali = Object.entries(tabanYzd)
      .filter(([p, y]) => p !== '_toplam_oy' && y >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);

    // Varsayılan kaynak/hedef parti
    if (!s.kaynak_parti && partilerSirali.length > 0) s.kaynak_parti = partilerSirali[0];
    if (!s.hedef_parti && partilerSirali.length > 1) s.hedef_parti = partilerSirali[1];
    if (!s.bolge) s.bolge = Object.keys(cache.geo.nuts1)[0];

    const secimOpts = KULLANILABILIR_SECIMLER.map(k =>
      `<option value="${k}" ${k === s.taban_secim ? 'selected' : ''}>${k.replace('_', ' · ')}</option>`
    ).join('');

    const bolgeOpts = Object.entries(cache.geo.nuts1).map(([k, info]) =>
      `<option value="${k}" ${k === s.bolge ? 'selected' : ''}>${k} · ${info.ad}</option>`
    ).join('');

    const kaynakOpts = partilerSirali.map(p =>
      `<option value="${p}" ${p === s.kaynak_parti ? 'selected' : ''}>${escapeHtml(p)}</option>`
    ).join('');

    const hedefOpts = partilerSirali.map(p =>
      `<option value="${p}" ${p === s.hedef_parti ? 'selected' : ''}>${escapeHtml(p)}</option>`
    ).join('');

    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          <strong>Bölgesel kayma:</strong> Sadece bir bölgede iki parti arası oy transferi varsayın.
          Diğer bölgeler değişmez. Türkiye genelinin nasıl etkilendiği otomatik hesaplanır.
        </p>
      </div>

      <div class="panel" style="margin-bottom: var(--space-5);">
        <div class="panel-title">Senaryo ayarları</div>
        <div class="senaryo-filtre" style="margin-bottom: var(--space-3);">
          <label class="senaryo-filtre-grup">
            <span class="senaryo-filtre-lbl">Taban seçim</span>
            <select id="senB-taban" class="senaryo-select">${secimOpts}</select>
          </label>
          <label class="senaryo-filtre-grup">
            <span class="senaryo-filtre-lbl">Bölge (NUTS-1)</span>
            <select id="senB-bolge" class="senaryo-select" style="min-width: 240px;">${bolgeOpts}</select>
          </label>
        </div>
        <div class="senaryo-filtre">
          <label class="senaryo-filtre-grup">
            <span class="senaryo-filtre-lbl">Kaynak parti (oyu azalan)</span>
            <select id="senB-kaynak" class="senaryo-select">${kaynakOpts}</select>
          </label>
          <label class="senaryo-filtre-grup">
            <span class="senaryo-filtre-lbl">Hedef parti (oyu artan)</span>
            <select id="senB-hedef" class="senaryo-select">${hedefOpts}</select>
          </label>
        </div>
        <div class="senaryo-transfer-kontrol">
          <div class="senaryo-transfer-baslik">
            Transfer miktarı: <strong id="senB-transfer-deger">${s.transfer_pp.toFixed(1)} pp</strong>
          </div>
          <input type="range" min="0" max="20" step="0.5" value="${s.transfer_pp}" id="senB-transfer" class="senaryo-transfer-input">
          <div class="senaryo-transfer-aciklama">
            "${escapeHtml(cache.geo.nuts1[s.bolge]?.ad || s.bolge)}" bölgesinde
            <strong style="color:${PARTI_RENK[s.kaynak_parti] || '#888'};">${escapeHtml(s.kaynak_parti)}</strong>'dan
            <strong style="color:${PARTI_RENK[s.hedef_parti] || '#888'};">${escapeHtml(s.hedef_parti)}</strong>'a
            <strong>%${s.transfer_pp.toFixed(1)}</strong> oy transfer oluyor.
          </div>
        </div>
      </div>

      <div class="senaryo-iki-sutun">
        <div class="panel">
          <div class="panel-title">Bölgesel etki — ${escapeHtml(cache.geo.nuts1[s.bolge]?.ad || s.bolge)}</div>
          <div id="senB-bolge-tablo"></div>
        </div>

        <div class="panel">
          <div class="panel-title">Türkiye geneli etkisi</div>
          <div id="senB-turkiye-tablo"></div>
        </div>
      </div>

      <div class="section-head">
        <h2>Senaryo haritası — kim önde?</h2>
        <span class="eyebrow">Her ilde en çok oy alan parti (transfer sonrası)</span>
      </div>
      <div class="panel" id="senB-harita-panel" style="padding: var(--space-4); position: relative;">
        <div id="senB-harita"></div>
        <div id="senB-tooltip" class="senaryo-tooltip" style="display: none;"></div>
        <div class="senaryo-lejant" id="senB-lejant"></div>
      </div>

      <div class="panel panel-muted">
        <p style="font-size: 13px; color: var(--ink-3); line-height: 1.6; margin: 0;">
          <strong>Nasıl çalışıyor?</strong> Sadece seçili bölgenin <strong>ilçelerinde</strong>
          kaynak partiden hedef partiye oy transferi uygulanır. Diğer bölgelerin oyları olduğu
          gibi kalır. Türkiye geneli etkisi bölgenin nüfus ağırlığıyla orantılıdır.
        </p>
      </div>
    `;

    // Olaylar
    icerikEl.querySelector('#senB-taban').addEventListener('change', e => {
      s.taban_secim = e.target.value;
      s.kaynak_parti = '';
      s.hedef_parti = '';
      renderSekmeB(container, icerikEl);
    });
    icerikEl.querySelector('#senB-bolge').addEventListener('change', e => {
      s.bolge = e.target.value;
      renderSekmeB(container, icerikEl);
    });
    icerikEl.querySelector('#senB-kaynak').addEventListener('change', e => {
      s.kaynak_parti = e.target.value;
      renderSekmeB(container, icerikEl);
    });
    icerikEl.querySelector('#senB-hedef').addEventListener('change', e => {
      s.hedef_parti = e.target.value;
      renderSekmeB(container, icerikEl);
    });
    icerikEl.querySelector('#senB-transfer').addEventListener('input', e => {
      s.transfer_pp = parseFloat(e.target.value);
      icerikEl.querySelector('#senB-transfer-deger').textContent = s.transfer_pp.toFixed(1) + ' pp';
      renderSekmeBIcerik(icerikEl);
    });

    renderSekmeBIcerik(icerikEl);
  }

  function renderSekmeBIcerik(icerikEl) {
    const s = state.B;
    const fmt = window.AT.fmt;

    // Her ilin bağlı olduğu NUTS-1'i geo'dan al
    const ilToNuts1 = {};
    for (const [ilAdi, info] of Object.entries(cache.geo.iller)) {
      if (info.nuts1) ilToNuts1[ilAdi] = info.nuts1;
    }

    // İl yüzdeleri (taban)
    const ilYzdeleri = getIlYuzdeleri(s.taban_secim);
    if (!ilYzdeleri) return;

    // Bölgesel transfer: sadece seçili bölgenin illerinde uygula
    const yeniIl = {};
    for (const [ilAdi, yzdMap] of Object.entries(ilYzdeleri)) {
      const yeni = {};
      for (const [p, y] of Object.entries(yzdMap)) {
        if (p === '_toplam') continue;
        yeni[p] = y;
      }
      // Eğer bu il seçili bölgedeyse, transfer uygula
      if (ilToNuts1[ilAdi] === s.bolge && s.transfer_pp > 0) {
        const mevcutKaynak = yeni[s.kaynak_parti] || 0;
        const cikar = Math.min(mevcutKaynak, s.transfer_pp);  // negatif olmasın
        yeni[s.kaynak_parti] = mevcutKaynak - cikar;
        yeni[s.hedef_parti] = (yeni[s.hedef_parti] || 0) + cikar;
      }
      yeni._toplam = yzdMap._toplam;
      yeniIl[ilAdi] = yeni;
    }

    // Bölgesel etki tablosu
    renderBolgeselEtki(icerikEl, ilYzdeleri, yeniIl, ilToNuts1);

    // Türkiye geneli etkisi
    renderTurkiyeEtkisi(icerikEl, ilYzdeleri, yeniIl);

    // Harita: her ilde kim önde
    const il_data = {};
    for (const [ilAdi, yzd] of Object.entries(yeniIl)) {
      let max = -1, kazanan = null;
      for (const [p, y] of Object.entries(yzd)) {
        if (p === '_toplam') continue;
        if (y > max) { max = y; kazanan = p; }
      }
      if (kazanan) il_data[ilAdi] = { kazanan, yuzde: max, tum: yzd };
    }
    cizSenaryoHarita(icerikEl, 'senB-harita', 'senB-tooltip', 'senB-harita-panel', 'senB-lejant', il_data);
  }

  function renderBolgeselEtki(icerikEl, ilYzdeleri, yeniIl, ilToNuts1) {
    const el = icerikEl.querySelector('#senB-bolge-tablo');
    if (!el) return;
    const fmt = window.AT.fmt;
    const s = state.B;

    // Bölgedeki illeri topla (taban ve yeni)
    let tabanTop = {}, yeniTop = {}, tabanT = 0, yeniT = 0;
    for (const [ilAdi, yzd] of Object.entries(ilYzdeleri)) {
      if (ilToNuts1[ilAdi] !== s.bolge) continue;
      const ilToplam = yzd._toplam || 0;
      tabanT += ilToplam;
      yeniT += yeniIl[ilAdi]?._toplam || ilToplam;
      for (const [p, y] of Object.entries(yzd)) {
        if (p === '_toplam') continue;
        tabanTop[p] = (tabanTop[p] || 0) + (y * ilToplam / 100);
      }
      const yeniYzd = yeniIl[ilAdi];
      for (const [p, y] of Object.entries(yeniYzd)) {
        if (p === '_toplam') continue;
        yeniTop[p] = (yeniTop[p] || 0) + (y * ilToplam / 100);
      }
    }

    // Toplam oydan yüzdeye dön
    const partilerSet = new Set([...Object.keys(tabanTop), ...Object.keys(yeniTop)]);
    const satirlar = [];
    for (const p of partilerSet) {
      const tabanYzd = tabanT > 0 ? (tabanTop[p] / tabanT) * 100 : 0;
      const yeniYzd = yeniT > 0 ? (yeniTop[p] / yeniT) * 100 : 0;
      if (tabanYzd < 0.5 && yeniYzd < 0.5) continue;
      satirlar.push({ parti: p, tabanYzd, yeniYzd, fark: yeniYzd - tabanYzd });
    }
    satirlar.sort((a, b) => b.yeniYzd - a.yeniYzd);

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">Parti</th>
            <th style="text-align:right;">Taban</th>
            <th style="text-align:right;">Yeni</th>
            <th style="text-align:right;">Fark</th>
          </tr>
        </thead>
        <tbody>
          ${satirlar.map(s_ => {
            const renk = Math.abs(s_.fark) < 0.05 ? 'var(--ink-3)' :
                         (s_.fark > 0 ? 'var(--signal-green)' : 'var(--signal-red)');
            const isaret = s_.fark > 0 ? '+' : '';
            return `
              <tr>
                <td>
                  <div style="display:flex; align-items:center; gap:var(--space-2);">
                    <span style="width:10px;height:10px;background:${PARTI_RENK[s_.parti] || '#888'};border-radius:2px;"></span>
                    <span style="font-weight:500;">${escapeHtml(s_.parti)}</span>
                  </div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n1(s_.tabanYzd)}%</td>
                <td class="num" style="text-align:right; font-weight:600;">${fmt.n1(s_.yeniYzd)}%</td>
                <td class="num" style="text-align:right; color:${renk}; font-weight:600;">
                  ${Math.abs(s_.fark) < 0.05 ? '—' : isaret + fmt.n1(s_.fark) + ' pp'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function renderTurkiyeEtkisi(icerikEl, ilYzdeleri, yeniIl) {
    const el = icerikEl.querySelector('#senB-turkiye-tablo');
    if (!el) return;
    const fmt = window.AT.fmt;

    // Türkiye geneli toplamlar
    let tabanTop = {}, yeniTop = {}, tabanT = 0, yeniT = 0;
    for (const [ilAdi, yzd] of Object.entries(ilYzdeleri)) {
      const ilToplam = yzd._toplam || 0;
      tabanT += ilToplam;
      yeniT += yeniIl[ilAdi]?._toplam || ilToplam;
      for (const [p, y] of Object.entries(yzd)) {
        if (p === '_toplam') continue;
        tabanTop[p] = (tabanTop[p] || 0) + (y * ilToplam / 100);
      }
      const yeniYzd = yeniIl[ilAdi];
      for (const [p, y] of Object.entries(yeniYzd)) {
        if (p === '_toplam') continue;
        yeniTop[p] = (yeniTop[p] || 0) + (y * ilToplam / 100);
      }
    }

    const partilerSet = new Set([...Object.keys(tabanTop), ...Object.keys(yeniTop)]);
    const satirlar = [];
    for (const p of partilerSet) {
      const tabanYzd = tabanT > 0 ? (tabanTop[p] / tabanT) * 100 : 0;
      const yeniYzd = yeniT > 0 ? (yeniTop[p] / yeniT) * 100 : 0;
      if (tabanYzd < 0.5 && yeniYzd < 0.5) continue;
      satirlar.push({ parti: p, tabanYzd, yeniYzd, fark: yeniYzd - tabanYzd });
    }
    satirlar.sort((a, b) => b.yeniYzd - a.yeniYzd);

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">Parti</th>
            <th style="text-align:right;">Taban</th>
            <th style="text-align:right;">Yeni</th>
            <th style="text-align:right;">Fark</th>
          </tr>
        </thead>
        <tbody>
          ${satirlar.map(s_ => {
            const renk = Math.abs(s_.fark) < 0.05 ? 'var(--ink-3)' :
                         (s_.fark > 0 ? 'var(--signal-green)' : 'var(--signal-red)');
            const isaret = s_.fark > 0 ? '+' : '';
            return `
              <tr>
                <td>
                  <div style="display:flex; align-items:center; gap:var(--space-2);">
                    <span style="width:10px;height:10px;background:${PARTI_RENK[s_.parti] || '#888'};border-radius:2px;"></span>
                    <span style="font-weight:500;">${escapeHtml(s_.parti)}</span>
                  </div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n1(s_.tabanYzd)}%</td>
                <td class="num" style="text-align:right; font-weight:600;">${fmt.n1(s_.yeniYzd)}%</td>
                <td class="num" style="text-align:right; color:${renk}; font-weight:600;">
                  ${Math.abs(s_.fark) < 0.05 ? '—' : isaret + fmt.n1(s_.fark) + ' pp'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  // ═══════════════════════════════════════════════════════════════
  // SEKME C — KATILIM SENARYOSU
  // ═══════════════════════════════════════════════════════════════
  function renderSekmeC(container, icerikEl) {
    const s = state.C;

    // Mevcut katılımı hesapla
    const mevcutKatilim = mevcutKatilimOrani(s.taban_secim);
    if (mevcutKatilim === null) {
      icerikEl.innerHTML = '<div class="panel"><p>Seçim verisi yok</p></div>';
      return;
    }

    // Varsayılan: mevcut katılımdan biraz aşağı
    if (s.yeni_katilim === 88 || s.yeni_katilim > mevcutKatilim) {
      s.yeni_katilim = Math.max(70, Math.round(mevcutKatilim - 5));
    }

    const tabanYzd = getTurkiyeYuzdeleri(s.taban_secim);
    if (!tabanYzd) return;

    // ≥%1 partileri al
    const partilerSirali = Object.entries(tabanYzd)
      .filter(([p, y]) => p !== '_toplam_oy' && y >= 1)
      .sort((a, b) => b[1] - a[1])
      .map(([p]) => p);

    // Varsayılan kayıp oranları: her partiye eşit (mevcut katılım - yeni katılım) / mevcut katılım
    // Yani katılım %88'den %82'ye düşerse, her parti seçmeni %6.8 kaybeder (varsayım: hepsi eşit etkilenir)
    const baselineKayip = mevcutKatilim > 0 ? ((mevcutKatilim - s.yeni_katilim) / mevcutKatilim) * 100 : 0;

    const secimOpts = KULLANILABILIR_SECIMLER.map(k =>
      `<option value="${k}" ${k === s.taban_secim ? 'selected' : ''}>${k.replace('_', ' · ')}</option>`
    ).join('');

    icerikEl.innerHTML = `
      <div class="panel" style="margin-bottom: var(--space-5);">
        <p class="lede" style="font-size: 15px; margin: 0;">
          <strong>Katılım senaryosu:</strong> Katılım oranı düşerse, hangi partinin seçmeni
          sandığa gelmez? Her parti için <strong>kayıp oranı</strong> belirleyin, yeni sonuçlar
          otomatik hesaplanır.
        </p>
      </div>

      <div class="panel" style="margin-bottom: var(--space-5);">
        <div class="panel-title">Senaryo ayarları</div>
        <div class="senaryo-filtre" style="margin-bottom: var(--space-3);">
          <label class="senaryo-filtre-grup">
            <span class="senaryo-filtre-lbl">Taban seçim</span>
            <select id="senC-taban" class="senaryo-select">${secimOpts}</select>
          </label>
          <div class="senaryo-katilim-bilgi">
            <div>Mevcut katılım: <strong>%${mevcutKatilim.toFixed(1)}</strong></div>
            <div style="margin-top: 4px;">Yeni katılım: <strong id="senC-yeni-katilim">%${s.yeni_katilim.toFixed(0)}</strong>
              <span style="color:var(--ink-3); margin-left: 6px;">(varsayılan kayıp: %${baselineKayip.toFixed(1)})</span>
            </div>
          </div>
        </div>
        <input type="range" min="50" max="${Math.round(mevcutKatilim)}" step="1" value="${s.yeni_katilim}" id="senC-katilim-slider" class="senaryo-transfer-input">
        <button class="senaryo-sifirla" id="senC-sifirla" style="margin-top: var(--space-3);">Kayıp oranlarını eşitle</button>
      </div>

      <div class="senaryo-iki-sutun">
        <div class="panel">
          <div class="panel-title">Parti kayıp oranları</div>
          <p style="font-size: 12px; color: var(--ink-3); margin-bottom: var(--space-3);">
            Her sürgü o partinin seçmenlerinin <strong>sandığa gelmeyen yüzdesi</strong>dir.
            Örnek: %30 → o partinin oyları %30 azalır.
          </p>
          <div id="senC-kayip-liste"></div>
        </div>

        <div class="panel">
          <div class="panel-title">Yeni Türkiye sonuçları</div>
          <div id="senC-sonuc-tablo"></div>
        </div>
      </div>

      <div class="section-head">
        <h2>Senaryo haritası — kim önde?</h2>
        <span class="eyebrow">Düşük katılım senaryosunda her ilde önde olan parti</span>
      </div>
      <div class="panel" id="senC-harita-panel" style="padding: var(--space-4); position: relative;">
        <div id="senC-harita"></div>
        <div id="senC-tooltip" class="senaryo-tooltip" style="display: none;"></div>
        <div class="senaryo-lejant" id="senC-lejant"></div>
      </div>

      <div class="panel panel-muted">
        <p style="font-size: 13px; color: var(--ink-3); line-height: 1.6; margin: 0;">
          <strong>Nasıl çalışıyor?</strong> Her partinin tabandan seçmen kaybı oranı,
          tüm illerde aynı uygulanır. Sonuçta her partinin <strong>oranı yeniden hesaplanır</strong>
          (kalan oylar toplam içinde yeniden paylaşılır). Bu basit bir varsayımdır; gerçek
          seçimde bölgesel davranış farklı olur.
        </p>
      </div>
    `;

    // Olaylar
    icerikEl.querySelector('#senC-taban').addEventListener('change', e => {
      s.taban_secim = e.target.value;
      s.parti_kayip_oranlari = {};
      s.yeni_katilim = 88;  // yenidən başlat
      renderSekmeC(container, icerikEl);
    });

    icerikEl.querySelector('#senC-katilim-slider').addEventListener('input', e => {
      s.yeni_katilim = parseFloat(e.target.value);
      icerikEl.querySelector('#senC-yeni-katilim').textContent = '%' + s.yeni_katilim.toFixed(0);
      // Eşit kayıp: tüm partilere baseline ata
      const yeniBaseline = mevcutKatilim > 0 ? ((mevcutKatilim - s.yeni_katilim) / mevcutKatilim) * 100 : 0;
      for (const p of partilerSirali) {
        s.parti_kayip_oranlari[p] = yeniBaseline;
      }
      renderSekmeCIcerik(icerikEl, partilerSirali, mevcutKatilim);
    });

    icerikEl.querySelector('#senC-sifirla').addEventListener('click', () => {
      const baseline = mevcutKatilim > 0 ? ((mevcutKatilim - s.yeni_katilim) / mevcutKatilim) * 100 : 0;
      for (const p of partilerSirali) {
        s.parti_kayip_oranlari[p] = baseline;
      }
      renderSekmeCIcerik(icerikEl, partilerSirali, mevcutKatilim);
    });

    // İlk render — varsayılan eşit kayıp
    if (Object.keys(s.parti_kayip_oranlari).length === 0) {
      for (const p of partilerSirali) {
        s.parti_kayip_oranlari[p] = baselineKayip;
      }
    }

    renderSekmeCIcerik(icerikEl, partilerSirali, mevcutKatilim);
  }

  /**
   * Mevcut katılım oranını hesapla (oy_kullanan / kayitli)
   */
  function mevcutKatilimOrani(secim) {
    const metaSec = cache.meta_iller?.secimler?.[secim];
    if (!metaSec || !metaSec.iller) return null;
    let kayitli = 0, oy = 0;
    for (const m of Object.values(metaSec.iller)) {
      kayitli += m.kayitli_secmen || 0;
      oy += m.oy_kullanan_secmen || 0;
    }
    return kayitli > 0 ? (oy / kayitli) * 100 : null;
  }

  function renderSekmeCIcerik(icerikEl, partilerSirali, mevcutKatilim) {
    renderKayipListesi(icerikEl, partilerSirali);
    renderKatilimSonuc(icerikEl, partilerSirali);
    renderKatilimHarita(icerikEl, partilerSirali);
  }

  function renderKayipListesi(icerikEl, partilerSirali) {
    const el = icerikEl.querySelector('#senC-kayip-liste');
    if (!el) return;
    const s = state.C;
    const fmt = window.AT.fmt;

    const satirlar = partilerSirali.map(p => {
      const kayip = s.parti_kayip_oranlari[p] || 0;
      const renk = PARTI_RENK[p] || '#888';
      return `
        <div class="surgu-row">
          <div class="surgu-parti">
            <span class="surgu-nokta" style="background:${renk};"></span>
            <span>${escapeHtml(p)}</span>
          </div>
          <div class="surgu-kontrol">
            <div class="surgu-rakamlar">
              <span class="surgu-taban">Kayıp: <strong>%${fmt.n1(kayip)}</strong></span>
              <span style="color:var(--ink-3); margin-left: auto;">
                ${kayip < 5 ? 'Az etkileniyor' : (kayip < 20 ? 'Orta düzey' : 'Çok etkileniyor')}
              </span>
            </div>
            <input type="range" min="0" max="60" step="1" value="${kayip}"
                   data-parti="${escapeHtml(p)}" class="senC-kayip-input">
          </div>
        </div>
      `;
    }).join('');

    el.innerHTML = satirlar;

    el.querySelectorAll('.senC-kayip-input').forEach(inp => {
      inp.addEventListener('input', e => {
        const parti = e.target.dataset.parti;
        const val = parseFloat(e.target.value);
        s.parti_kayip_oranlari[parti] = val;
        renderKayipListesi(icerikEl, partilerSirali);
        renderKatilimSonuc(icerikEl, partilerSirali);
        renderKatilimHarita(icerikEl, partilerSirali);
      });
    });
  }

  /**
   * Yeni Türkiye sonuçları:
   *   her partinin oyu = taban_oy × (1 - kayip%)
   *   yeniden yüzde hesapla
   */
  function hesaplaYeniYuzdeler(tabanYzdeler, kayipOranlari) {
    const yeniMutlak = {};
    let yeniToplam = 0;
    for (const [p, y] of Object.entries(tabanYzdeler)) {
      if (p === '_toplam_oy' || p === '_toplam') continue;
      const kayipYzd = kayipOranlari[p] || 0;
      const kalan = y * (1 - kayipYzd / 100);
      yeniMutlak[p] = kalan;
      yeniToplam += kalan;
    }
    const yeniYzd = {};
    for (const [p, m] of Object.entries(yeniMutlak)) {
      yeniYzd[p] = yeniToplam > 0 ? (m / yeniToplam) * 100 : 0;
    }
    return yeniYzd;
  }

  function renderKatilimSonuc(icerikEl, partilerSirali) {
    const el = icerikEl.querySelector('#senC-sonuc-tablo');
    if (!el) return;
    const s = state.C;
    const fmt = window.AT.fmt;
    const tabanYzd = getTurkiyeYuzdeleri(s.taban_secim);
    if (!tabanYzd) return;

    const yeni = hesaplaYeniYuzdeler(tabanYzd, s.parti_kayip_oranlari);

    const satirlar = partilerSirali.map(p => ({
      parti: p,
      tabanYzd: tabanYzd[p] || 0,
      yeniYzd: yeni[p] || 0,
    })).map(o => ({ ...o, fark: o.yeniYzd - o.tabanYzd }))
       .sort((a, b) => b.yeniYzd - a.yeniYzd);

    el.innerHTML = `
      <table class="data-table">
        <thead>
          <tr>
            <th style="text-align:left;">Parti</th>
            <th style="text-align:right;">Taban</th>
            <th style="text-align:right;">Yeni</th>
            <th style="text-align:right;">Fark</th>
          </tr>
        </thead>
        <tbody>
          ${satirlar.map(s_ => {
            const renk = Math.abs(s_.fark) < 0.05 ? 'var(--ink-3)' :
                         (s_.fark > 0 ? 'var(--signal-green)' : 'var(--signal-red)');
            const isaret = s_.fark > 0 ? '+' : '';
            return `
              <tr>
                <td>
                  <div style="display:flex; align-items:center; gap:var(--space-2);">
                    <span style="width:10px;height:10px;background:${PARTI_RENK[s_.parti] || '#888'};border-radius:2px;"></span>
                    <span style="font-weight:500;">${escapeHtml(s_.parti)}</span>
                  </div>
                </td>
                <td class="num" style="text-align:right;">${fmt.n1(s_.tabanYzd)}%</td>
                <td class="num" style="text-align:right; font-weight:600;">${fmt.n1(s_.yeniYzd)}%</td>
                <td class="num" style="text-align:right; color:${renk}; font-weight:600;">
                  ${Math.abs(s_.fark) < 0.05 ? '—' : isaret + fmt.n1(s_.fark) + ' pp'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    `;
  }

  function renderKatilimHarita(icerikEl, partilerSirali) {
    const s = state.C;
    const ilYzdeleri = getIlYuzdeleri(s.taban_secim);
    if (!ilYzdeleri) return;

    const il_data = {};
    for (const [ilAdi, yzdMap] of Object.entries(ilYzdeleri)) {
      const yeni = hesaplaYeniYuzdeler(yzdMap, s.parti_kayip_oranlari);
      let max = -1, kazanan = null;
      for (const [p, y] of Object.entries(yeni)) {
        if (y > max) { max = y; kazanan = p; }
      }
      if (kazanan) il_data[ilAdi] = { kazanan, yuzde: max, tum: yeni };
    }

    cizSenaryoHarita(icerikEl, 'senC-harita', 'senC-tooltip', 'senC-harita-panel', 'senC-lejant', il_data);
  }

  // ═══════════════════════════════════════════════════════════════
  // ORTAK HARİTA ÇİZİMİ
  // ═══════════════════════════════════════════════════════════════
  function cizSenaryoHarita(icerikEl, haritaId, tooltipId, panelId, lejantId, il_data) {
    const geojson = cache.geojson;
    const haritaEl = icerikEl.querySelector('#' + haritaId);
    const tooltipEl = icerikEl.querySelector('#' + tooltipId);
    const panelEl = icerikEl.querySelector('#' + panelId);
    const lejantEl = icerikEl.querySelector('#' + lejantId);

    if (!haritaEl) return;

    const fmt = window.AT.fmt;
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

    // Kazanan partilerden frekansı çıkar (lejant için)
    const partiFrekans = {};
    for (const d of Object.values(il_data)) {
      partiFrekans[d.kazanan] = (partiFrekans[d.kazanan] || 0) + 1;
    }
    const lejantPartiler = Object.entries(partiFrekans).sort((a, b) => b[1] - a[1]).map(([p]) => p);

    const paths = geojson.features.map(feat => {
      const il = feat.properties.geo_il_adi;
      const ozet = il_data[il];
      const veri_yok = !ozet;
      const renk = veri_yok ? 'var(--paper-3)' : (PARTI_RENK[ozet.kazanan] || '#888');
      const klass = `senaryo-il-path ${veri_yok ? 'veri-yok' : ''}`;
      const d = geometryToPath(feat.geometry);
      return `<path class="${klass}" d="${d}" fill="${renk}" data-il="${escapeHtml(il)}"></path>`;
    }).join('');

    haritaEl.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet">${paths}</svg>`;

    if (lejantEl) {
      lejantEl.innerHTML = lejantPartiler.map(p => `
        <span class="senaryo-lejant-item">
          <span class="senaryo-lejant-kutu" style="background:${PARTI_RENK[p] || '#888'}"></span>
          <span>${escapeHtml(p)} (${partiFrekans[p]} il)</span>
        </span>
      `).join('');
    }

    haritaEl.querySelectorAll('.senaryo-il-path').forEach(p => {
      const il = p.dataset.il;
      const ozet = il_data[il];

      p.addEventListener('mousemove', (e) => {
        if (!ozet) {
          tooltipEl.innerHTML = `<div class="tt-il">${escapeHtml(il)}</div><div class="tt-sub">Veri yok</div>`;
        } else {
          // İlk 4 partiyi göster
          const top4 = Object.entries(ozet.tum)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4);
          let liste = '';
          for (const [pr, y] of top4) {
            liste += `<div class="tt-parti">
              <span style="color:${PARTI_RENK[pr] || '#bbb'}">${escapeHtml(pr)}</span>: ${fmt.n1(y)}%
            </div>`;
          }
          tooltipEl.innerHTML = `<div class="tt-il">${escapeHtml(il)}</div>
                                 <div class="tt-deger" style="color:${PARTI_RENK[ozet.kazanan] || '#fff'}">
                                   Önde: ${escapeHtml(ozet.kazanan)} (%${fmt.n1(ozet.yuzde)})
                                 </div>
                                 ${liste}`;
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
        .senaryo-uyari-kritik {
          background: rgba(200, 134, 26, 0.08);
          border-left: 4px solid var(--signal-amber);
          border-radius: 0 var(--radius) var(--radius) 0;
          padding: var(--space-4) var(--space-5);
          margin-bottom: var(--space-6);
        }
        .senaryo-uyari-baslik {
          font-family: var(--font-display);
          font-size: 15px;
          font-weight: 600;
          color: var(--ink);
          margin-bottom: var(--space-2);
        }
        .senaryo-uyari-kritik p {
          font-size: 13.5px;
          line-height: 1.7;
          color: var(--ink-2);
          margin: 0;
        }

        .senaryo-sekmeler {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: var(--space-3);
          margin-bottom: var(--space-6);
        }
        .senaryo-sekme {
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
        .senaryo-sekme:hover { border-color: var(--brand-gold); transform: translateY(-1px); }
        .senaryo-sekme.active {
          border-color: var(--brand-gold);
          border-width: 2px;
          padding: calc(var(--space-4) - 1px) calc(var(--space-5) - 1px);
          background: var(--paper-2);
        }
        .senaryo-sekme .sekme-num {
          font-family: var(--font-display);
          font-size: 28px; font-weight: 500;
          color: var(--brand-gold); line-height: 1;
        }
        .senaryo-sekme .sekme-baslik {
          font-family: var(--font-display);
          font-size: 16px; font-weight: 600;
          color: var(--ink); margin-top: var(--space-2);
        }
        .senaryo-sekme .sekme-sub {
          font-size: 12px; color: var(--ink-3); margin-top: 2px;
        }

        .senaryo-iki-sutun {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: var(--space-4);
          margin-bottom: var(--space-5);
        }

        .senaryo-filtre {
          display: flex;
          gap: var(--space-3);
          align-items: center;
          flex-wrap: wrap;
        }
        .senaryo-filtre-grup {
          display: flex;
          flex-direction: column;
          gap: var(--space-1);
        }
        .senaryo-filtre-lbl {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.1em;
          color: var(--ink-3);
        }
        .senaryo-select {
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
        .senaryo-sifirla {
          font-family: var(--font-body);
          font-size: 12.5px;
          color: var(--ink-2);
          background: var(--paper);
          border: 1px solid var(--line);
          border-radius: var(--radius-sm);
          padding: var(--space-2) var(--space-3);
          cursor: pointer;
        }
        .senaryo-sifirla:hover {
          border-color: var(--brand-gold);
          color: var(--brand-gold);
        }

        /* Sekme B — Transfer slider */
        .senaryo-transfer-kontrol {
          margin-top: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--line-soft);
        }
        .senaryo-transfer-baslik {
          font-size: 13.5px;
          color: var(--ink-2);
          margin-bottom: var(--space-2);
        }
        .senaryo-transfer-input {
          width: 100%;
          accent-color: var(--brand-gold);
          cursor: pointer;
        }
        .senaryo-transfer-aciklama {
          font-size: 12.5px;
          color: var(--ink-3);
          margin-top: var(--space-2);
          line-height: 1.6;
        }

        /* Sekme C — Katılım bilgi kutusu */
        .senaryo-katilim-bilgi {
          font-size: 13px;
          color: var(--ink-2);
          line-height: 1.6;
          padding: var(--space-2) var(--space-3);
          background: rgba(200, 134, 26, 0.05);
          border-left: 3px solid var(--brand-gold);
          border-radius: 0 3px 3px 0;
          flex-grow: 1;
        }

        /* Sürgü satırı */
        .surgu-row {
          padding: var(--space-3) 0;
          border-bottom: 1px solid var(--line-soft);
        }
        .surgu-row:last-child { border-bottom: none; }
        .surgu-parti {
          display: flex;
          align-items: center;
          gap: var(--space-2);
          font-size: 13px;
          font-weight: 500;
          color: var(--ink-2);
          margin-bottom: 4px;
        }
        .surgu-nokta {
          width: 11px;
          height: 11px;
          border-radius: 2px;
        }
        .surgu-kontrol {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .surgu-rakamlar {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: var(--font-mono);
          font-size: 11.5px;
          color: var(--ink-3);
        }
        .surgu-taban {
          min-width: 50px;
        }
        .surgu-ok {
          color: var(--ink-4);
        }
        .surgu-yeni {
          font-weight: 600;
          color: var(--ink);
          min-width: 50px;
        }
        .surgu-kayma {
          margin-left: auto;
          font-weight: 600;
        }
        .surgu-input {
          width: 100%;
          accent-color: var(--brand-gold);
          cursor: pointer;
        }

        .senaryo-toplam-kontrol {
          margin-top: var(--space-3);
          padding: var(--space-3);
          border-radius: var(--radius-sm);
          font-size: 12.5px;
          font-weight: 500;
        }
        .senaryo-toplam-kontrol.dengeli {
          background: rgba(46, 125, 50, 0.08);
          color: var(--signal-green);
        }
        .senaryo-toplam-kontrol.pozitif,
        .senaryo-toplam-kontrol.negatif {
          background: rgba(200, 134, 26, 0.08);
          color: var(--ink-2);
        }
        .senaryo-toplam-not {
          margin-top: 4px;
          font-size: 11.5px;
          color: var(--ink-3);
          font-weight: 400;
        }

        /* Harita */
        #senA-harita, #senB-harita, #senC-harita {
          width: 100%;
          aspect-ratio: 5 / 3;
          max-height: 480px;
          overflow: hidden;
        }
        #senA-harita svg, #senB-harita svg, #senC-harita svg {
          width: 100%;
          height: 100%;
          display: block;
        }
        .senaryo-il-path {
          stroke: #fdfaf2;
          stroke-width: 0.5;
          cursor: pointer;
          transition: stroke-width 80ms ease;
        }
        .senaryo-il-path:hover {
          stroke: var(--ink);
          stroke-width: 1.5;
        }
        .senaryo-il-path.veri-yok {
          fill: var(--paper-3);
          opacity: 0.5;
          cursor: default;
        }
        .senaryo-tooltip {
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
          max-width: 260px;
        }
        .senaryo-tooltip .tt-il {
          font-family: var(--font-display);
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 2px;
        }
        .senaryo-tooltip .tt-deger {
          font-family: var(--font-mono);
          font-weight: 600;
          margin-bottom: 4px;
        }
        .senaryo-tooltip .tt-parti {
          font-size: 11px;
          line-height: 1.55;
        }
        .senaryo-tooltip .tt-sub {
          font-size: 11px;
          color: var(--paper-3);
          margin-top: 2px;
        }
        .senaryo-lejant {
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
        .senaryo-lejant-item {
          display: flex;
          align-items: center;
          gap: var(--space-2);
        }
        .senaryo-lejant-kutu {
          width: 14px;
          height: 14px;
          border-radius: 2px;
          border: 1px solid rgba(0,0,0,0.15);
        }

        .senaryo-yapim {
          padding: var(--space-5);
          text-align: center;
          background: rgba(200, 134, 26, 0.04);
          border-radius: var(--radius);
        }
        .senaryo-yapim-baslik {
          font-family: var(--font-display);
          font-size: 16px;
          font-weight: 600;
          color: var(--ink-2);
          margin-bottom: var(--space-2);
        }
        .senaryo-yapim p {
          font-size: 13px;
          color: var(--ink-3);
          line-height: 1.6;
        }

        @media (max-width: 900px) {
          .senaryo-iki-sutun {
            grid-template-columns: 1fr;
          }
        }
      </style>
    `;
  }
})();
