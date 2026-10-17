# AI-generated content

Promo videos and other generated media, one folder per project. Rules for AI agents working here: [`AGENTS.md`](AGENTS.md).

| Folder | What |
| --- | --- |
| `shared/` | Helpers any project can use. `cli.mjs`: the terminal menu (`npm start`). `eleven.mjs`: ElevenLabs voice-over (`speak`) and instrumental music (`music`), cached so re-renders cost no credits; every paid call is checked against the credits left and logged to `usage.jsonl`. `fal.mjs`: pictures and videos from fal.ai (`picture`, `video`, through fal's queue, with local files sent as data URIs), cached the same way, priced by fal's pricing API and logged to `fal-usage.jsonl` (not on the dashboard, which counts ElevenLabs credits). `dashboard.mjs`: a local page with the credits, the spending and every project's stills and videos. |
| `catatsaja/` | Catat Saja promo videos (app repo: `../project-catatsaja-reactrouter`). |

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

## Catat Saja

Two videos, each in English and Indonesian:

- **Promo** (`render.mjs`): a tour of the features, with one narrator. The vertical cut (Reels, Shorts) opens on a fast cut of the real screens under a spoken hook, not a title card.
- **Stories** (`render-stories.mjs`): stories of people using the app in their own lives (Rina, a new mum; Sari and Dimas, a couple; Adit, a freelancer in Tokyo; Maya, caring for her dad; Nadia, tracking her period; Wulan, scanning her grocery receipt; Pak Hendra, filing his supplier receipts). Each is an illustrated character speaking in their own ElevenLabs voice, with their mouth moving to it, next to the app's real screens. There is a full video of the first four, and a short one per story. Nadia's short has no introduction: it opens on the problem, said over the real screen (`full: false` keeps it out of the full video). Wulan's story happens in a place (`place` in `stories.mjs`): it opens in her kitchen, where the things act it out (the shopping tumbles out of the bag, the receipt unrolls off the screen, a phone photographs it; `fx` in `stage.html`) with her face in the corner, talking, and the place stays on as a band over the app's screens. People aren't drawn whole: hand-made body movement looked stiff. Hendra's shop is drawn by Recraft on fal.ai as SVG (`places-art.mjs`: four styles to choose from, the chosen one tidied into `places/`), and the boxes, the receipt spike and the phone move over it; AI draws places only, never the app's screens. Hendra himself is being tried as an AI video: `first-frame.mjs` draws him standing behind his counter (`figure` on a place scene, its `stand` in `stage.html`), and Kling AI Avatar on fal.ai (`avatar.mjs`) makes him say his line from that frame and his voice clip, lips following it. When a place scene has such a clip, `render-stories.mjs` takes its frames (once, into `out/stories/avatar-frames/`) and the stage draws them in place of the drawn scene, timed to the line; only the Indonesian short uses it, since the lips follow the Indonesian voice. His lines are drafts over the promo's screens until his own book is captured.

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
node ../ai-generated-content/catatsaja/scripts/capture.mjs <en|id>
node ../ai-generated-content/catatsaja/scripts/capture-stories.mjs <en|id>   # ONLY=shot,shot for a few
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
