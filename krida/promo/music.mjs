// Promo background music → krida/out/promo/bgm.m4a. Free with --dry-run.
// Gamelan × EDM bed timed to the 120 BPM promo grid (see voice_grid in lib.sh).
//   node krida/promo/music.mjs [--dry-run] [--force]
import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dryRun, estimate, music } from '../../shared/eleven.mjs'

// Cover the shared grid (~25 s) with a little tail.
const SECONDS = 26
const DIR = new URL('../audio/promo/', import.meta.url).pathname
const OUT = new URL('../out/promo/bgm.m4a', import.meta.url).pathname

// Cuts at 0 / 3 / 9.5 / 14.5 / 19 s (FADE 0.5, beats on 0.5 s). Keep in sync
// with voice_grid lengths in promo-video.sh if those change.
const PROMPT =
  'Warm Indonesian gamelan fused with modern EDM for a short app promo: bright ' +
  'bonang and saron melodies over a punchy electronic kick, sidechain bass and light ' +
  'synth stabs answering the metalophones, friendly and energetic, 120 BPM. Structure: ' +
  'opening hit at 0 seconds, first drop into a driving groove at 3 seconds when gameplay ' +
  'starts, a fresh percussion lift at 9.5 seconds, a bigger melodic hit at 14.5 seconds ' +
  'then three short accents half a second apart as game cards appear, final triumphant ' +
  'hit at 19 seconds for the call to action, leaves clear room for a voice-over, ' +
  'instrumental only, no vocals, clean ending'

mkdirSync(DIR, { recursive: true })
const file = await music({ dir: DIR, name: 'promo', prompt: PROMPT, seconds: SECONDS })

if (dryRun) {
  await estimate()
  process.exit(0)
}

mkdirSync(new URL('../out/promo/', import.meta.url).pathname, { recursive: true })
execFileSync('ffmpeg', ['-y', '-i', file, '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', OUT], {
  stdio: 'inherit',
})
await estimate()
console.log('Promo BGM ready at krida/out/promo/bgm.m4a')
