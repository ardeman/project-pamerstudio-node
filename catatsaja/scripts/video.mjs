// What every video here shares: recording stage.html frame by frame into
// ffmpeg, mixing voice clips over a music track, and a voice clip's loudness
// per frame (to move a drawn mouth).

import { execFileSync, spawn } from 'node:child_process'

export const FPS = 30

// Music under the voices (`clips`: { file, at } in seconds), faded at both
// ends, then levelled for social apps. No track: silence.
export const audioArgs = (clips, track, total) => {
  if (!track) return { inputs: ['-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=48000'], map: ['-map', '0:v', '-map', '1:a', '-shortest'] }
  const inputs = ['-i', track]
  const filters = [`[1:a]atrim=0:${total.toFixed(2)},volume=0.2,afade=t=in:d=0.4,afade=t=out:st=${(total - 1.8).toFixed(2)}:d=1.8[m]`]
  const labels = ['[m]']
  for (const clip of clips) {
    const index = inputs.length / 2 + 1
    const delay = Math.round(clip.at * 1000)
    inputs.push('-i', clip.file)
    filters.push(`[${index}:a]aresample=48000,adelay=${delay}|${delay}[v${index}]`)
    labels.push(`[v${index}]`)
  }
  filters.push(`${labels.join('')}amix=inputs=${labels.length}:normalize=0:duration=first,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]`)
  return { inputs, map: ['-filter_complex', filters.join(';'), '-map', '0:v', '-map', '[a]', '-t', total.toFixed(3)] }
}

// Seeks the page (window.seek) through every frame and encodes an MP4.
export const record = async (page, total, file, audio) => {
  const ffmpeg = spawn('ffmpeg', [
    '-loglevel', 'error', '-y',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    ...audio.inputs,
    ...audio.map,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
    '-profile:v', 'high', '-r', String(FPS),
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] })
  const done = new Promise((resolve, reject) => ffmpeg.on('exit', (code) => (code ? reject(new Error(`ffmpeg ${code}`)) : resolve())))
  const frames = Math.round(total * FPS)
  for (let frame = 0; frame < frames; frame++) {
    await page.evaluate((t) => window.seek(t), frame / FPS)
    const jpeg = await page.screenshot({ type: 'jpeg', quality: 95 })
    if (!ffmpeg.stdin.write(jpeg)) await new Promise((r) => ffmpeg.stdin.once('drain', r))
  }
  ffmpeg.stdin.end()
  await done
}

// How loud a clip is in each frame, 0 to 1 (its loudest frame is 1).
export const envelope = (file) => {
  const rate = 8000
  const pcm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-f', 's16le', '-ac', '1', '-ar', String(rate), '-'], { maxBuffer: 1 << 28 })
  const samples = new Int16Array(pcm.buffer, pcm.byteOffset, pcm.length / 2)
  const step = rate / FPS
  const levels = []
  for (let start = 0; start < samples.length; start += step) {
    let sum = 0
    const end = Math.min(samples.length, start + step)
    for (let i = Math.floor(start); i < end; i++) sum += samples[i] * samples[i]
    levels.push(Math.sqrt(sum / Math.max(1, end - start)))
  }
  const peak = Math.max(...levels, 1)
  return levels.map((level) => Math.round(Math.min(1, level / (peak * 0.7)) * 100) / 100)
}
