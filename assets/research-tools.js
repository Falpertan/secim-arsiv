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
    anket: {
      title: 'Anket karşılaştırması ne anlama gelir?',
      proves: [
        'Firma paylaşımları ile resmi YSK sonuçları arasındaki sapma (2018–2024)',
        'Her paylaşımın birincil kaynağı (TV, haber, YouTube vb.) ve tarihi',
        'Seçime en yakın anket için 0–100 isabet puanı (geçmiş seçimler)',
      ],
      notProves: [
        'Geleceğe dönük seçim öngörüsü veya “kim kazanır” yorumu',
        'Firma, parti veya aday lehine propaganda',
        'Sandık düzeyinde oy dağılımı veya hile kanıtı',
      ],
      note: 'Gelecek seçimlerde yalnızca doğrulanmış paylaşımlar listelenir; puan verilmez. Puan = 100 − (ortalama sapma × 10).',
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

  function csvEscape(val) {
    const s = String(val == null ? '' : val).replace(/\s+/g, ' ').trim();
    if (/[;"\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  }

  function downloadCsvText(lines, filename) {
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (filename || 'tablo') + '.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  }

  function csvMetaLines() {
    return [
      '# Kaynak: secimarsivi.com · AlperTan™ · CC BY-NC 4.0',
      '# Lisans: CC BY-NC 4.0 (ticari kullanım için izin gerekir)',
      '',
    ];
  }

  function exportTableAsCsv(tableEl, filename) {
    if (!tableEl) throw new Error('Tablo bulunamadı');
    const lines = csvMetaLines();
    tableEl.querySelectorAll('tr').forEach(tr => {
      const cells = [...tr.querySelectorAll('th, td')].map(c => csvEscape(c.innerText));
      if (cells.some(c => c)) lines.push(cells.join(';'));
    });
    if (lines.length <= 3) throw new Error('Dışa aktarılacak veri yok');
    downloadCsvText(lines, filename);
  }

  function exportRowsAsCsv(headers, rows, filename) {
    if (!headers || !headers.length) throw new Error('Başlık satırı gerekli');
    if (!rows || !rows.length) throw new Error('Dışa aktarılacak veri yok');
    const lines = csvMetaLines();
    lines.push(headers.map(csvEscape).join(';'));
    rows.forEach(row => {
      lines.push(row.map(c => csvEscape(c)).join(';'));
    });
    downloadCsvText(lines, filename);
  }

  function bindCsvExport(btnEl, tableResolver, filenameResolver) {
    if (!btnEl) return;
    btnEl.onclick = () => {
      if (!window.AT.exportTableAsCsv) {
        alert('CSV dışa aktarma yüklenemedi. Sayfayı yenileyin (Ctrl+F5).');
        return;
      }
      try {
        const table = typeof tableResolver === 'function' ? tableResolver() : tableResolver;
        const name = typeof filenameResolver === 'function' ? filenameResolver() : filenameResolver;
        window.AT.exportTableAsCsv(table, name);
      } catch (e) {
        alert(e.message || 'CSV oluşturulamadı.');
      }
    };
  }

  function bindRowsCsvExport(btnEl, headers, rowsResolver, filenameResolver) {
    if (!btnEl) return;
    btnEl.onclick = () => {
      if (!window.AT.exportRowsAsCsv) {
        alert('CSV dışa aktarma yüklenemedi. Sayfayı yenileyin (Ctrl+F5).');
        return;
      }
      try {
        const rows = typeof rowsResolver === 'function' ? rowsResolver() : rowsResolver;
        const name = typeof filenameResolver === 'function' ? filenameResolver() : filenameResolver;
        window.AT.exportRowsAsCsv(headers, rows, name);
      } catch (e) {
        alert(e.message || 'CSV oluşturulamadı.');
      }
    };
  }

  window.AT = window.AT || {};
  window.AT.renderContextNotice = renderContextNotice;
  window.AT.renderDataFreshness = renderDataFreshness;
  window.AT.exportSvgAsPng = exportSvgAsPng;
  window.AT.enhanceChartExports = enhanceChartExports;
  window.AT.exportTableAsCsv = exportTableAsCsv;
  window.AT.exportRowsAsCsv = exportRowsAsCsv;
  window.AT.bindCsvExport = bindCsvExport;
  window.AT.bindRowsCsvExport = bindRowsCsvExport;
})();
