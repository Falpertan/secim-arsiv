/* ─────────────────────────────────────────────────────────
   Değişim haritası — il bazında choropleth (2018 → 2024)
   Veri: meta_iller, tr_demografi_ozet, parti_iller, turkiye_iller.geojson
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  const META_2018 = '2018_CB';
  const META_2024 = '2024_BM';

  const PARTI_CB_GRUP = {
    'RECEP TAYYİP ERDOĞAN': 'AK Parti',
    'KEMAL KILIÇDAROĞLU': 'CHP',
    'MUHARREM İNCE': 'CHP',
    'MERAL AKŞENER': 'İYİ Parti',
    'SELAHATTİN DEMİRTAŞ': 'HDP/DEM',
    'TEMEL KARAMOLLAOĞLU': 'Diğer',
    'DOĞU PERİNÇEK': 'Diğer',
    'SİNAN OĞAN': 'Diğer',
  };

  const PARTI_MV_NORM = {
    'AKP': 'AK Parti', 'AK PARTİ': 'AK Parti', 'AK Parti': 'AK Parti',
    'CHP': 'CHP',
    'MHP': 'MHP',
    'İYİ PARTİ': 'İYİ Parti', 'İYİ Parti': 'İYİ Parti',
    'HDP': 'HDP/DEM', 'DEM Parti': 'HDP/DEM', 'DEM PARTİ': 'HDP/DEM',
    'YEŞİL SOL PARTİ': 'HDP/DEM', 'YEŞİL SOL PARTI': 'HDP/DEM',
    'YSP': 'HDP/DEM',
  };

  const PARTI_SECENEKLER = ['AK Parti', 'CHP', 'MHP', 'İYİ Parti', 'HDP/DEM', 'Diğer'];

  const YAS_ORTA = {
    '18-24': 21, '25-34': 29.5, '35-44': 39.5,
    '45-54': 49.5, '55-64': 59.5, '65+': 72,
  };

  const cache = {
    meta: null,
    parti: null,
    demografi: null,
    geo: null,
    geojson: null,
  };

  const state = {
    metrik: 'secmen',
    partiCift: 'cb',
    parti: 'AK Parti',
    seciliIl: null,
  };

  const METRIKLER = {
    secmen: {
      label: 'Seçmen artışı (2018→2024)',
      birim: '%',
      aciklama: 'Kayıtlı seçmen sayısı yüzde değişimi (2018 CB → 2024 BM).',
    },
    katilim: {
      label: 'Katılım değişimi (2018→2024)',
      birim: 'pp',
      aciklama: 'Katılım oranı farkı, yüzde puan (2018 CB → 2024 BM).',
    },
    egitim: {
      label: 'Eğitim değişimi — üniversite oranı (2018→2024)',
      birim: 'pp',
      aciklama: '18+ nüfusta üniversite mezunu ve üstü oran farkı (TÜİK ADNKS).',
    },
    yas: {
      label: 'Yaş değişimi — ortalama yaş (2018→2024)',
      birim: 'yıl',
      aciklama: 'Yaş gruplarından türetilmiş ağırlıklı ortalama yaş farkı.',
    },
    parti: {
      label: 'Parti oy kayması',
      birim: 'pp',
      aciklama: 'Seçilen parti için il bazında oy oranı farkı.',
    },
  };

  // ─── Yardımcılar ───────────────────────────────────────────
  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function ilGoster(il) {
    if (!il) return '';
    return il.charAt(0) + il.slice(1).toLocaleLowerCase('tr-TR');
  }

  function parseHex(hex) {
    hex = hex.replace('#', '');
    return [
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16),
    ];
  }

  function mixColor(c1, c2, ratio) {
    const p1 = parseHex(c1);
    const p2 = parseHex(c2);
    const r = Math.round(p1[0] * ratio + p2[0] * (1 - ratio));
    const g = Math.round(p1[1] * ratio + p2[1] * (1 - ratio));
    const b = Math.round(p1[2] * ratio + p2[2] * (1 - ratio));
    return `rgb(${r}, ${g}, ${b})`;
  }

  function divergingColor(value, extent) {
    if (value == null || Number.isNaN(value)) return '#ebe5d6';
    const maxPos = extent.maxPos || 1;
    const maxNeg = extent.maxNeg || 1;
    const neutral = 0.06;
    if (Math.abs(value) < Math.max(extent.minAbs || 0.5, 0.001)) return '#f5f1e8';
    if (value > 0) {
      const t = Math.min(1, value / maxPos);
      return mixColor('#2d6b3f', '#f5f1e8', Math.max(t, neutral));
    }
    const t = Math.min(1, Math.abs(value) / maxNeg);
    return mixColor('#b8311a', '#f5f1e8', Math.max(t, neutral));
  }

  function fmtSigned(v, birim) {
    const fmt = window.AT.fmt;
    if (v == null || Number.isNaN(v)) return '—';
    const isaret = v > 0 ? '+' : '';
    if (birim === '%') return isaret + fmt.n1(v) + '%';
    if (birim === 'pp') return isaret + fmt.n1(v) + ' pp';
    if (birim === 'yıl') return isaret + fmt.n1(v) + ' yıl';
    return isaret + fmt.n1(v);
  }

  // ─── Veri yükleme ──────────────────────────────────────────
  async function loadCoreData() {
    if (cache.geojson) return;
    const [meta, parti, demografi, geo, geojson] = await Promise.all([
      fetch('data/aggregates/meta_iller.json').then(r => {
        if (!r.ok) throw new Error('meta_iller.json yüklenemedi');
        return r.json();
      }),
      fetch('data/aggregates/parti_iller.json').then(r => {
        if (!r.ok) throw new Error('parti_iller.json yüklenemedi');
        return r.json();
      }),
      fetch('data/aggregates/tr_demografi_ozet.json').then(r => {
        if (!r.ok) throw new Error('tr_demografi_ozet.json yüklenemedi');
        return r.json();
      }),
      fetch('data/core/geo.json').then(r => {
        if (!r.ok) throw new Error('geo.json yüklenemedi');
        return r.json();
      }),
      fetch('data/core/turkiye_iller.geojson').then(r => {
        if (!r.ok) throw new Error('turkiye_iller.geojson yüklenemedi');
        return r.json();
      }),
    ]);
    cache.meta = meta;
    cache.parti = parti;
    cache.demografi = demografi;
    cache.geo = geo;
    cache.geojson = geojson;
  }

  function getMetaIl(il, key) {
    return cache.meta?.secimler?.[key]?.iller?.[il] || null;
  }

  function ortalamaYas(demYil) {
    if (!demYil?.yas || !demYil.toplam_18plus) return null;
    let top = 0;
    let agir = 0;
    for (const [k, ort] of Object.entries(YAS_ORTA)) {
      const ad = demYil.yas[k]?.toplam || 0;
      top += ad * ort;
      agir += ad;
    }
    return agir > 0 ? top / agir : null;
  }

  function uniOrani(demYil) {
    if (!demYil?.egitim || !demYil.toplam_18plus) return null;
    const uni = demYil.egitim.universite_plus?.toplam || 0;
    return (uni / demYil.toplam_18plus) * 100;
  }

  function partiCiftKeys() {
    return state.partiCift === 'mv'
      ? { once: '2018_MV', son: '2023_MV' }
      : { once: '2018_CB', son: '2023_CB1' };
  }

  function grupOyOrani(il, ckey, grup) {
    const ilData = cache.parti?.secimler?.[ckey]?.iller?.[il];
    if (!ilData?.toplam) return null;
    const cbMod = ckey.includes('CB');
    let grupOy = 0;
    for (const [p, oy] of Object.entries(ilData)) {
      if (p === 'toplam' || p === 'il_sayisi') continue;
      let g;
      if (cbMod) {
        g = PARTI_CB_GRUP[p] || 'Diğer';
      } else {
        g = PARTI_MV_NORM[p] || PARTI_MV_NORM[p.toUpperCase()] || 'Diğer';
      }
      if (g === grup) grupOy += oy || 0;
    }
    return (grupOy / ilData.toplam) * 100;
  }

  function computeMetricValue(il) {
    const m = state.metrik;
    if (m === 'secmen') {
      const o = getMetaIl(il, META_2018)?.kayitli_secmen;
      const s = getMetaIl(il, META_2024)?.kayitli_secmen;
      if (!o || !s) return null;
      return ((s - o) / o) * 100;
    }
    if (m === 'katilim') {
      const o = getMetaIl(il, META_2018)?.katilim_orani;
      const s = getMetaIl(il, META_2024)?.katilim_orani;
      if (o == null || s == null) return null;
      return s - o;
    }
    if (m === 'egitim') {
      const dem = cache.demografi?.iller?.[il]?.yillar;
      const o = uniOrani(dem?.['2018']);
      const s = uniOrani(dem?.['2024']);
      if (o == null || s == null) return null;
      return s - o;
    }
    if (m === 'yas') {
      const dem = cache.demografi?.iller?.[il]?.yillar;
      const o = ortalamaYas(dem?.['2018']);
      const s = ortalamaYas(dem?.['2024']);
      if (o == null || s == null) return null;
      return s - o;
    }
    if (m === 'parti') {
      const { once, son } = partiCiftKeys();
      const o = grupOyOrani(il, once, state.parti);
      const s = grupOyOrani(il, son, state.parti);
      if (o == null || s == null) return null;
      return s - o;
    }
    return null;
  }

  function buildIlData() {
    const iller = Object.keys(cache.geo?.iller || {});
    const data = {};
    for (const il of iller) {
      const v = computeMetricValue(il);
      if (v != null && !Number.isNaN(v)) data[il] = v;
    }
    return data;
  }

  function computeExtent(ilData) {
    const vals = Object.values(ilData);
    if (!vals.length) return { maxPos: 1, maxNeg: 1, min: 0, max: 0 };
    const pos = vals.filter(v => v > 0);
    const neg = vals.filter(v => v < 0).map(v => Math.abs(v));
    return {
      maxPos: pos.length ? Math.max(...pos) : 1,
      maxNeg: neg.length ? Math.max(...neg) : 1,
      min: Math.min(...vals),
      max: Math.max(...vals),
    };
  }

  // ─── Harita çizimi ─────────────────────────────────────────
  function computeBbox(geojson) {
    let minx = Infinity, miny = Infinity, maxx = -Infinity, maxy = -Infinity;
    function visit(coords) {
      if (typeof coords[0] === 'number') {
        const [lng, lat] = coords;
        if (lng < minx) minx = lng;
        if (lat < miny) miny = lat;
        if (lng > maxx) maxx = lng;
        if (lat > maxy) maxy = lat;
      } else {
        for (const c of coords) visit(c);
      }
    }
    for (const f of geojson.features) visit(f.geometry.coordinates);
    return { minx, miny, maxx, maxy };
  }

  function cizHarita(container, ilData, extent) {
    const panel = container.querySelector('#harita-panel');
    const haritaEl = container.querySelector('#harita-svg-wrap');
    if (!haritaEl) return;

    const geojson = cache.geojson;
    const bbox = computeBbox(geojson);
    const padding = 12;
    const W = 900;
    const latMid = (bbox.miny + bbox.maxy) / 2;
    const cosLat = Math.cos((latMid * Math.PI) / 180);
    const H = Math.round(
      W * ((bbox.maxy - bbox.miny) / ((bbox.maxx - bbox.minx) * cosLat)) * 0.92
    );

    function project(lng, lat) {
      const x = ((lng - bbox.minx) / (bbox.maxx - bbox.minx)) * (W - 2 * padding) + padding;
      const y = H - (((lat - bbox.miny) / (bbox.maxy - bbox.miny)) * (H - 2 * padding) + padding);
      return [x, y];
    }

    function geometryToPath(geom) {
      let d = '';
      const polygons = geom.type === 'MultiPolygon' ? geom.coordinates
        : geom.type === 'Polygon' ? [geom.coordinates] : [];
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
      const val = ilData[il];
      const veriYok = val == null;
      const secili = state.seciliIl === il;
      const fill = veriYok ? '#ebe5d6' : divergingColor(val, extent);
      const d = geometryToPath(feat.geometry);
      return `<path class="harita-il-path${secili ? ' secili' : ''}${veriYok ? ' veri-yok' : ''}"
        d="${d}" fill="${fill}" data-il="${esc(il)}" stroke="${secili ? '#1a1814' : '#c8bfa8'}"
        stroke-width="${secili ? 1.8 : 0.6}"></path>`;
    }).join('');

    haritaEl.innerHTML =
      `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Türkiye il haritası">${paths}</svg>`;

    const tooltip = container.querySelector('#harita-tooltip');
    haritaEl.querySelectorAll('.harita-il-path').forEach(p => {
      const il = p.dataset.il;
      p.addEventListener('mousemove', e => {
        const v = ilData[il];
        const birim = METRIKLER[state.metrik].birim;
        tooltip.innerHTML = v == null
          ? `<strong>${esc(ilGoster(il))}</strong><br>Veri yok`
          : `<strong>${esc(ilGoster(il))}</strong><br>${fmtSigned(v, birim)}`;
        const rect = panel.getBoundingClientRect();
        tooltip.style.left = (e.clientX - rect.left + 12) + 'px';
        tooltip.style.top = (e.clientY - rect.top + 12) + 'px';
        tooltip.hidden = false;
      });
      p.addEventListener('mouseleave', () => { tooltip.hidden = true; });
      p.addEventListener('click', () => {
        state.seciliIl = state.seciliIl === il ? null : il;
        renderPopup(container);
        cizHarita(container, ilData, extent);
      });
    });
  }

  function renderLegend(container, extent) {
    const el = container.querySelector('#harita-lejant');
    if (!el) return;
    const birim = METRIKLER[state.metrik].birim;
    const fmt = window.AT.fmt;
    const stops = [
      { v: extent.min, renk: divergingColor(extent.min, extent) },
      { v: 0, renk: '#f5f1e8' },
      { v: extent.max, renk: divergingColor(extent.max, extent) },
    ];
    el.innerHTML = `
      <div class="harita-lejant-bar">
        <span style="background:${stops[0].renk}"></span>
        <span style="background:${stops[1].renk}"></span>
        <span style="background:${stops[2].renk}"></span>
      </div>
      <div class="harita-lejant-etiketler">
        <span>${fmtSigned(stops[0].v, birim)}</span>
        <span>0 = değişim yok</span>
        <span>${fmtSigned(stops[2].v, birim)}</span>
      </div>
      <span class="harita-lejant-not">Kırmızı: azalış · Yeşil: artış · Bej: nötr</span>
    `;
  }

  function renderPopup(container) {
    const el = container.querySelector('#harita-popup');
    if (!el) return;
    const il = state.seciliIl;
    if (!il) {
      el.hidden = true;
      el.innerHTML = '';
      return;
    }
    const fmt = window.AT.fmt;
    const m2018 = getMetaIl(il, META_2018);
    const m2024 = getMetaIl(il, META_2024);
    const dem = cache.demografi?.iller?.[il]?.yillar;
    const secmenO = m2018?.kayitli_secmen;
    const secmenS = m2024?.kayitli_secmen;
    const secmenPct = (secmenO && secmenS) ? ((secmenS - secmenO) / secmenO) * 100 : null;
    const katO = m2018?.katilim_orani;
    const katS = m2024?.katilim_orani;
    const katFark = (katO != null && katS != null) ? katS - katO : null;
    const nufus = dem?.['2024']?.toplam_18plus;
    const uni = uniOrani(dem?.['2024']);
    const yas = ortalamaYas(dem?.['2024']);

    el.hidden = false;
    el.innerHTML = `
      <button type="button" class="harita-popup-kapat" aria-label="Kapat">×</button>
      <h3 class="harita-popup-baslik">${esc(ilGoster(il))}</h3>
      <dl class="harita-popup-dl">
        <dt>Seçmen artışı</dt><dd>${fmtSigned(secmenPct, '%')}</dd>
        <dt>Katılım (2018)</dt><dd>${katO != null ? fmt.n1(katO) + '%' : '—'}</dd>
        <dt>Katılım (2024)</dt><dd>${katS != null ? fmt.n1(katS) + '%' : '—'}</dd>
        <dt>Katılım değişimi</dt><dd>${fmtSigned(katFark, 'pp')}</dd>
        <dt>18+ nüfus (2024)</dt><dd>${nufus != null ? fmt.n(nufus) : '—'}</dd>
        <dt>Üniversite oranı</dt><dd>${uni != null ? fmt.n1(uni) + '%' : '—'}</dd>
        <dt>Ortalama yaş</dt><dd>${yas != null ? fmt.n1(yas) : '—'}</dd>
      </dl>
      <a class="harita-popup-link" href="#/bolge">Bölge profilinde incele →</a>
    `;
    el.querySelector('.harita-popup-kapat').addEventListener('click', () => {
      state.seciliIl = null;
      renderPopup(container);
      refreshHarita(container);
    });
  }

  function refreshHarita(container) {
    const ilData = buildIlData();
    const extent = computeExtent(ilData);
    cizHarita(container, ilData, extent);
    renderLegend(container, extent);
  }

  function renderControls(container) {
    const partiExtra = state.metrik === 'parti';
    const el = container.querySelector('#harita-kontrol');
    if (!el) return;
    el.innerHTML = `
      <div class="harita-kontrol-grup">
        <span class="harita-kontrol-etiket">Metrik</span>
        <div class="harita-metrik-tabs">
          ${Object.entries(METRIKLER).map(([k, v]) =>
            `<label class="harita-metrik-tab">
              <input type="radio" name="harita-metrik" value="${k}" ${state.metrik === k ? 'checked' : ''}>
              <span>${esc(v.label)}</span>
            </label>`
          ).join('')}
        </div>
      </div>
      <div class="harita-kontrol-alt" ${partiExtra ? '' : 'hidden'}>
        <label class="harita-select-wrap">
          <span>Seçim çifti</span>
          <select id="harita-parti-cift">
            <option value="cb" ${state.partiCift === 'cb' ? 'selected' : ''}>2018 CB → 2023 CB 1. tur</option>
            <option value="mv" ${state.partiCift === 'mv' ? 'selected' : ''}>2018 MV → 2023 MV</option>
          </select>
        </label>
        <label class="harita-select-wrap">
          <span>Parti</span>
          <select id="harita-parti">
            ${PARTI_SECENEKLER.map(p =>
              `<option value="${esc(p)}" ${state.parti === p ? 'selected' : ''}>${esc(p)}</option>`
            ).join('')}
          </select>
        </label>
      </div>
      <p class="harita-metrik-aciklama">${esc(METRIKLER[state.metrik].aciklama)}</p>
    `;

    el.querySelectorAll('input[name="harita-metrik"]').forEach(inp => {
      inp.addEventListener('change', () => {
        state.metrik = inp.value;
        state.seciliIl = null;
        renderControls(container);
        renderPopup(container);
        refreshHarita(container);
      });
    });

    const ciftSel = el.querySelector('#harita-parti-cift');
    const partiSel = el.querySelector('#harita-parti');
    if (ciftSel) ciftSel.addEventListener('change', () => {
      state.partiCift = ciftSel.value;
      refreshHarita(container);
    });
    if (partiSel) partiSel.addEventListener('change', () => {
      state.parti = partiSel.value;
      refreshHarita(container);
    });
  }

  function renderModule(container) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Modül · 10 · Seçmen coğrafyası</span>
        <h1>Değişim haritası</h1>
        <p class="lede">
          81 ilde seçmen, katılım, demografi ve parti oy kaymasını 2018–2024 aralığında
          harita üzerinde karşılaştırın. İle tıklayınca özet kart açılır.
        </p>
      </header>

      ${window.AT.renderDataFreshness ? window.AT.renderDataFreshness() : ''}

      <div class="panel harita-kontrol-panel" id="harita-kontrol"></div>

      <div class="panel harita-panel" id="harita-panel">
        <div id="harita-svg-wrap" class="harita-svg-wrap"></div>
        <div id="harita-tooltip" class="harita-tooltip" hidden></div>
        <div id="harita-popup" class="harita-popup card" hidden></div>
      </div>

      <div id="harita-lejant" class="harita-lejant"></div>

      <div class="panel harita-not-panel">
        <p class="harita-not">
          Bu harita değişim yönünü gösterir; nedeni tek bir faktöre bağlamaz.
          Seçmen artışı göç, belde birleşmesi veya demografik büyümeden kaynaklanabilir.
          Oy kayması ulusal trend, yerel aday etkisi veya koalisyon değişikliklerini yansıtabilir.
        </p>
      </div>

      ${renderStyles()}
    `;

    renderControls(container);
    renderPopup(container);
    refreshHarita(container);
  }

  function renderStyles() {
    return `<style>
      .harita-kontrol-panel { margin-bottom: var(--space-5); }
      .harita-kontrol-etiket {
        display: block;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--ink-3);
        margin-bottom: var(--space-2);
      }
      .harita-metrik-tabs {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
      }
      .harita-metrik-tab {
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        color: var(--ink-2);
      }
      .harita-metrik-tab input { margin-right: 4px; }
      .harita-metrik-tab:has(input:checked) span {
        color: var(--signal-blue, #1f4d6e);
        font-weight: 600;
      }
      .harita-kontrol-alt {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-4);
        margin-top: var(--space-4);
        padding-top: var(--space-3);
        border-top: 1px solid var(--line-soft);
      }
      .harita-select-wrap {
        display: flex;
        flex-direction: column;
        gap: 4px;
        font-size: 12px;
        color: var(--ink-2);
      }
      .harita-select-wrap select {
        font-family: inherit;
        font-size: 13px;
        padding: 6px 10px;
        border: 1px solid var(--line);
        border-radius: var(--radius-sm);
        background: var(--paper);
        min-width: 200px;
      }
      .harita-metrik-aciklama {
        margin-top: var(--space-3);
        font-size: 12px;
        color: var(--ink-3);
        line-height: 1.5;
      }
      .harita-panel {
        position: relative;
        padding: var(--space-4);
        margin-bottom: var(--space-3);
      }
      .harita-svg-wrap svg {
        width: 100%;
        max-width: 900px;
        display: block;
        margin: 0 auto;
      }
      .harita-il-path { cursor: pointer; transition: stroke-width 0.12s; }
      .harita-il-path:hover { stroke: #1a1814 !important; stroke-width: 1.4 !important; }
      .harita-il-path.veri-yok { cursor: default; opacity: 0.55; }
      .harita-tooltip {
        position: absolute;
        z-index: 5;
        pointer-events: none;
        background: rgba(26, 24, 20, 0.92);
        color: #f5f1e8;
        font-size: 12px;
        line-height: 1.45;
        padding: 8px 10px;
        border-radius: var(--radius-sm);
        max-width: 200px;
      }
      .harita-popup {
        position: absolute;
        top: var(--space-4);
        right: var(--space-4);
        width: min(280px, calc(100% - 32px));
        z-index: 6;
        padding: var(--space-4);
        box-shadow: 0 4px 20px rgba(0,0,0,0.08);
      }
      .harita-popup-kapat {
        position: absolute;
        top: 8px;
        right: 10px;
        border: none;
        background: none;
        font-size: 20px;
        line-height: 1;
        cursor: pointer;
        color: var(--ink-3);
      }
      .harita-popup-baslik {
        font-family: var(--font-display);
        font-size: 16px;
        font-weight: 600;
        margin: 0 24px var(--space-3) 0;
      }
      .harita-popup-dl {
        display: grid;
        grid-template-columns: 1fr auto;
        gap: 6px 12px;
        font-size: 12px;
        margin: 0 0 var(--space-3);
      }
      .harita-popup-dl dt { color: var(--ink-3); }
      .harita-popup-dl dd { margin: 0; font-weight: 600; text-align: right; font-variant-numeric: tabular-nums; }
      .harita-popup-link { font-size: 12px; font-weight: 600; color: var(--signal-blue, #1f4d6e); }
      .harita-lejant {
        margin-bottom: var(--space-5);
        font-size: 11px;
        color: var(--ink-3);
      }
      .harita-lejant-bar {
        display: flex;
        height: 10px;
        max-width: 360px;
        border-radius: 2px;
        overflow: hidden;
        margin-bottom: 6px;
      }
      .harita-lejant-bar span { flex: 1; }
      .harita-lejant-etiketler {
        display: flex;
        justify-content: space-between;
        max-width: 360px;
        font-variant-numeric: tabular-nums;
      }
      .harita-lejant-not { display: block; margin-top: 6px; }
      .harita-not-panel { background: var(--paper-2); }
      .harita-not { font-size: 13px; line-height: 1.6; color: var(--ink-2); margin: 0; }
      @media (max-width: 640px) {
        .harita-popup { position: static; width: 100%; margin-top: var(--space-3); }
      }
    </style>`;
  }

  // ─── Giriş ─────────────────────────────────────────────────
  window.Modules.harita = async function(container) {
    container.innerHTML = '<div class="loading">Harita verisi yükleniyor</div>';
    try {
      await loadCoreData();
    } catch (e) {
      container.innerHTML = `
        <header class="page-header">
          <span class="eyebrow">Modül · 10</span>
          <h1>Değişim haritası</h1>
          <p class="lede">Veri yüklenemedi: ${esc(e.message)}</p>
        </header>`;
      return;
    }
    renderModule(container);
  };
})();
