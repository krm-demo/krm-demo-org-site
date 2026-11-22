#!/usr/bin/env python3
"""Draws the figures of the articles as SVG files in docs/figures/.

    usage: scripts/make-figures.py          (needs numpy and scipy)

The SVG files are committed; the site build does not run this script. Colours are CSS variables with
fallbacks (var(--fig-a, #1456b8)): on GitHub the fallbacks are used, on the site scripts/md-to-html.py
draws the SVG into the page and the current skin supplies the colours. Figures carry no words, only
numbers and symbols, so one file serves every language; the caption is in the article.
"""
import os

import numpy as np
from numpy.polynomial import chebyshev as C
from scipy.fft import dct
from scipy.special import iv

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs", "figures")
INK, GRID = "var(--fig-ink,#222)", "var(--fig-grid,#ccc)"
A, B = "var(--fig-a,#1456b8)", "var(--fig-b,#c2410c)"
SUP = str.maketrans("-0123456789", "⁻⁰¹²³⁴⁵⁶⁷⁸⁹")


def num(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")


def pow10(e):
    return "1" if e == 0 else "10" + str(e).translate(SUP)


def text(x, y, s, anchor="middle", color=INK, size=15, italic=False):
    style = f"fill:{color};font-size:{size}px" + (";font-style:italic" if italic else "")
    return f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" style="{style}">{s}</text>'


def seg(x1, y1, x2, y2, color=INK, width=1, dash=None):
    d = f";stroke-dasharray:{dash}" if dash else ""
    return f'<line x1="{x1:.1f}" y1="{y1:.1f}" x2="{x2:.1f}" y2="{y2:.1f}" style="stroke:{color};stroke-width:{width}{d}"/>'


def dot(x, y, color, r=3.2, hollow=False):
    fill = "none" if hollow else color
    return f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" style="fill:{fill};stroke:{color};stroke-width:1.5"/>'


class Plot:
    """A rectangular plotting area inside the SVG, with linear x and linear or log10 y."""

    def __init__(self, x0, y0, w, h, xlim, ylim, ylog=False):
        self.x0, self.y0, self.w, self.h, self.xlim, self.ylog = x0, y0, w, h, xlim, ylog
        self.ylim = (np.log10(ylim[0]), np.log10(ylim[1])) if ylog else ylim

    def px(self, x):
        return self.x0 + (x - self.xlim[0]) / (self.xlim[1] - self.xlim[0]) * self.w

    def py(self, y):
        y = np.log10(y) if self.ylog else y
        return self.y0 + self.h - (y - self.ylim[0]) / (self.ylim[1] - self.ylim[0]) * self.h

    def frame(self, xticks, yticks, xlabel=None, xfmt=num, yfmt=num):
        out = []
        for t in yticks:
            y = self.py(t)
            out.append(seg(self.x0, y, self.x0 + self.w, y, GRID))
            out.append(text(self.x0 - 8, y + 5, yfmt(int(round(np.log10(t)))) if self.ylog else yfmt(t), "end"))
        for t in xticks:
            x = self.px(t)
            out.append(seg(x, self.y0 + self.h, x, self.y0 + self.h + 5))
            out.append(text(x, self.y0 + self.h + 22, xfmt(t)))
        out.append(seg(self.x0, self.y0 + self.h, self.x0 + self.w, self.y0 + self.h))
        out.append(seg(self.x0, self.y0, self.x0, self.y0 + self.h))
        if xlabel:
            out.append(text(self.x0 + self.w + 14, self.y0 + self.h + 5, xlabel, "start", italic=True))
        return out

    def line(self, xs, ys, color, width=2, dash=None):
        pts = " ".join(f"{self.px(x):.1f},{self.py(y):.1f}" for x, y in zip(xs, ys))
        d = f";stroke-dasharray:{dash}" if dash else ""
        return [f'<polyline points="{pts}" style="fill:none;stroke:{color};stroke-width:{width};stroke-linejoin:round{d}"/>']

    def dots(self, xs, ys, color, r=3.2, hollow=False):
        return [dot(self.px(x), self.py(y), color, r, hollow) for x, y in zip(xs, ys)]


def save(name, w, h, parts):
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}" '
           f'font-family="system-ui, sans-serif">\n' + "\n".join(parts) + "\n</svg>\n")
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, name), "w", encoding="utf-8") as f:
        f.write(svg)
    print("wrote docs/figures/" + name)


