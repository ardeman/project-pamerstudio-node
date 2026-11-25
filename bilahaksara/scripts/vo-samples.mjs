// Short comparison clips → Godot .tmp/vo-samples/ (owner listening).
//   node bilahaksara/scripts/vo-samples.mjs
import { mkdirSync, copyFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { speak } from '../../shared/eleven.mjs'
import { app } from './app.mjs'
import { elevenVoiceId } from './voices.mjs'

const SAMPLE_LINE =
  'Bilah Aksara. Nusa: negeri, umat, sumpah, aksara. Ingatan yang tak boleh hilang.'
const VO = { stability: 0.48, similarity_boost: 0.72, style: 0.35, speed: 0.95 }
const outDir = join(app, '.tmp/vo-samples')
const cache = new URL('../audio/samples/', import.meta.url).pathname

const clips = [
  ['narrator-sample', 'narrator'],
  ['lukas-sample', 'lukas'],
  ['bahari-sample', 'bahari'],
]

mkdirSync(cache, { recursive: true })
mkdirSync(outDir, { recursive: true })

for (const [name, speaker] of clips) {
  const voice = elevenVoiceId(speaker)
  const { file } = await speak({
    dir: cache,
    lang: 'id',
    name,
    text: SAMPLE_LINE,
    voice,
    settings: VO,
  })
  if (!file) continue
  const dest = join(outDir, `${name}.mp3`)
  copyFileSync(file, dest)
  console.log(dest, voice)
}