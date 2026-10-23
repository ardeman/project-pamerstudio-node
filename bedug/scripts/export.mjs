// Makes the app's notification sounds from the takes in sounds.mjs, into
// bedug/out/: <name>.caf for iOS and macOS (IMA4, which Apple accepts for
// notification sounds, unlike AAC or MP3) and <name>.wav for Android.
//   node bedug/scripts/export.mjs [--dry-run]
// Copy them into the app repo as its README says.

import { spawnSync } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { dryRun, estimate } from '../../shared/eleven.mjs'
import { make } from './sounds.mjs'

const out = new URL('../out/', import.meta.url).pathname

const run = (command, ...args) => {
  const result = spawnSync(command, args, { encoding: 'utf8' })
  if (result.status !== 0) throw new Error(result.stderr)
}

// Both sounds end up equally loud.
const level = 'loudnorm=I=-16:TP=-1.5'

// The bedug: three clacks of the stick on the drum's wooden body, then five
// booms on the hide, three at a medium pace and two slow (seconds).
const clacks = [0, 0.3, 0.6]
const booms = [1.3, 2.1, 2.9, 4.4, 6.2]
const bedugLength = 10

const bedug = (clack, boom, file) => {
  const hits = [...clacks.map((at) => [clack, at]), ...booms.map((at) => [boom, at])]
  // Each hit is trimmed to its onset, so the times above are when it sounds.
  const filter = [
    ...hits.map(([, at], i) => `[${i}:a]silenceremove=start_periods=1:start_threshold=-35dB,adelay=${Math.round(at * 1000)}:all=1[h${i}]`),
    `${hits.map((_, i) => `[h${i}]`).join('')}amix=inputs=${hits.length}:normalize=0,${level},afade=t=out:st=${bedugLength - 1.5}:d=1.5,atrim=0:${bedugLength}[out]`,
  ].join(';')
  run('ffmpeg', '-y', '-v', 'error', ...hits.flatMap(([input]) => ['-i', input]), '-filter_complex', filter, '-map', '[out]', '-ac', '1', '-ar', '44100', file)
}

const siren = (take, file) => run('ffmpeg', '-y', '-v', 'error', '-i', take, '-af', `${level},afade=t=out:st=9:d=1`, '-ac', '1', '-ar', '44100', file)

const files = await make()
if (dryRun) {
  await estimate()
  process.exit()
}
mkdirSync(out, { recursive: true })
const master = (name) => `${out}${name}-master.wav`
bedug(files.clack, files.boom, master('bedug'))
siren(files.siren, master('siren'))
for (const name of ['bedug', 'siren']) {
  run('afconvert', '-f', 'caff', '-d', 'ima4', master(name), `${out}${name}.caf`)
  // 16-bit mono at 22.05 kHz: small, and every Android version plays it.
  run('ffmpeg', '-y', '-v', 'error', '-i', master(name), '-ar', '22050', '-sample_fmt', 's16', `${out}${name}.wav`)
  rmSync(master(name))
  console.log(`${out}${name}.caf`, `${out}${name}.wav`)
}