def chebyshev_nodes():
    """Equally spaced points on a half circle and their shadows on the diameter: the Chebyshev nodes."""
    w, h, cx, cy, r, n = 640, 300, 320, 250, 230, 12
    arc = " ".join(f"{cx + r * np.cos(t):.1f},{cy - r * np.sin(t):.1f}" for t in np.linspace(0, np.pi, 121))
    parts = [f'<polyline points="{arc}" style="fill:none;stroke:{INK};stroke-width:1.5"/>',
             seg(cx - r - 20, cy, cx + r + 20, cy)]
    for i in range(n):
        t = (2 * i + 1) * np.pi / (2 * n)
        x, y = cx + r * np.cos(t), cy - r * np.sin(t)
        parts += [seg(x, y, x, cy, GRID, 1, "4 4"), dot(x, y, INK, 3, hollow=True), dot(x, cy, A, 4.2)]
    parts += [text(cx - r, cy + 24, "−1"), text(cx, cy + 24, "0"), text(cx + r, cy + 24, "1"),
              text(cx + r + 30, cy + 5, "x", "start", italic=True)]
    save("chebyshev-nodes.svg", w, h, parts)


def gibbs():
    """f(x) = x on [-1, 1] and the sum of the first 20 terms of its Fourier series."""
    p = Plot(50, 15, 550, 290, (-1, 1), (-1.35, 1.35))
    x = np.linspace(-1, 1, 1201)
    s = sum(2 * (-1) ** (k + 1) / (k * np.pi) * np.sin(k * np.pi * x) for k in range(1, 21))
    parts = p.frame([-1, -0.5, 0, 0.5, 1], [-1, 0, 1], "x")
    parts += [seg(p.px(-1), p.py(1.179), p.px(1), p.py(1.179), B, 1, "5 4"),
              seg(p.px(-1), p.py(-1.179), p.px(1), p.py(-1.179), B, 1, "5 4"),
              text(p.px(-1) + 8, p.py(1.179) - 6, "1.179", "start", B)]
    parts += p.line(x, x, INK, 1.3) + p.line(x, s, A, 2)
    save("gibbs.svg", 640, 340, parts)


def chebyshev_decay():
    """Size of the Chebyshev coefficients of exp(x) and of Runge's function, on a log scale."""
    p = Plot(62, 15, 530, 290, (0, 60), (1e-16, 10), ylog=True)
    parts = p.frame([0, 10, 20, 30, 40, 50, 60], [1, 1e-4, 1e-8, 1e-12, 1e-16], "k", yfmt=pow10)
    ke = np.arange(0, 17)
    ce = np.array([iv(0, 1)] + [2 * iv(k, 1) for k in ke[1:]])
    cr = np.abs(C.chebinterpolate(lambda t: 1 / (1 + 25 * t * t), 200))
    kr = np.arange(0, 61, 2)
    rho = 0.2 + np.sqrt(1.04)
    parts += p.line([0, 60], [1, rho ** -60.0], INK, 1, "5 4")
    parts += p.line(ke, ce, A, 1.2) + p.dots(ke, ce, A)
    parts += p.dots(kr, cr[kr], B, 3)
    parts += [text(p.px(13.5), p.py(1e-9), "eˣ", "start", A, 18, True),
              text(p.px(36), p.py(2e-2), "1/(1 + 25x²)", "start", B, 18, True)]
    save("chebyshev-decay.svg", 640, 340, parts)


