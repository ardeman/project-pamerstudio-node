// Mix timed SFX clips into one AAC track (local files only — no ElevenLabs).
// cues: [{ at: seconds, file: absolutePath }]

import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

export async function mixSfx({ cues, duration, outFile, volume = 0.85 }) {
  if (!cues.length) throw new Error('mixSfx: no cues')
  await mkdir(dirname(outFile), { recursive: true })

  const inputs = []
  const filters = []
  const labels = []
  for (const [i, cue] of cues.entries()) {
    inputs.push('-i', cue.file)
    const delay = Math.max(0, Math.round(cue.at * 1000))
    filters.push(`[${i}:a]aresample=48000,volume=${volume},adelay=${delay}|${delay}[a${i}]`)
    labels.push(`[a${i}]`)
  }
  filters.push(
    `${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=longest,atrim=0:${duration.toFixed(3)},apad=whole_dur=${duration.toFixed(3)}[aout]`,
  )

  const args = [
    '-loglevel', 'error', '-y',
    ...inputs,
    '-filter_complex', filters.join(';'),
    '-map', '[aout]',
    '-c:a', 'aac', '-b:a', '192k',
    outFile,
  ]

  await new Promise((resolve, reject) => {
    const ff = spawn('ffmpeg', args, { stdio: 'inherit' })
    ff.on('exit', (code) => (code ? reject(new Error(`ffmpeg mix ${code}`)) : resolve()))
  })
  return outFile
}
