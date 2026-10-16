# AI-generated content

Promo videos and other generated media, one folder per project. Rules for AI agents working here: [`AGENTS.md`](AGENTS.md).

| Folder | What |
| --- | --- |
| `shared/` | Helpers any project can use. `eleven.mjs`: ElevenLabs voice-over (`speak`) and instrumental music (`music`), cached so re-renders cost no credits. |
| `catatsaja/` | Catat Saja promo videos (app repo: `../project-catatsaja-reactrouter`). |

## Setup

Copy `.env.example` to `.env` and add an ElevenLabs API key. It needs the Text to Speech, Music and Models (read) permissions; checking the voice-over (`check-voice.mjs`) also needs Speech to Text. `.env` is shared by every project here; never commit or share it.

Tools: Node 24, ffmpeg, and Google Chrome (Playwright uses it to render). Capturing app screens also needs Java for the Firebase emulators: `brew install openjdk@21`, then put `/opt/homebrew/opt/openjdk@21/bin` on `PATH` when you start them.

## Catat Saja

Two videos, each in English and Indonesian:

- **Promo** (`render.mjs`): a tour of the features, with one narrator. The vertical cut (Reels, Shorts) opens on a fast cut of the real screens under a spoken hook, not a title card.
- **Stories** (`render-stories.mjs`): four stories of people using the app in their own lives (Rina, a new mum; Sari and Dimas, a couple; Adit, a freelancer in Tokyo; Maya, caring for her dad). Each is an illustrated character speaking in their own ElevenLabs voice, with their mouth moving to it, next to the app's real screens. There is a full video, and a short one per story.

### Layout

| Path | What |
| --- | --- |
| `catatsaja/scripts/stage.html` | The animated stage both videos render from (scenes, phones, cards, the illustrated people). |
| `catatsaja/scripts/video.mjs` | Shared: recording frames into ffmpeg, mixing voices over music, voice loudness per frame. |
| `catatsaja/scripts/copy.mjs`, `narration.mjs` | Promo: on-screen text and voice-over. |
| `catatsaja/scripts/stories.mjs` | Stories: the cast (looks, voices) and what each person says, with the screens for each line. |
| `catatsaja/scripts/demo-data.mjs`, `stories-data.mjs` | The demo accounts and content the screens are captured from. |
| `catatsaja/scripts/capture.mjs`, `capture-stories.mjs` | Seed the demo data on the emulators and capture screens into `shots/<lang>/` and `shots/<lang>/stories/`. |
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
node catatsaja/scripts/render.mjs [vertical|whatsapp|linkedin|youtube|all] [en|id|all] [--stills] [--silent]
node catatsaja/scripts/render-stories.mjs [full|rina|couple|adit|maya|all] [vertical|linkedin|youtube|all] [en|id|all] [--stills] [--silent] [--meta]
```

`--stills` writes one frame per scene instead of a video; with `--silent` it makes no ElevenLabs calls (lines get an estimated length), so previews are free. The full stories video is made in every format, the short ones only vertically (Reels, Shorts, WhatsApp Status). Without a language, each stories format is made in the language it is posted in: vertical in Indonesian, LinkedIn in English, YouTube in both (`formats` in `render-stories.mjs`); pass `all` for both everywhere. `--meta` writes what the upload forms take, without rendering: a subtitle file (`.srt`) and a cover frame (`-cover.jpg`) per video, and the YouTube chapters (`meta.json`); the titles, descriptions and tracked links to paste are in `out/stories/captions.md`.

How the stories videos are posted and measured (a tracked link per story) is part of the app's revenue plan: the app repo's `README.md` → Roadmap → Revenue.

`node catatsaja/scripts/check-voice.mjs` transcribes the promo's Indonesian clips to check how the narrator says “Catat”.

## A new project

Make a folder next to `catatsaja/`, and import the helpers:

```js
import { music, speak } from '../../shared/eleven.mjs'

const line = await speak({ dir: 'audio/en', lang: 'en', name: 'intro', text: 'Hello!' })
const track = await music({ dir: 'audio', name: 'main', prompt: 'calm lo-fi, no vocals', seconds: 30 })
```

`speak` picks the newest model that speaks the language and uses `voice`, else `VOICE_<LANG>` from `.env`, else Jessica.
