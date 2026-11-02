# Pamer Studio

Promo videos and other generated media, one folder per project. Rules for AI agents working here: [`AGENTS.md`](AGENTS.md).

| Folder | What |
| --- | --- |
| `shared/` | Helpers any project can use. `cli.mjs`: the terminal menu (`npm start`). `eleven.mjs`: ElevenLabs voice-over (`speak`), instrumental music (`music`) and sound effects (`sfx`), cached so re-renders cost no credits; every paid call is checked against the credits left and logged to `usage.jsonl`. `fal.mjs`: pictures and videos from fal.ai (`picture`, `video`, through fal's queue, with local files sent as data URIs), cached the same way, priced by fal's pricing API and logged to `fal-usage.jsonl`; its balance is on the dashboard. `cloud.mjs`: puts the marketing plans, finished media and the credits on Pamer Studio on the web (below). |
| `cloud/` | Rendering in the cloud (below): the render image, `inputs.mjs`, which syncs what renders read with Storage, and the render requests from the web page (`render.mjs`, `actions.mjs`, `trigger/`). |
| `web/` | Pamer Studio on the web (https://pamer-studio.web.app): Firebase Hosting, Firestore and Storage rules. |
| `bedug/` | Bedug's notification sounds (app repo: `../project_bedug_flutter`). |
| `catatsaja/` | Catat Saja promo videos (app repo: `../project-catatsaja-reactrouter`). |
| `cobalagi/` | Coba Lagi promo videos (app repo: `../project_cobalagi_flutter`). |

## Setup

Copy `.env.example` to `.env` and add an ElevenLabs API key. It needs the Text to Speech, Music and Models (read) permissions; checking the voice-over (`check-voice.mjs`) also needs Speech to Text. Drawing places (`places-art.mjs`) and making avatar videos (`avatar.mjs`) need a fal.ai key as `FAL_API_KEY`, with prepaid balance; give it the admin scope so the balance can be read for the dashboard. `.env` is shared by every project here; never commit or share it.

Tools: Node 24, ffmpeg, and Google Chrome (Playwright uses it to render). Capturing app screens also needs Java for the Firebase emulators: `brew install openjdk@21`, then put `/opt/homebrew/opt/openjdk@21/bin` on `PATH` when you start them.

## The menu and credits

```sh
npm start                # a menu in the terminal (shared/cli.mjs)
```

`npm start` shows the credits left on top and every project's actions (each project lists them in its `menu.mjs`): move with the arrow keys, Enter to choose, Esc to go back. A paid render first runs a free `--dry-run`; if anything isn't cached it shows the cost and asks before buying. Its last item sends the credits to the web page's Dashboard tab.


The Dashboard tab on the web page (below) shows the ElevenLabs credits left and when they reset, the credits each project spent this period, the last paid calls (from `usage.jsonl` on the Mac and from each cloud render: estimate, what was charged, what was left) the fal.ai balance left, and the latest cloud renders with their price. The page can't hold the keys, so the credits are read elsewhere (free) and kept in Firestore (`dashboard/account`) with the time they were read: by every `node shared/cloud.mjs push`, by `node shared/cloud.mjs account` (only that), and by the render job at the end of every run. The fal.ai balance needs a fal key with the admin scope. The tab flags them when they're over a day old. Speech to text (`check-voice.mjs`) isn't logged, but it shows in the balance. Stills stay on the Mac (`out/stills/`, `out/stories/stills/`); they aren't uploaded.

Any render that goes through `eleven.mjs` also takes `--dry-run`: it buys nothing, lists the clips and tracks that aren't cached with their estimated credits (one per character; music at the rate earlier tracks cost, once one is logged), and compares the total with the balance. Without it, a clip that needs more credits than are left stops the render, unless you pass `--force`. `fal.mjs` takes `--dry-run` too, with the price in dollars; the balance left is on the web Dashboard after `node shared/cloud.mjs account`.

## Pamer Studio on the web

https://pamer-studio.web.app shows each project's marketing plan (tick tasks or edit it from a phone, with a Copy button on every campaign link) and its posts and its finished media (videos, covers, subtitles, YouTube text and captions, filterable by language). Posts shows a project's posting calendar by date: captions as each app will show them, with their length against its limit; other drafts split into what gets pasted (title, URL, text…), each with a Copy button; and the campaign links. Mark a post as posted there, or approve a caption for the server to post once scheduled posting is built (Posting kit step 4 in Coba Lagi's plan). Its Dashboard tab shows the credits and spending (above). Only the Google account `are.theman@gmail.com` can sign in, and nothing shows before it does: the Firestore rules give every document only to that account, and the `dashboard` documents are read only from the page. It runs on the Firebase project `pamer-studio`.

```sh
node shared/cloud.mjs push [project...] [--dry-run] [--force]            # plan, posts and media up
node shared/cloud.mjs pull [project...] [--force]                         # plan edits, posted and approved back
node shared/cloud.mjs account                                             # the credits and paid calls for the Dashboard tab
cd web && npx -y firebase-tools deploy                                    # the page and the rules, by hand
```

GitHub Actions (`.github/workflows/web.yml`) deploys the page and the rules whenever `web/` changes on `main`, or on demand from the Actions tab. It signs in without a key, through Workload Identity Federation, as the service account `github-deploy`, which may only deploy Hosting and rules; `web/setup-ci.sh` (run once, free) sets that up, and only this repo's workflows can use it.

`cloud.mjs` signs in with the gcloud account (`gcloud auth login`), so no key is stored. Firestore holds each project's marketing plan; `marketing-plan.md` is a local copy that git ignores, for the scripts that read it (Coba Lagi's `posting.mjs` and `calendar.mjs`) and for editing on the Mac. `pull` writes it, also when it's missing (a fresh clone), so pull before editing it and push after; there's nothing to commit. `push` sends the plan up and, from `out/`, the `.mp4`, `.jpg`, `.wav`, `.srt`, `.txt` and `.md` files, skipping `stills/` and frame folders. Only files that changed are uploaded, and cloud files that are gone here (deleted, renamed, or no longer pushed) are deleted, so Storage holds only what `out/` has; `--dry-run` lists both first. A plan edited on the web isn't overwritten: `push` stops until you `pull`, and `pull` stops when the file here changed too. `--force` overrides either. Every save that replaces a plan, a push or a save on the web, first keeps the old one in `projects/<id>/versions`; the plan editor lists them under "Earlier versions", and Restore puts one in the editor to Save like any edit. The Firestore rules let the page add versions but never change or delete them. A project with `calendar.json` and `scripts/posting.mjs` also pushes its posts (`cloudPosts()` there), one Firestore document each, only those that changed. `pull` writes what was marked posted or approved on the web into `calendar.json`; a post marked posted on the Mac stays posted. Media links carry a download token, so anyone with a link can open that file; the list of links is only visible after signing in.

The AI tab (`web/public/ai.js`) runs Gemini through Firebase AI Logic (the Agent Platform Gemini API, billed to `pamer-studio` like Catat Saja's AI), with the project's plan as what it knows: a chat, a caption for one app in both languages (checked against a copy of the limits in `cobalagi/scripts/posting.mjs`; keep both the same), and video lines in both languages. "Rewrite with AI" on a `.txt` file in Media opens it as a caption to rewrite, and "Ask AI" in the plan editor changes the plan, which saves only when you press Save. Any answer can go to a `## Drafts` section at the end of the plan, so it reaches the Mac on `pull`. App Check (reCAPTCHA Enterprise, enforced for AI Logic) lets only this page on `pamer-studio.web.app`, `pamer-studio.firebaseapp.com` and localhost call it; trying it on localhost needs a debug token, which the page prints to the console, registered in App Check.

## Rendering in the cloud

The page's Render tab starts a render in the cloud, for the actions in `cloud/actions.mjs` (each project's `menu.mjs`, cut down to what works in Linux: for now Catat Saja's promo and stories). Voices, captures, the App Store video and everything else stay on the Mac.

```sh
cloud/build.sh                                                            # the image, the job and the trigger (after changing cloud/ or a script it runs)
gcloud run jobs execute render --region asia-southeast2 --wait            # a free check of the image (cloud/check.mjs)
node cloud/inputs.mjs push [project...] [--caches] [--dry-run]            # what renders read, here → Storage
node cloud/inputs.mjs pull [project...] [--inputs] [--dry-run]            # clips bought in the cloud, Storage → here
```

How a render goes:

1. **Request.** The tab writes `renders/<id>` in Firestore (project, menu action, its picks). The rules let only the owner create one, and the page may change it only to approve a priced one.
2. **Start.** The function `render-trigger` (`cloud/trigger/`) runs on every write to `renders/`. It runs as one instance, one write at a time, and starts the oldest waiting request only while none is `queued`, `pricing` or `rendering`, by setting it to `queued` and starting the Cloud Run Job `render` with `RENDER_ID` and `RENDER_STEP`. A request active for 70 minutes without a change (a job killed at its timeout never says so) is marked `failed`.
3. **Price.** The job (`cloud/render.mjs`) checks the request against `cloud/actions.mjs`, pulls the inputs from Storage, and for a paid action runs `--dry-run` and writes the price (`priced`). A free action, or one with everything cached, renders at once.
4. **Approve.** Approve on the page is the go-ahead AGENTS.md asks for. The job prices it again, asks again if it would now cost more, and renders without `--force`.
5. **Results.** New files in `out/` go to Storage under `renders/<id>/` and show on the card; clips it bought go back to `inputs/` (`inputs.mjs pull` brings them to the Mac); its `usage.jsonl` lines are kept on the request, not in the Mac's log; and it refreshes the Dashboard tab's credits.

The image (`cloud/Dockerfile`) has Node 24, Google Chrome, Playwright 1.64.0 (the version the Mac links from the Catat Saja repo), ffmpeg and Noto fonts with emoji, plus the scripts; `.gcloudignore` keeps keys and caches out of the upload. `build.sh` builds it with Cloud Build (no Docker on the Mac) into Artifact Registry (`render`, the newest 3 images kept, about 600 MB each), points the job at it (asia-southeast2, 2 CPU, 4 GiB, an hour's timeout, no retries, as the service account `render-job`) and deploys the trigger. `lib.sh` takes `CHROME` from the environment, since the image's Chrome isn't at the Mac's path. In the job, Google calls go without the `x-goog-user-project` header the gcloud account needs, since the job's account bills its own project.

The ElevenLabs key is the Secret Manager secret `elevenlabs-api-key`, made from `.env` by the first `build.sh` and readable by the job only; a later run doesn't update it, so after changing the key in `.env` add a new version (`gcloud secrets versions add elevenlabs-api-key --data-file -`, the key on stdin). The fal.ai key is `fal-api-key`, made the same way and updated the same way (`gcloud secrets versions add fal-api-key --data-file -`); Catat Saja's renders call no fal.ai, so the job only reads its balance for the Dashboard tab.

Inputs live in Storage under `inputs/<repo>/`: the paid caches (`*/audio`, `catatsaja/art`), Catat Saja's captured screens (`catatsaja/shots`) and logo, and from Coba Lagi's app repo its frames, clips, music, ARB words, robot art, `tool/elevenlabs.json` and `pubspec.yaml`, about 2 GB, roughly $0.05 a month. Caches are named by what made them and never change, so both directions only add what the other side lacks and never delete. Inputs go one way: push makes Storage match the Mac, skipping any that aren't on this machine. The job runs `pull --inputs` before a render and `push --caches` after it. Files keep their modification time, since Catat Saja picks the newest avatar clip by it. Apple's bezels and the iPhone and iPad frames aren't uploaded (the bezels may only be used in App Store material).

Cost: the cached Catat Saja promo ran for 3¼ minutes, about $0.02 of compute at the Jakarta list price and within Cloud Run's monthly free tier; its video takes 12 MiB in Storage, and reading the inputs in the same region is free. The Rp 80.000 budget alert on `pamer-studio` stays.

## Bedug

Two notification sounds for the app: a mosque bedug (three clacks of the stick on the drum's wooden body, then five booms, three at a medium pace and two slow) and a Ramadan siren. `bedug/scripts/sounds.mjs` holds the ElevenLabs sound-effect takes that were chosen (cached in `bedug/audio/`, with the other takes tried). The bedug is put together from one clack and one boom, since the model can't count strikes. `bedug/scripts/export.mjs` builds the pattern, levels both sounds and writes `bedug/out/<name>.caf` (IMA4, for iOS and macOS) and `<name>.wav` (Android).

```sh
node bedug/scripts/export.mjs [--dry-run]   # free while every take is cached
```

The timing of the bedug's hits is at the top of `export.mjs`; changing it costs nothing. A changed prompt buys a new take.

## Catat Saja

Two videos, each in English and Indonesian:

- **Promo** (`render.mjs`): a tour of the features, with one narrator. The vertical cut (Reels, Shorts) opens on a fast cut of the real screens under a spoken hook, not a title card.
- **Stories** (`render-stories.mjs`): stories of people using the app in their own lives (Rina, a new mum; Sari and Dimas, a couple; Adit, a freelancer in Tokyo; Maya, caring for her dad; Nadia, tracking her period; Wulan, scanning her grocery receipt; Pak Hendra, filing his supplier receipts). Each is an illustrated character speaking in their own ElevenLabs voice, with their mouth moving to it, next to the app's real screens. There is a full video of the first four, and a short one per story. Nadia's short has no introduction: it opens on the problem, said over the real screen (`full: false` keeps it out of the full video). Wulan's story happens in a place (`place` in `stories.mjs`): it opens in her kitchen, where the things act it out (the shopping tumbles out of the bag, the receipt unrolls off the screen, a phone photographs it; `fx` in `stage.html`) with her face in the corner, talking, and the place stays on as a band over the app's screens. People aren't drawn whole: hand-made body movement looked stiff. Hendra's shop is drawn by Recraft on fal.ai as SVG (`places-art.mjs`: four styles to choose from, the chosen one tidied into `places/`), and the boxes, the receipt spike and the phone move over it; AI draws places only, never the app's screens. Hendra himself is being tried as an AI video: `first-frame.mjs` draws him standing behind his counter (`figure` on a place scene, its `stand` in `stage.html`; for the later scenes, the band over the phone, framed taller by `stripStand`), and Kling AI Avatar on fal.ai (`avatar.mjs`) makes him say his line from that frame and his voice clip, lips following it. When a scene in a place (the opening or a band over the phone) has such a clip, `render-stories.mjs` takes its frames (once, into `out/stories/avatar-frames/`) and the stage draws them in place of the drawn scene, timed to the line; only the Indonesian short uses it, since the lips follow the Indonesian voice. His lines are drafts over the promo's screens until his own book is captured.

### Layout

| Path | What |
| --- | --- |
| `catatsaja/scripts/stage.html` | The animated stage both videos render from (scenes, phones, cards, the illustrated people, and the places stories happen in, with what happens there). |
| `catatsaja/scripts/video.mjs` | Shared: recording frames into ffmpeg, mixing voices over music, voice loudness per frame. |
| `catatsaja/scripts/copy.mjs`, `narration.mjs` | Promo: on-screen text and voice-over. |
| `catatsaja/scripts/stories.mjs` | Stories: the cast (looks, voices) and what each person says, with the screens for each line. |
| `catatsaja/scripts/demo-data.mjs`, `stories-data.mjs` | The demo accounts and content the screens are captured from. |
| `catatsaja/scripts/capture.mjs`, `capture-stories.mjs` | Seed the demo data on the emulators and capture screens into `shots/<lang>/` and `shots/<lang>/stories/`. |
| `catatsaja/scripts/first-frame.mjs` | Draws a scene's place with its person standing in it, as the short shows it, into `out/stories/first-frames/` (free). |
| `catatsaja/scripts/avatar.mjs` | Makes that frame and the line's voice clip into a talking video with Kling AI Avatar (fal.ai), cached in `art/`. |
| `catatsaja/scripts/places-art.mjs` | Draws the places with Recraft (fal.ai) into `art/` (a cache, not committed) and tidies the chosen one into `places/<place>.svg`, which `render-stories.mjs` passes to the stage. |
| `catatsaja/places/` | The place drawings the stories use (committed). |
| `catatsaja/audio/` | Cached voice clips (`en/`, `id/`, `stories/<lang>/`) and music. |
| `catatsaja/out/` | Promo videos and `captions.md`; `out/stories/` for the stories videos, their subtitles, covers and `captions.md`; `stills/` for previews. |

`catatsaja/node_modules` links to the app repo's packages (Playwright).

### Commands

Capture screens, from the app repo with `pnpm emulators` running there:

```sh
node ../project-pamerstudio-node/catatsaja/scripts/capture.mjs <en|id>
node ../project-pamerstudio-node/catatsaja/scripts/capture-stories.mjs <en|id>   # ONLY=shot,shot for a few
```

Render, from this folder:

```sh
node catatsaja/scripts/render.mjs [vertical|whatsapp|linkedin|youtube|all] [en|id|all] [--stills] [--silent] [--dry-run] [--force]
node catatsaja/scripts/render-stories.mjs [full|rina|couple|adit|maya|nadia|wulan|hendra|all] [vertical|linkedin|youtube|all] [en|id|all] [--stills] [--silent] [--dry-run] [--force] [--meta]
node catatsaja/scripts/places-art.mjs [shop] [--dry-run]   # paid (fal.ai) for a new or changed prompt
node catatsaja/scripts/first-frame.mjs [hendra] [1]        # free
node catatsaja/scripts/avatar.mjs [hendra] [1] [--dry-run] # paid (fal.ai, per second) for a new frame or clip
```

`--stills` writes one frame per scene instead of a video; with `--silent` it makes no ElevenLabs calls (lines get an estimated length), so previews are free. The full stories video is made in every format, the short ones only vertically (Reels, Shorts, WhatsApp Status). Without a language, each stories format is made in the language it is posted in: vertical in Indonesian, LinkedIn in English, YouTube in both (`formats` in `render-stories.mjs`); pass `all` for both everywhere. `--meta` writes what the upload forms take, without rendering: a subtitle file (`.srt`) and a cover frame (`-cover.jpg`) per video, and the YouTube chapters (`meta.json`); the titles, descriptions and tracked links to paste are in `out/stories/captions.md`.

How the stories videos are posted and measured (a tracked link per story) is part of the app's revenue plan: the app repo's `README.md` → Roadmap → Revenue.

`node catatsaja/scripts/check-voice.mjs` transcribes the promo's Indonesian clips to check how the narrator says “Catat”.

## A new project

Make a folder next to `catatsaja/`, give it a `menu.mjs` (see `catatsaja/menu.mjs`) to show it in `npm start`, and import the helpers:

```js
import { music, speak } from '../../shared/eleven.mjs'

const line = await speak({ dir: 'audio/en', lang: 'en', name: 'intro', text: 'Hello!' })
const track = await music({ dir: 'audio', name: 'main', prompt: 'calm lo-fi, no vocals', seconds: 30 })
```

`speak` picks the newest model that speaks the language and uses `voice`, else `VOICE_<LANG>` from `.env`, else Jessica.

## Coba Lagi

Promo videos, each in Indonesian and English, showing real gameplay from the app's "Watch me!" demos with the app's own narration clips and music (no paid calls):

- **Short** (`short-video.sh`, `short-<lang>`): vertical, 1080 × 1920, about 28 seconds, for TikTok, YouTube Shorts, Instagram Reels and Stories and WhatsApp status: the Star fuel story in Koba's own voice. Built on what keeps viewers watching short videos: it opens on the problem (the space wind blows the stars away, a big star counter at the top empties at once and Koba cries "Oh no! The wind took my stars!", an open question until the end); every shot fills the frame with the story's own space scenes, zoomed in on the board and slowly pushing in (no small phone on a coloured card); big outlined captions show Koba's words a sentence at a time, for viewers with the sound off; and each planet (Loops, Fix it! with its bump, orange ring and fix, Until the flag) ends on a solve with a star popping into the counter, about every five seconds. The ship takes off with a full tank, and the end card fades back into the opening so the video loops. Words stay clear of those apps' own buttons and captions (the top 250 px, the bottom 380 px and the right 140 px). A second short of features (Koba bumping a rock, then quick cuts) was dropped on 2026-10-23. Koba's lines are the app's clips, except the opening one, which the app has no clip for: lines for the videos only are in `koba-lines.json`, spoken by `koba-voice.mjs` in Koba's voice and settings from the app's `tool/elevenlabs.json` (paid once per line through `shared/eleven.mjs`, about 30 credits, then cached in `cobalagi/audio/`; a changed line is bought again).
- **Short 2** (`short-video-2.sh`, `short-2-<lang>`): the same shape on three planets the first doesn't show, since Koba asking for help got about three times the views of our other Shorts: Koba lands in thick fog with an empty counter (its own line, `fog`), asks for help from its ship (`new-planet-variables`), then Look ahead, Magic Block and Step Box each end on a star, and the ship loops with a full tank (`full-again-variables`). Each star pops on the frame Koba reaches the flag in the recording and holds a moment before the cut. `DRAFT=1` puts silence in place of the fog line, to check the layout before it's bought.
- **Promo** (`promo-video.sh`): landscape, 1920 × 1080, about 50 seconds, for YouTube and the Play listing's video, with a `thumbnail-<lang>.jpg` for YouTube.
- **App Store header and search result** (`app-store-video.sh`, `app-store-header-<lang>.mp4` and `app-store-search-<lang>.mp4`): the listing's only Header and Search Results assets (the app repo has no stills for them), 13 seconds at 30 fps, at Apple's sizes (3840 × 1646, 21:9, and 3840 × 2560, 3:2; 5 to 30 seconds). The header shows only the app, since the page shows its name and icon right below: iPhone 17s and iPad Pros fanned out and tilted (a big iPhone in the middle, as in Bedug's header), each playing a demo, with everything that matters inside the middle 66% an iPhone shows and clear of its Dynamic Island and round buttons. The search result puts Koba and the tagline over an iPad Pro and an iPhone 17 playing the demos. The devices are in Apple's product bezels with their status bars, read from the app repo's `store/bezels/` (its `tool/fetch_bezels.sh`; their license allows them only in App Store material, so they are never copied here) and drawn by its `store/device.mjs`. Each screen is filled with the app's light top colour, measured in Chrome and keyed out, so the gameplay shows through with the status bar over it. Apple loops them and starts them muted (search results can't be unmuted), so nothing depends on sound; the header has the music for viewers who unmute it. Upload them in App Store Connect under Header and Search Results.

The videos name no store in their pictures (the short ends on the website, which links to every store), so the same files stay right once the app is public on Google Play. Only their YouTube text changes: `live` (the default) puts the Play link in the descriptions, `soon` (`STORE=soon`) says it's coming. Cards are HTML shot by headless Chrome in a taller window and cropped, because its page is now and then a little short and left a strip at the bottom.

The scripts work from the app repo (`COBALAGI_APP`, `../project_cobalagi_flutter` by default), which has what they show: `website/screenshots/`, the voice clips and music in `assets/audio/`, the words in `lib/app/l10n/`, the robot art and the version in `pubspec.yaml`. Only the videos are written here.

### Layout

| Path | What |
| --- | --- |
| `cobalagi/scripts/lib.sh` | Shared: cards, the device bezel, gameplay segments, cross-fades with music and narration. |
| `cobalagi/scripts/short-lib.sh` | The shorts' shared parts: the star counter, captions in time with Koba's voice, full-frame story shots, the end card. |
| `cobalagi/scripts/short-video.sh`, `short-video-2.sh`, `promo-video.sh`, `app-store-video.sh` | The videos. |
| `cobalagi/scripts/koba-voice.mjs`, `koba-lines.json` | Koba's lines for the videos only (`--dry-run` for the price). |
| `cobalagi/scripts/render.mjs` | Runs them (for `npm start`). |
| `cobalagi/scripts/subtitles.mjs` | Each video's subtitles (`<video>.srt`): the ARB words of each clip, at the time it plays. |
| `cobalagi/scripts/youtube-text.mjs`, `youtube.json` | Each video's YouTube text (below). |
| `cobalagi/out/` | The videos with their `.srt`, `.youtube.txt` and thumbnails. |
| `cobalagi/marketing-plan.md` | The marketing plan: steps to tick off, the order, and results. A local copy from `node shared/cloud.mjs pull`, not in git: Firestore holds it. |
| `cobalagi/calendar.json`, `cobalagi/scripts/calendar.mjs` | The posting calendar: what goes out when, on which platform, and whether it is posted. The script adds each entry's campaign links from the plan's Results and refuses an unknown source or a missing draft. `posting.mjs` holds what the scripts share, including how a post looks on Pamer Studio. |
| `cobalagi/captions.json`, `cobalagi/scripts/captions.mjs` | Each calendar post's caption per language for apps with one (X, Threads, Instagram, TikTok, LinkedIn, YouTube), filled with its campaign links and ready to paste. Refused when it breaks the app's limits. |
| `cobalagi/scripts/posting.mjs` | What the posting scripts share: each app's caption limits and the campaign links. |

### Commands

Record the gameplay frames in the app repo (about 40 minutes; again whenever the demos or story scenes look different): the demos, the story scenes and a bump being fixed at phone size, and the demos on the iPhone and iPad. They land in its `tool/screenshots/out/video/`:

```sh
VIDEO_FRAMES=1 flutter test tool/screenshots --update-goldens --plain-name 'video frames'
```

Render, from this folder:

```sh
node cobalagi/scripts/render.mjs [short|short-2|promo|app-store|all] [live|soon]
node cobalagi/scripts/youtube-text.mjs --check    # YouTube's limits, for every video
node cobalagi/scripts/calendar.mjs [--all]        # posting calendar: what is not posted yet, with links
node cobalagi/scripts/calendar.mjs --posted <id> [YYYY-MM-DD] [notes]
node cobalagi/scripts/captions.mjs [id...]      # captions not posted yet, filled and ready to paste
node cobalagi/scripts/captions.mjs --check        # each app's limits, for every caption
```

### YouTube uploads

Rendering a video also writes `out/<video>.youtube.txt`, with the title, the description and every upload setting, ready to paste. Never edit those files: change `youtube.json` and render again, or run `node cobalagi/scripts/youtube-text.mjs <video> cobalagi/out/<video>.youtube.txt` for the text alone.

- **Other platforms:** each short's `.youtube.txt` ends with OTHER PLATFORMS, a caption per app (Instagram, Facebook, WhatsApp Status, Threads, LinkedIn, TikTok) from `social` in `youtube.json`; the same vertical file goes to all of them. Each caption is checked against its app's limits in `posting.mjs`.
- **Titles carry the app's version** at the time the video is made (`{version}`, the version name in the app's `pubspec.yaml`), so an upload always says which app it shows. A title without `{version}` is refused.
- **The store line** (`{store}` in descriptions) gives the Google Play link (`live`, the default: the app is on Play since 2026-10-30); `soon` says "Coming soon to Google Play".
- **Claims stay true** for the released app, as in its store listing, and both languages say the same.
- `youtube-text.mjs` refuses to write while any video breaks YouTube's limits (title 100, description 5,000 characters, no angle brackets) or leaves a `{…}` unfilled; `--check` runs just that.
- Settings: category Education, comments moderated Strict, AI use No (no realistic synthetic content), "Made for Kids" left to the channel owner (recommended No: the videos speak to parents).

YouTube can't replace a video's file: to update a video, delete it and upload the new one. Then update the links where it is shown: the app repo's website promo video (its video ids and title cards in `website/video/`) and, for the landscape promo, the Play listing's Video field.

## Roadmap

### Cloud renders: still open

Built 2026-10-31 (Rendering in the cloud, above). Still open:

- Paying for clips after Approve isn't tried yet: so far only a fully cached render ran in the cloud.
- Coba Lagi's cards ask for SF Pro Rounded, an Apple font that can't go in a Linux image. Pick an openly licensed rounded font for the cloud before its first cloud render, and check the stills against a Mac render.
- Request files in Storage (`renders/<id>/`) aren't cleaned up, and a finished video reaches the Mac's `out/` only by downloading it.
- Add the other projects' cloud actions to `cloud/actions.mjs` as their scripts are made to work in Linux.
