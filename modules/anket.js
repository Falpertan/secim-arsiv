/* ─────────────────────────────────────────────────────────
   Anket firmaları modülü — YSK vs anket karşılaştırması
   ───────────────────────────────────────────────────────── */

(function() {
  'use strict';

  const BUNDLE_PATH = 'data/anket/bundle.json';
  const ABOUT_PATH = 'data/anket/hakkimizda.json';
  const RESEARCH_STORAGE = 'secim-arsivi-anket-research';
  const POLLS_EXTRA_STORAGE = 'secim-arsivi-anket-polls-extra';
  const LOCAL_API = 'http://127.0.0.1:8765';
  const IS_LOCAL = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
  const IS_DEV_SERVER = IS_LOCAL && location.port === '8765';

  const CHANNEL_META = {
    tv: { label: 'Televizyon', icon: '📺' },
    youtube: { label: 'YouTube', icon: '▶️' },
    radio: { label: 'Radyo', icon: '📻' },
    online_news: { label: 'Online haber', icon: '🌐' },
    newspaper: { label: 'Gazete', icon: '📰' },
    social_media: { label: 'Sosyal medya', icon: '💬' },
    firm_website: { label: 'Firma sitesi', icon: '🏢' },
    subscriber_note: { label: 'Abonelik notu', icon: '📋' },
    press_leak: { label: 'Basına sızan', icon: '📢' },
    academic_report: { label: 'Rapor / analiz', icon: '📊' },
    other: { label: 'Diğer', icon: '📎' },
  };

  const RESEARCH_KEYWORDS = /anket|seçim|secim|oy\s*oran|parti\s*oran|cumhurbaşkan|milletvekili|ittifak|yüzde|araştırma\s*sonuc/i;

  let DATA = null;
  let aboutData = null;
  let rootEl = null;

  const ui = {
    mode: 'archive',
    electionId: null,
    firmId: null,
    view: 'compare',
    upcomingElectionId: null,
    profileFirmId: null,
  };

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/"/g, '&quot;');
  }

  function daysBetween(a, b) {
    return Math.round((new Date(b) - new Date(a)) / 86400000);
  }

  function fmtPct(v, d) {
    if (d === undefined) d = 1;
    return v.toFixed(d) + '%';
  }

  function fmtDate(iso) {
    if (!iso) return '—';
    return iso.split('T')[0].split('-').reverse().join('.');
  }

  function fmtDays(d) {
    if (d === 0) return 'Seçim günü';
    if (d === 1) return '1 gün kala';
    return d + ' gün kala';
  }

  function fmtDaysUntil(days) {
    if (days < 0) return Math.abs(days) + ' gün önce geçti';
    if (days === 0) return 'Bugün';
    if (days === 1) return 'Yarın';
    return days + ' gün kaldı';
  }

  function devCls(d) {
    const a = Math.abs(d);
    if (a <= 2) return 'ank-dev-good';
    if (a <= 5) return 'ank-dev-mid';
    return 'ank-dev-bad';
  }

  function comparePoll(poll, election) {
    const map = Object.fromEntries(election.results.map(r => [r.id, r]));
    const rows = poll.predictions.map(pred => {
      const actual = map[pred.targetId];
      if (!actual) return null;
      const deviation = pred.percent - actual.percent;
      return {
        ...actual,
        targetId: pred.targetId,
        predicted: pred.percent,
        actual: actual.percent,
        deviation,
        abs: Math.abs(deviation),
      };
    }).filter(Boolean);
    const mae = rows.length ? rows.reduce((s, r) => s + r.abs, 0) / rows.length : 0;
    return { mae, rows, days: daysBetween(poll.publishedDate, election.date) };
  }

  function maeToScore(mae) {
    return Math.max(0, Math.min(100, Math.round(100 - mae * 10)));
  }

  function scoreGrade(score) {
    if (score >= 90) return { letter: 'A+', cls: 'ank-grade-a' };
    if (score >= 80) return { letter: 'A', cls: 'ank-grade-a' };
    if (score >= 70) return { letter: 'B', cls: 'ank-grade-b' };
    if (score >= 55) return { letter: 'C', cls: 'ank-grade-c' };
    if (score >= 40) return { letter: 'D', cls: 'ank-grade-d' };
    return { letter: 'F', cls: 'ank-grade-f' };
  }

  function getElection() {
    return DATA.elections.find(e => e.id === ui.electionId);
  }

  function getPolls() {
    return DATA.polls.filter(p => p.electionId === ui.electionId);
  }

  function getFirm(id) {
    return DATA.firms.find(f => f.id === id);
  }

  function getScores() {
    const election = getElection();
    if (!election) return [];
    const byFirm = {};
    for (const poll of getPolls()) {
      if (new Date(poll.publishedDate) > new Date(election.date)) continue;
      const acc = comparePoll(poll, election);
      const cur = byFirm[poll.firmId];
      if (!cur || acc.days < cur.acc.days || (acc.days === cur.acc.days && acc.mae < cur.acc.mae)) {
        byFirm[poll.firmId] = {
          poll,
          acc,
          score: maeToScore(acc.mae),
          grade: scoreGrade(maeToScore(acc.mae)),
        };
      }
    }
    return Object.entries(byFirm)
      .map(([firmId, v]) => ({ firmId, ...v }))
      .sort((a, b) => b.score - a.score || a.acc.mae - b.acc.mae);
  }

  function loadStoredPollsExtra() {
    try {
      const raw = localStorage.getItem(POLLS_EXTRA_STORAGE);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveStoredPollsExtra(polls) {
    localStorage.setItem(POLLS_EXTRA_STORAGE, JSON.stringify(polls));
  }

  function pollUrlKey(poll) {
    const pub = getPrimaryPublication(poll.publications);
    const href = pub ? getPublicationHref(pub) : '';
    return href ? href.replace(/\?.*$/, '').toLowerCase() : poll.id;
  }

  function getMergedPollsUpcoming() {
    const base = DATA.pollsUpcoming || [];
    const extra = loadStoredPollsExtra();
    const seen = new Set();
    const out = [];
    for (const poll of [...base, ...extra]) {
      const key = pollUrlKey(poll);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(poll);
    }
    return out;
  }

  function defaultUpcomingElectionId() {
    const today = new Date().toISOString().slice(0, 10);
    const list = DATA.upcomingElections || [];
    if (!list.length) return null;
    return (list.find(e => e.date >= today) || list[0]).id;
  }

  function getBestPastPollForFirm(firmId, election) {
    const polls = DATA.polls.filter(
      p => p.firmId === firmId && p.electionId === election.id &&
        new Date(p.publishedDate) <= new Date(election.date),
    );
    if (!polls.length) return null;
    let best = null;
    for (const poll of polls) {
      const acc = comparePoll(poll, election);
      if (!best || acc.days < best.acc.days || (acc.days === best.acc.days && acc.mae < best.acc.mae)) {
        best = {
          poll,
          acc,
          score: maeToScore(acc.mae),
          grade: scoreGrade(maeToScore(acc.mae)),
        };
      }
    }
    return best;
  }

  function getFirmAverageScore(firmId) {
    const scores = DATA.elections
      .map(e => getBestPastPollForFirm(firmId, e))
      .filter(Boolean)
      .map(r => r.score);
    if (!scores.length) return null;
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  }

  function getFirmCrossElectionRecords(firmId) {
    const records = [];
    for (const election of DATA.elections) {
      const best = getBestPastPollForFirm(firmId, election);
      records.push({
        election,
        kind: 'past',
        hasData: !!best,
        best,
      });
    }
    for (const election of DATA.upcomingElections || []) {
      const polls = getMergedPollsUpcoming().filter(
        p => p.firmId === firmId && p.electionId === election.id,
      );
      const latest = polls.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))[0];
      records.push({ election, kind: 'upcoming', hasData: !!latest, latest });
    }
    return records.sort((a, b) => new Date(b.election.date) - new Date(a.election.date));
  }

  function buildResearchQueries() {
    const queries = [];
    const seen = new Set();
    const priority = ['konda', 'metropoll', 'gezici', 'genar', 'mak', 'optimar', 'sonar', 'orc', 'veri', 'area', 'piar'];
    const byId = Object.fromEntries((DATA.firms || []).map(f => [f.id, f]));
    for (const id of priority) {
      const f = byId[id];
      if (!f) continue;
      const token = f.name.split(/\s+/)[0];
      const q = '"' + token + '" anket';
      if (!seen.has(q)) {
        queries.push([id, q]);
        seen.add(q);
      }
    }
    for (const f of DATA.firms || []) {
      const token = f.name.split(/\s+/)[0];
      if (token.length <= 3 || queries.length >= 22) continue;
      const q = '"' + token + '" anket';
      if (seen.has(q)) continue;
      queries.push([f.id, q]);
      seen.add(q);
    }
    for (const q of ['seçim anketi Türkiye', 'site:youtube.com seçim anketi Türkiye']) {
      if (!seen.has(q)) {
        queries.push([null, q]);
        seen.add(q);
      }
    }
    return queries;
  }

  function researchItemToPollStub(item, electionId) {
    if (!item.firmId || !item.url) return null;
    const slug = item.url.replace(/[^a-z0-9]+/gi, '-').slice(0, 48).toLowerCase() || 'kaynak';
    const pubDate = item.publishedAt || new Date().toISOString().slice(0, 10);
    return {
      id: 'scan-' + slug,
      electionId,
      firmId: item.firmId,
      publishedDate: pubDate,
      scope: 'party',
      predictions: [],
      publications: [{
        id: 'pub-' + slug,
        channel: item.channel || 'online_news',
        outlet: item.outlet || 'Web',
        title: item.title,
        publishedAt: pubDate,
        url: item.url,
        isPrimary: true,
      }],
      sourceLabel: 'Otomatik tarama',
      notes: 'Başlıktan otomatik eklendi; oranlar elle doğrulanmalı.',
      _scanned: true,
    };
  }

  function mergeScannedPollsFromResearch(research) {
    const electionId = ui.upcomingElectionId || defaultUpcomingElectionId();
    if (!electionId || !research?.items?.length) return 0;
    const existing = new Set(getMergedPollsUpcoming().map(pollUrlKey));
    const extra = loadStoredPollsExtra();
    let added = 0;
    for (const item of research.items) {
      const stub = researchItemToPollStub(item, electionId);
      if (!stub) continue;
      const key = pollUrlKey(stub);
      if (existing.has(key)) continue;
      existing.add(key);
      extra.push(stub);
      added++;
    }
    if (added) saveStoredPollsExtra(extra);
    return added;
  }

  function defaultElectionId() {
    const withPolls = DATA.elections
      .filter(e => DATA.polls.some(p => p.electionId === e.id))
      .sort((a, b) => new Date(b.date) - new Date(a.date));
    return withPolls[0]?.id || DATA.elections[0]?.id;
  }

  function electionsByYear() {
    const m = {};
    for (const e of DATA.elections) {
      (m[e.year] ||= []).push(e);
    }
    return Object.entries(m).sort((a, b) => b[0] - a[0]);
  }

  function sortPublications(publications) {
    return [...(publications || [])].sort(
      (a, b) => new Date(a.publishedAt) - new Date(b.publishedAt),
    );
  }

  function getPrimaryPublication(publications) {
    const sorted = sortPublications(publications);
    if (!sorted.length) return null;
    return sorted.find(p => p.isPrimary) || sorted[0];
  }

  function getPublicationHref(pub) {
    return pub.url || pub.archiveUrl || '';
  }

  function renderPrimarySourceCell(publications) {
    const primary = getPrimaryPublication(publications);
    if (!primary) return '<span class="ank-src-nolink">—</span>';
    const meta = CHANNEL_META[primary.channel] || CHANNEL_META.other;
    const href = getPublicationHref(primary);
    const extra = publications.length - 1;
    let html =
      '<div class="ank-src-cell">' +
      '<div><span class="ank-src-badge">' + meta.icon + ' ' + esc(primary.outlet) + '</span>' +
      (extra > 0 ? ' <span class="ank-src-extra">+' + extra + '</span>' : '') +
      '</div>' +
      '<p class="ank-src-title">' + esc(primary.title) + '</p>' +
      '<time class="ank-src-date">' + fmtDate(primary.publishedAt.split('T')[0]) + '</time>';
    if (href) {
      html +=
        ' <a class="ank-src-link" href="' + esc(href) +
        '" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">' +
        esc(meta.label) + ' kaynağını aç →</a>';
    } else {
      html += ' <span class="ank-src-nolink">Bağlantı yok</span>';
    }
    html += '</div>';
    return html;
  }

  function renderSourcesPanel(publications) {
    const sorted = sortPublications(publications);
    if (!sorted.length) {
      return '<div class="ank-sources-empty">Bu anket için kaynak bağlantısı henüz eklenmemiş.</div>';
    }
    let html =
      '<div class="ank-sources-panel"><h4 class="ank-sources-title">Kaynaklar — paylaşım nerede yayımlandı?</h4><ol class="ank-sources-list">';
    for (const pub of sorted) {
      const meta = CHANNEL_META[pub.channel] || CHANNEL_META.other;
      const href = getPublicationHref(pub);
      html +=
        '<li class="ank-src-item">' +
        '<div class="ank-src-item-hdr">' +
        '<span><span class="ank-src-badge">' + meta.icon + ' ' + esc(meta.label) + '</span> <strong>' +
        esc(pub.outlet) + '</strong>' +
        (pub.isPrimary ? ' <span class="ank-src-primary">Birincil</span>' : '') +
        '</span>' +
        '<time class="ank-src-date">' + fmtDate(pub.publishedAt.split('T')[0]) + '</time></div>' +
        '<p class="ank-src-title">' + esc(pub.title) + '</p>';
      if (pub.note) html += '<p class="ank-src-note">' + esc(pub.note) + '</p>';
      if (href) {
        html +=
          ' <a class="ank-src-link" href="' + esc(href) +
          '" target="_blank" rel="noopener noreferrer">' +
          (pub.url ? 'Kaynağı aç →' : 'Arşiv bağlantısı →') + '</a>';
      }
      html += '</li>';
    }
    html += '</ol></div>';
    return html;
  }

  function barHtml(label, color, pct, dev, actual) {
    let devStr = dev != null
      ? ' <span class="' + devCls(dev) + '" style="font-size:11px">(' + (dev > 0 ? '+' : '') + dev.toFixed(1) + ' puan)</span>'
      : '';
    let mark = actual != null
      ? '<div class="ank-bar-mark" style="left:' + Math.min(actual, 100) + '%"></div>'
      : '';
    return (
      '<div class="ank-bar-row"><div class="ank-bar-top"><span class="ank-bar-label">' +
      '<span class="ank-dot" style="background:' + color + '"></span>' + esc(label) +
      '</span><span><strong>' + fmtPct(pct, dev == null ? 2 : 1) + '</strong>' + devStr + '</span></div>' +
      '<div class="ank-bar-track">' + mark +
      '<div class="ank-bar-fill" style="width:' + Math.min(pct, 100) + '%;background:' + color + '"></div></div></div>'
    );
  }

  function getFirmHistory(firmId, election) {
    return getPolls()
      .filter(p => p.firmId === firmId && new Date(p.publishedDate) <= new Date(election.date))
      .map(poll => {
        const acc = comparePoll(poll, election);
        const score = maeToScore(acc.mae);
        return { poll, acc, score, grade: scoreGrade(score) };
      })
      .sort((a, b) => a.acc.days - b.acc.days || a.acc.mae - b.acc.mae);
  }

  function renderFirmShares(firmId, election) {
    const f = getFirm(firmId);
    const history = getFirmHistory(firmId, election);
    if (!history.length) {
      return '<div class="panel ank-empty">' + esc(f?.name || firmId) + ' — bu seçimde anket yok</div>';
    }
    const pubCount = history.reduce((n, h) => n + (h.poll.publications?.length || 0), 0);
    const best = history.reduce((a, b) => (a.acc.mae <= b.acc.mae ? a : b));
    const rows = history.map((item, i) => {
      const isBest = item.poll.id === best.poll.id;
      const rowsAcc = item.acc.rows
        .sort((a, b) => b.actual - a.actual)
        .map(r =>
          '<li style="display:flex;justify-content:space-between;font-size:12px;padding:6px 0;border-bottom:1px solid var(--line-soft)">' +
          '<span><span class="ank-dot" style="background:' + r.color + '"></span> ' + esc(r.label) + '</span>' +
          '<span><strong>' + fmtPct(r.predicted) + '</strong> → ' + fmtPct(r.actual, 2) +
          ' <span class="' + devCls(r.deviation) + '">(' + (r.deviation > 0 ? '+' : '') + r.deviation.toFixed(1) + ')</span></span></li>',
        )
        .join('');
      return (
        '<div class="ank-share-row' + (isBest ? ' best' : '') + '">' +
        '<div class="ank-share-hdr">' +
        '<div style="flex:1;min-width:200px">' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
        '<span class="ank-rank' + (isBest ? ' gold' : '') + '">' + (i + 1) + '</span>' +
        '<strong>' + fmtDate(item.poll.publishedDate) + '</strong>' +
        '<span style="font-size:11px;color:var(--ink-3)">' + fmtDays(item.acc.days) + '</span>' +
        (isBest ? ' <span class="ank-badge-best">En isabetli</span>' : '') +
        '</div><div style="margin-top:8px">' + renderPrimarySourceCell(item.poll.publications || []) + '</div></div>' +
        '<div style="text-align:right">' +
        '<div class="ank-score-num" style="font-size:1.25rem">' + item.score + '</div>' +
        '<div style="font-size:10px;color:var(--ink-3)">puan</div>' +
        '<span class="ank-grade ' + item.grade.cls + '" style="margin-top:4px">' + item.grade.letter + '</span>' +
        '<div style="font-size:11px;margin-top:4px"><strong>' + fmtPct(item.acc.mae) + '</strong> sapma</div></div></div>' +
        '<div class="ank-share-body"><p style="font-size:11px;font-weight:600;color:var(--ink-3);margin-bottom:8px">Paylaşım vs YSK</p>' +
        '<ul style="list-style:none;margin:0;padding:0">' + rowsAcc + '</ul>' +
        renderSourcesPanel(item.poll.publications || []) + '</div></div>'
      );
    }).join('');

    return (
      '<div class="panel panel-flush">' +
      '<div class="ank-compare-hdr">' +
      '<div><p class="ank-kicker">Firma paylaşımları</p>' +
      '<h3>' + esc(f?.name || firmId) + '</h3>' +
      '<p style="font-size:12px;color:var(--ink-3);margin-top:4px">' + history.length + ' anket · ' + pubCount + ' kaynak</p>' +
      '<p style="font-size:11px;color:var(--ink-3);margin-top:4px">En isabetli: ' + fmtDate(best.poll.publishedDate) +
      ' (' + fmtDays(best.acc.days) + ', ' + fmtPct(best.acc.mae) + ' sapma)</p></div></div>' +
      rows + '</div>'
    );
  }

  function renderCompare(sel, election, sorted) {
    const f = getFirm(sel.firmId);
    const rows = [...sel.acc.rows].sort((a, b) => b.actual - a.actual);
    return (
      '<div class="panel panel-flush">' +
      '<div class="ank-compare-hdr">' +
      '<div><p class="ank-kicker">Karşılaştırma</p>' +
      '<h3>' + esc(f?.name || sel.firmId) + '</h3>' +
      '<p style="font-size:13px;color:var(--ink-3)">' + fmtDate(sel.poll.publishedDate) + ' · ' + fmtDays(sel.acc.days) + '</p></div>' +
      '<div class="ank-score-box"><div class="ank-score-num">' + sel.score + '</div>' +
      '<div style="font-size:11px;color:var(--ink-3)">isabet puanı</div>' +
      '<span class="ank-grade ' + sel.grade.cls + '" style="margin-top:8px;width:2.5rem;height:2.5rem">' + sel.grade.letter + '</span></div></div>' +
      '<div class="ank-cols">' +
      '<div class="ank-col"><h4><span class="ank-dot" style="background:var(--signal-green)"></span>Resmi sonuç (YSK)</h4>' +
      sorted.map(r => barHtml(r.label, r.color, r.percent, null, null)).join('') + '</div>' +
      '<div class="ank-col"><h4><span class="ank-dot" style="background:var(--signal-blue)"></span>Firma paylaşımı</h4>' +
      rows.map(r => barHtml(r.label, r.color, r.predicted, r.deviation, r.actual)).join('') + '</div></div>' +
      '<div class="ank-chips">' +
      rows.map(r =>
        '<span class="ank-chip"><span class="ank-dot" style="background:' + r.color + '"></span> ' + esc(r.label) +
        ' <strong class="' + devCls(r.deviation) + '">' + (r.deviation > 0 ? '+' : '') + r.deviation.toFixed(1) + ' puan</strong></span>',
      ).join('') +
      '<span class="ank-chip"><strong>Ort. sapma: ' + fmtPct(sel.acc.mae) + '</strong></span></div>' +
      renderSourcesPanel(sel.poll.publications) + '</div>'
    );
  }

  function renderScoresTable(scores) {
    return (
      '<div class="panel panel-flush">' +
      '<div style="padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--line-soft)">' +
      '<h2 style="font-family:var(--font-display);font-size:16px;font-weight:600">Firma puan tablosu</h2>' +
      '<p class="panel-note" style="margin:0">Her firmanın seçime en yakın anketi · 0–100 puan</p></div>' +
      (scores.length
        ? '<div class="data-table-wrap"><table class="data-table ank-data-table"><thead><tr>' +
          '<th>#</th><th>Firma</th><th>Tarih</th><th>Kaynak</th><th>Seçime kalan</th><th>Sapma</th><th>Puan</th><th>Not</th>' +
          '</tr></thead><tbody>' +
          scores.map((s, i) => {
            const f = getFirm(s.firmId);
            const cls = s.firmId === ui.firmId ? ' class="ank-table-row-sel"' : '';
            return (
              '<tr' + cls + ' data-firm-row="' + s.firmId + '">' +
              '<td><span class="ank-rank' + (i === 0 ? ' gold' : '') + '">' + (i + 1) + '</span></td>' +
              '<td><strong>' + esc(f?.name || s.firmId) + '</strong></td>' +
              '<td>' + fmtDate(s.poll.publishedDate) + '</td>' +
              '<td onclick="event.stopPropagation()">' + renderPrimarySourceCell(s.poll.publications) + '</td>' +
              '<td>' + fmtDays(s.acc.days) + '</td>' +
              '<td class="num">' + fmtPct(s.acc.mae) + '</td>' +
              '<td><span class="ank-prog"><i style="width:' + s.score + '%"></i></span><strong class="num">' + s.score + '</strong></td>' +
              '<td><span class="ank-grade ' + s.grade.cls + '">' + s.grade.letter + '</span></td></tr>'
            );
          }).join('') +
          '</tbody></table></div>'
        : '<p class="ank-empty">Veri yok</p>') +
      '<p class="panel-note" style="padding:var(--space-3) var(--space-5);background:var(--paper-2);border-top:1px solid var(--line-soft);margin:0">' +
      'Puan = 100 − (ortalama sapma × 10)</p></div>'
    );
  }

  function renderArchiveMain() {
    const election = getElection();
    if (!election) return '<p class="ank-empty">Seçim bulunamadı</p>';
    const scores = getScores();
    if (!ui.firmId || !scores.find(s => s.firmId === ui.firmId)) {
      ui.firmId = scores[0]?.firmId || null;
    }
    const sorted = [...election.results].sort((a, b) => b.percent - a.percent);
    const sel = scores.find(s => s.firmId === ui.firmId);

    const tabs = [
      { id: 'compare', l: 'Karşılaştır', s: 'En yakın anket' },
      { id: 'firm-shares', l: 'Paylaşımlar', s: 'Tüm yayınlar + isabet' },
      { id: 'scores', l: 'Puan tablosu', s: 'Seçime en yakın anketler' },
    ];

    let main = '';
    if (ui.view === 'compare') {
      main = sel
        ? renderCompare(sel, election, sorted)
        : '<div class="panel ank-empty">Karşılaştırmak için firma seçin</div>';
    } else if (ui.view === 'firm-shares') {
      main = sel
        ? renderFirmShares(sel.firmId, election)
        : '<div class="panel ank-empty">Firma seçin</div>';
    } else {
      main = renderScoresTable(scores);
    }

    let elHtml = '';
    for (const [year, list] of electionsByYear()) {
      elHtml += '<p class="ank-year-label">' + year + '</p><div class="ank-el-grid">';
      for (const el of list) {
        const active = el.id === ui.electionId ? ' active' : '';
        elHtml +=
          '<button type="button" class="ank-el-btn' + active + '" data-el="' + el.id + '">' +
          '<span class="t">' + esc(el.title) + '</span>' +
          '<span class="d">' + fmtDate(el.date) + (el.city ? ' · ' + esc(el.city) : '') + '</span></button>';
      }
      elHtml += '</div>';
    }

    const firmsHtml = scores.length
      ? scores.map((s, i) => {
          const f = getFirm(s.firmId);
          const active = s.firmId === ui.firmId ? ' active' : '';
          return (
            '<button type="button" class="ank-firm-btn' + active + '" data-firm="' + s.firmId + '">' +
            '<span class="ank-rank' + (i === 0 ? ' gold' : '') + '">' + (i + 1) + '</span>' +
            '<span style="flex:1;min-width:0"><span class="ank-firm-name">' + esc(f?.name || s.firmId) + '</span><br>' +
            '<span class="ank-firm-sub">' + fmtDate(s.poll.publishedDate) + ' · ' + fmtDays(s.acc.days) + '</span></span>' +
            '<span class="ank-grade ' + s.grade.cls + '">' + s.grade.letter + '</span></button>'
          );
        }).join('')
      : '<p class="ank-empty">Anket yok</p>';

    const yskHtml = sorted
      .map(r => barHtml(r.label, r.color, r.percent, null, null))
      .join('');

    const tabsHtml = tabs
      .map(t =>
        '<button type="button" class="ank-tab' + (ui.view === t.id ? ' active' : '') + '" data-view="' + t.id + '">' +
        '<span class="tl">' + t.l + '</span><span class="ts">' + t.s + '</span></button>',
      )
      .join('');

    return (
      '<div class="ank-layout">' +
      '<aside class="ank-aside">' +
      '<div class="panel panel-spaced"><div class="panel-title">Seçim<span class="panel-meta">YSK sonuçları</span></div>' + elHtml + '</div>' +
      '<div class="panel panel-spaced"><div class="panel-title">Firmalar<span class="panel-meta">En yakın anket</span></div>' +
      '<div class="ank-firm-list">' + firmsHtml + '</div></div>' +
      '<div class="panel"><div class="panel-title">Resmi sonuç</div><div class="ank-ysk-list">' + yskHtml + '</div></div>' +
      '</aside>' +
      '<div><div class="panel panel-flush panel-spaced"><div class="ank-tabs">' + tabsHtml + '</div></div>' + main + '</div></div>'
    );
  }

  function getUpcomingTargets(e) {
    return e.targets && e.targets.length ? e.targets : e.results.map(r => ({ id: r.id, label: r.label, color: r.color }));
  }

  function loadStoredResearch() {
    try {
      const raw = localStorage.getItem(RESEARCH_STORAGE);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function saveStoredResearch(data) {
    localStorage.setItem(RESEARCH_STORAGE, JSON.stringify(data));
  }

  function getResearchData() {
    const embedded = DATA.researchLatest || { totalHits: 0, items: [] };
    const stored = loadStoredResearch();
    if (!stored || !stored.generatedAt) return embedded;
    if (!embedded.generatedAt) return stored;
    return new Date(stored.generatedAt) >= new Date(embedded.generatedAt) ? stored : embedded;
  }

  function renderResearchPanel(research) {
    const r = research || getResearchData() || { totalHits: 0, items: [], note: 'Henüz tarama yapılmadı.' };
    const hasRun = r.generatedAt && r.totalHits > 0;
    const runLabel = r.generatedAt ? new Date(r.generatedAt).toLocaleString('tr-TR') : null;
    const modeLabel =
      r.mode === 'local-server' || r.mode === 'python' ? 'Python (dosyaya yazıldı)' :
      r.mode === 'browser' ? 'Tarayıcı (localStorage)' : 'Gömülü arşiv';

    let listHtml = '';
    if (hasRun) {
      const items = (r.items || []).slice(0, 40);
      listHtml =
        '<ul class="ank-research-list">' +
        items.map(it => {
          const ch = { tv: '📺', youtube: '▶️', social_media: '💬', online_news: '🌐' }[it.channel] || '📎';
          const date = it.publishedAt ? fmtDate(it.publishedAt) : '—';
          return (
            '<li class="ank-research-item">' +
            (it.firmName ? '<strong class="ank-research-firm">' + esc(it.firmName) + '</strong> ' : '') +
            '<span style="font-size:10px;color:var(--ink-3)">' + ch + ' ' + date + '</span>' +
            '<p style="margin:6px 0;color:var(--ink-2);line-height:1.4">' + esc(it.title) + '</p>' +
            '<a class="ank-src-link" href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">Kaynağı aç →</a></li>'
          );
        }).join('') +
        '</ul>';
      if ((r.items || []).length > 40) {
        listHtml += '<p style="font-size:11px;color:var(--ink-4)">+' + (r.items.length - 40) + ' kaynak daha</p>';
      }
    } else {
      listHtml = '<p class="ank-empty">' + esc(r.note || 'Aşağıdaki düğmeyle taramayı başlatın.') + '</p>';
    }

    const scanBtn =
      '<button type="button" id="ank-research-run" class="ank-btn-research ank-btn-update">' +
      'Anketleri güncelle</button>';

    const localNote = IS_DEV_SERVER
      ? '<p class="panel-note" style="margin-top:12px">Bu sunucu modunda tarama <strong>bundle.json</strong> dosyasına yazılır. Yayın için GitHub\'a push edin.</p>'
      : IS_LOCAL
        ? '<p class="panel-note" style="margin-top:12px">Tam dosya güncellemesi için <strong>SUNUCU.bat</strong> ile açın (port 8765), sonra güncelle\'ye basın.</p>'
        : '<p class="panel-note" style="margin-top:12px">Canlı sitede tarama tarayıcıda çalışır; yeni kaynaklar bu cihazda saklanır. Kalıcı arşiv için yerelde SUNUCU.bat + push gerekir.</p>';

    return (
      '<section class="panel panel-spaced">' +
      '<div class="ank-research-hdr"><h2>Kaynak taraması</h2>' +
      '<p class="panel-note" style="margin:4px 0 0;color:var(--signal-green)">Google News RSS — haber, TV, YouTube başlıkları</p></div>' +
      '<div class="ank-research-controls">' +
      '<label>Dönem<select id="ank-research-days">' +
      '<option value="30">30 gün</option><option value="90">90 gün</option>' +
      '<option value="180">6 ay</option><option value="365" selected>1 yıl</option></select></label>' +
      scanBtn + '</div>' +
      '<p id="ank-research-status" style="font-size:11px;color:var(--ink-3);min-height:1.25rem;margin:0 0 12px"></p>' +
      (runLabel
        ? '<p style="font-size:11px;color:var(--ink-3);margin-bottom:12px">Son tarama: ' + runLabel +
          ' · <strong>' + r.totalHits + '</strong> kaynak · ' + modeLabel +
          (r.newPolls != null ? ' · <strong>' + r.newPolls + '</strong> yeni anket' : '') + '</p>'
        : '') +
      listHtml +
      (r.note && hasRun ? '<p class="panel-note" style="margin-top:12px">' + esc(r.note) + '</p>' : '') +
      localNote + '</section>'
    );
  }

  function renderUpcomingMain() {
    if (!DATA.upcomingElections?.length) {
      return '<p class="ank-empty">Gelecek seçim tanımı yok.</p>';
    }
    const today = new Date().toISOString().slice(0, 10);
    if (!ui.upcomingElectionId) {
      const def = DATA.upcomingElections.find(e => e.date >= today) || DATA.upcomingElections[0];
      ui.upcomingElectionId = def.id;
    }
    const election = DATA.upcomingElections.find(e => e.id === ui.upcomingElectionId);
    const targets = getUpcomingTargets(election);
    const polls = getMergedPollsUpcoming().filter(p => p.electionId === ui.upcomingElectionId);
    const daysLeft = daysBetween(today, election.date);

    const elBtns = DATA.upcomingElections.map(el => {
      const active = el.id === ui.upcomingElectionId ? ' active' : '';
      return (
        '<button type="button" class="ank-el-btn' + active + '" data-up-el="' + el.id + '">' +
        '<span class="t">' + esc(el.title) + '</span><span class="d">' + fmtDate(el.date) + '</span></button>'
      );
    }).join('');

    const pollRows = polls.length
      ? polls
          .sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate))
          .map(p => {
            const firm = getFirm(p.firmId);
            const top = [...p.predictions].sort((a, b) => b.percent - a.percent)[0];
            const tl = top
              ? (targets.find(t => t.id === top.targetId)?.label || top.targetId) + ' ' + fmtPct(top.percent)
              : '—';
            const isNew = p.publishedDate >= today;
            const isScanned = !!p._scanned;
            const dLeft = daysBetween(p.publishedDate, election.date);
            return (
              '<tr><td><strong>' + esc(firm?.name || p.firmId) + '</strong>' +
              (isNew ? ' <span class="ank-badge-new">Yeni</span>' : '') +
              (isScanned ? ' <span class="ank-badge-scan">Taranan</span>' : '') + '</td>' +
              '<td>' + fmtDate(p.publishedDate) + '</td><td>' + fmtDaysUntil(dLeft) + '</td><td>' + esc(tl) + '</td>' +
              '<td>' + renderPrimarySourceCell(p.publications || []) + '</td></tr>'
            );
          }).join('')
      : '<tr><td colspan="5" class="ank-empty">Henüz doğrulanmış anket yok</td></tr>';

    return (
      '<div class="ank-banner">Henüz resmi sonuç yok — puan verilmez.</div>' +
      '<div class="ank-layout">' +
      '<aside class="ank-aside">' +
      '<div class="panel panel-spaced"><div class="panel-title">Gelecek seçim</div><div class="ank-el-grid">' + elBtns + '</div></div>' +
      '<div class="panel" style="background:var(--paper-2)">' +
      '<p style="font-size:11px;font-weight:600;color:var(--signal-amber)">Henüz sonuç yok</p>' +
      '<h3 style="font-family:var(--font-display);font-size:15px;font-weight:600;margin-top:4px">' + esc(election.title) + '</h3>' +
      '<p style="font-size:12px;color:var(--ink-3)">' + fmtDate(election.date) + ' · ' + fmtDaysUntil(daysLeft) + '</p></div></aside>' +
      '<div>' + renderResearchPanel(getResearchData()) +
      '<div class="panel panel-flush"><div style="padding:var(--space-4) var(--space-5);border-bottom:1px solid var(--line-soft)">' +
      '<h2 style="font-family:var(--font-display);font-size:16px;font-weight:600">Doğrulanmış anketler</h2>' +
      '<p class="panel-note" style="margin:0">' + polls.length + ' kayıt</p></div>' +
      '<div class="data-table-wrap"><table class="data-table"><thead><tr>' +
      '<th>Firma</th><th>Tarih</th><th>Seçime kalan</th><th>Öne çıkan</th><th>Kaynak</th></tr></thead><tbody>' +
      pollRows + '</tbody></table></div></div></div></div>'
    );
  }

  function renderFirmsMain() {
    const firms = [...(DATA.firms || [])].sort((a, b) => {
      const sa = getFirmAverageScore(a.id);
      const sb = getFirmAverageScore(b.id);
      if (sa != null && sb != null) return sb - sa || a.name.localeCompare(b.name, 'tr');
      if (sa != null) return -1;
      if (sb != null) return 1;
      return a.name.localeCompare(b.name, 'tr');
    });

    if (!ui.profileFirmId || !firms.find(f => f.id === ui.profileFirmId)) {
      ui.profileFirmId = firms.find(f => getFirmAverageScore(f.id) != null)?.id || firms[0]?.id || null;
    }

    const firm = getFirm(ui.profileFirmId);
    const records = ui.profileFirmId ? getFirmCrossElectionRecords(ui.profileFirmId) : [];
    const avg = ui.profileFirmId ? getFirmAverageScore(ui.profileFirmId) : null;
    const covered = records.filter(r => r.hasData && r.kind === 'past').length;

    const firmBtns = firms.map(f => {
      const active = f.id === ui.profileFirmId ? ' active' : '';
      const avgScore = getFirmAverageScore(f.id);
      return (
        '<button type="button" class="ank-firm-btn' + active + '" data-profile-firm="' + f.id + '">' +
        '<span style="flex:1;min-width:0"><span class="ank-firm-name">' + esc(f.name) + '</span>' +
        (f.website ? '<br><span class="ank-firm-sub">' + esc(f.website.replace(/^https?:\/\//, '')) + '</span>' : '') +
        '</span>' +
        (avgScore != null
          ? '<span class="ank-grade ank-grade-b" title="Ortalama puan">' + avgScore + '</span>'
          : '<span class="ank-firm-sub">—</span>') +
        '</button>'
      );
    }).join('');

    const rows = records.length
      ? records.map(rec => {
          if (rec.kind === 'past') {
            if (!rec.hasData) {
              return (
                '<tr class="ank-firm-row-empty"><td>' + esc(rec.election.title) + '</td>' +
                '<td>' + fmtDate(rec.election.date) + '</td>' +
                '<td colspan="6" class="ank-empty" style="padding:12px">Bu seçimde kayıtlı anket yok</td></tr>'
              );
            }
            const b = rec.best;
            return (
              '<tr><td><strong>' + esc(rec.election.title) + '</strong></td>' +
              '<td>' + fmtDate(rec.election.date) + '</td>' +
              '<td>' + fmtDate(b.poll.publishedDate) + '</td>' +
              '<td>' + fmtDays(b.acc.days) + '</td>' +
              '<td class="num">' + fmtPct(b.acc.mae) + '</td>' +
              '<td><span class="ank-grade ' + b.grade.cls + '">' + b.grade.letter + '</span> ' +
              '<strong class="num">' + b.score + '</strong></td>' +
              '<td onclick="event.stopPropagation()">' + renderPrimarySourceCell(b.poll.publications) + '</td></tr>'
            );
          }
          if (!rec.hasData) {
            return (
              '<tr class="ank-firm-row-empty"><td>' + esc(rec.election.title) + '</td>' +
              '<td>' + fmtDate(rec.election.date) + '</td>' +
              '<td colspan="6" class="ank-empty" style="padding:12px">Henüz paylaşım yok</td></tr>'
            );
          }
          const p = rec.latest;
          const top = [...(p.predictions || [])].sort((a, b) => b.percent - a.percent)[0];
          const targets = getUpcomingTargets(rec.election);
          const tl = top
            ? (targets.find(t => t.id === top.targetId)?.label || top.targetId) + ' ' + fmtPct(top.percent)
            : (p._scanned ? 'Oran doğrulanmadı' : '—');
          return (
            '<tr><td><strong>' + esc(rec.election.title) + '</strong> <span class="ank-badge-new">Gelecek</span></td>' +
            '<td>' + fmtDate(rec.election.date) + '</td>' +
            '<td>' + fmtDate(p.publishedDate) + (p._scanned ? ' <span class="ank-badge-scan">Taranan</span>' : '') + '</td>' +
            '<td>—</td><td>—</td><td>—</td>' +
            '<td><span style="font-size:12px;color:var(--ink-2)">' + esc(tl) + '</span><br>' +
            renderPrimarySourceCell(p.publications || []) + '</td></tr>'
          );
        }).join('')
      : '<tr><td colspan="7" class="ank-empty">Firma seçin</td></tr>';

    return (
      '<div class="ank-layout">' +
      '<aside class="ank-aside">' +
      '<div class="panel panel-spaced"><div class="panel-title">Anket firmaları<span class="panel-meta">' + firms.length + ' firma</span></div>' +
      '<div class="ank-firm-list ank-firm-list-tall">' + firmBtns + '</div></div></aside>' +
      '<div>' +
      '<div class="panel panel-spaced ank-firm-profile-hdr">' +
      '<p class="ank-kicker">Firma profili</p>' +
      '<h2 style="font-family:var(--font-display);font-size:20px;font-weight:600;margin:4px 0">' + esc(firm?.name || '—') + '</h2>' +
      '<div class="ank-firm-stats">' +
      '<div class="ank-firm-stat"><span class="lbl">Kapsanan seçim</span><strong>' + covered + '</strong></div>' +
      '<div class="ank-firm-stat"><span class="lbl">Ortalama puan</span><strong>' + (avg != null ? avg + '/100' : '—') + '</strong></div>' +
      '<div class="ank-firm-stat"><span class="lbl">Puan formülü</span><strong>100 − sapma×10</strong></div>' +
      '</div>' +
      '<p class="panel-note" style="margin:12px 0 0">Her geçmiş seçimde firmaya ait <em>seçime en yakın</em> anket esas alınır. Gelecek seçimlerde puan verilmez.</p></div>' +
      '<div class="panel panel-flush"><div class="data-table-wrap"><table class="data-table ank-firm-history-table"><thead><tr>' +
      '<th>Seçim</th><th>Tarih</th><th>Anket tarihi</th><th>Seçime kalan</th><th>Sapma</th><th>Puan</th><th>Kaynak</th>' +
      '</tr></thead><tbody>' + rows + '</tbody></table></div></div></div></div>'
    );
  }

  function renderAboutMain() {
    const a = aboutData;
    if (!a) return '<p class="ank-empty">Hakkında metni yüklenemedi.</p>';

    let sections = '';
    for (const section of a.sections) {
      sections += '<div class="ank-about-block"><h3>' + esc(section.title) + '</h3>';
      if (section.lead) sections += '<p>' + esc(section.lead) + '</p>';
      if (section.bullets?.length) {
        sections += '<ul>' + section.bullets.map(b => '<li>' + esc(b) + '</li>').join('') + '</ul>';
      }
      if (section.paragraphs) {
        sections += section.paragraphs.map(p => '<p>' + esc(p) + '</p>').join('');
      }
      if (section.note) sections += '<p style="color:var(--ink-3)">' + esc(section.note) + '</p>';
      sections += '</div>';
    }

    return (
      '<div class="ank-about-card">' +
      '<div class="ank-about-hdr">' +
      '<div class="ank-about-logo" aria-hidden="true">AT</div>' +
      '<div><p class="ank-kicker">' + esc(a.brand.project) + '</p>' +
      '<h2 style="font-family:var(--font-display);font-size:22px;font-weight:600;margin-top:4px">Anket firmaları</h2>' +
      '<p style="font-size:13px;font-weight:600;color:var(--ink-2);margin-top:4px">' + esc(a.brand.author) + '</p>' +
      '<p style="font-size:14px;color:var(--ink-2);margin-top:8px;line-height:1.5">' + esc(a.brand.tagline) + '</p></div></div>' +
      '<div class="ank-about-body"><p>' + esc(a.intro) + '</p>' +
      '<p class="ank-about-highlight">' + esc(a.archiveNote) + '</p>' + sections +
      '<p style="border-top:1px solid var(--line-soft);padding-top:var(--space-4);margin-bottom:0">' + esc(a.summary) + '</p></div></div>'
    );
  }

  function syncUrl() {
    const params = { mode: ui.mode };
    if (ui.mode === 'archive') {
      if (ui.electionId) params.election = ui.electionId;
      if (ui.firmId) params.firm = ui.firmId;
      if (ui.view && ui.view !== 'compare') params.view = ui.view;
    } else if (ui.mode === 'upcoming' && ui.upcomingElectionId) {
      params.election = ui.upcomingElectionId;
    } else if (ui.mode === 'firms' && ui.profileFirmId) {
      params.firm = ui.profileFirmId;
    }
    window.AT.navigate('anket', params);
  }

  function paint() {
    if (!rootEl) return;
    const meta = document.getElementById('ank-meta');
    if (meta && DATA.dataRange) {
      meta.textContent =
        DATA.dataRange.from + '–' + DATA.dataRange.to + ' · ' +
        DATA.dataRange.electionCount + ' seçim · ' + DATA.dataRange.pollCount + ' anket';
    }

    document.querySelectorAll('.ank-mode-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === ui.mode);
    });

    const content = document.getElementById('ank-content');
    if (!content) return;

    if (ui.mode === 'archive') content.innerHTML = renderArchiveMain();
    else if (ui.mode === 'upcoming') content.innerHTML = renderUpcomingMain();
    else if (ui.mode === 'firms') content.innerHTML = renderFirmsMain();
    else content.innerHTML = renderAboutMain();

    bindContentEvents(content);
  }

  async function isLocalServerUp() {
    try {
      const r = await fetch(LOCAL_API + '/api/health', { signal: AbortSignal.timeout(1500) });
      return r.ok;
    } catch {
      return false;
    }
  }

  async function fetchRssText(query) {
    const rssUrl = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=tr&gl=TR&ceid=TR:tr';
    const proxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(rssUrl);
    const resp = await fetch(proxy, { signal: AbortSignal.timeout(25000) });
    if (!resp.ok) throw new Error('RSS alınamadı: ' + query);
    return resp.text();
  }

  function guessFirm(title) {
    const lower = title.toLowerCase();
    if (/özk[ıi]raz|ozkiraz|kemal özk/i.test(lower)) {
      return DATA.firms.find(f => f.id === 'ozkiraz') || null;
    }
    for (const f of DATA.firms) {
      const name = f.name.toLowerCase();
      if (lower.includes(name)) return f;
      const token = name.split(/\s+/)[0];
      if (token.length > 3 && lower.includes(token)) return f;
    }
    return null;
  }

  function detectChannel(url) {
    const rules = [
      [/youtube\.com|youtu\.be/i, 'youtube'],
      [/twitter\.com|x\.com/i, 'social_media'],
      [/haberturk|halktv|tv100|cnnturk|ntv|showtv|atv|trt/i, 'tv'],
      [/sozcu|cumhuriyet|hurriyet|milliyet|sabah|diken|t24|bianet/i, 'online_news'],
    ];
    for (const [re, ch] of rules) {
      if (re.test(url)) return ch;
    }
    return 'online_news';
  }

  function parseRssItems(xmlText, sinceMs, firmId) {
    const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
    const nodes = doc.querySelectorAll('item');
    const out = [];
    nodes.forEach(item => {
      const title = item.querySelector('title')?.textContent?.trim() || '';
      const link = item.querySelector('link')?.textContent?.trim() || '';
      const pubRaw = item.querySelector('pubDate')?.textContent?.trim() || '';
      if (!title || !link || !RESEARCH_KEYWORDS.test(title)) return;
      let pubMs = pubRaw ? Date.parse(pubRaw) : NaN;
      if (!Number.isNaN(pubMs) && pubMs < sinceMs) return;
      const firm = firmId ? DATA.firms.find(f => f.id === firmId) : guessFirm(title);
      out.push({
        firmId: firm?.id,
        firmName: firm?.name,
        title,
        url: link,
        publishedAt: Number.isNaN(pubMs) ? null : new Date(pubMs).toISOString().slice(0, 10),
        channel: detectChannel(link),
        outlet: 'Google News',
        source: 'browser_rss',
      });
    });
    return out;
  }

  function dedupeItems(items) {
    const seen = new Set();
    return items
      .sort((a, b) => (b.publishedAt || '').localeCompare(a.publishedAt || ''))
      .filter(it => {
        const key = it.url.replace(/\?.*$/, '').toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }

  async function runBrowserResearch(days, onProgress) {
    const queries = buildResearchQueries();
    const sinceMs = Date.now() - days * 86400000;
    const all = [];
    for (let i = 0; i < queries.length; i++) {
      const [firmId, query] = queries[i];
      onProgress('Tarayıcı modu (' + (i + 1) + '/' + queries.length + '): ' + query);
      try {
        const xml = await fetchRssText(query);
        all.push(...parseRssItems(xml, sinceMs, firmId));
      } catch (e) {
        console.warn(e);
      }
      await new Promise(r => setTimeout(r, 400));
    }
    const items = dedupeItems(all);
    const now = new Date().toISOString();
    const added = mergeScannedPollsFromResearch({ items });
    return {
      generatedAt: now,
      periodFrom: new Date(sinceMs).toISOString().slice(0, 10),
      periodTo: now.slice(0, 10),
      daysBack: days,
      totalHits: items.length,
      newPolls: added,
      items,
      mode: 'browser',
      note: items.length + ' kaynak bulundu' + (added ? (' · ' + added + ' yeni anket eklendi') : '') + ' (tarayıcı modu).',
    };
  }

  async function startResearchScan(days) {
    const btn = document.getElementById('ank-research-run');
    const status = document.getElementById('ank-research-status');
    if (!btn || btn.disabled) return;
    btn.disabled = true;
    const prev = btn.textContent;
    btn.textContent = 'Taranıyor…';
    const setStatus = msg => { if (status) status.textContent = msg; };
    try {
      let result;
      if (await isLocalServerUp()) {
        setStatus('Python taraması çalışıyor…');
        const r = await fetch(LOCAL_API + '/api/research?days=' + days, {
          method: 'POST',
          signal: AbortSignal.timeout(600000),
        });
        result = await r.json();
        if (!r.ok || result.error) throw new Error(result.error || 'Sunucu hatası');
        result.mode = result.mode || 'python';
        if (result.regenerated) {
          DATA = null;
          setStatus('Tamam — ' + (result.newPolls || 0) + ' yeni anket · veri yenileniyor…');
          const bundle = await fetch(BUNDLE_PATH + '?t=' + Date.now()).then(res => {
            if (!res.ok) throw new Error('Veri yenilenemedi');
            return res.json();
          });
          DATA = bundle;
          setStatus('Tamam: ' + result.totalHits + ' kaynak · ' + (result.newPolls || 0) + ' yeni anket');
          paint();
          return;
        }
      } else {
        setStatus('Tarayıcı taraması başladı…');
        result = await runBrowserResearch(days, setStatus);
      }
      saveStoredResearch(result);
      DATA.researchLatest = result;
      setStatus('Tamam: ' + result.totalHits + ' kaynak' +
        (result.newPolls ? ' · ' + result.newPolls + ' yeni anket' : ''));
      paint();
    } catch (e) {
      setStatus('Hata: ' + (e.message || e));
    } finally {
      btn.disabled = false;
      btn.textContent = prev;
    }
  }

  function bindContentEvents(content) {
    content.querySelectorAll('[data-el]').forEach(btn => {
      btn.addEventListener('click', () => {
        ui.electionId = btn.dataset.el;
        ui.firmId = null;
        syncUrl();
      });
    });
    content.querySelectorAll('[data-firm]').forEach(btn => {
      btn.addEventListener('click', () => {
        ui.firmId = btn.dataset.firm;
        ui.view = 'firm-shares';
        syncUrl();
      });
    });
    content.querySelectorAll('[data-firm-row]').forEach(row => {
      row.addEventListener('click', () => {
        ui.firmId = row.dataset.firmRow;
        ui.view = 'firm-shares';
        syncUrl();
      });
    });
    content.querySelectorAll('[data-view]').forEach(btn => {
      btn.addEventListener('click', () => {
        ui.view = btn.dataset.view;
        syncUrl();
      });
    });
    content.querySelectorAll('[data-up-el]').forEach(btn => {
      btn.addEventListener('click', () => {
        ui.upcomingElectionId = btn.dataset.upEl;
        syncUrl();
      });
    });
    content.querySelectorAll('[data-profile-firm]').forEach(btn => {
      btn.addEventListener('click', () => {
        ui.profileFirmId = btn.dataset.profileFirm;
        syncUrl();
      });
    });
    const researchBtn = content.querySelector('#ank-research-run');
    if (researchBtn && !researchBtn.dataset.bound) {
      researchBtn.dataset.bound = '1';
      researchBtn.addEventListener('click', () => {
        const days = parseInt(document.getElementById('ank-research-days')?.value || '365', 10);
        startResearchScan(days);
      });
    }
  }

  function initFromParams(params) {
    params = params || {};
    ui.mode = ['archive', 'upcoming', 'firms', 'about'].includes(params.mode) ? params.mode : 'archive';
    ui.view = params.view || 'compare';
    ui.firmId = null;
    ui.profileFirmId = null;
    if (ui.mode === 'upcoming') {
      ui.upcomingElectionId = params.election || null;
      ui.electionId = null;
    } else if (ui.mode === 'archive') {
      ui.electionId = params.election || null;
      ui.firmId = params.firm || null;
      ui.upcomingElectionId = null;
    } else if (ui.mode === 'firms') {
      ui.profileFirmId = params.firm || null;
      ui.electionId = null;
      ui.upcomingElectionId = null;
    } else {
      ui.electionId = null;
      ui.upcomingElectionId = null;
    }
    if (ui.mode === 'archive' && !ui.electionId) ui.electionId = defaultElectionId();
  }

  window.Modules.anket = async function(container, ctx) {
    rootEl = container;
    container.innerHTML = '<div class="loading">Yükleniyor</div>';

    try {
      if (!DATA) {
        const [bundle, about] = await Promise.all([
          fetch(BUNDLE_PATH).then(r => {
            if (!r.ok) throw new Error('Anket verisi yüklenemedi (' + r.status + ')');
            return r.json();
          }),
          fetch(ABOUT_PATH).then(r => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        DATA = bundle;
        aboutData = about;
      }
    } catch (e) {
      container.innerHTML =
        '<header class="page-header"><h1>Anket firmaları</h1>' +
        '<p class="lede">Veri yüklenemedi: ' + esc(e.message) + '</p></header>';
      return;
    }

    initFromParams(ctx.params || {});

    container.innerHTML =
      '<div class="ank-page">' +
      '<header class="page-header">' +
      '<span class="eyebrow">Modül · 09 · Anket karşılaştırması</span>' +
      '<h1>Anket firmaları</h1>' +
      '<p class="lede">Kamuoyu araştırma şirketlerinin seçim öncesi paylaşımlarını resmi YSK sonuçlarıyla karşılaştırın. Her paylaşımın kaynağına tıklayarak ulaşın.</p>' +
      '<p class="ank-meta" id="ank-meta"></p></header>' +
      (window.AT.renderDataFreshness ? window.AT.renderDataFreshness() : '') +
      (window.AT.renderContextNotice ? window.AT.renderContextNotice('anket') : '') +
      '<nav class="ank-mode-nav" aria-label="Anket modu">' +
      '<button type="button" class="ank-mode-btn' + (ui.mode === 'archive' ? ' active' : '') + '" data-mode="archive">Geçmiş seçimler</button>' +
      '<button type="button" class="ank-mode-btn' + (ui.mode === 'upcoming' ? ' active' : '') + '" data-mode="upcoming">Gelecek seçimler</button>' +
      '<button type="button" class="ank-mode-btn' + (ui.mode === 'firms' ? ' active' : '') + '" data-mode="firms">Firma profilleri</button>' +
      '<button type="button" class="ank-mode-btn' + (ui.mode === 'about' ? ' active' : '') + '" data-mode="about">Hakkında</button>' +
      '</nav>' +
      '<div id="ank-content"></div>' +
      '<p class="footnote">Resmi sonuçlar YSK verilerine dayanır. Puan = 100 − (ortalama sapma × 10). Gelecek seçimlerde puan verilmez.</p>' +
      '</div>';

    container.querySelectorAll('.ank-mode-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        ui.mode = btn.dataset.mode;
        syncUrl();
      });
    });

    paint();
  };
})();
