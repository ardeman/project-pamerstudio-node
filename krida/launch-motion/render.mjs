// Krida product-launch-motion pilot.
//   node krida/launch-motion/render.mjs --stills [en|id|all]
//   node krida/launch-motion/render.mjs [en|id|all] [--blur]
// Silent by default (no ElevenLabs). Ask before adding music/SFX.

import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { renderFilm, stillsFilm } from '../../shared/launch-motion/render.mjs'

const ROOT = fileURLToPath(new URL('./', import.meta.url))
const OUT = fileURLToPath(new URL('../out/launch-motion/', import.meta.url))
const HTML = join(ROOT, 'film.html')

const DURATION = 4
const SIZE = 1080
// One frame near each beat (120 BPM), plus a mid transition check.
const BEAT_TIMES = [0.12, 0.62, 1.12, 1.62, 2.12, 2.62, 3.12, 3.62]

const stills = process.argv.includes('--stills')
const blur = process.argv.includes('--blur')
const langArg = process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'all'
const langs = langArg === 'all' ? ['en', 'id'] : [langArg]

await mkdir(OUT, { recursive: true })

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
  })
  console.log('mp4', file)
}
