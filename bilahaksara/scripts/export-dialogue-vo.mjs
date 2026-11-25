// Export dialogue VO takes to bilahaksara/out/vo_dlg_*.mp3 (does not wipe music/SFX).
//   node bilahaksara/scripts/dialogue-vo.mjs [--dry-run]
//   node bilahaksara/scripts/export-dialogue-vo.mjs
//   node bilahaksara/scripts/install-audio.mjs

import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dryRun, estimate } from '../../shared/eleven.mjs'
import { makeDialogueVo } from './dialogue-vo.mjs'

const out = new URL('../out/', import.meta.url).pathname
const audio = new URL('../audio/', import.meta.url).pathname

const run = (command, ...args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr || `${command} failed`)
}

const files = await makeDialogueVo()
if (dryRun) {
  await estimate()
  process.exit()
}

mkdirSync(out, { recursive: true })
let total = 0
for (const [key, file] of Object.entries(files)) {
  if (!key.startsWith('vo_dlg_')) continue
  const target = `${out}${key}.mp3`
  const length = Number(
    spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], {
      encoding: 'utf8',
    }).stdout,
  )
  const filter = [
    'silenceremove=start_periods=1:start_threshold=-40dB',
    'loudnorm=I=-16:TP=-1.5',
    `afade=t=out:st=${Math.max(0, length - 0.12)}:d=0.1`,
  ].join(',')
  // Mobile size target for speech: mono 24 kHz 48 kbps CBR (see bilah docs/audio-pamer.md).
  run('ffmpeg', '-y', '-v', 'error', '-i', file, '-af', filter, '-map_metadata', '-1', '-ac', '1', '-ar', '24000', '-c:a', 'libmp3lame', '-b:a', '48k', target)
  total += statSync(target).size
  console.log(target)
}
console.log(`${Object.keys(files).length} dialogue VO → out/ (${Math.round(total / 1024)} KB)`)
if (!existsSync(audio)) console.warn('audio cache folder missing')
const cached = readdirSync(audio).filter((n) => n.startsWith('dlg-')).length
console.log(`cache clips named dlg-*: ${cached}`)
