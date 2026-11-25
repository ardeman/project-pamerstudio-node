// Makes Krida's in-game sounds from sounds.mjs, into krida/out/ as
// <key>.m4a (AAC, mono): both AVAudioPlayer and Android's SoundPool play it,
// and it keeps the app under its 15 MB download budget.
//   node krida/scripts/export.mjs [--dry-run]
// Then copy them into the app repo: krida/out/*.m4a goes to both
// androidApp/src/main/res/raw/ and ios/Krida/Audio/.

import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync, statSync } from 'node:fs'
import { dryRun, estimate } from '../../shared/eleven.mjs'
import { make } from './sounds.mjs'

const out = new URL('../out/', import.meta.url).pathname

const run = (command, ...args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr)
}

// Seed clicks repeat many times a move, so they sit below the voice.
const quiet = new Set([
  'sfx_sow',
  'sfx_store',
  'sfx_tap',
  'sfx_die',
  'sfx_step',
  'sfx_miss',
  'sfx_hit',
  'sfx_night',
  'sfx_dawn',
])

const files = await make()
if (dryRun) {
  await estimate()
  process.exit()
}
rmSync(out, { recursive: true, force: true })
mkdirSync(out, { recursive: true })
let total = 0

// The music loops in the app: its last seconds are faded over its start, so
// the end runs straight into the beginning with no gap or jump.
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
  run('ffmpeg', '-y', '-v', 'error', '-i', file, '-filter_complex', filter, '-map', '[out]', '-ac', '2', '-ar', '44100', '-c:a', 'aac', '-b:a', '96k', target)
}

for (const [key, file] of Object.entries(files)) {
  if (key === 'bgm') {
    loop(file, `${out}bgm.m4a`)
    total += statSync(`${out}bgm.m4a`).size
    console.log(`${out}bgm.m4a`)
    continue
  }
  const target = `${out}${key}.m4a`
  // Trimmed to the onset so a sound plays the moment it's triggered, then
  // peak-limited and given a short fade so it never ends on a click.
  const length = Number(
    spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' }).stdout,
  )
  const filter = [
    'silenceremove=start_periods=1:start_threshold=-40dB',
    `loudnorm=I=${quiet.has(key) ? -22 : -16}:TP=-1.5`,
    `afade=t=out:st=${Math.max(0, length - 0.12)}:d=0.1`,
  ].join(',')
  run('ffmpeg', '-y', '-v', 'error', '-i', file, '-af', filter, '-ac', '1', '-ar', '44100', '-c:a', 'aac', '-b:a', '64k', target)
  total += statSync(target).size
  console.log(target)
}
console.log(`${Object.keys(files).length} files, ${Math.round(total / 1024)} KB`)
