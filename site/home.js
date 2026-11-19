// home.js — the category chips, the "All" checkbox and the search box on the home page.
// The lists themselves are written by scripts/build-home.py; this only hides and shows their rows.
//
// Chips work like checkboxes: each one switches its category on or off, any number at once.
// The square "all" button is pressed when every chip is on, half-pressed (aria-pressed="mixed", dashed outline)
// when some are, and not pressed when none are; clicking it switches every chip on, or every chip off when all were on.
// The choice is kept for a year in the cookie "cats-off": the categories switched OFF, comma-separated,
// so that a category added later shows up switched on. Where stats.json exists, The Collection also
// shows how many times each page was opened (the same numbers as the badge on the articles).
(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip:not([disabled])'));
  var all = document.getElementById('all-categories');
  var search = document.getElementById('collection-search');
  if (!all) return;

  function on(chip) { return chip.getAttribute('aria-pressed') === 'true'; }

  function readOff() {
    var m = document.cookie.match(/(?:^|; )cats-off=([^;]*)/);
    return m ? decodeURIComponent(m[1]).split(',').filter(Boolean) : [];
  }

  function saveOff() {
    var off = chips.filter(function (c) { return !on(c); }).map(function (c) { return c.getAttribute('data-category'); });
    document.cookie = 'cats-off=' + encodeURIComponent(off.join(',')) + '; Max-Age=31536000; Path=/; SameSite=Lax';
  }

  var off = readOff();
  chips.forEach(function (c) {
    if (off.indexOf(c.getAttribute('data-category')) >= 0) c.setAttribute('aria-pressed', 'false');
  });

  function chosen() {
    var set = {};
    chips.forEach(function (c) { if (on(c)) set[c.getAttribute('data-category')] = true; });
    return set;
  }

  function apply() {
    var cats = chosen();
    var count = chips.filter(on).length;
    all.setAttribute('aria-pressed', count === chips.length ? 'true' : count > 0 ? 'mixed' : 'false');

    var words = (search && search.value || '').toLowerCase().split(/\s+/).filter(Boolean);
    [['#exhibition-list', false], ['#collection-list', true]].forEach(function (pair) {
      var list = document.querySelector(pair[0]);
      if (!list) return;
      var shown = 0;
      Array.prototype.forEach.call(list.children, function (row) {
        var ok = !!cats[row.getAttribute('data-category')];
        if (ok && pair[1] && words.length) {
          var text = row.getAttribute('data-search') || '';
          ok = words.every(function (w) { return text.indexOf(w) >= 0; });
        }
        row.hidden = !ok;
        if (ok) shown++;
      });
      var note = list.parentNode.querySelector('.empty-note');
      if (note) note.hidden = shown > 0;
      // An empty section keeps its place, but its heading fades (see .is-empty in site.css).
      list.parentNode.classList.toggle('is-empty', shown === 0);
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chip.setAttribute('aria-pressed', String(!on(chip)));
      saveOff();
      apply();
    });
  });
  all.addEventListener('click', function () {
    var everyOn = chips.every(on);
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(!everyOn)); });
    saveOff();
    apply();
  });
  if (search) search.addEventListener('input', apply);
  apply();

  // Visit counts in The Collection, when stats.json is there (production only).
  // Russian: 1 открытие, 2–4 открытия, 5+ открытий (11–14 also "открытий").
  function opened(n) {
    if ((document.documentElement.lang || '').indexOf('ru') !== 0) return n + ' opened';
    var d = n % 10, h = n % 100;
    var word = d === 1 && h !== 11 ? 'открытие' : d >= 2 && d <= 4 && (h < 12 || h > 14) ? 'открытия' : 'открытий';
    return n + ' ' + word;
  }

  var stats = null;
  function showVisits() {
    if (!stats) return;
    document.querySelectorAll('#collection-list .item').forEach(function (row) {
      var page = row.getAttribute('data-page');
      var p = page && stats.pages && stats.pages[page];
      var slot = row.querySelector('.item-visits');
      if (p && slot) slot.textContent = ' · ' + opened(p.total);
    });
  }
  document.addEventListener('krm:lang', showVisits);

  fetch('stats.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (s) { stats = s; showVisits(); })
    .catch(function () { /* no numbers here: show nothing */ });
})();
