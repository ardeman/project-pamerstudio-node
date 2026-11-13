// Krida product-launch-motion film.
//   node krida/launch-motion/render.mjs --stills [en|id|all]
//   node krida/launch-motion/render.mjs [en|id|all] [--blur] [--silent]
// Audio uses cached krida/out sfx + bgm only (free). --silent skips the mix.

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderFilm, stillsFilm } from '../../shared/launch-motion/render.mjs'
import { mixSfx } from '../../shared/launch-motion/mix-sfx.mjs'

const ROOT = fileURLToPath(new URL('./', import.meta.url))
const OUT = fileURLToPath(new URL('../out/launch-motion/', import.meta.url))
const SFX = fileURLToPath(new URL('../out/', import.meta.url))
const HTML = join(ROOT, 'film.html')

const DURATION = 12
const SIZE = 1080
// One still near each beat (plus a couple of holds).
const BEAT_TIMES = Array.from({ length: 24 }, (_, i) => i * 0.5 + 0.12)

const SFX_FILES = {
  tap: 'sfx_tap.m4a',
  sow: 'sfx_sow.m4a',
  capture: 'sfx_capture.m4a',
  store: 'sfx_store.m4a',
  win: 'sfx_win.m4a',
  turn: 'sfx_turn.m4a',
}

const stills = process.argv.includes('--stills')
const blur = process.argv.includes('--blur')
const silent = process.argv.includes('--silent')
const langArg = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'all'
const langs = langArg === 'all' ? ['en', 'id'] : [langArg]

await mkdir(OUT, { recursive: true })

async function buildAudio() {
  if (silent) return undefined
  // Keep in sync with film.html window.CUES.
  const cues = [
    { at: 0.5, sfx: 'tap' },
    { at: 1.0, sfx: 'sow' },
    { at: 1.5, sfx: 'sow' },
    { at: 2.0, sfx: 'sow' },
    { at: 2.5, sfx: 'sow' },
    { at: 3.0, sfx: 'sow' },
    { at: 3.5, sfx: 'sow' },
    { at: 4.0, sfx: 'capture' },
    { at: 5.0, sfx: 'store' },
    { at: 6.0, sfx: 'tap' },
    { at: 7.0, sfx: 'win' },
    { at: 8.0, sfx: 'turn' },
  ].map((c) => ({ at: c.at, file: join(SFX, SFX_FILES[c.sfx]) }))
  const mixPath = join(OUT, 'mix.m4a')
  await mixSfx({
    cues,
    duration: DURATION,
    outFile: mixPath,
    bed: { file: join(SFX, 'bgm.m4a'), volume: 0.26 },
  })
  return mixPath
}

const audioFile = stills ? undefined : await buildAudio()

for (const lang of langs) {
  if (stills) {
    const dir = join(OUT, 'stills', lang)
    const paths = await stillsFilm({
      htmlPath: HTML,
      outDir: dir,
      times: BEAT_TIMES,
      width: SIZE,
      height: SIZE,
      lang,
      prefix: 'beat',
    })
    console.log('stills', lang, paths.length, '→', dir)
    continue
  }

  const file = join(OUT, `krida-one-shape-${lang}${blur ? '-blur' : ''}.mp4`)
  await renderFilm({
    htmlPath: HTML,
    outFile: file,
    duration: DURATION,
    width: SIZE,
    height: SIZE,
    fps: 60,
    lang,
    blur,
    audioFile,
  })
  console.log('mp4', file, audioFile ? '+bgm+sfx' : 'silent')
}
