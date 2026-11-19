// site.js — the skin and language switchers and a few small page behaviours.
// Loaded in <head> (not deferred) so the skin and the language are applied before the page is painted.
//
// Language: cookie "lang"; without it, the browser's language (Russian if it is set to Russian, English otherwise).
// - Pages marked <html data-i18n> (the home page) switch in place: every element with data-ru-text gets that text
//   in Russian (the English is kept in data-en-text), data-ru-placeholder / data-ru-label do the same for the
//   placeholder and aria-label, and a link's data-ru replaces its href. Other scripts hear the change through
//   the "krm:lang" event on document and read the language from <html lang>.
// - Article pages are written in one language: the switch opens the translation when there is one
//   (<link rel="alternate" hreflang>), and the other languages are shown greyed out when there is none.
(function () {
  var SKINS = ['light', 'dark', 'scientific', 'pulp'];
  var NAMES = {
    en: { light: 'Light', dark: 'Dark', scientific: 'Scientific', pulp: 'Pulp', group: 'Skin' },
    ru: { light: 'Светлая', dark: 'Тёмная', scientific: 'Научная', pulp: 'Pulp', group: 'Оформление' }
  };
  var LANGS = ['en', 'ru'];
  var LANG_NAMES = { en: 'English', ru: 'Русский' };
  var ONLY_IN = { en: 'This article is only in English', ru: 'Эта статья есть только на русском' };
  var root = document.documentElement;
  var inPlace = root.hasAttribute('data-i18n');

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

  // The tab icon, the touch icon and the phone's address-bar colour follow the skin as well.
  var THEME_COLOR = { light: '#123a73', dark: '#0e1116', scientific: '#ffffff', pulp: '#efb81f' };

  function applyIcons(next) {
    var links = document.querySelectorAll('link[rel~="icon"], link[rel="apple-touch-icon"]');
    for (var i = 0; i < links.length; i++) {
      links[i].href = links[i].getAttribute('href').replace(/-(light|dark|scientific|pulp)-/, '-' + next + '-');
    }
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_COLOR[next]);
  }

  // ---------- language: cookie "lang" ----------

  function initialLang() {
    var saved = readCookie('lang');
    if (LANGS.indexOf(saved) >= 0) return saved;
    return (navigator.language || '').toLowerCase().indexOf('ru') === 0 ? 'ru' : 'en';
  }

  var lang = initialLang();
  if (inPlace) root.lang = lang;

  function pageLang() { return (root.lang || 'en').slice(0, 2); }

  // Swaps the texts of a data-i18n page between English and Russian.
  function translatePage() {
    var ru = lang === 'ru';
    var swap = function (sel, ruAttr, enAttr, get, set) {
      var nodes = document.querySelectorAll(sel);
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (!n.hasAttribute(enAttr)) n.setAttribute(enAttr, get(n));
        set(n, n.getAttribute(ru ? ruAttr : enAttr));
      }
    };
    swap('[data-ru-text]', 'data-ru-text', 'data-en-text',
      function (n) { return n.textContent; }, function (n, v) { n.textContent = v; });
    swap('[data-ru-placeholder]', 'data-ru-placeholder', 'data-en-placeholder',
      function (n) { return n.placeholder; }, function (n, v) { n.placeholder = v; });
    swap('[data-ru-label]', 'data-ru-label', 'data-en-label',
      function (n) { return n.getAttribute('aria-label'); }, function (n, v) { n.setAttribute('aria-label', v); });
    swap('a[data-ru]', 'data-ru', 'data-en',
      function (n) { return n.getAttribute('href'); }, function (n, v) { n.setAttribute('href', v); });
    var title = document.querySelector('title');
    if (title && title.hasAttribute('data-ru-text')) document.title = title.textContent;
  }

  function setLang(next) {
    if (inPlace) {
      lang = next;
      writeCookie('lang', next);
      root.lang = next;
      translatePage();
      labelSkins();
      markLangs();
      document.dispatchEvent(new CustomEvent('krm:lang', { detail: next }));
      return;
    }
    var alt = document.querySelector('link[rel="alternate"][hreflang="' + next + '"]');
    if (!alt) return;
    writeCookie('lang', next);
    location.href = alt.getAttribute('href') + location.hash;
  }

  // Put <div id="lang-switch"></div> in the header.
  function buildLangSwitch() {
    var host = document.getElementById('lang-switch');
    if (!host) return;
    host.className = 'lang-switch-head';
    host.setAttribute('role', 'radiogroup');
    host.setAttribute('aria-label', 'Language / Язык');
    LANGS.forEach(function (code) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-lang-option', code);
      b.lang = code;
      b.textContent = code.toUpperCase();
      b.addEventListener('click', function () { setLang(code); });
      host.appendChild(b);
    });
    markLangs();
  }

  function markLangs() {
    var current = inPlace ? lang : pageLang();
    var buttons = document.querySelectorAll('.lang-switch-head button');
    for (var i = 0; i < buttons.length; i++) {
      var code = buttons[i].getAttribute('data-lang-option');
      var available = inPlace || code === current ||
        !!document.querySelector('link[rel="alternate"][hreflang="' + code + '"]');
      buttons[i].setAttribute('aria-checked', String(code === current));
      buttons[i].disabled = !available;
      buttons[i].title = available ? LANG_NAMES[code] : ONLY_IN[current] || '';
    }
  }

  var skin = initialSkin();
  root.setAttribute('data-skin', skin);
  applyIcons(skin);

  function setSkin(next) {
    skin = next;
    root.setAttribute('data-skin', next);
    applyIcons(next);
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
    host.className = 'skin-switch';
    host.setAttribute('role', 'radiogroup');
    SKINS.forEach(function (s) {
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('role', 'radio');
      b.setAttribute('data-skin-option', s);
      b.setAttribute('aria-checked', String(s === skin));
      var swatch = document.createElement('span');
      swatch.className = 'swatch';
      var label = document.createElement('span');
      label.className = 'skin-name';
      b.appendChild(swatch);
      b.appendChild(label);
      b.addEventListener('click', function () { setSkin(s); });
      host.appendChild(b);
    });
    labelSkins();
  }

  function labelSkins() {
    var names = NAMES[pageLang()] || NAMES.en;
    var host = document.getElementById('skin-switch');
    if (host) host.setAttribute('aria-label', names.group);
    var buttons = document.querySelectorAll('.skin-switch button');
    for (var i = 0; i < buttons.length; i++) {
      var s = buttons[i].getAttribute('data-skin-option');
      buttons[i].title = names[s];
      buttons[i].querySelector('.skin-name').textContent = names[s];
    }
  }

  // ---------- small behaviours ----------

  function onReady() {
    buildLangSwitch();
    buildSwitcher();
    if (inPlace) translatePage();

    // Section ids are the same in every language, so switching language can stay at the same section.
    var badges = document.querySelectorAll('.article-nav a.lang-badge');
    for (var i = 0; i < badges.length; i++) {
      badges[i].addEventListener('click', function () {
        if (location.hash) this.href = this.getAttribute('href').split('#')[0] + location.hash;
      });
    }

    // Remember the language when a reader opens a translation from an article's own EN / RU badges.
    var own = document.querySelectorAll('.article-nav a.lang-badge[hreflang]');
    for (var k = 0; k < own.length; k++) {
      own[k].addEventListener('click', function () { writeCookie('lang', this.getAttribute('hreflang')); });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', onReady);
  else onReady();
})();
