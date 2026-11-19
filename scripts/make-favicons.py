#!/usr/bin/env python3
"""Draws the site icon [(-)] in the colours of each skin and renders every size the browsers and phones ask for.

    usage: scripts/make-favicons.py            (run by hand; the results are committed, like the figures)

Needs rsvg-convert (librsvg) and ImageMagick's convert. Writes into site/icons/:

    favicon-<skin>.svg                      the drawing itself, for 32 px and up
    favicon-<skin>-16x16.svg                a pixel-aligned version for 16 px, where thin curves would blur
    favicon-<skin>-16x16.png                browser tab, normal screens
    favicon-<skin>-32x32.png                browser tab, high-density screens; taskbar
    favicon-<skin>-48x48.png                Windows site tiles, some bookmark lists
    apple-touch-icon-<skin>-180x180.png     iPhone / iPad home screen (iOS rounds the corners itself)
    icon-<skin>-192x192.png                 Android home screen (manifest.json)
    icon-<skin>-512x512.png                 Android splash screen, install dialogs

and site/favicon.ico (16, 32, 48; light skin) for programs that only look at /favicon.ico.
site.js swaps the tab icon, the touch icon and the address-bar colour (theme-color) when the skin changes.
The home-screen icon in manifest.json stays light: a phone reads it once, when the site is added.
"""
import os
import subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "site", "icons")

# Colours follow site.css: the tile is the header, the brackets are its text, the dash is the accent.
SKINS = {
    "light":      dict(tile="#123a73", ink="#ffffff", dash="#8fc1ff", radius=14, stroke=4.5, border=None, border_width=0),
    "dark":       dict(tile="#0e1116", ink="#dfe5ee", dash="#8fc1ff", radius=14, stroke=4.5, border="#303a49", border_width=1.5),
    "scientific": dict(tile="#ffffff", ink="#111111", dash="#7a1f2b", radius=4,  stroke=3.6, border="#111111", border_width=2),
    "pulp":       dict(tile="#efb81f", ink="#1c1814", dash="#c62a1d", radius=10, stroke=5.5, border="#1c1814", border_width=3),
}

# [(-)] on a 64-unit square, symmetric about x = 32.
GLYPH = [
    "M15 14H9V50H15",           # [
    "M24 16Q16.5 32 24 48",     # (
    "M40 16Q47.5 32 40 48",     # )
    "M49 14H55V50H49",          # ]
]
DASH = "M28.5 32H35.5"


def svg_large(c):
    border = ""
    if c["border"]:
        w = c["border_width"]
        border = f' stroke="{c["border"]}" stroke-width="{w}"'
        inset = w / 2
    else:
        inset = 0
    size = 64 - 2 * inset
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
    <rect x="{inset}" y="{inset}" width="{size}" height="{size}" rx="{c["radius"]}" fill="{c["tile"]}"{border}/>
    <g fill="none" stroke-width="{c["stroke"]}" stroke-linecap="round" stroke-linejoin="round">
        <path stroke="{c["ink"]}" d="{" ".join(GLYPH)}"/>
        <path stroke="{c["dash"]}" d="{DASH}"/>
    </g>
</svg>
"""


# 16 px: drawn on the pixel grid. Brackets 2 px wide, parentheses 1 px, the dash a 2x2 block.
PIXELS_INK = [
    (1, 3, 2, 10), (3, 3, 1, 2), (3, 11, 1, 2),        # [
    (6, 4, 1, 2), (5, 6, 1, 4), (6, 10, 1, 2),         # (
    (9, 4, 1, 2), (10, 6, 1, 4), (9, 10, 1, 2),        # )
    (13, 3, 2, 10), (12, 3, 1, 2), (12, 11, 1, 2),     # ]
]
PIXELS_DASH = [(7, 7, 2, 2)]


def svg_small(c):
    rects = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>' for x, y, w, h in PIXELS_INK)
    dash = "".join(f'<rect x="{x}" y="{y}" width="{w}" height="{h}"/>' for x, y, w, h in PIXELS_DASH)
    # No border at this size: there is no pixel to spare between it and the brackets.
    radius = 1 if c["radius"] < 8 else 3
    return f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" shape-rendering="crispEdges">
    <rect width="16" height="16" rx="{radius}" fill="{c["tile"]}"/>
    <g fill="{c["ink"]}">{rects}</g>
    <g fill="{c["dash"]}">{dash}</g>
</svg>
"""


def render(svg_path, png_path, size):
    subprocess.run(["rsvg-convert", "-w", str(size), "-h", str(size), "-o", png_path, svg_path], check=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    for skin, c in SKINS.items():
        large = os.path.join(OUT, f"favicon-{skin}.svg")
        small = os.path.join(OUT, f"favicon-{skin}-16x16.svg")
        with open(large, "w") as f:
            f.write(svg_large(c))
        with open(small, "w") as f:
            f.write(svg_small(c))
        render(small, os.path.join(OUT, f"favicon-{skin}-16x16.png"), 16)
        for size in (32, 48):
            render(large, os.path.join(OUT, f"favicon-{skin}-{size}x{size}.png"), size)
        # Phones put their own mask on the icon, so these are full-bleed squares without a border.
        touch = dict(c, radius=0, border=None)
        full = os.path.join(OUT, f".touch-{skin}.svg")
        with open(full, "w") as f:
            f.write(svg_large(touch))
        render(full, os.path.join(OUT, f"apple-touch-icon-{skin}-180x180.png"), 180)
        for size in (192, 512):
            render(full, os.path.join(OUT, f"icon-{skin}-{size}x{size}.png"), size)
        os.remove(full)
    subprocess.run(["convert"] + [os.path.join(OUT, f"favicon-light-{s}x{s}.png") for s in (16, 32, 48)]
                   + [os.path.join(OUT, "..", "favicon.ico")], check=True)
    print("icons written to", os.path.normpath(OUT))


if __name__ == "__main__":
    main()
