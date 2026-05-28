/* ─────────────────────────────────────────────────────────
   Türkiye Seçim Arşivi · App router & state
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  // ─── Global state ───────────────────────────────────────
  const state = {
    manifest:  null,
    parties:   null,
    cache:     {
      // election_key → loaded JSON (lazy)
      election: {},
      meta:     {},
      // demografi loaded once (60MB) — only when explicitly needed
      demografi: null,
    },
    currentRoute: null,
  };

  window.AT = state;  // global erişim için (debug/modüller)

  // ─── Routes & module registry ───────────────────────────
  const ROUTES = [
    { id: 'home',          label: 'Anasayfa',             num: '00', module: 'home',          section: 'main' },
    { id: 'arsiv',         label: 'Arşiv',                num: '01', module: 'arsiv',         section: 'main' },
    { id: 'uyumsuzluk',    label: 'Uyumsuzluk tespiti',   num: '02', module: 'uyumsuzluk',    section: 'main' },
    { id: 'trend',         label: 'Trend analizi',        num: '03', module: 'trend',         section: 'main' },
    { id: 'karsilastirma', label: 'Karşılaştırma',        num: '04', module: 'karsilastirma', section: 'main' },
    { id: 'demografi',     label: 'Demografi',            num: '05', module: 'demografi',     section: 'main' },
    { id: 'senaryo',       label: 'Senaryo',              num: '06', module: 'senaryo',       section: 'analiz' },
    { id: 'bolge',         label: 'Bölge profili',        num: '07', module: 'bolge',         section: 'analiz' },
    { id: 'vekil',         label: 'Vekil dağılımı',       num: '08', module: 'vekil',         section: 'analiz' },
    { id: 'anket',         label: 'Anket firmaları',      num: '09', module: 'anket',         section: 'analiz' },
    { id: 'baslangic',     label: 'Başlangıç rehberi',    num: '?',  module: 'baslangic',     section: 'bilgi' },
    { id: 'metodoloji',    label: 'Metodoloji',           num: 'i',  module: 'metodoloji',    section: 'bilgi' },
    { id: 'hakkinda',      label: 'Hakkında',             num: 'ii', module: 'hakkinda',      section: 'bilgi' },
  ];

  // Module functions registered by modules/*.js
  // Each module exposes: window.Modules[name] = function(container, ctx) { ... }
  window.Modules = window.Modules || {};

  // ─── Data loader helpers ────────────────────────────────
  async function fetchJSON(path) {
    const r = await fetch(path);
    if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    return r.json();
  }

  /** JSON veya .json.gz (Cloudflare Pages 25MB limiti için) */
  async function fetchJSONAuto(path) {
    const gzPath = path.endsWith('.json') ? path + '.gz' : path;
    try {
      const r = await fetch(gzPath);
      if (!r.ok) throw new Error('gz miss');
      if (typeof DecompressionStream !== 'undefined' && r.body) {
        const ds = new DecompressionStream('gzip');
        const text = await new Response(r.body.pipeThrough(ds)).text();
        return JSON.parse(text);
      }
      throw new Error('no decompression');
    } catch {
      return fetchJSON(path);
    }
  }

  async function loadManifest() {
    if (state.manifest) return state.manifest;
    state.manifest = await fetchJSON('data/manifest.json');
    return state.manifest;
  }

  async function loadParties() {
    if (state.parties) return state.parties;
    state.parties = await fetchJSON('data/parties.json');
    return state.parties;
  }

  async function loadElection(key) {
    if (state.cache.election[key]) return state.cache.election[key];
    const m = await loadManifest();
    const e = m.elections.find(x => x.key === key);
    if (!e) throw new Error(`Unknown election: ${key}`);
    const data = await fetchJSON(e.dashboard);
    state.cache.election[key] = data;
    return data;
  }

  async function loadMeta(key) {
    if (state.cache.meta[key]) return state.cache.meta[key];
    const m = await loadManifest();
    const e = m.elections.find(x => x.key === key);
    if (!e) throw new Error(`Unknown election: ${key}`);
    const data = await fetchJSON(e.meta);
    state.cache.meta[key] = data;
    return data;
  }

  async function loadDemografi() {
    if (state.cache.demografi) return state.cache.demografi;
    const m = await loadManifest();
    // 60MB — uyar
    console.log('Demografi yükleniyor (60MB) — büyük dosya, bir an sürebilir...');
    state.cache.demografi = await fetchJSON(m.demografi.path);
    return state.cache.demografi;
  }

  window.AT.loadManifest   = loadManifest;
  window.AT.loadParties    = loadParties;
  window.AT.loadElection   = loadElection;
  window.AT.loadMeta       = loadMeta;
  window.AT.loadDemografi  = loadDemografi;
  window.AT.fetchJSONAuto  = fetchJSONAuto;

  // ─── Format helpers ─────────────────────────────────────
  const fmt = {
    n:  (v) => v == null ? '—' : new Intl.NumberFormat('tr-TR').format(Math.round(v)),
    n1: (v) => v == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 }).format(v),
    n2: (v) => v == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 }).format(v),
    pct:(v, d=1) => v == null ? '—' : new Intl.NumberFormat('tr-TR', { maximumFractionDigits: d }).format(v) + '%',
    bytes: (b) => {
      if (b == null) return '—';
      if (b < 1024) return b + ' B';
      if (b < 1024*1024) return (b/1024).toFixed(1) + ' KB';
      return (b/1024/1024).toFixed(1) + ' MB';
    },
  };
  window.AT.fmt = fmt;

  // ─── Router ─────────────────────────────────────────────
  function parseHash() {
    const h = location.hash.replace(/^#\/?/, '');
    if (!h) return { id: 'home', params: {} };
    const [rawId, ...rest] = h.split('/');
    const id = rawId === 'projeksiyon' ? 'demografi' : rawId;
    const params = {};
    for (let i = 0; i < rest.length; i += 2) {
      if (rest[i+1] !== undefined) params[rest[i]] = decodeURIComponent(rest[i+1]);
    }
    return { id, params };
  }

  function navigate(id, params) {
    let h = '#/' + id;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        h += '/' + k + '/' + encodeURIComponent(v);
      }
    }
    location.hash = h;
  }
  window.AT.navigate = navigate;

  function buildDocumentTitle(route, params) {
    let t = route.label;
    if (params && state.manifest) {
      if (params.key) {
        const e = state.manifest.elections.find(x => x.key === params.key);
        if (e) t += ' · ' + (e.kisa || e.tip);
      }
      if (params.il) t += ' · ' + params.il;
      if (params.ilce) t += ' · ' + params.ilce;
      if (params.election) t += ' · ' + params.election.replace(/-/g, ' ');
      if (params.firm) t += ' · ' + params.firm;
    }
    return t + ' · Türkiye Seçim Arşivi · AlperTan™';
  }

  async function renderRoute() {
    const { id, params } = parseHash();
    const route = ROUTES.find(r => r.id === id) || ROUTES[0];
    state.currentRoute = route;

    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.route === route.id);
    });

    closeSidebar();

    const container = document.getElementById('app-main');
    container.innerHTML = '<div class="loading">Yükleniyor</div>';

    // Manifest first
    try {
      await loadManifest();
    } catch (e) {
      container.innerHTML = `<div class="page-header"><h1>Veri yüklenemedi</h1><p class="lede">${e.message}</p></div>`;
      return;
    }

    // Dispatch to module
    const mod = window.Modules[route.module];
    if (typeof mod === 'function') {
      try {
        await mod(container, { params, route, state });
      } catch (e) {
        console.error(e);
        container.innerHTML = `<div class="page-header"><h1>Modül hatası</h1><p class="lede">${e.message}</p></div>`;
      }
    } else {
      // Placeholder for not-yet-built modules
      renderPlaceholder(container, route);
    }

    // Scroll to top on route change
    window.scrollTo(0, 0);

    document.title = buildDocumentTitle(route, params);

    if (window.ATAnalytics) {
      window.ATAnalytics.trackPageView(route, params);
    }

    mountShareButton(container, route, params);
  }

  // ─── Paylaşım ───────────────────────────────────────────
  function buildShareUrl() {
    const base = location.origin + location.pathname;
    return location.hash ? base + location.hash : base + '#/home';
  }

  function buildShareText(route, params) {
    let text = route.label + ' · Türkiye Seçim Arşivi';
    if (params && params.key) {
      const m = state.manifest;
      const e = m && m.elections.find(x => x.key === params.key);
      if (e) text += ' · ' + (e.kisa || e.tip);
    }
    text += ' — 2018–2024, il ve ilçe bazında seçim verisi. Kaynak: AlperTan™';
    if (route.id === 'senaryo') {
      text += ' (Bu bir tahmin değildir; varsayımsal modeldir.)';
    }
    if (route.id === 'anket') {
      text += ' (Geçmiş seçimlerde isabet puanı; gelecek seçimlerde puan yok.)';
    }
    return text;
  }

  function copyShareLink(onDone) {
    const url = buildShareUrl();
    const done = (ok) => { if (onDone) onDone(ok); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(() => done(true)).catch(() => fallbackCopy(url, done));
    } else {
      fallbackCopy(url, done);
    }
  }

  function fallbackCopy(text, done) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.cssText = 'position:fixed;left:-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      done(document.execCommand('copy'));
    } catch {
      done(false);
    }
    ta.remove();
  }

  let activeShareMenu = null;

  function closeActiveShareMenu() {
    if (!activeShareMenu) return;
    activeShareMenu.menu.hidden = true;
    activeShareMenu.trigger.setAttribute('aria-expanded', 'false');
    activeShareMenu = null;
  }

  document.addEventListener('click', () => closeActiveShareMenu());

  function mountShareButton(container, route, params) {
    const header = container.querySelector('.page-header');
    if (!header || header.querySelector('.share-wrap')) return;

    const url = encodeURIComponent(buildShareUrl());
    const text = encodeURIComponent(buildShareText(route, params));
    const combined = encodeURIComponent(buildShareText(route, params) + '\n\n' + buildShareUrl());

    const wrap = document.createElement('div');
    wrap.className = 'share-wrap';
    wrap.innerHTML = `
      <button type="button" class="share-trigger focus-ring" aria-expanded="false" aria-haspopup="true">
        Paylaş
      </button>
      <div class="share-menu" hidden>
        <a class="share-item" data-action="whatsapp" href="https://wa.me/?text=${combined}" target="_blank" rel="noopener noreferrer">WhatsApp</a>
        <a class="share-item" data-action="x" href="https://twitter.com/intent/tweet?text=${text}&url=${url}" target="_blank" rel="noopener noreferrer">X</a>
        <a class="share-item" data-action="telegram" href="https://t.me/share/url?url=${url}&text=${text}" target="_blank" rel="noopener noreferrer">Telegram</a>
        <button type="button" class="share-item" data-action="instagram">Instagram</button>
        <a class="share-item" data-action="linkedin" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noopener noreferrer">LinkedIn</a>
        <button type="button" class="share-item share-item-copy" data-action="copy">Linki kopyala</button>
      </div>
      <span class="share-toast" hidden aria-live="polite"></span>
    `;

    header.appendChild(wrap);

    const trigger = wrap.querySelector('.share-trigger');
    const menu = wrap.querySelector('.share-menu');
    const toast = wrap.querySelector('.share-toast');

    function showToast(msg) {
      toast.textContent = msg;
      toast.hidden = false;
      clearTimeout(wrap._toastTimer);
      wrap._toastTimer = setTimeout(() => { toast.hidden = true; }, 2800);
    }

    function closeMenu() {
      menu.hidden = true;
      trigger.setAttribute('aria-expanded', 'false');
      if (activeShareMenu && activeShareMenu.wrap === wrap) activeShareMenu = null;
    }

    function openMenu() {
      closeActiveShareMenu();
      menu.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      activeShareMenu = { wrap, menu, trigger };
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.hidden ? openMenu() : closeMenu();
    });

    wrap.addEventListener('click', (e) => e.stopPropagation());

    menu.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = el.dataset.action;
        if (action === 'instagram') {
          e.preventDefault();
          copyShareLink((ok) => {
            showToast(ok
              ? 'Link kopyalandı — Instagram story veya DM\'ye yapıştırın'
              : 'Kopyalanamadı — linki elle seçin');
            if (ok && window.ATAnalytics) window.ATAnalytics.trackShare('instagram', route);
          });
          closeMenu();
        } else if (action === 'copy') {
          e.preventDefault();
          copyShareLink((ok) => {
            showToast(ok ? '✓ Link kopyalandı' : 'Kopyalanamadı');
            if (ok && window.ATAnalytics) window.ATAnalytics.trackShare('copy', route);
          });
          closeMenu();
        } else if (action === 'whatsapp' || action === 'x' || action === 'telegram' || action === 'linkedin') {
          if (window.ATAnalytics) window.ATAnalytics.trackShare(action, route);
          closeMenu();
        } else {
          closeMenu();
        }
      });
    });
  }

  function renderPlaceholder(container, route) {
    container.innerHTML = `
      <header class="page-header">
        <span class="eyebrow">Modül · ${route.num}</span>
        <h1>${route.label}</h1>
        <p class="lede">Bu modül henüz inşa edilmedi. İskele kuruldu, içerik aşamalı olarak gelecek.</p>
      </header>
      <div class="module-placeholder">
        <div class="mp-title">Yapım aşamasında</div>
        <div class="mp-body">
          Bu modülde <strong>${route.label}</strong> ekranı yer alacak.
          Veri katmanı hazır, modül kodu sonraki aşamalarda yazılacak.
        </div>
      </div>
    `;
  }

  // ─── Sidebar render ─────────────────────────────────────
  function renderSidebar() {
    const sectionGroups = {
      main:   { title: 'Ana modüller',     items: [] },
      analiz: { title: 'İleri analiz',     items: [] },
      bilgi:  { title: 'Hakkında',         items: [] },
    };
    for (const r of ROUTES) {
      sectionGroups[r.section].items.push(r);
    }

    let html = `
      <div class="sidebar-brand">
        Türkiye<br/>Seçim Arşivi<span class="tm">™</span>
      </div>
      <div class="sidebar-tagline">
        Bağımsız, açık, tarafsız.<br/>
        2018'den 2024'e 13 seçim için il + ilçe analizi.
      </div>
    `;

    for (const [key, grp] of Object.entries(sectionGroups)) {
      if (!grp.items.length) continue;
      html += `<div class="sidebar-section">
        <div class="sidebar-section-title">${grp.title}</div>
        <ul class="nav-list">`;
      for (const r of grp.items) {
        html += `<li class="nav-item" data-route="${r.id}">
          <span class="nav-num">${r.num}</span>
          <span>${r.label}</span>
        </li>`;
      }
      html += '</ul></div>';
    }

    html += `
      <div class="sidebar-footer">
        <div class="sidebar-footer-brand">
          <img src="assets/alpertan_logo.png" alt="" class="sidebar-footer-logo" width="24" height="24">
          <span>
            AlperTan<span style="font-size:9px;vertical-align:super">™</span> · v1.0
          </span>
        </div>
        Veri: YSK, TÜİK<br/>
        <a href="#/baslangic">Başlangıç rehberi</a> ·
        <a href="#/hakkinda">Hakkında</a>
      </div>
    `;

    const aside = document.getElementById('app-sidebar');
    aside.innerHTML = html;

    aside.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        navigate(el.dataset.route);
        closeSidebar();
      });
    });
  }

  function closeSidebar() {
    const root = document.getElementById('app-root');
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    if (!root) return;
    root.classList.remove('sidebar-open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    if (overlay) overlay.hidden = true;
  }

  function toggleSidebar() {
    const root = document.getElementById('app-root');
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    if (!root) return;
    const open = !root.classList.contains('sidebar-open');
    root.classList.toggle('sidebar-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (overlay) overlay.hidden = !open;
  }

  function initMobileNav() {
    const toggle = document.getElementById('sidebar-toggle');
    const overlay = document.getElementById('sidebar-overlay');
    if (toggle) toggle.addEventListener('click', toggleSidebar);
    if (overlay) overlay.addEventListener('click', closeSidebar);
  }

  // ─── Boot ───────────────────────────────────────────────
  function boot() {
    renderSidebar();
    initMobileNav();
    window.addEventListener('hashchange', renderRoute);
    renderRoute();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
