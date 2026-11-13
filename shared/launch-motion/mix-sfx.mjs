// Mix timed SFX (and optional bed music) into one AAC track — local files only.

import { spawn } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

/**
 * @param {{
 *   cues: { at: number, file: string, volume?: number }[],
 *   duration: number,
 *   outFile: string,
 *   volume?: number,
 *   bed?: { file: string, volume?: number },
 * }} opts
 */
export async function mixSfx({ cues, duration, outFile, volume = 0.85, bed }) {
  if (!cues.length && !bed) throw new Error('mixSfx: no cues or bed')
  await mkdir(dirname(outFile), { recursive: true })

  const inputs = []
  const filters = []
  const labels = []
  let i = 0

  if (bed) {
    inputs.push('-i', bed.file)
    const bedVol = bed.volume ?? 0.28
    filters.push(
      `[${i}:a]aresample=48000,atrim=0:${duration.toFixed(3)},volume=${bedVol},afade=t=in:d=0.25,afade=t=out:st=${(duration - 0.45).toFixed(2)}:d=0.45[bed]`,
    )
    labels.push('[bed]')
    i++
  }

  for (const cue of cues) {
    inputs.push('-i', cue.file)
    const delay = Math.max(0, Math.round(cue.at * 1000))
    const vol = cue.volume ?? volume
    filters.push(`[${i}:a]aresample=48000,volume=${vol},adelay=${delay}|${delay}[a${i}]`)
    labels.push(`[a${i}]`)
    i++
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
