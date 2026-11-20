/* swept-amount-math.js — "Balances Equilibrium" (cash sweep math): the swept amount per current balance, as an interactive graph.
 *
 *   x = currentBalance, y = sweptAmount (both in $).
 *   T_min ≤ T_max — thresholds (just T when they are equal); τ_min, τ_max — nominals;
 *   A — available: the balance of the investment account, the most one sweep in can bring back;
 *   L — limit: the largest single payment into the investment account, the most one sweep out may send.
 *
 *     y = A                   x < T_min − A                       Swept in partial (all there is, still short of T_min)
 *     y = T_min − x           T_min − A ≤ x ≤ T_min − τ_min       Swept in full
 *     y = 0                   T_min − τ_min < x < T_max + τ_max   In nominal min / In range / In nominal max
 *     y = x − T_max           T_max + τ_max ≤ x ≤ T_max + L       Swept out
 *     y does not exist        x > T_max + L                       Overflow
 *
 * The nominals are the smallest amounts worth a transfer: a sweep happens only when it moves at least τ. So the
 * function jumps at T_min − τ_min and T_max + τ_max, and the point at the jump belongs to the sweeping piece
 * (filled on the sweep, open on the zero). Every slope is 45°: the axes of each panel have the same $ per pixel.
 *
 * In the code the parameters keep their old names: tmin, tmax (T), nmin, nmax (τ), imax (A), omax (L).
 *
 * Markup: <div data-swept-amount-math data-xs="…/swept-amount-math.svg"></div>. Sizes L / M / S are drawn here
 * (sweptAmountMathProfiles), chosen by the width of the container; XS is the static picture from data-xs.
 * ?size=L|M|S|XS forces a size. Axes: Linear, or Broken for real-world amounts (L in millions).
 *
 * No libraries. KaTeX, when the page has loaded it, typesets the formula; otherwise a plain-text line is shown.
 * Also loads in Node (module.exports), where scripts/make-swept-amount-math-svg.js uses it to draw the XS picture.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.sweptAmountMath = api;
  if (typeof document !== 'undefined') api.autoInit();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var K = 1e3, M = 1e6;
  var BLUE = '#378ADD', GRAY = '#888780', PURPLE = '#8B5CF6';   // purple: the probe, a colour no zone uses
  var ZONES = {
    inp:   { fill: '#A8692A', ink: '#8A5418', title: 'Swept in partial', op: 0.17 },
    in:    { fill: '#EF9F27', ink: '#BA7517', title: 'Swept in full',  op: 0.13 },
    nmin:  { fill: BLUE,      ink: BLUE,      title: 'In nominal min', op: 0.06 },
    range: { fill: BLUE,      ink: BLUE,      title: 'In range',       op: 0.15 },
    nmax:  { fill: BLUE,      ink: BLUE,      title: 'In nominal max', op: 0.06 },
    out:   { fill: '#1D9E75', ink: '#1D9E75', title: 'Swept out',      op: 0.13 },
    over:  { fill: '#E24B4A', ink: '#E24B4A', title: 'Overflow',       op: 0.10 }
  };

  // Data ranges of the axes. Broken: the "pan" (thresholds and nominals, in thousands) bottom left,
  // the "handle" (Swept out up to L, in millions) top right; xShare = part of the width the first piece gets.
  // Heights are not set: each piece of the y axis gets the $ per pixel of the x piece of its panel, so slopes stay 45°.
  var SCALES = {
    linear: { x: [[-8 * K, 104 * K]], y: [[-18 * K, 52 * K]],
              omax: { min: 5 * K, max: 50 * K, step: 5 * K, dot: 5 * K } },
    broken: { x: [[-8 * K, 104 * K], [0.4 * M, 5.6 * M]], y: [[-18 * K, 52 * K], [0.4 * M, 5.4 * M]],
              omax: { min: 0.5 * M, max: 5 * M, step: 0.1 * M, dot: 0.5 * M }, xShare: 0.72, gap: 12 }
  };
  var IMAX = { min: 5 * K, max: 50 * K, step: 5 * K, dot: 5 * K };
  var DEFAULTS = { tmin: 40 * K, tmax: 60 * K, nmin: 10 * K, nmax: 15 * K, imax: 25 * K, p: 85 * K,
                   omax: { linear: 30 * K, broken: 2 * M } };

  // Sizes drawn by render(): width of the picture, the plot box (its height follows from the scale), the rails, fonts,
  // and how many labels:
  // pri 1 — thresholds and the caps only; 2 — also the nominals and T_min − A; 3 — everything (the grey midpoints).
  var sweptAmountMathProfiles = {
    L: { w: 760, L: 34, R: 726, T: 40, rail: 14, font: 15, wm: 15, wmMin: 22, rowGap: 19, pri: 3, fx: 26 },
    M: { w: 560, L: 28, R: 530, T: 34, rail: 11, font: 14, wm: 14, wmMin: 19, rowGap: 18, pri: 2, fx: 22 },
    S: { w: 380, L: 22, R: 358, T: 30, rail: 9,  font: 14, wm: 14, wmMin: 17, rowGap: 18, pri: 1, fx: 18 }
  };
  var MIN_WIDTH = { L: 720, M: 520, S: 300 };   // container width (CSS px) from which a size is chosen by Auto

  // Colours that follow the site's skin (custom properties of site.css), and the fixed ones of the static picture.
  var THEMES = {
    page:   { ink: 'var(--ink, #18212c)', soft: 'var(--ink-soft, #5a6777)', rule: 'var(--rule, #d6dde7)', bg: 'var(--bg, #fbfcfe)' },
    static: { ink: '#4b5563', soft: '#6b7280', rule: '#c7ccd4', bg: '#ffffff' }
  };
  var SERIF = "Georgia, 'Times New Roman', serif", SANS = 'system-ui, -apple-system, \'Segoe UI\', sans-serif';

  /* ---------- the model ---------- */

  function sweptAmountAt(x, s) {
    if (x < s.tmin - s.imax) return { zone: 'inp', y: s.imax };
    if (x <= s.tmin - s.nmin) return { zone: 'in', y: s.tmin - x };
    if (x < s.tmin) return { zone: 'nmin', y: 0 };
    if (x <= s.tmax) return { zone: 'range', y: 0 };
    if (x < s.tmax + s.nmax) return { zone: 'nmax', y: 0 };
    return x - s.tmax > s.omax ? { zone: 'over', y: null } : { zone: 'out', y: x - s.tmax };
  }

  function defaults(mode) {
    var s = {};
    for (var k in DEFAULTS) s[k] = DEFAULTS[k];
    s.omax = DEFAULTS.omax[mode || 'linear'];
    return s;
  }

  var clamp = function (v, a, b) { return Math.min(Math.max(v, a), b); };
  var ceilTo = function (v, r) { return Math.max(r.min, Math.ceil(v / r.step) * r.step); };

  // Sets one parameter and keeps the others consistent: T_min ≤ T_max, τ_min ≤ A, τ_max ≤ L, everything on the "pan".
  function setParam(s, mode, k, v) {
    var sc = SCALES[mode], lo = sc.x[0][0], hi = sc.x[0][1], om = sc.omax;
    var end = sc.x[sc.x.length - 1][1];
    if (k === 'imax') v = Math.round(v / IMAX.step) * IMAX.step;
    else if (k === 'omax') v = Math.round(v / om.step) * om.step;
    else if (k === 'p') v = Math.round(v / 100) * 100;
    else v = Math.round(v / K) * K;
    if (k === 'tmin') s.tmin = clamp(v, lo + s.nmin, s.tmax);
    if (k === 'tmax') s.tmax = clamp(v, s.tmin, hi - s.nmax);
    if (k === 'nmin') s.nmin = clamp(v, 0, Math.min(s.tmin - lo, s.imax));
    if (k === 'nmax') s.nmax = clamp(v, 0, Math.min(hi - s.tmax, s.omax));
    if (k === 'imax') s.imax = clamp(v, ceilTo(s.nmin, IMAX), IMAX.max);
    if (k === 'omax') s.omax = clamp(v, ceilTo(s.nmax, om), om.max);
    if (k === 'p') s.p = clamp(v, lo, end);
    return s;
  }

  /* ---------- axes: one or two pieces ---------- */

  function axis(segs, a, b, share, gap) {
    if (segs.length === 1) return [{ d0: segs[0][0], d1: segs[0][1], q0: a, q1: b }];
    var dir = b > a ? 1 : -1, m = a + dir * (Math.abs(b - a) - gap) * share;
    return [{ d0: segs[0][0], d1: segs[0][1], q0: a, q1: m },
            { d0: segs[1][0], d1: segs[1][1], q0: m + dir * gap, q1: b }];
  }
  function lin(sg, v) { return sg.q0 + (v - sg.d0) * (sg.q1 - sg.q0) / (sg.d1 - sg.d0); }
  function fwd(ax, v) {                       // data → pixels (outside the pieces: the nearest piece, extended)
    var sg = ax[0];
    for (var i = 1; i < ax.length; i++) if (v >= ax[i].d0) sg = ax[i];
    return lin(sg, v);
  }
  function inv(ax, q) {                       // pixels → data, clamped to the nearest piece
    var best = ax[0], bd = Infinity;
    ax.forEach(function (sg) {
      var lo = Math.min(sg.q0, sg.q1), hi = Math.max(sg.q0, sg.q1), d = q < lo ? lo - q : q > hi ? q - hi : 0;
      if (d < bd) { bd = d; best = sg; }
    });
    var qq = clamp(q, Math.min(best.q0, best.q1), Math.max(best.q0, best.q1));
    return best.d0 + (qq - best.q0) * (best.d1 - best.d0) / (best.q1 - best.q0);
  }
  function visible(ax, v) { return ax.some(function (sg) { return v >= sg.d0 && v <= sg.d1; }); }

  // Liang–Barsky: the part of a segment inside a box, or null.
  function clip(x1, y1, x2, y2, a, b, c, d) {
    var t0 = 0, t1 = 1, dx = x2 - x1, dy = y2 - y1;
    var p = [-dx, dx, -dy, dy], q = [x1 - a, b - x1, y1 - c, d - y1];
    for (var i = 0; i < 4; i++) {
      if (p[i] === 0) { if (q[i] < 0) return null; continue; }
      var r = q[i] / p[i];
      if (p[i] < 0) { if (r > t1) return null; if (r > t0) t0 = r; }
      else { if (r < t0) return null; if (r < t1) t1 = r; }
    }
    if (t1 - t0 < 1e-9) return null;
    return [x1 + t0 * dx, y1 + t0 * dy, x1 + t1 * dx, y1 + t1 * dy];
  }

  /* ---------- drawing ---------- */

  var n2 = function (v) { return Math.round(v * 100) / 100; };
  function stroke(col, w, dash, op) {
    return 'stroke:' + col + ';stroke-width:' + w + (dash ? ';stroke-dasharray:' + dash : '') +
      (op != null && op !== 1 ? ';stroke-opacity:' + op : '') + ';stroke-linecap:round;fill:none';
  }
  function line(a, b, c, d, st) {
    return '<line x1="' + n2(a) + '" y1="' + n2(b) + '" x2="' + n2(c) + '" y2="' + n2(d) + '" style="' + st + '"/>';
  }
  function circle(x, y, r, st) { return '<circle cx="' + n2(x) + '" cy="' + n2(y) + '" r="' + r + '" style="' + st + '"/>'; }

  function trim1(v) { return String(Math.round(v * 10) / 10); }
  function money(v, full) {
    var a = Math.abs(v), sign = v < 0 ? '−' : '';
    if (full) return sign + '$' + Math.round(a).toLocaleString('en-US');
    if (a >= M) return sign + '$' + trim1(a / M) + 'M';
    if (a >= K) return sign + '$' + trim1(a / K) + 'k';
    return sign + '$' + Math.round(a);
  }
  // 'T_min − τ_min' → italic letters with subscripts as <tspan>s.
  function tex(s) {
    var o = '', i = 0, m, re = /([A-Za-zα-ω]+)_([a-z]+)/g, sh = false;
    while ((m = re.exec(s))) {
      var pre = s.slice(i, m.index);
      if (pre) { o += '<tspan dy="' + (sh ? -4 : 0) + '">' + pre + '</tspan>'; sh = false; }
      o += '<tspan dy="' + (sh ? -4 : 0) + '">' + m[1] + '</tspan><tspan dy="4" font-size="0.78em" font-style="normal">' + m[2] + '</tspan>';
      sh = true; i = re.lastIndex;
    }
    var post = s.slice(i);
    if (post) o += '<tspan dy="' + (sh ? -4 : 0) + '">' + post + '</tspan>';
    return o;
  }

  /* Draws the graph. o = { profile, theme, mode, sym, interactive, id }.
   * Returns { svg (the inner markup), width, height, G (the axes, for dragging), zone, y }. */
  function render(s, o) {
    var pf = o.profile, th = o.theme, sc = SCALES[o.mode], sym = o.sym, live = o.interactive, id = o.id || 'sam';
    var f = pf.font / 14;
    var gap = sc.gap || 0, GX = axis(sc.x, pf.L, pf.R, sc.xShare, gap);
    // Each y piece takes the $ per pixel of the x piece on the diagonal: equal scales, 45° slopes in every panel.
    var hs = sc.y.map(function (r, j) { return (r[1] - r[0]) * (GX[j].q1 - GX[j].q0) / (GX[j].d1 - GX[j].d0); });
    var plotH = hs.reduce(function (a, b) { return a + b; }, 0) + gap * (hs.length - 1);
    var P = { L: pf.L, R: pf.R, T: pf.T, B: pf.T + plotH }, RL = pf.rail, RR = pf.w - pf.rail;
    var GY = [{ d0: sc.y[0][0], d1: sc.y[0][1], q0: P.B, q1: P.B - hs[0] }];
    if (sc.y.length > 1) GY.push({ d0: sc.y[1][0], d1: sc.y[1][1], q0: P.B - hs[0] - gap, q1: P.T });
    var G = { X: GX, Y: GY };
    var X = function (v) { return fwd(G.X, v); }, Y = function (v) { return fwd(G.Y, v); };
    var visX = function (v) { return visible(G.X, v); }, visY = function (v) { return visible(G.Y, v); };
    var seg = function (x1, y1, x2, y2, st) {
      var out = '';
      G.X.forEach(function (sx) {
        G.Y.forEach(function (sy) {
          var c = clip(x1, y1, x2, y2, sx.d0, sx.d1, sy.d0, sy.d1);
          if (c) out += line(lin(sx, c[0]), lin(sy, c[1]), lin(sx, c[2]), lin(sy, c[3]), st);
        });
      });
      return out;
    };

    var tmin = s.tmin, tmax = s.tmax, nmin = s.nmin, nmax = s.nmax, imax = s.imax, omax = s.omax, p = s.p;
    var xl = tmin - nmin, xr = tmax + nmax, xk = tmin - imax, xo = tmax + omax, xc = (tmin + tmax) / 2, yc = (tmin - tmax) / 2;
    var xA = sc.x[0][0], xZ = sc.x[sc.x.length - 1][1], yA = sc.y[0][0], yZ = sc.y[sc.y.length - 1][1];
    var y0 = Y(0), ax = X(0), xoc = Math.min(xo, xZ), Z = ZONES;
    var LAB = 'font-family:' + SERIF + ';font-style:italic;font-size:' + pf.font + 'px';
    var CAP = 'font-family:' + SERIF + ';font-style:italic;font-size:' + Math.round(13 * f) + 'px;fill:' + th.soft;

    var h = '<defs><pattern id="' + id + '-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">' +
      '<line x1="0" y1="0" x2="0" y2="6" style="stroke:#E24B4A;stroke-width:1;stroke-opacity:.35"/></pattern>' +
      '<marker id="' + id + '-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">' +
      '<path d="M2 1L8 5L2 9" style="fill:none;stroke:' + th.soft + ';stroke-width:1.5;stroke-linecap:round;stroke-linejoin:round"/></marker></defs>';

    // Zones: translucent slices, one rectangle per panel, and a watermark in the widest piece.
    var bands = [[xA, xk, 'inp'], [xk, xl, 'in'], [xl, tmin, 'nmin'], [tmin, tmax, 'range'], [tmax, xr, 'nmax'], [xr, xoc, 'out'], [xoc, xZ, 'over']];
    var low = G.Y[0], wmY = (low.q0 + low.q1) / 2 - (G.Y.length > 1 ? 0 : plotH * 0.08), marks = '';
    bands.forEach(function (bd) {
      var z = bd[2], widest = null;
      G.X.forEach(function (sx) {
        var a = Math.max(bd[0], sx.d0), b = Math.min(bd[1], sx.d1);
        if (b <= a) return;
        var qa = lin(sx, a), w = lin(sx, b) - qa;
        if (w <= 0.5) return;
        if (!widest || w > widest.w) widest = { x: qa, w: w };
        G.Y.forEach(function (sy) {
          var top = Math.min(sy.q0, sy.q1), hh = Math.abs(sy.q1 - sy.q0);
          h += '<rect x="' + n2(qa) + '" y="' + n2(top) + '" width="' + n2(w) + '" height="' + n2(hh) + '" style="fill:' + Z[z].fill + ';fill-opacity:' + Z[z].op + '"/>';
          if (z === 'over') h += '<rect x="' + n2(qa) + '" y="' + n2(top) + '" width="' + n2(w) + '" height="' + n2(hh) + '" fill="url(#' + id + '-hatch)"/>';
        });
      });
      if (widest && widest.w >= pf.wmMin) {
        var cx = n2(widest.x + widest.w / 2);
        marks += '<text transform="rotate(-90 ' + cx + ' ' + n2(wmY) + ')" x="' + cx + '" y="' + n2(wmY + 5) + '" text-anchor="middle" style="font-family:' + SANS +
          ';font-size:' + pf.wm + 'px;font-weight:500;letter-spacing:1.5px;fill:' + Z[z].ink + ';fill-opacity:' + (z === 'nmin' || z === 'nmax' ? 0.42 : 0.34) + '">' + Z[z].title + '</text>';
      }
    });
    h += marks + '<g class="grid"></g><g class="aux"></g>';

    // Axes, with a break mark where a piece ends.
    var axSt = stroke(th.soft, 1);
    G.X.forEach(function (sx, i) {
      var last = i === G.X.length - 1, a = i === 0 ? P.L : sx.q0, b = last ? P.R + 6 : sx.q1;
      h += '<line x1="' + n2(a) + '" y1="' + n2(y0) + '" x2="' + n2(b) + '" y2="' + n2(y0) + '" style="' + axSt + '"' + (last ? ' marker-end="url(#' + id + '-arrow)"' : '') + '/>';
      if (!last) [sx.q1, G.X[i + 1].q0].forEach(function (q) { h += line(q - 3, y0 + 5, q + 3, y0 - 5, axSt); });
    });
    G.Y.forEach(function (sy, i) {
      var last = i === G.Y.length - 1, a = i === 0 ? P.B : sy.q0, b = last ? P.T - 6 : sy.q1;
      h += '<line x1="' + n2(ax) + '" y1="' + n2(a) + '" x2="' + n2(ax) + '" y2="' + n2(b) + '" style="' + axSt + '"' + (last ? ' marker-end="url(#' + id + '-arrow)"' : '') + '/>';
      if (!last) [sy.q1, G.Y[i + 1].q0].forEach(function (q) { h += line(ax - 5, q + 3, ax + 5, q - 3, axSt); });
    });
    h += '<text x="' + n2(ax + 8) + '" y="' + (P.T - 12) + '" style="' + CAP + '">Swept amount, $</text>';
    h += '<text x="' + n2(ax - 5) + '" y="' + n2(y0 + 4) + '" text-anchor="end" style="' + LAB + ';fill:' + th.soft + '">0</text>';

    // Points of interest on the x axis (labels in rows so that they never overlap) and on the y axis.
    // pri: which sizes show the label (see sweptAmountMathProfiles); with T_min = T_max both are just T.
    var eq = tmin === tmax, Tn = eq ? 'T' : 'T_min', Tx = eq ? 'T' : 'T_max';
    var xs = [{ x: xl, s: Tn + ' − τ_min', c: Z.in.ink, y: nmin, pri: 2 }, { x: tmin, s: Tn, c: th.ink, y: 0, pri: 1 },
              { x: xr, s: Tx + ' + τ_max', c: Z.out.ink, y: nmax, pri: 2 }];
    if (!eq) xs.push({ x: tmax, s: Tx, c: th.ink, y: 0, pri: 1 });
    if (xk > xA + K) xs.push({ x: xk, s: Tn + ' − A', c: Z.in.ink, y: imax, pri: 2 });
    if (visX(xo) && xo < xZ - (xZ - xA) * 0.01 && visY(omax)) xs.push({ x: xo, s: Tx + ' + L', c: Z.over.ink, y: omax, pri: 1 });
    xs = xs.filter(function (q) { return q.pri <= pf.pri; });
    xs.sort(function (a, b) { return a.x - b.x; });
    var tw = function (t) { return t.replace(/_/g, '').length * 6.6 * f; };
    var rows = [];
    xs.forEach(function (q) {
      q.w = (sym ? tw(q.s) : money(q.x).length * 7.4 * f) + 4;
      q.cx = clamp(X(q.x), q.w / 2 + 2, pf.w - 2 - q.w / 2);
      var r = 0;
      while (rows[r] !== undefined && q.cx - q.w / 2 < rows[r] + 9) r++;
      rows[r] = q.cx + q.w / 2; q.r = r;
    });
    var rowY = function (r) { return P.B + 19 * f + r * pf.rowGap; }, H = rowY(Math.max(rows.length - 1, 0)) + 30 * f;

    var ys = [{ y: nmin, s: 'τ_min', c: Z.in.ink, px: X(xl), pri: 2 }, { y: nmax, s: 'τ_max', c: Z.out.ink, px: X(xr), pri: 2 },
              { y: imax, s: 'A', c: Z.inp.ink, px: null, pri: 1 }, { y: omax, s: 'L', c: Z.over.ink, px: null, pri: 1 }];
    ys = ys.filter(function (q) { return q.pri <= pf.pri && visY(q.y); });
    ys.forEach(function (q) { q.cy = Y(q.y); });
    ys.sort(function (a, b) { return b.cy - a.cy; });
    for (var i = 1; i < ys.length; i++) if (ys[i - 1].cy - ys[i].cy < 16 * f) ys[i].cy = ys[i - 1].cy - 16 * f;

    // The grey midpoint (the crossing of the |x| lines): only on the largest size. Its labels are two-storey
    // fractions: (T_min + T_max)/2 above the x axis, in the empty middle of In range; (T_min − T_max)/2 by the y axis.
    var mids = tmax - tmin >= 2 * K && pf.pri >= 3 && visY(yc);

    // Projections of every point onto both axes.
    var proj = stroke(GRAY, 0.6, '1.5 3', 0.8);
    xs.forEach(function (q) { h += line(X(q.x), Y(q.y) + 5, X(q.x), rowY(q.r) - 13 * f, proj); });
    ys.forEach(function (q) { if (q.px !== null && Math.abs(q.y) > 1) h += line(q.px, Y(q.y), ax, Y(q.y), proj); });
    // The y fraction stands right of the axis with its bar on the projection, which stops at the fraction.
    var fyW = tw('T_min − T_max') + 4, fyX = ax + 8 + fyW / 2;
    if (mids) h += line(X(xc), Y(yc), sym ? fyX + fyW / 2 + 4 : ax, Y(yc), proj) + line(X(xc), Y(yc) - 5, X(xc), y0, proj);
    h += line(RL, Y(imax), X(xl), Y(imax), stroke(Z.inp.ink, 1, '1 3'));
    if (visY(omax)) h += line(ax, Y(omax), RR, Y(omax), stroke(Z.over.ink, 1, '1 3', 0.9));

    // The function. Solid: what happens; dashed in the zone's colour: what would happen without the caps and nominals.
    h += seg(tmin, 0, tmin - yA, yA, stroke(GRAY, 1, '2 4')) + seg(tmax + yA, yA, tmax, 0, stroke(GRAY, 1, '2 4'));
    h += seg(xl, nmin, tmin, 0, stroke(BLUE, 1.4, '4 3', 0.85)) + seg(tmax, 0, xr, nmax, stroke(BLUE, 1.4, '4 3', 0.85));
    if (xk > xA) h += seg(xA, tmin - xA, xk, imax, stroke(Z.in.ink, 1.4, '4 3', 0.6));
    if (xo < xZ) h += seg(xo, omax, xZ, xZ - tmax, stroke(Z.over.ink, 1.4, '4 3', 0.75));
    var pr = sweptAmountAt(p, s);
    var W = 2.75;
    if (xk > xA) h += seg(xA, imax, xk, imax, stroke(Z.inp.ink, W));
    if (xl > xA) { var a0 = Math.max(xk, xA); h += seg(a0, tmin - a0, xl, nmin, stroke(Z.in.ink, W)); }
    h += seg(xl, 0, xr, 0, stroke(BLUE, W));
    if (xr < xZ) h += seg(xr, nmax, xoc, xoc - tmax, stroke(Z.out.ink, W));
    // The jumps at the nominals, dashed in the colour of the sweep they belong to.
    h += seg(xl, 0, xl, nmin, stroke(Z.in.ink, 2, '4 3')) + seg(xr, 0, xr, nmax, stroke(Z.out.ink, 2, '4 3'));

    ys.forEach(function (q) { h += line(ax - 3, Y(q.y), ax + 3, Y(q.y), stroke(q.c, 1.2)); });
    var dot = function (x, y, r, st) { if (visX(x) && visY(y)) h += circle(X(x), Y(y), r, st); };
    if (tmax - tmin >= 2 * K) dot(xc, yc, 3, 'fill:' + GRAY);
    if (xk > xA) dot(xk, imax, 4.5, 'fill:' + Z.inp.ink);
    if (xo < xZ) dot(xo, omax, 5, 'fill:' + Z.out.ink);
    // At a jump the sweep owns the point (filled), the zero piece starts and ends open; no jump when τ = 0.
    var open = 'fill:' + th.bg + ';stroke:' + BLUE + ';stroke-width:2';
    if (nmin > 0) { dot(xl, 0, 5, open); dot(xl, nmin, 5, 'fill:' + Z.in.ink); } else dot(xl, 0, 5, 'fill:' + Z.in.ink);
    if (nmax > 0) { dot(xr, 0, 5, open); dot(xr, nmax, 5, 'fill:' + Z.out.ink); } else dot(xr, 0, 5, 'fill:' + Z.out.ink);

    // The probe, in purple: a dashed vertical through the balance, a dashed projection onto the y axis, the point.
    if (live) {
      h += seg(p, yA, p, yZ, stroke(PURPLE, 1.4, '5 4', 0.9));
      if (pr.y !== null && visY(pr.y) && visX(p)) {
        h += line(ax, Y(pr.y), X(p), Y(pr.y), stroke(PURPLE, 1.1, '3 3', 0.8)) + line(ax - 4, Y(pr.y), ax + 4, Y(pr.y), stroke(PURPLE, 1.6));
        dot(p, pr.y, 7, 'fill:' + PURPLE + ';fill-opacity:.18;stroke:' + PURPLE + ';stroke-width:1.4');
        dot(p, pr.y, 3.2, 'fill:' + PURPLE);
      }
    }

    var text = function (x, y, anchor, col, body) {
      return '<text x="' + n2(x) + '" y="' + n2(y) + '"' + (anchor ? ' text-anchor="' + anchor + '"' : '') + ' style="' + LAB + ';fill:' + col + '">' + body + '</text>';
    };
    // A two-storey fraction centred on (cx, bar).
    var frac = function (cx, bar, num, den, col) {
      var w = tw(num) + 4;
      return text(cx, bar - 5, 'middle', col, tex(num)) + line(cx - w / 2, bar, cx + w / 2, bar, stroke(col, 1)) +
        text(cx, bar + pf.font + 1, 'middle', col, tex(den));
    };
    if (mids) {
      var mx = X(xc), myY = Y(yc), fy = 'T_min − T_max', fx = 'T_min + T_max';
      if (sym) {
        h += frac(mx, y0 - pf.font - 9, fx, '2', GRAY);
        h += frac(fyX, myY, fy, '2', GRAY);
      } else {
        h += text(mx, y0 - 8, 'middle', GRAY, money(xc)) + text(ax + 7, myY - 4, null, GRAY, money(yc));
      }
      h += line(ax - 3, myY, ax + 3, myY, stroke(GRAY, 1.2));
    }
    ys.forEach(function (q) { h += text(ax + 7, q.cy - 4, null, q.c, sym ? tex(q.s) : money(q.y)); });
    xs.forEach(function (q) { h += text(q.cx, rowY(q.r), 'middle', q.c, sym ? tex(q.s) : money(q.x)); });
    h += '<text x="' + P.R + '" y="' + n2(H - 8) + '" text-anchor="end" style="' + CAP + '">Current balance, $</text>';

    if (live) {
      // A and L rails: discrete steps, a dot per step; the handle sits on the current value.
      var rail = function (xp, v, k, c, mn, rg) {
        var r = line(xp, Y(rg.max), xp, Y(rg.min), stroke(th.rule, 2));
        for (var t = rg.min; t <= rg.max + 1; t += rg.dot) r += circle(xp, Y(t), 1.6, 'fill:' + (t < mn ? th.rule : th.soft));
        var yv = Y(v);
        return r + '<g data-h="' + k + '" style="cursor:ns-resize"><rect x="' + (xp - 16) + '" y="' + n2(yv - 15) + '" width="32" height="30" fill="transparent"/>' +
          '<rect x="' + (xp - 9) + '" y="' + n2(yv - 6) + '" width="18" height="12" rx="6" style="fill:' + c + ';stroke:' + th.bg + ';stroke-width:1.5"/>' +
          line(xp - 4, yv - 2, xp + 4, yv - 2, 'stroke:#fff;stroke-width:1') + line(xp - 4, yv + 2, xp + 4, yv + 2, 'stroke:#fff;stroke-width:1') + '</g>';
      };
      h += rail(RL, imax, 'imax', Z.inp.ink, ceilTo(nmin, IMAX), IMAX);
      h += rail(RR, omax, 'omax', Z.over.ink, ceilTo(nmax, sc.omax), sc.omax);
    }
    // Borders of the nominals: dotted verticals in the colour of the neighbouring zone (with a grip on top when live).
    var grip = function (x, k, c) {
      var g = seg(x, yA, x, yZ, stroke(c, 1.6, '0 4.5', 0.8)), q = X(x);
      if (!live) return g;
      return '<g data-h="' + k + '" style="cursor:ew-resize"><rect x="' + n2(q - 16) + '" y="' + (P.T - 16) + '" width="32" height="34" fill="transparent"/>' + g +
        '<rect x="' + n2(q - 6) + '" y="' + (P.T - 11) + '" width="12" height="22" rx="6" style="fill:' + c + ';stroke:' + th.bg + ';stroke-width:1.5"/>' +
        line(q - 2, P.T - 4, q - 2, P.T + 4, 'stroke:#fff;stroke-width:1') + line(q + 2, P.T - 4, q + 2, P.T + 4, 'stroke:#fff;stroke-width:1') + '</g>';
    };
    h += grip(xl, 'nmin', Z.in.ink) + grip(xr, 'nmax', Z.out.ink);
    if (live) {
      var dia = function (x, k) {
        var q = X(x);
        return '<g data-h="' + k + '" style="cursor:ew-resize"><circle cx="' + n2(q) + '" cy="' + n2(y0) + '" r="17" fill="transparent"/>' +
          '<path d="M' + n2(q) + ' ' + n2(y0 - 7) + 'L' + n2(q + 7) + ' ' + n2(y0) + 'L' + n2(q) + ' ' + n2(y0 + 7) + 'L' + n2(q - 7) + ' ' + n2(y0) + 'Z" style="fill:' + th.ink + ';stroke:' + th.bg + ';stroke-width:1.5"/></g>';
      };
      h += dia(tmin, 'tmin') + dia(tmax, 'tmax');
    }
    return { svg: h, width: pf.w, height: Math.ceil(H), G: G, zone: pr.zone, y: pr.y };
  }

  // The static picture (size XS and the noscript fallback): default parameters, linear axes, no handles.
  function staticSvg() {
    var r = render(defaults('linear'), { profile: sweptAmountMathProfiles.S, theme: THEMES.static, mode: 'linear', sym: true, interactive: false, id: 'samxs' });
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + r.width + ' ' + r.height + '" width="' + r.width + '" height="' + r.height + '"' +
      ' role="img" aria-label="Balances Equilibrium: swept amount per current balance">\n<title>Balances Equilibrium: swept amount per current balance</title>\n' + r.svg + '\n</svg>\n';
  }

  /* ---------- the formula ---------- */

  // The rows go in the order of x; the branch of the probe's zone is in colour, the others grey.
  // A plain two-column array instead of {cases}: narrower gaps, so the formula can be set larger.
  function rowsOf(zone, eq, T) {
    var mid = zone === 'nmin' || zone === 'range' || zone === 'nmax';
    var col = function (z) { return (z === 'range' ? mid : z === zone) ? ZONES[z].ink : GRAY; };
    var Tn = eq ? 'T' : T.min, Tx = eq ? 'T' : T.max;
    return [['inp', 'A', 'x' + T.lt + Tn + T.minus + 'A'],
            ['in', Tn + T.minus + 'x', Tn + T.minus + 'A' + T.le + 'x' + T.le + Tn + T.minus + T.tmin],
            ['range', '0', Tn + T.minus + T.tmin + T.lt + 'x' + T.lt + Tx + T.plus + T.tmax],
            ['out', 'x' + T.minus + Tx, Tx + T.plus + T.tmax + T.le + 'x' + T.le + Tx + T.plus + 'L'],
            ['over', T.none, 'x' + T.gt + Tx + T.plus + 'L']].map(function (r) { return [col(r[0]), r[1], r[2]]; });
  }
  var TEX = { min: 'T_{\\min}', max: 'T_{\\max}', tmin: '\\tau_{\\min}', tmax: '\\tau_{\\max}', minus: '-', plus: '+',
              lt: '<', gt: '>', le: '\\le ', none: '\\nexists' };
  var HTML = { min: 'T<sub>min</sub>', max: 'T<sub>max</sub>', tmin: 'τ<sub>min</sub>', tmax: 'τ<sub>max</sub>',
               minus: ' − ', plus: ' + ', lt: ' &lt; ', gt: ' &gt; ', le: ' ≤ ', none: '∄' };

  function formulaTex(zone, eq) {
    return 'y(x)=\\left\\{\\begin{array}{ll}' + rowsOf(zone, eq, TEX).map(function (r) {
      return '\\textcolor{' + r[0] + '}{' + r[1] + '} & \\textcolor{' + r[0] + '}{' + r[2] + '}';
    }).join('\\\\[2pt]') + '\\end{array}\\right.';
  }

  // Without KaTeX: the same rows as a small HTML table.
  function formulaHtml(zone, eq) {
    return '<span class="sam-fx-plain"><span>y(x) =</span><span class="sam-fx-brace">{</span><table>' + rowsOf(zone, eq, HTML).map(function (r) {
      return '<tr style="color:' + r[0] + '"><td>' + r[1] + '</td><td>' + r[2] + '</td></tr>';
    }).join('') + '</table></span>';
  }

  /* ---------- the widget ---------- */

  var CHIPS = [['tmin', 'T', 'min', 'lower threshold', 'd'], ['tmax', 'T', 'max', 'upper threshold', 'd'],
               ['nmin', 'τ', 'min', 'nominal below', 's'], ['nmax', 'τ', 'max', 'nominal above', 's'],
               ['imax', 'A', '', 'investment balance', 'b'], ['omax', 'L', '', 'single payment limit', 'b']];
  var SIZES = ['auto', 'L', 'M', 'S', 'XS'];
  var count = 0;

  function Widget(el) {
    this.el = el; this.id = 'sam' + (++count);
    var q = typeof location !== 'undefined' ? new URLSearchParams(location.search).get('size') : null;
    q = q && (q.toLowerCase() === 'auto' ? 'auto' : q.toUpperCase());
    this.size = SIZES.indexOf(q) >= 0 ? q : (el.getAttribute('data-size') || 'auto');
    this.mode = 'linear'; this.sym = true;
    this.reset();
    this.build();
    var self = this;
    if (typeof ResizeObserver !== 'undefined') new ResizeObserver(function () { self.layout(); }).observe(el);
    else window.addEventListener('resize', function () { self.layout(); });
    this.layout();
  }

  Widget.prototype.reset = function () {
    this.omaxBy = { linear: DEFAULTS.omax.linear, broken: DEFAULTS.omax.broken };
    this.s = defaults(this.mode);
  };

  Widget.prototype.build = function () {
    var self = this, el = this.el, btn = function (attrs, text) { return '<button type="button" ' + attrs + '>' + text + '</button>'; };
    el.classList.add('sam');
    el.innerHTML =
      '<div class="sam-bar">' +
        '<div class="sam-seg" role="group" aria-label="Size">' + SIZES.map(function (z) {
          return btn('data-size="' + z + '" title="' + (z === 'auto' ? 'Size by the width of the page' : 'Size ' + z) + '"', z === 'auto' ? 'Auto' : z); }).join('') + '</div>' +
        '<div class="sam-seg sam-live-only" role="group" aria-label="Axes">' + btn('data-mode="linear" title="Linear axes"', 'Linear') +
          btn('data-mode="broken" title="Broken axes: thousands bottom left, millions top right"', 'Broken') + '</div>' +
        '<span class="sam-gap"></span>' +
        btn('class="sam-sym sam-live-only" title="Labels: formulas or dollars"', '$') + btn('class="sam-rst sam-live-only" aria-label="Reset" title="Reset"', '↺') +
      '</div>' +
      '<div class="sam-live">' +
        '<div class="sam-ro" aria-live="polite"></div>' +
        '<svg class="sam-graph" role="img" aria-label="Swept amount versus current balance"></svg>' +
        '<div class="sam-fx"></div>' +
        '<div class="sam-chips">' + CHIPS.map(function (c) {
          return '<div class="sam-chip"><span class="sam-sw sam-sw-' + c[4] + '" style="background:' + self.chipColour(c[0]) + '"></span>' +
            '<div class="sam-chip-text"><div class="sam-nm">' + c[1] + (c[2] ? '<sub>' + c[2] + '</sub>' : '') + ' <span class="sam-mean">' + c[3] + '</span></div>' +
            '<div class="sam-v" data-v="' + c[0] + '"></div></div>' +
            '<div class="sam-bt">' + btn('data-k="' + c[0] + '" data-d="-1" aria-label="Decrease ' + c[1] + ' ' + c[2] + '"', '−') +
            btn('data-k="' + c[0] + '" data-d="1" aria-label="Increase ' + c[1] + ' ' + c[2] + '"', '+') + '</div></div>';
        }).join('') + '</div>' +
        '<p class="sam-hint">Diamonds move T, the grips on top move τ, the side rails set A and L. Drag anywhere else to probe a balance (purple).</p>' +
      '</div>' +
      '<img class="sam-xs" alt="Balances Equilibrium: swept amount per current balance" src="' + (el.getAttribute('data-xs') || '') + '" hidden>';

    this.svg = el.querySelector('.sam-graph');
    el.querySelectorAll('[data-size]').forEach(function (b) {
      b.addEventListener('click', function () { self.setSize(b.getAttribute('data-size')); });
    });
    el.querySelectorAll('[data-mode]').forEach(function (b) {
      b.addEventListener('click', function () { self.setMode(b.getAttribute('data-mode')); });
    });
    el.querySelector('.sam-sym').addEventListener('click', function () { self.sym = !self.sym; self.draw(); });
    el.querySelector('.sam-rst').addEventListener('click', function () { self.reset(); self.draw(); });

    // −/+ : one step per press, repeating while held.
    var rep, rep2, stop = function () { clearTimeout(rep); clearInterval(rep2); };
    el.querySelectorAll('[data-k]').forEach(function (b) {
      b.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        var k = b.getAttribute('data-k'), d = +b.getAttribute('data-d');
        var step = k === 'imax' ? IMAX.step : k === 'omax' ? SCALES[self.mode].omax.step : K;
        var go = function () { self.set(k, self.s[k] + d * step); };
        go();
        rep = setTimeout(function () { rep2 = setInterval(go, k === 'imax' || k === 'omax' ? 160 : 70); }, 350);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { b.addEventListener(ev, stop); });
    });

    // Dragging: a handle if one was hit, else the probe.
    var drag = null, pt = this.svg.createSVGPoint();
    var move = function (e) {
      pt.x = e.clientX; pt.y = e.clientY;
      var m = pt.matrixTransform(self.svg.getScreenCTM().inverse()), x = inv(self.G.X, m.x), y = inv(self.G.Y, m.y);
      if (drag === 'tmin' || drag === 'tmax' || drag === 'p') self.set(drag, x);
      else if (drag === 'nmin') self.set('nmin', self.s.tmin - x);
      else if (drag === 'nmax') self.set('nmax', x - self.s.tmax);
      else if (drag === 'imax' || drag === 'omax') self.set(drag, y);
    };
    this.svg.addEventListener('pointerdown', function (e) {
      var g = e.target.closest('[data-h]');
      drag = g ? g.getAttribute('data-h') : 'p';
      self.svg.setPointerCapture(e.pointerId);
      move(e);
    });
    this.svg.addEventListener('pointermove', function (e) { if (drag) move(e); });
    ['pointerup', 'pointercancel'].forEach(function (ev) { self.svg.addEventListener(ev, function () { drag = null; }); });
  };

  Widget.prototype.chipColour = function (k) {
    return { tmin: 'var(--ink, #18212c)', tmax: 'var(--ink, #18212c)', nmin: ZONES.in.ink, nmax: ZONES.out.ink, imax: ZONES.inp.ink, omax: ZONES.over.ink }[k];
  };

  Widget.prototype.set = function (k, v) { setParam(this.s, this.mode, k, v); this.draw(); };

  Widget.prototype.setMode = function (mode) {
    if (mode === this.mode) return;
    this.omaxBy[this.mode] = this.s.omax;
    this.mode = mode;
    this.s.omax = this.omaxBy[mode];
    setParam(this.s, mode, 'omax', this.s.omax);   // L ≥ τ_max
    setParam(this.s, mode, 'p', this.s.p);         // the probe stays on the axis
    this.draw();
  };

  Widget.prototype.setSize = function (size) {
    this.size = size;
    if (typeof history !== 'undefined' && history.replaceState) {
      var u = new URL(location.href);
      if (size === 'auto') u.searchParams.delete('size'); else u.searchParams.set('size', size);
      history.replaceState(null, '', u);
    }
    this.layout();
  };

  Widget.prototype.layout = function () {
    var size = this.size;
    if (size === 'auto') {
      var w = this.el.clientWidth;
      size = w >= MIN_WIDTH.L ? 'L' : w >= MIN_WIDTH.M ? 'M' : w >= MIN_WIDTH.S ? 'S' : 'XS';
    }
    if (size === this.shown && this.drawn) return;
    this.shown = size;
    var el = this.el;
    ['L', 'M', 'S', 'XS'].forEach(function (z) { el.classList.toggle('sam--' + z, z === size); });
    el.querySelector('.sam-live').hidden = size === 'XS';
    el.querySelector('.sam-xs').hidden = size !== 'XS';
    this.draw();
  };

  Widget.prototype.draw = function () {
    var self = this, el = this.el, s = this.s;
    el.querySelectorAll('[data-size]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-size') === self.size)); });
    el.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === self.mode)); });
    el.querySelector('.sam-sym').textContent = this.sym ? '$' : 'τ';
    el.querySelectorAll('[data-v]').forEach(function (n) { n.textContent = money(s[n.getAttribute('data-v')], true); });
    if (this.shown === 'XS') return;
    this.drawn = true;

    var r = render(s, { profile: sweptAmountMathProfiles[this.shown], theme: THEMES.page, mode: this.mode, sym: this.sym, interactive: true, id: this.id });
    this.G = r.G;
    this.svg.setAttribute('viewBox', '0 0 ' + r.width + ' ' + r.height);
    this.svg.innerHTML = r.svg;

    var z = ZONES[r.zone];
    el.querySelector('.sam-ro').innerHTML = '<span class="sam-badge" style="background:' + z.fill + '26;color:' + z.ink + '">' + z.title + '</span>' +
      '<span class="sam-vi">x</span><span class="sam-mono sam-probe">' + money(s.p, true) + '</span><span>→</span>' +
      '<span class="sam-vi">y</span><span class="sam-mono sam-probe">' + (r.y === null ? 'not defined' : money(r.y, true)) + '</span>';

    // The formula fills the width: set once at 10px, measured, then scaled (up to the profile's largest size).
    var fx = el.querySelector('.sam-fx'), eq = s.tmin === s.tmax, max = sweptAmountMathProfiles[this.shown].fx;
    fx.style.fontSize = '10px';
    if (typeof katex !== 'undefined') {
      try { katex.render(formulaTex(r.zone, eq), fx, { displayMode: true, throwOnError: false }); } catch (e) { fx.innerHTML = formulaHtml(r.zone, eq); }
    } else {
      fx.innerHTML = formulaHtml(r.zone, eq);
    }
    var body = fx.querySelector('.katex') || fx.querySelector('.sam-fx-plain'), w = body ? body.getBoundingClientRect().width : 0;
    if (w > 0) fx.style.fontSize = Math.max(7.5, Math.min(max, 10 * fx.clientWidth * 0.98 / w)).toFixed(2) + 'px';
  };

  function autoInit() {
    var go = function () {
      document.querySelectorAll('[data-swept-amount-math]').forEach(function (el) { if (!el.samWidget) el.samWidget = new Widget(el); });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
  }

  return { sweptAmountAt: sweptAmountAt, setParam: setParam, defaults: defaults, render: render, staticSvg: staticSvg,
           formulaTex: formulaTex, sweptAmountMathProfiles: sweptAmountMathProfiles, SCALES: SCALES, ZONES: ZONES,
           Widget: Widget, autoInit: autoInit };
});
