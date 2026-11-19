#!/usr/bin/env python3
"""Fills the home page from the profiles in docs/.

    usage: scripts/build-home.py <dist dir>

scripts/build.sh runs this after copying site/ to dist/. It reads

- docs/categories.json  — the category chips, in order (Math, IT, Projects, ...);
- docs/<id>.json        — one profile per article or project (see README, "Article profiles");
- docs/icons/*.svg      — the drawings the profiles point to,

and writes

- the chips, "Current Exhibition" and "The Collection" into dist/index.html, where the markers
  <!-- build-home:chips -->, <!-- build-home:exhibition --> and <!-- build-home:collection --> stand;
- dist/catalog.json — all profiles in one file, newest first, for scripts that want them.

Current Exhibition: profiles marked "featured": true, plus everything updated in the last EXHIBITION_DAYS days,
newest first, at most EXHIBITION_MAX. The Collection: everything, newest first.
A bad profile (unknown category, missing English title, icon file not found) stops the build.
"""
import datetime as dt
import glob
import html
import json
import os
import re
import sys

EXHIBITION_DAYS = 45
EXHIBITION_MAX = 5
HERE = os.path.dirname(os.path.abspath(__file__))
DOCS = os.path.join(HERE, "..", "docs")


def fail(msg):
    sys.exit(f"build-home: {msg}")


def esc(s):
    return html.escape(s, quote=True)


def load_profiles(category_ids):
    profiles = []
    for path in sorted(glob.glob(os.path.join(DOCS, "*.json"))):
        if os.path.basename(path) == "categories.json":
            continue
        with open(path, encoding="utf-8") as f:
            p = json.load(f)
        name = os.path.basename(path)
        if p.get("id") != name[:-5]:
            fail(f"{name}: id must be the file name without .json")
        if p.get("category") not in category_ids:
            fail(f"{name}: unknown category {p.get('category')!r} (see docs/categories.json)")
        if "full" not in p.get("title", {}).get("en", {}):
            fail(f"{name}: title.en.full is required")
        for size, icon in p.get("icon", {}).items():
            if icon and not os.path.isfile(os.path.join(DOCS, icon)):
                fail(f"{name}: icon.{size} {icon} not found in docs/")
        for key in ("createdAt", "updatedAt"):
            p[key + "_dt"] = dt.datetime.fromisoformat(p[key])
        profiles.append(p)
    profiles.sort(key=lambda p: p["updatedAt_dt"], reverse=True)
    return profiles


def url(p, lang):
    """Where the profile opens in the given language."""
    if p.get("link"):
        return p["link"]
    return f"{p['id']}.{lang}.html" if len(p["languages"]) > 1 else f"{p['id']}.html"


def title(p, lang, size):
    t = p["title"].get(lang) or p["title"]["en"]
    return t.get(size) or t["full"]


def icon_svg(p, size, css_class):
    path = p.get("icon", {}).get(size)
    if not path:
        return f'<span class="{css_class}" aria-hidden="true"></span>'
    with open(os.path.join(DOCS, path), encoding="utf-8") as f:
        svg = f.read().strip()
    svg = re.sub(r'\s+xmlns="[^"]*"', "", svg, count=1)
    return svg.replace("<svg", f'<svg class="{css_class}" aria-hidden="true"', 1)


def title_link(p, size):
    """Title in English; visitors whose browser is set to Russian get the Russian page (data-ru, see home.js)."""
    attrs = f'href="{esc(url(p, "en"))}"'
    if "ru" in p["languages"] and len(p["languages"]) > 1:
        attrs += f' data-ru="{esc(url(p, "ru"))}"'
    if p.get("link"):
        attrs += ' rel="external"'
    return f'<a {attrs}>{esc(title(p, "en", size))}</a>'


def lang_badges(p):
    if p.get("link"):
        return '<span class="kind-badge">GitHub</span>'
    out = []
    for lang in p["languages"]:
        hint = "English" if lang == "en" else f"Русский: {title(p, lang, 'full')}"
        out.append(f'<a class="lang-badge" href="{esc(url(p, lang))}" hreflang="{lang}" lang="{lang}" '
                   f'title="{esc(hint)}">{lang.upper()}</a>')
    return "".join(out)


