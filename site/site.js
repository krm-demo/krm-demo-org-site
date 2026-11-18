// site.js — the skin switcher and a few small page behaviours.
// Loaded in <head> (not deferred) so the skin is applied before the page is painted.
(function () {
  var SKINS = ['light', 'dark', 'scientific', 'pulp'];
  var NAMES = {
    en: { light: 'Light', dark: 'Dark', scientific: 'Scientific', pulp: 'Pulp', group: 'Skin' },
    ru: { light: 'Светлая', dark: 'Тёмная', scientific: 'Научная', pulp: 'Pulp', group: 'Оформление' }
  };
  var root = document.documentElement;

  // ---------- skin: cookie "skin", kept for a year; without it, follow the system's light/dark setting ----------

  function readCookie(name) {
    var m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : null;
  }

  function writeCookie(name, value) {
    document.cookie = name + '=' + encodeURIComponent(value) + '; Max-Age=31536000; Path=/; SameSite=Lax';
  }

  function initialSkin() {
    var saved = readCookie('skin');
    if (SKINS.indexOf(saved) >= 0) return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  var skin = initialSkin();
  root.setAttribute('data-skin', skin);

  function setSkin(next) {
    skin = next;
    root.setAttribute('data-skin', next);
    writeCookie('skin', next);
    var buttons = document.querySelectorAll('.skin-switch button');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].setAttribute('aria-checked', String(buttons[i].getAttribute('data-skin-option') === next));
    }
  }

  // Put <div id="skin-switch"></div> where the switcher should appear.
  function buildSwitcher() {
    var host = document.getElementById('skin-switch');
    if (!host) return;
    var names = NAMES[(root.lang || 'en').slice(0, 2)] || NAMES.en;
    host.className = 'skin-switch';
    host.setAttribute('role', 'radiogroup');
    host.setAttribute('aria-label', names.group);
    SKINS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-skin-option', s);
      b.setAttribute('aria-checked', String(s === skin));
      b.title = names[s];
      var swatch = document.createElement('span');
      swatch.className = 'swatch';
      var label = document.createElement('span');
      label.className = 'skin-name';
      label.textContent = names[s];
      b.appendChild(swatch);
      b.appendChild(label);
      b.addEventListener('click', function () { setSkin(s); });
      host.appendChild(b);
    });
  }

  // ---------- small behaviours ----------

  function onReady() {
    buildSwitcher();

    // Section ids are the same in every language, so switching language can stay at the same section.
    var badges = document.querySelectorAll('.article-nav a.lang-badge');
    for (var i = 0; i < badges.length; i++) {
      badges[i].addEventListener('click', function () {
        if (location.hash) this.href = this.getAttribute('href').split('#')[0] + location.hash;
      });
    }

    // Home page: a title opens the article in the visitor's language when that translation exists.
    var prefersRu = (navigator.language || '').toLowerCase().indexOf('ru') === 0;
    var titles = document.querySelectorAll('a[data-ru]');
    for (var j = 0; j < titles.length; j++) {
      if (prefersRu) titles[j].href = titles[j].getAttribute('data-ru');
    }

    // Narrow screens: the contents block starts closed.
    var toc = document.querySelector('.toc details');
    if (toc && window.matchMedia && window.matchMedia('(max-width: 62rem)').matches) toc.removeAttribute('open');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
