# Who drops by while nobody's home?

*The first night of this site's access logs, read line by line: 137 requests between 02:14 and 05:58 UTC on 2026-11-19 (a quiet Wednesday evening in New York). Every number below was counted from those log files by a script; nothing is estimated. A sequel to [Who is reading this?](visit-counter.md), which explains how the logs are collected.*

**The short version.** In almost four hours the site answered 137 requests. Half of them came from a single browser tab left open since early in the week, still asking for a file that no longer exists. A fifth came from one crawler dressed as a 2019 iPhone, calling from eight countries. Nine were burglars trying the doors of a WordPress site that isn't here. Real people with real browsers opened the home page three times. The visit counter, which skips anything that admits to being a robot, counted 30 page openings; 24 of them were the iPhone that wasn't.

## 1. The night in numbers

Each request in the log carries the time, the address asked for, the answer, the browser's own description of itself (the *user agent*), the page it came from (the *referer*), and the country it came from. There is no IP address: we chose not to keep it ([§5 of the previous note](visit-counter.md#s5)). Grouping the 137 lines by who sent them gives five kinds of guest.

| Who | Requests | Share | What they wanted |
| --- | --- | --- | --- |
| A tab left open since early in the week | 70 | 51% | `/build.json`, every minute, in bursts |
| A crawler dressed as an iPhone | 26 | 19% | Article pages only, never a picture or a stylesheet |
| Real browsers | 27 | 20% | Pages together with their stylesheet, scripts and `build-site.json` |
| Door-knockers | 9 | 7% | WordPress login and plugin files, plus one `/321` |
| Link checkers | 5 | 4% | The home page, through the redirects and no further |

## 2. A tab left open since early in the week

Seventy requests, half of the night, came from one Mac with Chrome. Every one of them asked for `/build.json`, and every one arrived as a pair: first the plain `http://` address, which CloudFront answers with a redirect to `https://`, then the `https://` address, which answers *404 Not Found*.

The file was renamed to `build-site.json` on 2026-11-17. A page loaded before that day, from an `http://` link, never reloaded and kept polling the old name once a minute ([how the polling works](page-refresh.md)). The requests come in bursts — 02:14, 02:15, then 02:31 to 02:33 — because browsers put background tabs to sleep and wake them now and then.

The current version stops polling while its tab is hidden, so tabs opened today will not do this. The only fix for the old one is to close it.

## 3. An iPhone from 2019 in eight countries

Twenty-six requests carry the same description, word for word: an iPhone with iOS 13.2.3, a version from November 2019. That exact string is also what Chrome's developer tools send when they pretend to be an iPhone, which makes it a convenient disguise for automated browsers.

It came from the United States (12 requests), Brazil (3), Singapore (3), Hong Kong (2), Germany (2), South Korea (2), Indonesia (1) and Japan (1). It asked only for article pages, at intervals of ten to forty minutes, never with a referer. It never asked for the stylesheet, the scripts, the fonts or the formula fonts, which every real Safari loads with the page.

One phone does not travel from Seoul to São Paulo in an hour. This is one program, run from rented machines in several data centres, reading the site one page at a time. The counter's robot list looks for words like *bot*, *crawl* and *headless* in the user agent. This one says none of them, so it was counted: 24 of the 30 page openings counted that night are its own.

## 4. Door-knockers

Nine requests had nothing to do with this site. They tried the addresses where a WordPress site keeps its login page (`/wp-login.php`, from the US and Brazil) and a plugin file (`/wp-content/plugins/hellopress/wp_filemanager.php`). They also sent three `POST` requests to `/wp-json/batch/v1` and the home page from Brazil, and asked for `/321` from the Czech Republic.

These are scripts that walk through every address on the internet and try the doors of popular software, hoping one is unlocked. Here there is nothing behind the doors: the pages are plain files. The `GET` requests got *404 Not Found*. The `POST` requests got *403 Forbidden*, because CloudFront accepts only reading requests for this site and refuses everything else before it reaches storage.

The two bare `wp-login.php` visitors described themselves as just `Mozilla/5.0`, and one plugin-file visitor sent no description at all. Neither is something a real browser does.

