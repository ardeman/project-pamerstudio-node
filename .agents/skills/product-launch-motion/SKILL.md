---
name: product-launch-motion
description: Use when asked to make a launch video, product film, motion design piece, UI motion reel, Dribbble-style UI animation or animated brand/logo sting — anything rendered to MP4 from HTML with a cursor, morphing UI, springs, beat-synced music and SFX. Adapted for Pamer Studio from AbubakrChan/product-launch-motion (v2: pure seek(t), closed-form springs, Playwright subframes, ffmpeg tmix).
---

# Product launch motion (Pamer Studio)

Canonical copy: `project-pamerstudio-node/.agents/skills/product-launch-motion/`.
Reuse via `~/.cursor/skills/product-launch-motion` and each app’s `.agents/skills/` symlink — same pattern as `app-store-screenshots`.

**Do not scaffold films inside an app repo.** Per-app HTML films and render scripts live under that app’s folder here (`krida/launch-motion/`, `catatsaja/…`, …). Shared springs + Playwright/ffmpeg helpers live in `shared/launch-motion/`.

Upstream creative direction and prompts: [`references/prompts.md`](references/prompts.md), [`references/technique.md`](references/technique.md) (MIT, Abubakr Chan). Sample films from the upstream repo are **not** shipped and must not be reused.

## How this differs from store screenshots

| | `app-store-screenshots` | `product-launch-motion` |
| --- | --- | --- |
| Deliverable | Static PNG store ads | 60 fps MP4 launch / UI motion film |
| Shared asset | One Next.js editor (`store-screenshots/`) | Render helpers (`shared/launch-motion/`) |
| Per product | Deck JSON + uploads in the editor | One HTML film: every pixel = `f(t)` in `seek(t)` |

## Pamer rules (override upstream when they conflict)

Upstream says “invent the scenes” and “no creative limits”. In this studio:

1. **Truthful content** (`AGENTS.md`): show only what the app really does. Stylized UI chrome and simplified interactions are fine; do not fake store screenshots, fake testimonials, or invented product outcomes. Real numbers only when defensible; label invented micro-story vs real stats in the report.
2. **Both languages**: every film exists in English and Indonesian (casual, not word-for-word). Prefer a `lang` switch on the same `seek(t)` film.
3. **Credits**: music and ElevenLabs SFX go through `shared/eleven.mjs`. Run `--dry-run` and get the user’s go-ahead before paid work. Prefer `--stills` (free) while iterating. Synthesized offline SFX (numpy / local) need no credits.
4. **Look at stills** in `out/` before a full blur render. Watch the MP4 (or a contact sheet) before saying done.
5. **Director calls**: log creative choices as `DECISION:` lines the user can overturn in one reply — but still ask before spending credits.

Music-first (no voice-over) is the default for these films. Narrated explainers stay on the existing Catat Saja / Coba Lagi VO pipelines (or upstream v1 ideas), not this skill.

## Non-negotiable motion rules

Same as upstream v2 — read `references/prompts.md` before building:

1. **One shape, never cut.** Morph size/radius/colour; content swaps with a short blur.
2. **Springs**, tiny overshoot at most (closed-form `stepR` / `Track` in `shared/launch-motion/springs.mjs`).
3. **A cursor drives every change** (real press scale, drags as direct manipulation).
4. **Camera frames every state** — empty frames are a bug.
5. **Music first** — beat grid, something on every beat; place SFX by measured peak when mixing.
6. **Loops**: last frame ≡ first frame (cursor included).

Banned unless the user overrides: bouncy easing, particle bursts, glows, gradients on UI chrome, dead time, template looks.

## Process

1. **Ask for inputs** (unless given): product / app folder, 8–12 UI states, palette (brand system preferred), soundtrack plan (ElevenLabs music vs licensed track), languages (`en`+`id`), duration / loop.
2. **Direct first**: beat-by-beat scene plan + `DECISION:` list. Show it before a long code pass.
3. **Build** one HTML (+ JS) under `<app>/launch-motion/` where `window.seek(t)` paints every frame. Import spring helpers from the shared module only in Node; in the browser, inline the small spring helpers (or serve them).
4. **Stills**: `node <app>/launch-motion/render.mjs --stills` → contact sheet / per-beat frames. Fix framing and overlap.
5. **Preview MP4** (no motion blur): default render.
6. **Full**: `--blur` for 4 subframes + ffmpeg `tmix` at 60 fps; mux music/SFX only after dry-run approval.
7. **Report**: paths, real-vs-invented, `DECISION:`s, whether audio was heard or only measured.

## Shared helpers

```sh
# From an app film folder (example: Krida pilot)
node krida/launch-motion/render.mjs --stills          # free
node krida/launch-motion/render.mjs                   # silent MP4 preview
node krida/launch-motion/render.mjs --blur            # 60 fps + motion blur (slower)
```

- `shared/launch-motion/springs.mjs` — `stepR`, `Track`, `vis`, `clamp`
- `shared/launch-motion/render.mjs` — Playwright Chrome + ffmpeg (resolves Playwright via `catatsaja/node_modules`, same as other promo scripts)

## Pilot

`krida/launch-motion/` is the first film: a short silent one-shape congklak loop (stylized chrome, not app screenshots). Extend it; do not start a second scaffold in the Krida app repo.
