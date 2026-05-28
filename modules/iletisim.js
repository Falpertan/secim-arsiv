/* ─────────────────────────────────────────────────────────
   İletişim — e-posta, GitHub, yönlendirmeler
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  const CONTACT_PATH = 'data/contact.json';

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  window.Modules.iletisim = async function(container) {
    let c;
    try {
      c = await fetch(CONTACT_PATH).then(r => {
        if (!r.ok) throw new Error('İletişim bilgisi yüklenemedi');
        return r.json();
      });
    } catch (e) {
      container.innerHTML =
        '<header class="page-header"><h1>İletişim</h1>' +
        '<p class="lede">' + esc(e.message) + '</p></header>';
      return;
    }

    const mailto = 'mailto:' + encodeURIComponent(c.email) +
      '?subject=' + encodeURIComponent('Seçim Arşivi — ') +
      '&body=' + encodeURIComponent('Merhaba,\n\n');

    container.innerHTML =
      '<header class="page-header">' +
      '<span class="eyebrow">Bölüm · iii · İletişim</span>' +
      '<h1>İletişim</h1>' +
      '<p class="lede">Veri düzeltmesi, anket kaynağı, basın veya genel sorular için aşağıdaki kanalları kullanabilirsiniz.</p>' +
      '</header>' +
      '<div class="prose">' +
      '<p class="ilet-not">' + esc(c.responseNote) + '</p>' +
      '<div class="ilet-grid">' +
      '<a class="ilet-kart ilet-kart-primary" href="' + esc(mailto) + '">' +
      '<span class="ilet-kart-etiket">E-posta</span>' +
      '<strong class="ilet-kart-baslik">' + esc(c.email) + '</strong>' +
      '<p>Veri hatası, basın, işbirliği ve genel mesajlar.</p>' +
      '<span class="ilet-kart-cta">E-posta gönder →</span></a>' +
      '<a class="ilet-kart" href="' + esc(c.githubIssues) + '" target="_blank" rel="noopener noreferrer">' +
      '<span class="ilet-kart-etiket">GitHub</span>' +
      '<strong class="ilet-kart-baslik">Hata / veri bildirimi</strong>' +
      '<p>Net bir hata veya eksik veri varsa issue açın (tercih edilen teknik kanal).</p>' +
      '<span class="ilet-kart-cta">Issue aç →</span></a>' +
      '<a class="ilet-kart" href="#/anket/add/1">' +
      '<span class="ilet-kart-etiket">Anket modülü (beta)</span>' +
      '<strong class="ilet-kart-baslik">Anket kaynağı ekle</strong>' +
      '<p>TV, X veya haber linki + isteğe bağlı ekran görüntüsü ile arşive katkı.</p>' +
      '<span class="ilet-kart-cta">Anket ekle →</span></a>' +
      '</div>' +
      '<section class="ilet-bolum">' +
      '<h2>Ne için hangi kanal?</h2>' +
      '<ul>' +
      '<li><strong>YSK / TÜİK verisi yanlış görünüyor</strong> — GitHub issue (ekran görüntüsü + il/ilçe/seçim adı).</li>' +
      '<li><strong>Anket firması paylaşımı</strong> — önce <a href="#/anket/add/1">Anket ekle</a>; kalıcı arşiv için e-posta ile JSON paylaşımı.</li>' +
      '<li><strong>Basın / akademik</strong> — e-posta.</li>' +
      '<li><strong>Metodoloji sorusu</strong> — <a href="#/metodoloji">Metodoloji</a> sayfasını okuyun; kalan sorular için e-posta.</li>' +
      '</ul></section>' +
      '<section class="ilet-bolum">' +
      '<h2>Marka ve depo</h2>' +
      '<p><strong>' + esc(c.displayName) + '</strong> · ' + esc(c.brand) +
      ' · <a href="' + esc(c.github) + '" target="_blank" rel="noopener noreferrer">GitHub deposu</a></p>' +
      '</section>' +
      '</div>' +
      renderStyles();
  };

  function renderStyles() {
    return `<style>
      .ilet-not {
        padding: var(--space-3) var(--space-4);
        border: 1px solid var(--line-soft);
        border-radius: var(--radius-sm);
        background: var(--paper-2);
        font-size: 13px;
        color: var(--ink-2);
      }
      .ilet-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: var(--space-4);
        margin: var(--space-5) 0;
      }
      .ilet-kart {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-4) var(--space-5);
        border: 1px solid var(--line);
        border-radius: var(--radius-md);
        background: var(--paper);
        text-decoration: none;
        color: inherit;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .ilet-kart:hover {
        border-color: rgba(31, 77, 110, 0.35);
        box-shadow: 0 2px 12px rgba(0,0,0,0.04);
      }
      .ilet-kart-primary { border-color: rgba(31, 77, 110, 0.25); background: rgba(31, 77, 110, 0.04); }
      .ilet-kart-etiket { font-size: 10px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-3); }
      .ilet-kart-baslik { font-family: var(--font-display); font-size: 16px; font-weight: 600; color: var(--ink); }
      .ilet-kart p { font-size: 13px; line-height: 1.5; color: var(--ink-2); margin: 0; flex: 1; }
      .ilet-kart-cta { font-size: 12px; font-weight: 600; color: var(--signal-blue, #1f4d6e); margin-top: var(--space-2); }
      .ilet-bolum { margin-top: var(--space-6); }
      .ilet-bolum h2 { font-size: 14px; font-weight: 600; margin-bottom: var(--space-3); }
      .ilet-bolum ul { margin-left: var(--space-5); }
      .ilet-bolum li { margin-bottom: var(--space-2); font-size: 14px; line-height: 1.55; }
    </style>`;
  }
})();
