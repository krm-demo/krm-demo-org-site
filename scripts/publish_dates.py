"""When an article first appeared on the preview and on krm-demo.org, read from git.

- Preview: the time of the first commit that added any of docs/<id>.json, docs/<id>.md or docs/<id>.<lang>.md.
  Every push to main is built for the preview within a minute, so the commit time stands for it.
- krm-demo.org: the earliest v* tag that contains that commit, with the tag's date (for annotated tags the
  time the tag was made, for lightweight ones the time of the tagged commit).

Needs the git history and tags in the checkout (fetch-depth: 0). Without them the dates are missing, not wrong:
the page simply shows fewer of them.
"""
import datetime as dt
import subprocess
from zoneinfo import ZoneInfo

ZONE = ZoneInfo("America/New_York")   # where the site is written; the times on the page are in this zone
MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
MONTHS_RU = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"]

_cache = {}


def _git(*args):
    try:
        return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        return ""


def dates(doc_id):
    """{"preview": datetime or None, "release": datetime or None, "tag": "v1.1.0" or None}"""
    if doc_id in _cache:
        return _cache[doc_id]
    result = {"preview": None, "release": None, "tag": None}
    log = _git("log", "--reverse", "--format=%H %cI", "--",
               f"docs/{doc_id}.json", f"docs/{doc_id}.md", f"docs/{doc_id}.*.md")
    if log:
        sha, when = log.splitlines()[0].split(" ", 1)
        result["preview"] = dt.datetime.fromisoformat(when)
        tags = _git("tag", "--list", "v*", "--contains", sha, "--sort=creatordate",
                    "--format=%(refname:short) %(creatordate:iso-strict)")
        if tags:
            tag, when = tags.splitlines()[0].split(" ", 1)
            result["tag"], result["release"] = tag, dt.datetime.fromisoformat(when)
    _cache[doc_id] = result
    return result


def local(moment):
    return moment.astimezone(ZONE)


def day(moment, lang):
    """2026-Nov-19 / 19 ноя 2026"""
    d = local(moment)
    if lang == "ru":
        return f"{d.day} {MONTHS_RU[d.month - 1]} {d.year}"
    return f"{d.year}-{MONTHS_EN[d.month - 1]}-{d.day:02d}"


def day_time(moment, lang):
    """2026-Nov-19 23:05 EST / 19 ноя 2026, 23:05 EST"""
    d = local(moment)
    sep = ", " if lang == "ru" else " "
    return f"{day(moment, lang)}{sep}{d:%H:%M} {d.tzname()}"
