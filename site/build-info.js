// Shows which build of the site is being served, e.g.
//   "Build #7 · v0.2.0 · a10737a · aws-s3 · deployed 3 minutes ago"
// Data comes from build.json, written by scripts/build.sh during the GitHub Actions build.
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
    var parts = [];
    parts.push(b.run_number
      ? link('Build #' + b.run_number + (b.run_attempt > 1 ? '.' + b.run_attempt : ''),
             gh && b.run_id ? gh + '/actions/runs/' + b.run_id : null)
      : link('Local build', null));
    if (b.ref) parts.push(link(b.ref, gh ? gh + '/tree/' + encodeURIComponent(b.ref) : null));
    if (b.sha) parts.push(link(b.sha.slice(0, 7), gh ? gh + '/commit/' + b.sha : null));
    if (b.target) parts.push(link(b.target, null));

    builtAt = new Date(b.built_at);
    ageEl = document.createElement('span');
    ageEl.title = builtAt.toLocaleString();
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
    fetch('build.json', { cache: 'no-store' })
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

  load();
  setInterval(tick, 30 * 1000);   // keep "x minutes ago" current
  setInterval(load, 60 * 1000);   // notice a newer deploy
})();