def fft_spectrum():
    """A noisy signal (top) and the size of its DFT coefficients (bottom): two tones stand out."""
    fs = 1000
    t = np.arange(1000) / fs
    x = np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 120 * t) + np.random.default_rng(1).normal(0, 1, t.size)
    amp = 2 * np.abs(np.fft.rfft(x)) / x.size
    freq = np.fft.rfftfreq(x.size, d=1 / fs)
    top = Plot(50, 12, 550, 130, (0, 0.25), (-4, 4))
    parts = top.frame([0, 0.05, 0.1, 0.15, 0.2, 0.25], [-3, 0, 3], "s", xfmt=lambda v: f"{v:.2f}")
    parts += top.line(t[:251], x[:251], INK, 1.1)
    bot = Plot(50, 195, 550, 130, (0, 250), (0, 1.2))
    parts += bot.frame([0, 50, 100, 120, 150, 200, 250], [0, 0.5, 1], "Hz", xfmt=lambda v: str(int(v)))
    for f, a in zip(freq[:251], amp[:251]):
        parts.append(seg(bot.px(f), bot.py(0), bot.px(f), bot.py(a), A, 1.6))
    save("fft-spectrum.svg", 640, 360, parts)


def dct_vs_dft():
    """Coefficients of a smooth signal that does not return to its starting value: DFT and DCT."""
    n = 64
    x = np.exp(np.arange(n) / n)
    k = np.arange(1, 32)
    xf = np.abs(np.fft.fft(x))[k] / n
    xc = np.abs(dct(x))[k] / (2 * n)
    p = Plot(62, 15, 530, 290, (0, 32), (1e-4, 1), ylog=True)
    parts = p.frame([1, 4, 8, 12, 16, 20, 24, 28, 31], [1, 1e-1, 1e-2, 1e-3, 1e-4], "k", yfmt=pow10)
    parts += p.line(k, 0.27 / k, B, 1, "5 4") + p.line(k, 0.17 / k ** 2, A, 1, "5 4")
    parts += p.dots(k, xf, B) + p.dots(k, xc, A)
    parts += [text(p.px(24), p.py(2.2e-2), "DFT", "start", B, 18), text(p.px(24), p.py(1.1e-3), "DCT", "start", A, 18)]
    save("dct-vs-dft.svg", 640, 340, parts)


