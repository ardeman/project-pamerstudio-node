# Coba Lagi marketing plan

Made 2026-10-30, when 2.9.0 was live on Google Play, the App Store (iPhone, iPad, Mac) and GitHub Releases.

**Goal:** more installs. **Audience:** Indonesian and English-speaking parents, side by side. **Budget:** none, time only. **The user's time:** 1–2 hours a week; Claude drafts everything and the user approves it: they post it by hand, or approve it on Pamer Studio on the web and the server posts it at its scheduled time. Nothing is posted without the user's approval.

Work that keeps bringing installs after it is done (store pages, nominations, directories) comes before work that needs a daily habit. Every claim follows the app repo's store listing rules: true for the released app, both languages saying the same.

## 1. Measure first

- [x] Campaign links per channel (under Results): Google Play links with `utm_source`/`utm_campaign` (Play Console → acquisition reports), App Store links with `pt`/`ct` (App Store Connect → Sources). They add nothing to the app.
- [x] Write down this week's installs per store as the baseline (2026-10-30).
- [x] Keep the links and the baseline in this file, under Results.

## 2. Store pages

- [ ] Play store listing experiments (free A/B tests): short description first, then the first screenshot, one language at a time.
- [x] App Store keyword field (100 characters) in `id` and `en`: words from the name and subtitle dropped (Apple already searches them), "koding", "homeschool(ing)", "game"/"permainan" added. In the app repo's `store/app_store/`; goes live with the next version upload.
- [ ] App change (app repo): a "Rate Coba Lagi" button in the Parent area, behind the parent gate.

## 3. Editorial and directories

