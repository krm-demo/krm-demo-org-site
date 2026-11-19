// visit-badge.js — shows, quietly, how often this page was opened in the last seven days.
// The numbers come from stats.json, written every hour by a small function that reads the CloudFront
// access logs (infra/visit-counter.yaml; the article docs/visit-counter.md explains what is counted).
// Put <span id="visit-badge"></span> where the badge may appear. Where stats.json does not exist
// (the GitHub Pages preview, a local build) or has no entry for the page, nothing is shown.
(function () {
  var host = document.getElementById('visit-badge');
  if (!host) return;
  var page = location.pathname.split('/').pop() || 'index.html';
  var ru = (document.documentElement.lang || '').indexOf('ru') === 0;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  fetch('stats.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (stats) {
      var p = stats.pages && stats.pages[page];
      if (!p) return;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'visit-badge';
      button.setAttribute('aria-expanded', 'false');
      button.textContent = (ru ? 'Открытий за неделю: ' : 'Opened this week: ') + p.week;

      // One click: the total, since when, and when it was last counted.
      var more = document.createElement('span');
      more.className = 'visit-more';
      more.hidden = true;
      var at = new Date(stats.updated);
      var time = isNaN(at) ? '' : pad(at.getHours()) + ':' + pad(at.getMinutes());
      more.appendChild(document.createTextNode(ru
        ? ' · всего ' + p.total + ' с ' + stats.since + (time ? ', подсчёт в ' + time : '') + ' · '
        : ' · ' + p.total + ' in all since ' + stats.since + (time ? ', counted at ' + time : '') + ' · '));
      var how = document.createElement('a');
      how.href = 'visit-counter.html';
      how.textContent = ru ? 'как это считается' : 'how this is counted';
      more.appendChild(how);

      button.addEventListener('click', function () {
        more.hidden = !more.hidden;
        button.setAttribute('aria-expanded', String(!more.hidden));
      });

      host.appendChild(document.createTextNode('· '));
      host.appendChild(button);
      host.appendChild(more);
    })
    .catch(function () { /* no numbers here: show nothing */ });
})();
