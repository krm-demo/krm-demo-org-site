// build-site-info.js — shows which build of the site is being served, e.g.
//   "<GitHub mark> build #7 · v0.2.0 · a10737a · aws-s3 · deployed 3 minutes ago"
// Data comes from build-site.json, written by scripts/build.sh during the GitHub Actions build.
// Put <span id="build-info"></span> anywhere in a page and include this script.
(function () {
  var el = document.getElementById('build-info');
  if (!el) return;

  var shownKey = null;
  var builtAt = null;
  var ageEl = null;

  function link(text, href) {
    if (!href) { var s = document.createElement('span'); s.textContent = text; return s; }
    var a = document.createElement('a');
    a.href = href; a.textContent = text; a.target = '_blank'; a.rel = 'noopener';
    a.className = 'link-secondary';
    return a;
  }

  // The GitHub mark (Octicons "mark-github"), sized to the text and coloured like it.
  function githubMark() {
    var ns = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('width', '1em');
    svg.setAttribute('height', '1em');
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('role', 'img');
    svg.setAttribute('aria-label', 'GitHub workflow');
    svg.style.verticalAlign = '-0.125em';
    svg.style.marginRight = '0.3em';
    var path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z');
    svg.appendChild(path);
    return svg;
  }

  function ago(date) {
    var sec = Math.round((date.getTime() - Date.now()) / 1000); // negative = past
    var rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    var units = [['year', 31536000], ['month', 2592000], ['day', 86400], ['hour', 3600], ['minute', 60]];
    for (var i = 0; i < units.length; i++) {
      if (Math.abs(sec) >= units[i][1]) return rtf.format(Math.round(sec / units[i][1]), units[i][0]);
    }
    return rtf.format(sec, 'second');
  }

  function render(b) {
    var gh = b.repo ? 'https://github.com/' + b.repo : null;
    var runUrl = gh && b.run_id ? gh + '/actions/runs/' + b.run_id : null;
    var parts = [];
    // "<GitHub mark> build #7" -> the workflow run that built it
    if (b.run_number) {
      var run = link('build #' + b.run_number + (b.run_attempt > 1 ? '.' + b.run_attempt : ''), runUrl);
      run.insertBefore(githubMark(), run.firstChild);
      run.title = 'GitHub workflow run';
      parts.push(run);
    } else {
      parts.push(link('Local build', null));
    }
    // "v0.2.0"/"main" -> the repository at that tag or branch
    if (b.ref) parts.push(link(b.ref, gh ? gh + '/tree/' + encodeURI(b.ref) : null));
    // "a10737a"      -> the commit
    if (b.sha) parts.push(link(b.sha.slice(0, 7), gh ? gh + '/commit/' + b.sha : null));
    if (b.target) parts.push(link(b.target, null));

    // "deployed 3 minutes ago" -> the workflow run as well; exact time on hover
    builtAt = new Date(b.built_at);
    ageEl = link('', runUrl);
    ageEl.title = 'Built ' + builtAt.toLocaleString() + (b.workflow ? ' by "' + b.workflow + '"' : '');
    parts.push(ageEl);

    el.textContent = '';
    parts.forEach(function (p, i) {
      if (i) el.appendChild(document.createTextNode(' · '));
      el.appendChild(p);
    });
    tick();
  }

  function tick() {
    if (ageEl && builtAt && !isNaN(builtAt)) ageEl.textContent = 'deployed ' + ago(builtAt);
  }

  function load() {
    fetch('build-site.json', { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (b) {
        var key = [b.sha, b.run_id, b.run_attempt, b.built_at].join('|');
        if (shownKey === null) { shownKey = key; render(b); }
        else if (key !== shownKey) {
          // A newer build was deployed while this page was open.
          if (!document.getElementById('build-info-new')) {
            var n = document.createElement('a');
            n.id = 'build-info-new'; n.href = ''; n.className = 'ms-2 fw-bold';
            n.textContent = 'new version deployed — reload';
            el.appendChild(n);
          }
        }
      })
      .catch(function () {
        if (shownKey === null) el.textContent = 'Local preview (no build info)';
      });
  }

  // Re-check build-site.json about once a minute to notice a newer deploy.
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
    tick();
    poll();
  });

  load();
  schedule();
  setInterval(tick, 30 * 1000);   // keep "x minutes ago" current
})();
