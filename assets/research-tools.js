/* ─────────────────────────────────────────────────────────
   Araştırmacı / gazeteci yardımcıları
   — bağlam uyarıları, grafik PNG dışa aktarma, veri tarihi
   NOT: app.js'den SONRA yüklenmeli (window.AT = state üzerine eklenir)
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  const CONTEXT_NOTICES = {
    demografi: {
      title: 'Bu modül ne gösterir, ne göstermez?',
      proves: [
        'İl/ilçe düzeyinde yaş, eğitim ve cinsiyet dağılımı (TÜİK ADNKS)',
        'Zaman içinde demografik yapının değişimi (2018–2024)',
        'Bölgesel demografik farklılıklar',
      ],
      notProves: [
        'Bireysel oy tercihi veya “X partisini eğitimli seçmenler destekler” gibi nedensellik',
        'Seçim sonucunu tek başına açıklama',
        'Anket veya sandık çıkışı verisi (site bunları içermez)',
      ],
      note: 'İlçe düzeyinde demografi ile oy oranını yan yana görmek ekolojik düşme riski taşır: toplum özelliği, bireysel tercihi kanıtlamaz.',
    },
    uyumsuzluk: {
      title: 'Uyumsuzluk ne anlama gelir?',
      proves: [
        'YSK kayıtlı seçmen ile TÜİK 18+ nüfus arasındaki oran farkları',
        'Aynı tip seçimler arasında olağandışı seçmen artış/azalış desenleri',
        'Yerel seçim tipleri (BB vs İGM) arasında kapsam tutarsızlıkları',
      ],
      notProves: [
        'Seçim hilesi, suç veya kasıtlı manipülasyon',
        'Tek bir açıklama (göç, deprem, belde birleşmesi, veri tarihi farkı vb. alternatifler geçerlidir)',
        'Otomatik soruşturma gerekliliği',
      ],
      note: 'Eşikler (%85–115, ±%20 vb.) referans çizgisidir; “kesin uygunsuzluk” anlamına gelmez. Detay: Metodoloji → Uyumsuzluk eşikleri.',
    },
    trend: {
      title: 'Trend grafiği nasıl okunur?',
      proves: [
        'Parti/aday oy oranının seçimler arası değişimi (aynı kapsamda)',
        'Bölgesel ve ulusal zaman serisi karşılaştırması',
      ],
      notProves: [
        'Milletvekili dağılımı veya seçim sistemi etkisi (oy payı ≠ vekil payı)',
        'İttifak birleştirmeleri hariç “aynı parti” karşılaştırması (parti adı değişimleri Metodoloji’de)',
      ],
      note: 'MV seçimlerinde d’Hondt ve çevrim katsayısı oy–vekil ilişkisini doğrudan yansıtmaz.',
    },
  };

  function renderContextNotice(type) {
    const n = CONTEXT_NOTICES[type];
    if (!n) return '';

    const li = (arr) => arr.map(x => `<li>${x}</li>`).join('');

    return `
      <aside class="at-context-notice" role="note">
        <div class="at-context-notice-title">${n.title}</div>
        <div class="at-context-notice-grid">
          <div>
            <div class="at-context-notice-label">Gösterir</div>
            <ul>${li(n.proves)}</ul>
          </div>
          <div>
            <div class="at-context-notice-label">Göstermez / kanıtlamaz</div>
            <ul>${li(n.notProves)}</ul>
          </div>
        </div>
        <p class="at-context-notice-note">${n.note}</p>
      </aside>
    `;
  }

  function renderDataFreshness() {
    const m = window.AT && window.AT.manifest;
    if (!m) return '';
    let label = m.updated_at || '—';
    if (m.updated_at) {
      const d = new Date(m.updated_at + 'T12:00:00');
      if (!isNaN(d)) {
        label = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
      }
    }
    const ver = m.version || '1.0';
    return `
      <div class="at-data-freshness">
        Veri sürümü <strong>v${ver}</strong> · Son güncelleme <strong>${label}</strong>
        · <a href="#/metodoloji">Metodoloji</a>
        · <a href="docs/codebook.html" target="_blank" rel="noopener">Codebook</a>
      </div>
    `;
  }

  function exportSvgAsPng(svgEl, filename) {
    if (!svgEl) return Promise.reject(new Error('Grafik bulunamadı'));

    const vb = svgEl.viewBox.baseVal;
    const w = Math.max(1, Math.round(vb.width || svgEl.clientWidth || 1200));
    const h = Math.max(1, Math.round(vb.height || svgEl.clientHeight || 630));

    const clone = svgEl.cloneNode(true);
    clone.setAttribute('width', String(w));
    clone.setAttribute('height', String(h));
    if (!clone.getAttribute('xmlns')) {
      clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const footer = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    footer.setAttribute('x', '12');
    footer.setAttribute('y', String(h - 10));
    footer.setAttribute('fill', '#6b6253');
    footer.setAttribute('font-size', '11');
    footer.setAttribute('font-family', 'Inter, Arial, sans-serif');
    footer.textContent = 'Kaynak: secimarsivi.com · AlperTan™ · CC BY-NC 4.0';
    clone.appendChild(footer);

    const svgStr = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = w * 2;
          canvas.height = h * 2;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#f5f1e8';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          canvas.toBlob((pngBlob) => {
            if (!pngBlob) { reject(new Error('PNG oluşturulamadı')); return; }
            const a = document.createElement('a');
            a.href = URL.createObjectURL(pngBlob);
            a.download = (filename || 'grafik') + '.png';
            a.click();
            setTimeout(() => URL.revokeObjectURL(a.href), 5000);
            resolve();
          }, 'image/png');
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Grafik dışa aktarılamadı'));
      };
      img.src = url;
    });
  }

  function enhanceChartExports(container) {
    if (!container) return;
    container.querySelectorAll('[data-chart-export]').forEach(panel => {
      if (panel.querySelector('.chart-export-toolbar')) return;
      const svg = panel.querySelector('svg');
      if (!svg) return;

      const toolbar = document.createElement('div');
      toolbar.className = 'chart-export-toolbar';
      toolbar.innerHTML = `
        <span class="chart-export-hint">Gazete / sunum için</span>
        <button type="button" class="chart-export-btn focus-ring">PNG indir</button>
      `;
      panel.insertBefore(toolbar, panel.firstChild);

      toolbar.querySelector('.chart-export-btn').addEventListener('click', () => {
        const name = panel.dataset.chartExport || 'secim-arsivi-grafik';
        exportSvgAsPng(svg, name).catch(err => {
          alert(err.message || 'Dışa aktarma başarısız.');
        });
      });
    });
  }

  window.AT = window.AT || {};
  window.AT.renderContextNotice = renderContextNotice;
  window.AT.renderDataFreshness = renderDataFreshness;
  window.AT.exportSvgAsPng = exportSvgAsPng;
  window.AT.enhanceChartExports = enhanceChartExports;
})();
