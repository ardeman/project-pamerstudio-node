// Copies bilahaksara/out/*.mp3 into the Godot app's assets/audio/ folders.
//   node bilahaksara/scripts/install-audio.mjs

import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { app } from './app.mjs'

const out = new URL('../out/', import.meta.url).pathname

// Map export keys → Godot paths (match scripts/audio.gd stems).
const map = {
  music_title: 'music/title_loop.mp3',
  music_era1: 'music/era1_loop.mp3',
  music_ga: 'music/ga_loop.mp3',
  music_era2: 'music/era2_loop.mp3',
  music_era3: 'music/era3_loop.mp3',
  music_epilogue: 'music/epilogue_loop.mp3',
  sfx_ui_tap: 'sfx/ui_tap.mp3',
  sfx_ui_confirm: 'sfx/ui_confirm.mp3',
  sfx_blade_chime: 'sfx/blade_chime.mp3',
  sfx_cannon: 'sfx/cannon.mp3',
  sfx_hit: 'sfx/hit.mp3',
  sfx_sail: 'sfx/sail.mp3',
  vo_title: 'vo/title.mp3',
  vo_title_en: 'vo/title_en.mp3',
  vo_start: 'vo/start.mp3',
  vo_start_en: 'vo/start_en.mp3',
  vo_blade: 'vo/blade.mp3',
  vo_blade_en: 'vo/blade_en.mp3',
  vo_fire: 'vo/fire.mp3',
  vo_fire_en: 'vo/fire_en.mp3',
  vo_remember: 'vo/remember.mp3',
  vo_remember_en: 'vo/remember_en.mp3',
}

if (!existsSync(out)) {
  console.error('No bilahaksara/out/ yet. Run: node bilahaksara/scripts/export.mjs')
  process.exit(1)
}

const files = readdirSync(out).filter((name) => name.endsWith('.mp3'))
if (!files.length) {
  console.error('bilahaksara/out/ has no .mp3 files. Run: node bilahaksara/scripts/export.mjs')
  process.exit(1)
}

const root = join(app, 'assets/audio')
mkdirSync(join(root, 'music'), { recursive: true })
mkdirSync(join(root, 'sfx'), { recursive: true })
mkdirSync(join(root, 'vo'), { recursive: true })

let n = 0
for (const name of files) {
  const key = name.replace(/\.mp3$/, '')
  const rel = map[key]
  if (!rel) {
    console.warn(`skip unmapped ${name}`)
    continue
  }
  const dest = join(root, rel)
  cpSync(join(out, name), dest)
  console.log(dest)
  n += 1
}
console.log(`${n} files → ${root}`)
