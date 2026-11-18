// build-site-info.js — shows which build of the site is being served and when it was published, e.g.
//   krm-demo.org (aws-s3):  "<GitHub mark> v0.3.0.3 · published 2026-Nov-16 (Mon) 23:12 EST, yesterday"
//   preview (gh-pages):     "<GitHub mark> v0.3.0.47 · gh-pages · published 2026-Nov-17 (Tue) 22:18 EST, 20 minutes ago"
// The GitHub mark links to the sources (tag or main), the version to the workflow run that built it.
// The commit hash is kept in build-site.json only.
// Data comes from build-site.json, written by scripts/build.sh during the GitHub Actions build.
// Put <span id="build-info"></span> anywhere in a page and include this script.
//
// The line never wraps: it is rendered in several variants, from the most verbose to the shortest,
// and the first one that fits the available width is shown (re-checked when the width changes).
// Dates are shown in the visitor's time zone in the "natural" format of krm-demo/core-utils
// (CoreDateTimeUtils: "yyyy-MM-dd (EEE) HH:mm"), with the month as three letters: "2026-Nov-16 (Mon) 23:12".
(function () {
  var el = document.getElementById('build-info');
  if (!el) return;
  el.style.display = 'block';
  el.style.whiteSpace = 'nowrap';
  el.style.overflow = 'hidden';
  el.style.textOverflow = 'ellipsis';   // last resort if even the shortest variant is too wide

  var build = null;        // the build shown on the page (first build-site.json loaded)
  var shownKey = null;
  var newVersion = false;  // a newer build was published while the page was open
  var noInfo = null;       // text shown when build-site.json can't be loaded

  // ---------- date formatting ----------

  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var COUNT_WORDS = ['zero', 'one', 'two', 'three'];

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  // "2026-Nov-16 (Mon) 23:12" in the visitor's time zone
  function natural(d) {
    return d.getFullYear() + '-' + MONTHS[d.getMonth()] + '-' + pad(d.getDate()) +
      ' (' + DAYS[d.getDay()].slice(0, 3) + ') ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  // "Nov-16 (Mon) 23:12"
  function naturalShort(d) {
    return natural(d).slice(5);
  }

  // "EST", "CET", or "GMT+2" when the browser has no abbreviation for the zone
  function zoneName(d) {
    try {
      var parts = new Intl.DateTimeFormat(undefined, { timeZoneName: 'short' }).formatToParts(d);
      for (var i = 0; i < parts.length; i++) if (parts[i].type === 'timeZoneName') return parts[i].value;
    } catch (e) { /* old browser */ }
    return '';
  }

  function plural(n, unit) { return n + ' ' + unit + (n === 1 ? '' : 's'); }

  function midnight(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

  // Calendar days between two dates (DST-safe: rounds the 23/25-hour days)
  function dayDiff(from, to) { return Math.round((midnight(to) - midnight(from)) / 86400000); }

  // Monday of the date's week (weeks start on Monday, as in ISO-8601)
  function weekStart(d) {
    var m = midnight(d);
    m.setDate(m.getDate() - (m.getDay() + 6) % 7);
    return m;
  }

  // How long ago, in words that follow the calendar rather than a stopwatch:
  // "5 seconds ago", "12 minutes ago", "3 hours ago", "yesterday", "day before yesterday",
  // "this Monday", "last Wednesday", "two weeks ago", "this month", "last month", "4 months ago",
  // "last year", "3 years ago".
  function relative(d, now) {
    var sec = Math.floor((now - d) / 1000);
    if (sec < 5) return 'just now';             // also covers a slightly fast build clock
    if (sec < 60) return plural(sec, 'second') + ' ago';
    if (sec < 3600) return plural(Math.floor(sec / 60), 'minute') + ' ago';

    var days = dayDiff(d, now);
    if (days === 0 || sec < 6 * 3600) return plural(Math.floor(sec / 3600), 'hour') + ' ago';
    if (days === 1) return 'yesterday';
    if (days === 2) return 'day before yesterday';

    var weeks = Math.round((weekStart(now) - weekStart(d)) / (7 * 86400000));
    if (weeks === 0) return 'this ' + DAYS[d.getDay()];
    if (weeks === 1) return 'last ' + DAYS[d.getDay()];
    if (weeks <= 3) return COUNT_WORDS[weeks] + ' weeks ago';

    var years = now.getFullYear() - d.getFullYear();
    var months = years * 12 + now.getMonth() - d.getMonth();
    if (months === 0) return 'this month';
    if (months === 1) return 'last month';
    if (years === 0) return months + ' months ago';
    if (years === 1) return 'last year';
    return years + ' years ago';
  }

  // When the relative text can next change, so the footer stays current without busy updates
  function nextTickMs(d, now) {
    var sec = (now - d) / 1000;
    if (sec < 60) return 1000;
    if (sec < 3600) return 15 * 1000;
    return 60 * 1000;
  }

  // ---------- DOM helpers ----------

  // text: a string, or an array of strings and nodes (e.g. dim() parts)
  function link(text, href, title) {
    var n;
    if (href) {
      n = document.createElement('a');
      n.href = href; n.target = '_blank'; n.rel = 'noopener';
      n.className = 'link-secondary';
    } else {
      n = document.createElement('span');
    }
    [].concat(text).forEach(function (t) {
      n.appendChild(typeof t === 'string' ? document.createTextNode(t) : t);
    });
    if (title) n.title = title;
    return n;
  }

  // Words around the data ("published", "yesterday") are shown dimmer and in italics (class in site.css).
  function dim(text) {
    var s = document.createElement('span');
    s.className = 'build-info-dim';
    s.textContent = text;
    return s;
  }

  // The GitHub mark (Octicons "mark-github"), sized to the text and coloured like it.
  function githubMark() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '1.4em');
    svg.setAttribute('height', '1.4em');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'Sources on GitHub');
    svg.style.verticalAlign = '-0.35em';
    svg.style.marginRight = '0.45em';
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z');
    svg.appendChild(path);
    return svg;
  }

  function reloadLink(text) {
    var n = document.createElement('a');
    n.href = ''; n.className = 'fw-bold';
    n.textContent = text;
    n.title = 'A newer build was published while this page was open';
    return n;
  }

  // ---------- variants, from the most verbose to the shortest ----------

  function variants(b, now) {
    var gh = b.repo ? 'https://github.com/' + b.repo : null;
    var runUrl = gh && b.run_id ? gh + '/actions/runs/' + b.run_id : null;
    var at = new Date(b.built_at);
    var hasDate = !isNaN(at);
    var tip = hasDate ? 'Published ' + at.toISOString().replace('.000', '') + ' (UTC)' : '';
    var rel = hasDate ? relative(at, now) : '';
    var zone = hasDate ? zoneName(at) : '';
    var full = hasDate ? natural(at) : '';
    var short = hasDate ? naturalShort(at) : '';
    var isPublic = b.target === 'aws-s3';

    // The GitHub mark → the sources this build was made from (the tag in production, main on the preview)
    function source() {
      if (!gh || !b.ref) return null;
      var a = link([], gh + '/tree/' + encodeURI(b.ref), 'Sources on GitHub: ' + b.ref);
      a.appendChild(githubMark());
      return a;
    }
    // The version (latest v* tag + workflow run number) → the workflow run that built it
    function version() {
      var v = b.version || b.ref || 'local build';
      var runTitle = b.workflow ? 'Built by workflow "' + b.workflow + '"' + (b.run_number ? ', run #' + b.run_number : '') : null;
      return link(v, runUrl, runTitle);
    }
    // The preview names its environment; the public site doesn't need to.
    function env() { return isPublic || !b.target ? null : link(b.target, null); }
    function when(parts) { return hasDate ? link(parts, null, tip) : null; }
    // [published] 2026-Nov-16 (Mon) 23:12 EST, [yesterday]
    function stamp(withZone) {
      return when([dim('published'), ' ' + full + (withZone && zone ? ' ' + zone : '') + ', ', dim(rel)]);
    }

    // Each variant: [icon, the rest joined with " · "]. The commit stays in build-site.json only.
    return [
      // <GitHub> v0.3.0.3 · published 2026-Nov-16 (Mon) 23:12 EST, yesterday · new version published — reload
      [source(), [version(), env(), stamp(true), newVersion && reloadLink('new version published — reload')]],
      // <GitHub> v0.3.0.3 · published 2026-Nov-16 (Mon) 23:12, yesterday · new version — reload
      [source(), [version(), env(), stamp(false), newVersion && reloadLink('new version — reload')]],
      // <GitHub> v0.3.0.3 · 2026-Nov-16 (Mon) 23:12 · yesterday · ↻ reload
      [source(), [version(), when(full), when([dim(rel)]), newVersion && reloadLink('↻ reload')]],
      // <GitHub> v0.3.0.3 · Nov-16 (Mon) 23:12 · yesterday · ↻
      [source(), [version(), when(short), when([dim(rel)]), newVersion && reloadLink('↻')]],
      // v0.3.0.3 · yesterday · ↻
      [null, [version(), when([dim(rel)]), newVersion && reloadLink('↻')]],
      // yesterday
      [null, [when([dim(rel)]) || version(), newVersion && reloadLink('↻')]]
    ];
  }

  function fill(variant) {
    el.textContent = '';
    if (variant[0]) el.appendChild(variant[0]);
    var first = true;
    variant[1].forEach(function (p) {
      if (!p) return;
      if (!first) el.appendChild(document.createTextNode(' · '));
      el.appendChild(p);
      first = false;
    });
  }

  function fits() { return el.scrollWidth <= el.clientWidth + 1; }

  var tickTimer = null;

  function render() {
    clearTimeout(tickTimer);
    if (!build) { if (noInfo) el.textContent = noInfo; return; }
    var now = new Date();
    var list = variants(build, now);
    for (var i = 0; i < list.length; i++) {
      fill(list[i]);
      if (fits()) break;
    }
    var at = new Date(build.built_at);
    if (!isNaN(at)) tickTimer = setTimeout(render, nextTickMs(at, now));   // keep "… ago" current
  }

  // ---------- loading and polling ----------

  function load() {
    fetch('build-site.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (b) {
        var key = [b.sha, b.run_id, b.run_attempt, b.built_at].join('|');
        if (shownKey === null) { shownKey = key; build = b; render(); }
        else if (key !== shownKey && !newVersion) { newVersion = true; render(); }
      })
      .catch(function () {
        if (shownKey === null) { noInfo = 'Local preview (no build info)'; render(); }
      });
  }

  // Re-check build-site.json about once a minute to notice a newer build.
  // Each wait gets a little random jitter so open pages don't all poll at the same moment.
  // While the tab is hidden (background tab, locked phone) nothing is polled; on return it checks at once.
  var POLL_MS = 60 * 1000, JITTER_MS = 10 * 1000;
  var pollTimer = null;

  function schedule() {
    clearTimeout(pollTimer);
    pollTimer = setTimeout(poll, POLL_MS + Math.random() * JITTER_MS);
  }

  function poll() {
    if (document.hidden) return;   // resumed by the visibilitychange handler
    load();
    schedule();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) { clearTimeout(pollTimer); return; }
    render();
    poll();
  });

  // Pick the variant again whenever the available width changes (rotation, window resize).
  var lastWidth = -1;
  function onResize() {
    var w = el.clientWidth;
    if (w !== lastWidth) { lastWidth = w; render(); }
  }
  if (window.ResizeObserver) new ResizeObserver(onResize).observe(el);
  else window.addEventListener('resize', onResize);

  load();
  schedule();
})();
