# AGENTS.md

Instructions for AI agents working in this folder. `README.md` has the setup, layout and commands; this file does not repeat them.

## Credits and the account

- ElevenLabs is paid per character and per second of music. Don't make calls that cost credits (voice, music, speech to text) without the user's go-ahead for that render. Listing voices, models and the subscription is free.
- Before asking, say what it will cost: run the render with `--dry-run` (free) and give its list and total against the credits left. Don't pass `--force` without the user's go-ahead.
- A cloud render from the web page's Render tab is priced first; pressing Approve there is the user's go-ahead for that render. Don't approve a request yourself, and don't let the job pass `--force`.
- Iterate on layout with `--stills --silent`, which makes no calls, and look at the stills before rendering a video.
- Adding a voice from the voice library to the account, or changing the account in any other way, needs the user's approval too.
- fal.ai (pictures and videos, through `shared/fal.mjs`) is paid per picture or second of video from a prepaid balance. The same rules apply: run `--dry-run` for the price, and ask before a new or changed prompt. Never call it from a project directly, and don't delete `art/`.

## Keep it cheap to re-render

- Every clip and track goes through `shared/eleven.mjs`, which caches by what made it. Don't call the ElevenLabs API directly from a project, and don't delete `audio/`: a re-render would buy everything again.
- Changing a line, a voice or a music prompt buys a new clip or track; changing timing or visuals doesn't.

## Truthful content

- Show only what the app really does, on its real screens: capture them from the demo data on the emulators (`capture*.mjs`), never mock up a screen. Generated pictures are only for the places stories happen in: never an app screen, text or a brand. Generated video may move a story's made-up person, drawn in the stories' flat style from a frame we drew (`first-frame.mjs`), never photoreal and never a real person. Check a claim against the app repo (its `README.md`, `AGENTS.md` and code) before a line says it.
- Stories are about people the demo data makes up. Don't present them as real customers or testimonials, and don't draw or name real people.
- Health lines describe what is logged and shown; never a diagnosis or a medical promise.
- Coba Lagi's videos show only the app's own gameplay (frames recorded from its demos), screenshots, words, voices and music; they follow its store listing's rules (the app repo's `AGENTS.md` → Store listing): true for the released app, both languages saying the same, and "Coming soon" until the app is public. Every title carries the app's version.

## Both languages

- Every video, caption and line exists in English and Indonesian, written for that language (casual, the way people talk), not translated word for word.
- In Indonesian, an English voice reads “c” as “k”: lines for the narrator (an English voice) go through `spoken()` in `narration.mjs`, which spells it “ch”. Native Indonesian voices (the stories' cast) need no respelling.
- After a new Indonesian narrator line with a “c”, run `check-voice.mjs` (it costs speech-to-text credits, so ask first).

## Look at the result

- Look at the stills (`out/stills/`, `out/stories/stills/`) for every format you changed, in both languages: text must not run into phones or cards, and nothing may be cut off.
- Watch the finished video (or a contact sheet of frames) before saying it's done.

## Conventions

- Scripts are Node ES modules (`.mjs`) with no dependencies beyond Playwright (linked from the app repo) and ffmpeg. Keep comments short and about why. Coba Lagi's renders are bash with headless Chrome and ffmpeg, run through `render.mjs`.
- One folder per project; helpers more than one project can use go in `shared/`.
- The app repo stays clean: no media, keys or promo scripts go into it.
- Marketing plans can be edited on the web: run `node shared/cloud.mjs pull` before changing a `marketing-plan.md`, and `push` after. Ask before a push that uploads media (it adds to Storage costs) or a `deploy`. A git push to `main` that changes `web/` deploys it through GitHub Actions, so it counts as a `deploy`.
- Never write the API key anywhere but `.env`, and never print it. The cloud render job reads the keys from Secret Manager (`elevenlabs-api-key` and `fal-api-key`, made from `.env` by `cloud/build.sh`, given to the job only); never put a key in the image, an environment variable or Firestore.
- `cloud/build.sh` changes the cloud (image, job, trigger, secret): ask before running it, like a `deploy`. `node cloud/inputs.mjs push` adds to Storage costs: run it with `--dry-run` first and ask before a large upload.

## AI on the web

- The AI tab on Pamer Studio makes drafts only. Treat what it writes (a `## Drafts` section in a plan, a caption, video lines) like any new line: check every claim against the app repo and keep the rules under Truthful content and Both languages before it goes into a video, caption or `captions.json`. Move a draft out of `## Drafts` once it is used or dropped.
- Its prompts in `web/public/ai.js` carry those rules; when a rule here changes, change them too. Its caption limits are a copy of `cobalagi/scripts/posting.mjs`: change both together.
- Calls are paid from the `pamer-studio` billing account. Don't call it from scripts, and don't turn off App Check enforcement for AI Logic.

## Keeping docs current

When you change a command, the layout or the setup, update `README.md`; when you change a rule, update this file. `CLAUDE.md` contains only the import of this file.
