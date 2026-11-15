// Makes Bilah Aksara in-game audio from sounds.mjs into bilahaksara/out/ as
// <key>.mp3 (LAME) for Godot 4 (WAV stubs stay as fallback in the app repo).
// Homebrew ffmpeg here has libmp3lame but not libvorbis; Godot loops MP3 fine.
//   node bilahaksara/scripts/export.mjs [--dry-run]
// Then: node bilahaksara/scripts/install-audio.mjs

import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, statSync } from 'node:fs'
import { dryRun, estimate } from '../../shared/eleven.mjs'
import { make } from './sounds.mjs'

const out = new URL('../out/', import.meta.url).pathname

const run = (command, ...args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`)
}

const quiet = new Set(['sfx_ui_tap', 'sfx_sail', 'sfx_hit'])

const files = await make()
if (dryRun) {
  await estimate()
  process.exit()
}
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
let total = 0

// Crossfade the last seconds over the start so Godot can loop without a seam.
const loop = (file, target) => {
  const fade = 2
  const length = Number(
    spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout,
  )
  const filter = [
    `[0:a]asplit=3[a][b][c]`,
    `[a]atrim=0:${fade},asetpts=N/SR/TB,afade=t=in:d=${fade}[head]`,
    `[b]atrim=${length - fade}:${length},asetpts=N/SR/TB,afade=t=out:d=${fade}[tail]`,
    `[head][tail]amix=inputs=2:normalize=0[joined]`,
    `[c]atrim=${fade}:${length - fade},asetpts=N/SR/TB[body]`,
    `[joined][body]concat=n=2:v=0:a=1,loudnorm=I=-20:TP=-2[out]`,
  ].join(';')
  run('ffmpeg', '-y', '-v', 'error', '-i', file, '-filter_complex', filter, '-map', '[out]', '-ac', '2', '-ar', '44100', '-c:a', 'libmp3lame', '-b:a', '128k', target)
}

for (const [key, file] of Object.entries(files)) {
  if (key.startsWith('music_')) {
    const target = `${out}${key}.mp3`
    loop(file, target)
    total += statSync(target).size
    console.log(target)
    continue
  }
  const target = `${out}${key}.mp3`
  const length = Number(
    spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout,
  )
  const filter = [
    'silenceremove=start_periods=1:start_threshold=-40dB',
    `loudnorm=I=${quiet.has(key) ? -22 : -16}:TP=-1.5`,
    `afade=t=out:st=${Math.max(0, length - 0.12)}:d=0.1`,
  ].join(',')
  // Speech VO: mono 24 kHz 48 kbps (mobile size target); SFX keep 44.1 kHz 96 kbps.
  const enc = key.startsWith('vo_') ? ['-ar', '24000', '-b:a', '48k'] : ['-ar', '44100', '-b:a', '96k']
  run('ffmpeg', '-y', '-v', 'error', '-i', file, '-af', filter, '-map_metadata', '-1', '-ac', '1', enc[0], enc[1], '-c:a', 'libmp3lame', enc[2], enc[3], target)
  total += statSync(target).size
  console.log(target)
}
console.log(`${Object.keys(files).length} files, ${Math.round(total / 1024)} KB`)