## 5. Link checkers

Five requests met only redirects and went no further. A machine in France asked for the home page four times in three seconds. Each time it was sent on, either from `http://` to `https://` or from `www.krm-demo.org` to `krm-demo.org`, and it never collected the page itself. A "Pixel 6" asked once, got the redirect away from `www.`, and left.

These are probably link checkers and uptime monitors: they want to know that the address answers, not what it says.

## 6. And people

Real browsers leave a recognisable trail. Within the same second they ask for the page and then for `site.css`, `site.js` and `build-site-info.js`, each with the page itself as the referer, and a moment later for `build-site.json`. When the browser already has a fresh copy, the answer is *304 Not Modified* instead of the file. That is cheap, and it still shows in the log.

Three such trails appear in the night, all on the home page:

- an Android phone that came from a link on github.com at 04:07 and again at 05:12, and that also had `page-refresh.html` open, polling for new versions;
- a Linux Chrome at 02:55, whose stylesheet and scripts arrive in the same second as the page.

Two more Windows visitors opened the home page. One asked for nothing else, which a browser with everything cached might do. The other fetched the two scripts the way a program follows links: each from the plain `http://` address, each naming itself as the referer. Neither left the full trail, so they may be people or may not; the log alone cannot tell.

## 7. What this means for the counter

The counter counts a page opening when a page is answered *200* or *304* and the user agent does not admit to being a robot. That night it counted 30 openings. Real browsers account for three to five of them, and the iPhone crawler for 24.

A better rule is already in the logs. Count a page only when its stylesheet or script is requested with that page as the referer. Crawlers that fetch only the HTML never do that, and real browsers always do, unless they kept the files in their cache. The same night under that rule gives 3 openings, all of the home page, which matches the trails in §6.

The rule has two blind spots:

- A reader who opens a second article within five minutes may load nothing new, because the stylesheet is cached for 300 seconds, and would go uncounted.
- A crawler that renders pages fully, stylesheets and all, would still be counted.

Both are smaller errors than counting one program in eight countries as twenty-four readers. The change is a few lines in the hourly function. It is not switched on yet.

## 8. Where to look yourself

The CloudFront console has ready-made reports for the last 60 days, with no setup and at no extra cost:

- **Popular objects** — the 50 most requested files, with hits, misses and errors.
- **Top referrers** — the 25 sites that sent the most requests.
- **Viewers** — devices, browsers, operating systems and locations.
- **Usage** and **Cache statistics**.

Find them under *Reports & analytics* in the CloudFront console. All times are UTC.

Those reports count every request, robots included, just like the raw log. The log files themselves are in the private bucket `krm-demo-org-cf-logs-560574854768`, one small compressed file every few minutes, and are deleted after 90 days.

## 9. The words in the log

The `x-edge-result-type` column says how CloudFront answered:

| Value | Meaning | Count that night |
| --- | --- | --- |
| `Redirect` | `http://` sent to `https://` by CloudFront itself | 44 |
| `Error` | A *4xx* or *5xx* answer (here: 404 and 403) | 42 |
| `RefreshHit` | The edge had a copy, asked the origin whether it was still current, and served it | 34 |
| `Miss` | The edge had no copy and fetched one from the bucket | 9 |
| `FunctionGeneratedResponse` | Answered by our function that sends `www.` to the bare name | 5 |
| `Hit` | Served straight from the edge's copy | 3 |

## References

1. Amazon CloudFront Developer Guide. *Standard logging (access logs): log file fields.* https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/standard-logs-reference.html
2. Amazon CloudFront Developer Guide. *View CloudFront reports in the console.* https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/reports.html
3. Amazon CloudFront Developer Guide. *View CloudFront popular objects reports.* https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/popular-objects-report.html
4. Amazon CloudFront Developer Guide. *View CloudFront top referrers reports.* https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/top-referrers-report.html
5. This site: [Who is reading this? Counting visits without a tracker](visit-counter.md) and [Are we there yet? How this site notices a new version](page-refresh.md).