def search_text(p):
    words = [p["category"]]
    for lang, t in p["title"].items():
        words += t.values()
    words += p.get("summary", {}).values()
    return " ".join(words).lower()


def common_attrs(p):
    return (f'data-id="{esc(p["id"])}" data-category="{esc(p["category"])}" '
            f'data-page="{esc("" if p.get("link") else url(p, "en"))}"')


def exhibition_html(profiles, now):
    cutoff = now - dt.timedelta(days=EXHIBITION_DAYS)
    chosen = [p for p in profiles if p.get("featured") or p["updatedAt_dt"] >= cutoff][:EXHIBITION_MAX]
    rows = []
    for p in chosen:
        rows.append(f"""            <li class="entry" {common_attrs(p)}>
                {icon_svg(p, "large", "glyph")}
                <div>
                    <h3>{title_link(p, "full")}</h3>
                    <p>{esc(p.get("summary", {}).get("en", ""))}</p>
                </div>
                <div class="entry-langs">{lang_badges(p)}</div>
            </li>""")
    return "\n".join(rows)


def collection_html(profiles, cat_titles):
    rows = []
    for p in profiles:
        rows.append(f"""            <li class="item" {common_attrs(p)} data-search="{esc(search_text(p))}">
                {icon_svg(p, "small", "item-icon")}
                <div class="item-main">
                    <span class="item-title">{title_link(p, "medium")}</span>
                    <span class="item-meta"><span class="item-cat">{esc(cat_titles[p["category"]])}</span> ·
                        <time datetime="{esc(p["updatedAt"])}">{p["updatedAt_dt"].strftime("%Y-%m-%d")}</time><span
                        class="item-visits"></span></span>
                </div>
                <div class="entry-langs">{lang_badges(p)}</div>
            </li>""")
    return "\n".join(rows)


def chips_html(categories, profiles):
    counts = {}
    for p in profiles:
        counts[p["category"]] = counts.get(p["category"], 0) + 1
    out = []
    for c in categories:
        n = counts.get(c["id"], 0)
        empty = " disabled" if n == 0 else ""
        out.append(f'<button type="button" class="chip" data-category="{esc(c["id"])}" aria-pressed="true"'
                   f'{empty}>{esc(c["title"]["en"])} <span class="chip-count">{n}</span></button>')
    return "\n            ".join(out)


def main():
    if len(sys.argv) != 2:
        fail("usage: scripts/build-home.py <dist dir>")
    dist = sys.argv[1]
    with open(os.path.join(DOCS, "categories.json"), encoding="utf-8") as f:
        categories = json.load(f)["categories"]
    cat_titles = {c["id"]: c["title"]["en"] for c in categories}
    profiles = load_profiles(set(cat_titles))
    now = dt.datetime.now(dt.timezone.utc)

    index_path = os.path.join(dist, "index.html")
    with open(index_path, encoding="utf-8") as f:
        page = f.read()
    for marker, content in (("chips", chips_html(categories, profiles)),
                            ("exhibition", exhibition_html(profiles, now)),
                            ("collection", collection_html(profiles, cat_titles))):
        tag = f"<!-- build-home:{marker} -->"
        if tag not in page:
            fail(f"{tag} not found in index.html")
        page = page.replace(tag, content)
    with open(index_path, "w", encoding="utf-8") as f:
        f.write(page)

    catalog = [{k: v for k, v in p.items() if not k.endswith("_dt")} for p in profiles]
    for p in catalog:
        p["url"] = {lang: url(p, lang) for lang in p["languages"]}
    with open(os.path.join(dist, "catalog.json"), "w", encoding="utf-8") as f:
        json.dump({"categories": categories, "items": catalog}, f, ensure_ascii=False, indent=2)
    print(f"build-home: {len(profiles)} profiles, {len(categories)} categories")


if __name__ == "__main__":
    main()
