// home.js — the category chips, the "All" checkbox and the search box on the home page.
// The lists themselves are written by scripts/build-home.py; this only hides and shows their rows.
//
// Chips work like checkboxes: each one switches its category on or off, any number at once.
// "All" is ticked when every chip is on, half-ticked when some are, empty when none are;
// clicking it switches every chip on, or every chip off when all were on.
// The choice lives only in the page (nothing is stored). Where stats.json exists, The Collection also
// shows how many times each page was opened (the same numbers as the badge on the articles).
(function () {
  var chips = Array.prototype.slice.call(document.querySelectorAll('.chip:not([disabled])'));
  var all = document.getElementById('all-categories');
  var search = document.getElementById('collection-search');
  if (!all) return;

  function on(chip) { return chip.getAttribute('aria-pressed') === 'true'; }

  function chosen() {
    var set = {};
    chips.forEach(function (c) { if (on(c)) set[c.getAttribute('data-category')] = true; });
    return set;
  }

  function apply() {
    var cats = chosen();
    var count = chips.filter(on).length;
    all.checked = count === chips.length;
    all.indeterminate = count > 0 && count < chips.length;

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
    });
  }

  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      chip.setAttribute('aria-pressed', String(!on(chip)));
      apply();
    });
  });
  all.addEventListener('change', function () {
    var everyOn = chips.every(on);
    chips.forEach(function (c) { c.setAttribute('aria-pressed', String(!everyOn)); });
    apply();
  });
  if (search) search.addEventListener('input', apply);
  apply();

  // Visit counts in The Collection, when stats.json is there (production only).
  var ru = (navigator.language || '').toLowerCase().indexOf('ru') === 0;
  fetch('stats.json', { cache: 'no-cache' })
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (stats) {
      document.querySelectorAll('#collection-list .item').forEach(function (row) {
        var page = row.getAttribute('data-page');
        var p = page && stats.pages && stats.pages[page];
        var slot = row.querySelector('.item-visits');
        if (!p || !slot) return;
        slot.textContent = ' · ' + p.total + (ru ? ' открытий' : ' opened');
      });
    })
    .catch(function () { /* no numbers here: show nothing */ });
})();
