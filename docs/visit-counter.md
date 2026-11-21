# Who is reading this? Counting visits without a tracker

*How many people open these pages, measured where the pages are served and with nothing added to them: no script, no cookie. What the owner can already see, what it would take to count each article, and which numbers could be shown to everybody. As of 2026-11-18: the counter was switched on that evening, so the numbers start there.*

**The short version.** krm-demo.org is served by [Amazon CloudFront](https://aws.amazon.com/cloudfront/){: .tech}, and CloudFront counts every request whether we ask it to or not. Totals for the whole site are available today, and so is a list of the most requested pages; both need an [AWS](https://aws.amazon.com/){: .tech} login. A counter that every visitor can see takes one more step: a small scheduled job that turns the request logs into a tiny file of totals, which the page then reads. That is how it is done here ([§5](#s5)), and it is the same trick this site already uses to notice [a new version of itself](page-refresh.md).

## 1. A request is not a reader

Opening one article makes the browser ask for the page, the stylesheet, two scripts, the formula fonts, and then for `build-site.json` once a minute for as long as the tab stays open. CloudFront counts all of it.

The real numbers show the gap. On 17 November 2026 the site answered 5,726 requests and sent 6.2 MB. On the 18th, up to the evening, it answered 768 requests and sent 3.6 MB. Almost all of that was one person, the owner, testing pages on two devices and leaving tabs open. So the raw total says "the site is alive" and nothing more.

To count readers, count only requests that mean "someone opened a page":

- the address is `/` or ends in `.html`;
- the answer was 200 (sent) or 304 (the browser's copy is still good);
- the visitor does not introduce itself as a robot.

Two effects blur even that number, and both are harmless. A reload within five minutes never reaches CloudFront, because the browser was told the page stays fresh for 300 seconds; it is the same reader anyway. And when a link is pasted into a messenger, the messenger fetches the page to draw a preview, which counts as one more "reader".

**Why count at CloudFront and not at the storage behind it?** CloudFront answers most requests from its own cache. The [S3](https://aws.amazon.com/s3/){: .tech} bucket behind it sees only the few that miss, so its numbers would be far too low.

## 2. Four places to look

| Where | What it shows | Per page | Who can see it | Cost | To set up |
| --- | --- | --- | --- | --- | --- |
| [CloudWatch](https://aws.amazon.com/cloudwatch/){: .tech} metrics | Requests, bytes and error rates for the whole site, minute by minute | No | The owner, in the AWS console; or anyone, through a shared dashboard ([§3](#s3)) | Free | Nothing: on by default |
| CloudFront console reports | The 50 most requested addresses with their request counts; where visitors came from; their devices, browsers and countries | Yes | The owner, in the AWS console | Free | Nothing: on by default |
| Access logs | One line per request: time, address, answer, referring page, browser, and more if asked for | Yes | The owner only | Cents per month for storage | A private bucket and a delivery setting |
| A counter file made from the logs | Whatever totals we choose to publish | Yes | Everybody | Close to nothing | A scheduled job ([§5](#s5)) |

The second row is the pleasant surprise. The [popular objects report](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/popular-objects-report.html) covers any range within the last 60 days and needs no logging to be switched on. In the AWS console it is under CloudFront, "Reports & analytics", "Popular objects". The same menu holds "Top referrers" and "Viewers".

## 3. What can be shown without a login

**A shared dashboard.** CloudWatch can [share one dashboard publicly](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/share-cloudwatch-dashboard-public.html): anyone with the link sees it, with no account and no password. A dashboard with a single chart, requests per day, would be a public pulse of the site. It cannot show counts per article, because the metrics behind it are totals. It should hold nothing else, since the link works for everyone who gets hold of it.

**A counter on the page.** For "this article was opened 314 times", the numbers have to come from the logs, and the logs must stay private. So a job reads them and publishes only totals:

1. CloudFront writes its access logs to a private bucket.
2. Once a day, or once an hour, a small job reads the new lines, applies the rules of [§1](#s1), and adds to the totals.
3. It writes `stats.json`, a file of a few hundred bytes, next to the pages: for each article the total and the count for the last seven days, and the time of the update.
4. The page fetches that file and prints the number beside the title, just as the footer prints the build information from `build-site.json`.

Nothing runs in the reader's browser beyond fetching one small file, and no cookie is set.

## 4. What this kind of counting cannot tell

- **People.** It counts openings, not persons. One reader on a phone and a laptop is two; a reader who comes back every day is counted every day.
- **Robots that lie.** Search engines say who they are and are easy to leave out. Scrapers that pretend to be a browser are counted as readers.
- **Attention.** There is no "time on page" and no "read to the end". Only a script in the page could measure that.
- **The preview site.** [GitHub Pages](https://pages.github.com/){: .tech} keeps no logs for us, so only krm-demo.org is counted. That is right: the preview is for testing.

A script-based counter errs the other way: it misses every reader whose browser blocks trackers. The two methods never agree, and the truth lies between them. For a site of long articles, "how many times was this opened" is the question, and the logs answer it.

## 5. How it is set up here

Everything is one CloudFormation template, [`infra/visit-counter.yaml`](https://github.com/krm-demo/krm-demo-org-site/blob/main/infra/visit-counter.yaml), deployed once as the stack `krm-demo-org-visit-counter`:

- **A private bucket for the logs.** Log files are deleted after 90 days.
- **Log delivery from CloudFront**, limited to nine fields: date, time, method, address, answer code, referring page, browser, cache result and country. The visitor's IP address is not among them, so it is never stored.
- **A small function that runs every hour.** It reads the log files that arrived since its last run, applies the rules of [§1](#s1), keeps running totals, and writes `stats.json` into the site's bucket. The file looks like this:

```json
{"updated": "2026-11-19T02:00:00Z", "since": "2026-11-19",
 "pages": {"fft.ru.html": {"week": 12, "total": 40}, "index.html": {"week": 31, "total": 95}}}
```

- **The badge.** Each article has a quiet line near the top, "Opened this week: 12". One click adds the total, the starting date and the time of the last count. `visit-badge.js` draws it from `stats.json`; where the file is missing, as on the preview site, nothing is shown.

Numbers appear with a delay of up to about two hours: CloudFront delivers logs in batches, the function runs hourly, and the file may be cached for five minutes. Removing the whole thing is one action: delete the stack (and empty the log bucket first).

Still optional: a shared CloudWatch dashboard with the requests-per-day chart ([§3](#s3)).

## 6. History: "You are visitor number 001337"

The first web counters were pictures. In the middle of the 1990s a page would embed an image from a counting service; each time the image was requested the service added one and drew the new number, usually as the rolling digits of a car's odometer. Everyone could see the count, and everyone could raise it by pressing reload.

Site owners who wanted honest numbers turned to the record their own server already kept: one line per request. Programs such as Analog (1995), Webalizer (1997) and AWStats (2000) read those logs overnight and produced tables of pages, referrers and browsers.

Then caches and content networks moved between the reader and the server, and the server's log stopped seeing most requests. Counting moved into the page itself, as a script that reports each view to an analytics service; Google Analytics, built on a product called Urchin, arrived in 2005. That brought cookies, consent banners and blockers.

The plan above goes back one step, to reading the logs, but reads them at the content network, the one place that sees every request. The odometer returns too, only this time reloading the page does not move it.

## References

- Amazon CloudFront Developer Guide, [View CloudFront reports in the console](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/reports.html) and [popular objects reports](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/popular-objects-report.html).
- Amazon CloudFront Developer Guide, [Access logs (standard logs)](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/AccessLogs.html).
- Amazon CloudFront Developer Guide, [Logging and monitoring in Amazon CloudFront](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/logging-and-monitoring.html).
- Amazon CloudWatch User Guide, [Sharing a CloudWatch dashboard publicly](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/share-cloudwatch-dashboard-public.html).