def fft_gaussians():
    """A narrow bell (s = 4), its DFT (a wide bell, s = 1/4), and the bell that is its own DFT (s = 1)."""
    n_pts = 64
    n = np.arange(-n_pts // 2, n_pts // 2)
    idx = n % n_pts

    def bell(s):
        return sum(np.exp(-np.pi * s * (n + m * n_pts) ** 2 / n_pts) for m in range(-6, 7))

    narrow = bell(4.0)
    wrapped = np.zeros(n_pts)
    wrapped[idx] = narrow
    wide = (np.fft.fft(wrapped).real / np.sqrt(n_pts))[idx]
    p = Plot(50, 15, 550, 290, (-32, 32), (0, 1.08))
    parts = p.frame([-32, -16, 0, 16, 32], [0, 0.5, 1], "n", xfmt=lambda v: str(int(v)))
    parts += p.line(n, bell(1.0), INK, 1.4, "5 4")
    parts += p.line(n, wide, B, 1.6) + p.dots(n, wide, B, 2.2)
    parts += p.line(n, narrow, A, 1.6) + p.dots(n, narrow, A, 2.2)
    parts += [text(p.px(3.5), p.py(0.93), "s = 4", "start", A, 18, True),
              text(p.px(13), p.py(0.37), "s = ¼", "start", B, 18, True),
              text(p.px(-15.5), p.py(0.72), "s = 1", "end", INK, 18, True)]
    save("fft-gaussians.svg", 640, 340, parts)


def fft_bell_16():
    """N = 16 on [0, 2pi): the bell and its DFT coincide (top); the bell moved to pi gets alternating signs (bottom)."""
    n_pts = 16
    n = np.arange(n_pts)
    x = 2 * np.pi * n / n_pts
    g = sum(np.exp(-np.pi * (n + m * n_pts) ** 2 / n_pts) for m in range(-3, 4))
    fine = np.linspace(0, 2 * np.pi, 401)
    t = fine * n_pts / (2 * np.pi)
    curve = sum(np.exp(-np.pi * (t + m * n_pts) ** 2 / n_pts) for m in range(-3, 4))
    ticks = [0, np.pi / 2, np.pi, 3 * np.pi / 2, 2 * np.pi]
    labels = {0: "0", 1: "π/2", 2: "π", 3: "3π/2", 4: "2π"}
    fmt = lambda v: labels[int(round(v / (np.pi / 2)))]
    top = Plot(50, 12, 550, 130, (0, 2 * np.pi), (0, 1.1))
    parts = top.frame(ticks, [0, 0.5, 1], "x", xfmt=fmt)
    G = np.fft.fft(g).real / np.sqrt(n_pts)
    parts += top.line(fine, curve, GRID, 1.2) + top.dots(x, G, B, 6, hollow=True) + top.dots(x, g, A, 3)
    moved = np.roll(g, n_pts // 2)
    H = np.fft.fft(moved).real / np.sqrt(n_pts)
    bot = Plot(50, 195, 550, 130, (0, 2 * np.pi), (-1.1, 1.1))
    parts += bot.frame(ticks, [-1, 0, 1], "x", xfmt=fmt)
    mid = sum(np.exp(-np.pi * (t - n_pts / 2 + m * n_pts) ** 2 / n_pts) for m in range(-3, 4))
    parts += bot.line(fine, mid, GRID, 1.2)
    for xi, h in zip(x, H):
        parts.append(seg(bot.px(xi), bot.py(0), bot.px(xi), bot.py(h), B, 1.4))
    parts += bot.dots(x, H, B, 6, hollow=True) + bot.dots(x, moved, A, 3)
    save("fft-bell-16.svg", 640, 360, parts)


def fft_dice():
    """The sum of ten dice, computed by multiplying spectra, against the bell with the same mean and variance."""
    d, n_pts = 10, 64
    die = np.zeros(n_pts)
    die[1:7] = 1 / 6
    p_sum = np.fft.ifft(np.fft.fft(die) ** d).real
    mean, var = 3.5 * d, d * 35 / 12
    k = np.arange(10, 61)
    fine = np.linspace(10, 60, 501)
    bell = np.exp(-(fine - mean) ** 2 / (2 * var)) / np.sqrt(2 * np.pi * var)
    p = Plot(62, 15, 530, 290, (10, 60), (0, 0.08))
    parts = p.frame([10, 20, 30, 35, 40, 50, 60], [0, 0.02, 0.04, 0.06, 0.08], "k",
                    xfmt=lambda v: str(int(v)), yfmt=lambda v: f"{v:.2f}")
    half = 0.36 * (p.px(1) - p.px(0))
    for kk in k:
        parts.append(f'<rect x="{p.px(kk) - half:.1f}" y="{p.py(p_sum[kk]):.1f}" width="{2 * half:.1f}" '
                     f'height="{p.py(0) - p.py(p_sum[kk]):.1f}" style="fill:{A};opacity:0.75"/>')
    parts += p.line(fine, bell, B, 2)
    save("fft-dice.svg", 640, 340, parts)


def home_glyphs():
    """Prints the small drawings used beside the article titles on the home page (pasted into site/index.html)."""
    x = np.linspace(-1, 1, 81)
    t7 = C.chebval(x, [0] * 7 + [1])
    pts = " ".join(f"{6 + (v + 1) * 54:.1f},{34 - 26 * y:.1f}" for v, y in zip(x, t7))
    print("chebyshev glyph points:", pts)
    heights = [8, 14, 52, 16, 10, 9, 30, 11, 8, 7, 6, 6, 5, 5, 4, 4]
    print("fft glyph bars:", " ".join(f"M{9 + 7 * i} 62V{62 - h}" for i, h in enumerate(heights)))


def sampling_humps():
    """Seven samples of a band-limited signal, one sin(x)/x hump per sample, and their sum through every sample."""
    def sig(t):
        return 0.6 * np.sin(2 * np.pi * 0.13 * t + 0.4) + 0.35 * np.cos(2 * np.pi * 0.31 * t)
    n = np.arange(-3, 4)
    t = np.linspace(-4.5, 4.5, 901)
    p = Plot(50, 15, 550, 290, (-4.5, 4.5), (-1.0, 1.0))
    parts = p.frame([-4, -3, -2, -1, 0, 1, 2, 3, 4], [-1, -0.5, 0, 0.5, 1], "t/Δ", xfmt=lambda v: str(int(v)))
    for k in n:
        parts += p.line(t, sig(k) * np.sinc(t - k), A, 1, "4 3")
    total = sum(sig(k) * np.sinc(t - k) for k in n)
    parts += p.line(t, total, INK, 2.2) + p.dots(n, sig(n), B, 4)
    save("sampling-humps.svg", 640, 340, parts)


def sampling_lattices():
    """Copies of a round spectrum in two equal squares: on a square lattice (left) and packed hexagonally (right)."""
    r, w, h, box = 24, 640, 300, 260
    parts = []
    for k, (ox, hexa) in enumerate(((30, False), (350, True))):
        parts.append(f'<clipPath id="lat{k}"><rect x="{ox}" y="20" width="{box}" height="{box}"/></clipPath>')
        cells = []
        for i in range(-6, 9):
            for j in range(-2, 9):
                x = ox + r + (i + (0.5 * j if hexa else 0)) * 2 * r
                y = 20 + r + j * (np.sqrt(3) if hexa else 2) * r
                if ox - r <= x <= ox + box + r and 20 - r <= y <= 20 + box + r:
                    cells.append((x, y))
        g = [f'<circle cx="{x:.1f}" cy="{y:.1f}" r="{r}" style="fill:{A};fill-opacity:.12;stroke:{A};stroke-width:1.4"/>'
             + dot(x, y, INK, 2.2) for x, y in cells]
        parts.append(f'<g clip-path="url(#lat{k})">' + "".join(g) + "</g>")
        parts.append(f'<rect x="{ox}" y="20" width="{box}" height="{box}" style="fill:none;stroke:{INK};stroke-width:1.2"/>')
    save("sampling-lattices.svg", w, h, parts)


def sampling_sphere():
    """A globe with L = 8 Gauss-Legendre latitudes and 2L - 1 = 15 meridians: the 120 sampling points."""
    L, cx, cy, R, w, h = 8, 320, 170, 150, 640, 340
    tilt = np.radians(20)

    def proj(theta, phi):
        x, y, z = np.sin(theta) * np.cos(phi), np.sin(theta) * np.sin(phi), np.cos(theta)
        y2, z2 = y * np.cos(tilt) - z * np.sin(tilt), y * np.sin(tilt) + z * np.cos(tilt)
        return cx + R * x, cy - R * z2, y2           # y2 < 0: the front half

    def curve(pts):
        out, run = [], []
        for x, y, d in pts:
            if d <= 0:
                run.append(f"{x:.1f},{y:.1f}")
            elif run:
                out.append(run)
                run = []
        if run:
            out.append(run)
        return [f'<polyline points="{" ".join(r)}" style="fill:none;stroke:{GRID};stroke-width:1.2"/>' for r in out if len(r) > 1]

    parts = [f'<circle cx="{cx}" cy="{cy}" r="{R}" style="fill:none;stroke:{INK};stroke-width:1.5"/>']
    z, _ = np.polynomial.legendre.leggauss(L)
    thetas = np.arccos(z)
    phis = 2 * np.pi * np.arange(2 * L - 1) / (2 * L - 1)
    ring = np.linspace(0, 2 * np.pi, 241)
    for th in thetas:
        parts += curve([proj(th, ph) for ph in ring])
    for ph in phis:
        parts += curve([proj(th, ph) for th in np.linspace(0, np.pi, 121)])
    for th in thetas:
        for ph in phis:
            x, y, d = proj(th, ph)
            if d <= 0:
                parts.append(dot(x, y, A, 3.4))
    save("sampling-sphere.svg", w, h, parts)


if __name__ == "__main__":
    chebyshev_nodes()
    gibbs()
    chebyshev_decay()
    fft_spectrum()
    dct_vs_dft()
    fft_gaussians()
    fft_bell_16()
    fft_dice()
    home_glyphs()
    sampling_humps()
    sampling_lattices()
    sampling_sphere()
