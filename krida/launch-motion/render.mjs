// Krida product-launch-motion pilot.
//   node krida/launch-motion/render.mjs --stills [en|id|all]
//   node krida/launch-motion/render.mjs [en|id|all] [--blur] [--silent]
// SFX are free (cached m4a in krida/out/). --silent skips the mix.

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

import { renderFilm, stillsFilm } from '../../shared/launch-motion/render.mjs'
import { mixSfx } from '../../shared/launch-motion/mix-sfx.mjs'

const ROOT = fileURLToPath(new URL('./', import.meta.url))
const OUT = fileURLToPath(new URL('../out/launch-motion/', import.meta.url))
const SFX = fileURLToPath(new URL('../out/', import.meta.url))
const HTML = join(ROOT, 'film.html')

const DURATION = 5
const SIZE = 1080
const BEAT_TIMES = [0.12, 0.62, 1.12, 1.62, 2.12, 2.62, 3.12, 3.62, 4.12, 4.62]

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

async function audioForLang() {
  if (silent) return undefined
  // Cues mirror film.html window.CUES (keep in sync).
  const cues = [
    { at: 0.5, sfx: 'tap' },
    { at: 1.0, sfx: 'sow' },
    { at: 1.5, sfx: 'sow' },
    { at: 2.0, sfx: 'capture' },
    { at: 2.5, sfx: 'store' },
    { at: 3.0, sfx: 'win' },
    { at: 3.5, sfx: 'turn' },
  ].map((c) => ({ at: c.at, file: join(SFX, SFX_FILES[c.sfx]) }))
  const mixPath = join(OUT, 'mix-sfx.m4a')
  await mixSfx({ cues, duration: DURATION, outFile: mixPath })
  return mixPath
}

const audioFile = stills ? undefined : await audioForLang()

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
  console.log('mp4', file, audioFile ? '+sfx' : 'silent')
}

// Touch so tooling that imports this module for cues can resolve the HTML URL.
void pathToFileURL(HTML)
