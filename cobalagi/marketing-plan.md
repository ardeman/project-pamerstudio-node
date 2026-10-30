# Coba Lagi marketing plan

Made 2026-10-30, when 2.9.0 was live on Google Play, the App Store (iPhone, iPad, Mac) and GitHub Releases.

**Goal:** more installs. **Audience:** Indonesian and English-speaking parents, side by side. **Budget:** none, time only. **The user's time:** 1–2 hours a week; Claude drafts everything, the user approves and posts. Nothing is posted without the user.

Work that keeps bringing installs after it is done (store pages, nominations, directories) comes before work that needs a daily habit. Every claim follows the app repo's store listing rules: true for the released app, both languages saying the same.

## 1. Measure first

- [ ] Campaign links per channel (written under Results; App Store `pt` still missing): Google Play links with `utm_source`/`utm_campaign` (Play Console → acquisition reports), App Store links with `pt`/`ct` (App Store Connect → Sources). They add nothing to the app.
- [ ] Write down this week's installs per store as the baseline.
- [ ] Keep the links (done) and the baseline in this file, under Results.

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

- [ ] English: Show HN (GPL, no tracking, Flutter and Flame), r/homeschool, r/SteamDeck (game controller support), r/FlutterDev and Flame's showcase, Product Hunt.
- [ ] Indonesian: parenting and homeschooling Facebook groups, teacher communities. Indonesia's new coding and AI elective is a hook; check its exact scope before a pitch uses it.

## 5. Press

- [ ] Short pitch emails to Indonesian tech, parenting and regional outlets. Regional outlets get the regional-language angle ("a free coding app in your own language").

## 6. Weekly routine (about 1 hour a week)

- [ ] One post a week from gameplay frames and story clips, drafted by Claude.
- [ ] Post the short and the promos the user hasn't posted yet.

## Posting kit

The user posts by hand; this kit makes that copy and paste. Build it in small steps:

1. [ ] **Calendar file:** what goes out when, on which platform, with which campaign link, and whether it is posted. Each session reads it and drafts the next batch.
2. [ ] **Per-platform captions with limit checks:** one caption per app for every post, checked like `youtube-text.mjs` checks YouTube's limits (for example Threads 500, X 280, LinkedIn 3,000, TikTok and Instagram caption limits), refusing a caption that doesn't fit.
3. [ ] **Preview page in `dashboard.html`:** each draft as it will look per app, with copy buttons and "mark as posted".
4. [ ] **Reply drafts:** the user pastes new comments; Claude drafts replies in the right language, honest and never pushy.

Reddit, Hacker News, Product Hunt, Facebook groups, WhatsApp, press and directories stay fully manual; Claude writes the text.

## Order

| When | What |
|---|---|
| Week 1 | Campaign links and baseline, keywords, featuring nomination, Hour of Code email |
| Weeks 2–3 | Posting kit steps 1–3, launch posts, directory submissions |
| Weeks 3–4 | Press pitches, first listing experiment |
| December | Hour of Code week; read the campaign numbers, drop channels that bring nothing |
| January | New school term in Indonesia: teacher communities |

## Results

### Campaign links

Google Play reads `utm_source`/`utm_campaign` (Play Console → Statistics → acquisition). The App Store reads `ct` (App Store Connect → Analytics → Sources) only with the team's provider token `pt`; `PT` below is a placeholder until it is filled in.

| Channel | Google Play | App Store |
|---|---|---|
| Hacker News (Show HN) | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=hn&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=PT&ct=hn&mt=8 |
| r/homeschool | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=r-homeschool&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=PT&ct=r-homeschool&mt=8 |
| r/SteamDeck | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=r-steamdeck&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=PT&ct=r-steamdeck&mt=8 |
| r/FlutterDev, Flame showcase | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=r-flutterdev&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=PT&ct=r-flutterdev&mt=8 |
| Product Hunt | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=producthunt&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=PT&ct=producthunt&mt=8 |
| Facebook groups | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=facebook&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=PT&ct=facebook&mt=8 |
| Teacher communities, WhatsApp | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=whatsapp&utm_campaign=launch | https://apps.apple.com/app/id6823508005?pt=PT&ct=whatsapp&mt=8 |
| Press pitches | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=press&utm_campaign=press | https://apps.apple.com/app/id6823508005?pt=PT&ct=press&mt=8 |
| Hour of Code | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=hourofcode&utm_campaign=directory | https://apps.apple.com/app/id6823508005?pt=PT&ct=hourofcode&mt=8 |
| Common Sense Media | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=commonsense&utm_campaign=directory | https://apps.apple.com/app/id6823508005?pt=PT&ct=commonsense&mt=8 |
| Educational App Store | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=edappstore&utm_campaign=directory | https://apps.apple.com/app/id6823508005?pt=PT&ct=edappstore&mt=8 |
| AlternativeTo | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=alternativeto&utm_campaign=directory | https://apps.apple.com/app/id6823508005?pt=PT&ct=alternativeto&mt=8 |
| Instagram | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=instagram&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=PT&ct=instagram&mt=8 |
| TikTok | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=tiktok&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=PT&ct=tiktok&mt=8 |
| YouTube | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=youtube&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=PT&ct=youtube&mt=8 |
| Threads | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=threads&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=PT&ct=threads&mt=8 |
| X | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=x&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=PT&ct=x&mt=8 |
| LinkedIn | https://play.google.com/store/apps/details?id=com.ardeman.cobalagi&utm_source=linkedin&utm_campaign=weekly | https://apps.apple.com/app/id6823508005?pt=PT&ct=linkedin&mt=8 |

### Baseline

| Week of | Google Play installs | App Store installs |
|---|---|---|
| 2026-10-26 | ? | ? |
