/* ─────────────────────────────────────────────────────────
   Türkiye Seçim Arşivi · Analytics (Umami uyumlu)
   Modül görüntüleme + paylaşım olayları
   Kurulum: ANALYTICS.md
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  function umamiReady() {
    return typeof window.umami === 'object' && typeof window.umami.track === 'function';
  }

  function virtualPath(route, params) {
    let path = '/' + (route.id || 'home');
    if (params && params.key) path += '/key/' + params.key;
    return path;
  }

  function trackPageView(route, params) {
    if (!route) return;
    const path = virtualPath(route, params);
    const title = route.label + ' · Türkiye Seçim Arşivi';

    if (umamiReady()) {
      window.umami.track(function(props) {
        return Object.assign({}, props, { url: path, title: title });
      });
      window.umami.track('module-view', {
        module: route.id,
        label: route.label,
        num: route.num || '',
      });
    }
  }

  function trackShare(platform, route) {
    if (!route || !platform) return;

    if (umamiReady()) {
      window.umami.track('share', {
        platform: platform,
        module: route.id,
        label: route.label,
      });
    }
  }

  window.ATAnalytics = {
    trackPageView: trackPageView,
    trackShare: trackShare,
  };
})();