- [ ] App Store featuring nomination (App Store Connect → Featuring): drafted in `featuring-nomination.md` for 2.9.0 (free, no ads, offline, coding before reading); the user submits it. The regional languages get a second nomination once their version is ready.
- [ ] Hour of Code (now Hour of AI) / CS Education Week, December: the activity submission window is closed (the last one ended Oct 1). Send the email in `hour-of-code.md` to ask about a late listing and the 2027 window.
- [ ] AlternativeTo, Educational App Store, Common Sense Media: drafted in `directories.md`; the user submits them (free ones only).
- [ ] Flathub (the Linux build in the Steam Deck's Discover store). The most work of these.

## 4. Launch posts (one week)

- [ ] English: Show HN (GPL, no tracking, Flutter and Flame), r/homeschool, r/SteamDeck (game controller support), r/FlutterDev and Flame's showcase, Product Hunt. Drafted in `launch-posts.md`; the user posts them.
- [ ] Indonesian: parenting and homeschooling Facebook groups, teacher communities. Drafted in `launch-posts.md`. The coding and AI elective is optional, from grade 5, only in schools that are ready (start year differs between reports), so posts call the app "the basics before grade 5" and name no year.

## 5. Press

- [ ] Short pitch emails to Indonesian tech, parenting and regional outlets. Regional outlets get the regional-language angle ("a free coding app in your own language").

## 6. Weekly routine (about 1 hour a week)

- [ ] One post a week from gameplay frames and story clips, drafted by Claude.
- [x] Post the short and the promos the user hasn't posted yet.

## Posting kit

The user approves each post on the web and the server posts it at its time; where an app has no posting API, the kit makes posting by hand a copy and paste. Build it in small steps:

1. [x] **Calendar file:** what goes out when, on which platform, with which campaign link, and whether it is posted. Each session reads it and drafts the next batch. In `calendar.json`; `node cobalagi/scripts/calendar.mjs` lists what is not posted yet with its links, `--posted <id>` marks one.
2. [x] **Per-platform captions with limit checks:** one caption per app for every post, in `captions.json` by calendar id (the entry's draft is `captions.json`), with `{play}` and `{appStore}` for its campaign links. `node cobalagi/scripts/captions.mjs` prints the ones not posted yet, ready to paste, and refuses any that breaks its app's limits in `posting.mjs` (X 280 with a link counted as 23, Threads 500 and one tag, Instagram 2,200 and 5 hashtags, TikTok 2,200, LinkedIn 3,000, YouTube title 100 and description 5,000).
3. [x] **Preview page on Pamer Studio (web):** the Posts tab shows each draft as it will look per app, with copy buttons, "Approve" (the server will post it at its date and time once step 4 is built) and "Mark as posted" for posts made by hand. `node shared/cloud.mjs push` puts the calendar in Firestore; `pull` brings back what was marked posted or approved.
4. [ ] **Scheduled posting on the server:** a scheduled function posts each approved draft at its time through the app's own posting API, with the campaign link, and marks it posted (or shows the error on the web). Start with one app, then add the others. Before building it, check each API's access and cost (some need an app review or a paid tier) and the Firebase cost (Cloud Functions need the Blaze plan; Cloud Scheduler has a small free allowance); ask before anything that costs money.
5. [ ] **Reply drafts:** the user pastes new comments; Claude drafts replies in the right language, honest and never pushy.

Reddit, Hacker News, Product Hunt, Facebook groups, WhatsApp, press and directories stay manual (no posting API, or the community expects a person); Claude writes the text.

## Order

| When | What |
|---|---|
| Week 1 | Campaign links and baseline, keywords, featuring nomination, Hour of Code email |
| Weeks 2–3 | Posting kit steps 1–3, launch posts, directory submissions |
| Weeks 3–4 | Press pitches, first listing experiment, scheduled posting (Posting kit step 4) |
| December | Hour of Code week; read the campaign numbers, drop channels that bring nothing |
| January | New school term in Indonesia: teacher communities |

## Results

### Campaign links

Google Play reads `utm_source`/`utm_campaign` (Play Console → Statistics → acquisition). The App Store reads `ct` (App Store Connect → Analytics → Sources) only with the team's provider token `pt` (129623998, the provider ID in App Store Connect).

| Channel | Google Play | App Store |
|---|---|---|
| Hacker News (Show HN) | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=hn&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=129623998&ct=hn&mt=8 |
| r/homeschool | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=r-homeschool&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=129623998&ct=r-homeschool&mt=8 |
| r/SteamDeck | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=r-steamdeck&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=129623998&ct=r-steamdeck&mt=8 |
| r/FlutterDev, Flame showcase | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=r-flutterdev&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=129623998&ct=r-flutterdev&mt=8 |
| Product Hunt | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=producthunt&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=129623998&ct=producthunt&mt=8 |
| Facebook groups | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=facebook&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=129623998&ct=facebook&mt=8 |
| Teacher communities, WhatsApp | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=whatsapp&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=129623998&ct=whatsapp&mt=8 |
| Press pitches | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=press&utm_campaign=press | https://apps.apple.com/app/id6823508005?pt=129623998&ct=press&mt=8 |
| Hour of Code | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=hourofcode&utm_campaign=directory | https://apps.apple.com/app/id6823508005?pt=129623998&ct=hourofcode&mt=8 |
| Common Sense Media | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=commonsense&utm_campaign=directory | https://apps.apple.com/app/id6823508005?pt=129623998&ct=commonsense&mt=8 |
| Educational App Store | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=edappstore&utm_campaign=directory | https://apps.apple.com/app/id6823508005?pt=129623998&ct=edappstore&mt=8 |
| AlternativeTo | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=alternativeto&utm_campaign=directory | https://apps.apple.com/app/id6823508005?pt=129623998&ct=alternativeto&mt=8 |
| Instagram | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=instagram&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=129623998&ct=instagram&mt=8 |
| TikTok | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=tiktok&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=129623998&ct=tiktok&mt=8 |
| YouTube | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=youtube&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=129623998&ct=youtube&mt=8 |
| Threads | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=threads&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=129623998&ct=threads&mt=8 |
| X | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=x&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=129623998&ct=x&mt=8 |
| LinkedIn | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=linkedin&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=129623998&ct=linkedin&mt=8 |

### Baseline

Read on 2026-10-30, before any launch post. Google Play's production release went live that day (100%), so its numbers are mostly the closed test.

| Store | Period | Installs | Other |
|---|---|---|---|
| Google Play | Latest production release (live a few hours) | 10 | |
| Google Play | Last 28 days | 16 device acquisitions, 5 first opens | 20 monthly active devices |
| App Store | 7 days to 2026-10-28 | 6 first-time downloads, 1 redownload | 601 impressions, 45 product page views, 1.56% conversion, 3 updates |

Next reading: the week after the launch posts, same pages (Play Console dashboard; App Store Connect → Analytics → Overview, last 7 days), plus Sources and acquisition by campaign.
