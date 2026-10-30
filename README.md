# Pamer Studio

Promo videos and other generated media, one folder per project. Rules for AI agents working here: [`AGENTS.md`](AGENTS.md).

| Folder | What |
| --- | --- |
| `shared/` | Helpers any project can use. `cli.mjs`: the terminal menu (`npm start`). `eleven.mjs`: ElevenLabs voice-over (`speak`), instrumental music (`music`) and sound effects (`sfx`), cached so re-renders cost no credits; every paid call is checked against the credits left and logged to `usage.jsonl`. `fal.mjs`: pictures and videos from fal.ai (`picture`, `video`, through fal's queue, with local files sent as data URIs), cached the same way, priced by fal's pricing API and logged to `fal-usage.jsonl` (not on the dashboard, which counts ElevenLabs credits). `dashboard.mjs`: a local page with the credits, the spending and every project's stills and videos. `cloud.mjs`: puts the marketing plans and finished media on Pamer Studio on the web (below). |
| `web/` | Pamer Studio on the web (https://pamer-studio.web.app): Firebase Hosting, Firestore and Storage rules. |
| `bedug/` | Bedug's notification sounds (app repo: `../project_bedug_flutter`). |
| `catatsaja/` | Catat Saja promo videos (app repo: `../project-catatsaja-reactrouter`). |
| `cobalagi/` | Coba Lagi promo videos (app repo: `../project_cobalagi_flutter`). |

## Setup

Copy `.env.example` to `.env` and add an ElevenLabs API key. It needs the Text to Speech, Music and Models (read) permissions; checking the voice-over (`check-voice.mjs`) also needs Speech to Text. Drawing places (`places-art.mjs`) and making avatar videos (`avatar.mjs`) need a fal.ai key as `FAL_API_KEY`, with prepaid balance. `.env` is shared by every project here; never commit or share it.

Tools: Node 24, ffmpeg, and Google Chrome (Playwright uses it to render). Capturing app screens also needs Java for the Firebase emulators: `brew install openjdk@21`, then put `/opt/homebrew/opt/openjdk@21/bin` on `PATH` when you start them.

## The menu, credits and the dashboard

```sh
npm start                # a menu in the terminal (shared/cli.mjs)
npm run dashboard        # or: node shared/dashboard.mjs [--no-open]
```

`npm start` shows the credits left on top and every project's actions (each project lists them in its `menu.mjs`): move with the arrow keys, Enter to choose, Esc to go back. A paid render first runs a free `--dry-run`; if anything isn't cached it shows the cost and asks before buying. It also opens the dashboard.


It writes `dashboard.html` here and opens it in the browser: the ElevenLabs credits left and when they reset, the last paid calls from `usage.jsonl` (estimate, what was charged, what was left), and every project's stills and videos, filterable by language. The credits are read when you run it, on this machine, so the key never goes in the page; run it again to refresh. Both files are local and not committed. Speech to text (`check-voice.mjs`) isn't logged, but it shows in the balance.

Any render that goes through `eleven.mjs` also takes `--dry-run`: it buys nothing, lists the clips and tracks that aren't cached with their estimated credits (one per character; music at the rate earlier tracks cost, once one is logged), and compares the total with the balance. Without it, a clip that needs more credits than are left stops the render, unless you pass `--force`. `fal.mjs` takes `--dry-run` too, with the price in dollars; it can't read the fal balance, so check that in fal's dashboard.

## Pamer Studio on the web

https://pamer-studio.web.app shows each project's marketing plan (tick tasks or edit it from a phone, with a Copy button on every campaign link) and its finished media (videos, covers, subtitles, YouTube text and captions, filterable by language). Only the Google account `are.theman@gmail.com` can sign in. It runs on the Firebase project `pamer-studio`.

```sh
node shared/cloud.mjs push [project...] [--dry-run] [--force]            # plan and media up
node shared/cloud.mjs pull [project...] [--force]                         # plan edits made on the web back
cd web && npx -y firebase-tools deploy                                    # the page and the rules, by hand
```

GitHub Actions (`.github/workflows/web.yml`) deploys the page and the rules whenever `web/` changes on `main`, or on demand from the Actions tab. It signs in without a key, through Workload Identity Federation, as the service account `github-deploy`, which may only deploy Hosting and rules; `web/setup-ci.sh` (run once, free) sets that up, and only this repo's workflows can use it.

`cloud.mjs` signs in with the gcloud account (`gcloud auth login`), so no key is stored. It pushes each project's `marketing-plan.md` and, from `out/`, the `.mp4`, `.jpg`, `.wav`, `.srt`, `.txt` and `.md` files, skipping `stills/` and frame folders. Only files that changed are uploaded, and cloud files that are gone here (deleted, renamed, or no longer pushed) are deleted, so Storage holds only what `out/` has; `--dry-run` lists both first. A plan edited on the web isn't overwritten: `push` stops until you `pull`, and `pull` stops when the file here changed too. `--force` overrides either. Media links carry a download token, so anyone with a link can open that file; the list of links is only visible after signing in.

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

- **Short** (`short-video.sh`, `short-<lang>`): vertical, 1080 × 1920, about 28 seconds, for TikTok, YouTube Shorts, Instagram Reels and Stories and WhatsApp status: the Star fuel story in Koba's own voice. Built on what keeps viewers watching short videos: it opens on the problem (the space wind blows the stars away, a big star counter at the top empties at once and Koba cries "Oh no! The wind took my stars!", an open question until the end); every shot fills the frame with the story's own space scenes, zoomed in on the board and slowly pushing in (no small phone on a coloured card); big outlined captions show Koba's words a sentence at a time, for viewers with the sound off; and each planet (Loops, Fix it! with its bump, orange ring and fix, Until the flag) ends on a solve with a star popping into the counter, about every five seconds. The ship takes off with a full tank, and the end card fades back into the opening so the video loops. Words stay clear of those apps' own buttons and captions (the top 250 px, the bottom 380 px and the right 140 px). There is one short: a second one (Koba bumping a rock, then quick cuts of features) was dropped on 2026-10-23. Koba's lines are the app's clips, except the opening one, which the app has no clip for: lines for the videos only are in `koba-lines.json`, spoken by `koba-voice.mjs` in Koba's voice and settings from the app's `tool/elevenlabs.json` (paid once per line through `shared/eleven.mjs`, about 30 credits, then cached in `cobalagi/audio/`; a changed line is bought again).
- **Promo** (`promo-video.sh`): landscape, 1920 × 1080, about 50 seconds, for YouTube and the Play listing's video, with a `thumbnail-<lang>.jpg` for YouTube.
- **App Store header and search result** (`app-store-video.sh`, `app-store-header-<lang>.mp4` and `app-store-search-<lang>.mp4`): the moving versions of the app's still `header.png` and `search_result.png`, 13 seconds at 30 fps, at Apple's sizes (3840 × 1646, 21:9, and 3840 × 2560, 3:2; 5 to 30 seconds). Koba and the tagline sit with an iPhone 17 and an iPad Pro playing the demos, in Apple's product bezels with their status bars, read from the app repo's `store/bezels/` (its `tool/fetch_bezels.sh`; their license allows them only in App Store material, so they are never copied here) and drawn by its `store/device.mjs`. Each screen is filled with the app's light top colour, measured in Chrome and keyed out, so the gameplay shows through with the status bar over it. Apple loops them and starts them muted (search results can't be unmuted), so nothing depends on sound; the header has the music for viewers who unmute it. Upload them in App Store Connect under Header and Search Results, as the app repo's README says for the stills.

The videos name no store in their pictures (the short ends on the website, which links to every store), so the same files stay right once the app is public on Google Play. Only their YouTube text changes: `live` (`STORE=live`) puts the Play link in the descriptions. Cards are HTML shot by headless Chrome in a taller window and cropped, because its page is now and then a little short and left a strip at the bottom.

The scripts work from the app repo (`COBALAGI_APP`, `../project_cobalagi_flutter` by default), which has what they show: `website/screenshots/`, the voice clips and music in `assets/audio/`, the words in `lib/app/l10n/`, the robot art and the version in `pubspec.yaml`. Only the videos are written here.

### Layout

| Path | What |
| --- | --- |
| `cobalagi/scripts/lib.sh` | Shared: cards, the device bezel, gameplay segments, cross-fades with music and narration. |
| `cobalagi/scripts/short-video.sh`, `promo-video.sh`, `app-store-video.sh` | The videos. |
| `cobalagi/scripts/koba-voice.mjs`, `koba-lines.json` | Koba's lines for the videos only (`--dry-run` for the price). |
| `cobalagi/scripts/render.mjs` | Runs them (for `npm start`). |
| `cobalagi/scripts/subtitles.mjs` | Each video's subtitles (`<video>.srt`): the ARB words of each clip, at the time it plays. |
| `cobalagi/scripts/youtube-text.mjs`, `youtube.json` | Each video's YouTube text (below). |
| `cobalagi/out/` | The videos with their `.srt`, `.youtube.txt` and thumbnails. |
| `cobalagi/marketing-plan.md` | The marketing plan: steps to tick off, the order, and results. |
| `cobalagi/calendar.json`, `cobalagi/scripts/calendar.mjs` | The posting calendar: what goes out when, on which platform, and whether it is posted. The script adds each entry's campaign links from the plan's Results and refuses an unknown source or a missing draft. |

### Commands

Record the gameplay frames in the app repo (about 40 minutes; again whenever the demos or story scenes look different): the demos, the story scenes and a bump being fixed at phone size, and the demos on the iPhone and iPad. They land in its `tool/screenshots/out/video/`:

```sh
VIDEO_FRAMES=1 flutter test tool/screenshots --update-goldens --plain-name 'video frames'
```

Render, from this folder:

```sh
node cobalagi/scripts/render.mjs [short|promo|app-store|all] [soon|live]
node cobalagi/scripts/youtube-text.mjs --check    # YouTube's limits, for every video
node cobalagi/scripts/calendar.mjs [--all]        # posting calendar: what is not posted yet, with links
node cobalagi/scripts/calendar.mjs --posted <id> [YYYY-MM-DD] [notes]
```

### YouTube uploads

Rendering a video also writes `out/<video>.youtube.txt`, with the title, the description and every upload setting, ready to paste. Never edit those files: change `youtube.json` and render again, or run `node cobalagi/scripts/youtube-text.mjs <video> cobalagi/out/<video>.youtube.txt` for the text alone.

- **Other platforms:** each short's `.youtube.txt` ends with OTHER PLATFORMS, a caption per app (Instagram, Facebook, WhatsApp Status, Threads, LinkedIn, TikTok) from `social` in `youtube.json`; the same vertical file goes to all of them. Captions stay under Threads' 500 characters (checked).
- **Titles carry the app's version** at the time the video is made (`{version}`, the version name in the app's `pubspec.yaml`), so an upload always says which app it shows. A title without `{version}` is refused.
- **The store line** (`{store}` in descriptions) says "Coming soon to Google Play" until the app is public; then render with `live`.
- **Claims stay true** for the released app, as in its store listing, and both languages say the same.
- `youtube-text.mjs` refuses to write while any video breaks YouTube's limits (title 100, description 5,000 characters, no angle brackets) or leaves a `{…}` unfilled; `--check` runs just that.
- Settings: category Education, comments moderated Strict, AI use No (no realistic synthetic content), "Made for Kids" left to the channel owner (recommended No: the videos speak to parents).

YouTube can't replace a video's file: to update a video, delete it and upload the new one. Then update the links where it is shown: the app repo's website promo video (its video ids and title cards in `website/video/`) and, for the landscape promo, the Play listing's Video field.
