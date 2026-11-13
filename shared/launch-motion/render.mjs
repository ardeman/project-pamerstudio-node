// Render a seek(t) HTML film with Playwright + ffmpeg.
// Playwright resolves through catatsaja/node_modules (linked to the Catat Saja app repo).
//
// Usage from a film’s render.mjs:
//   import { renderFilm, stillsFilm } from '../../shared/launch-motion/render.mjs'

import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

const require = createRequire(new URL('../../catatsaja/scripts/render.mjs', import.meta.url))
const { chromium } = require('playwright')

/** Prefer system Chrome (Catat Saja style); fall back to Playwright’s Chromium. */
async function launch() {
  if (process.env.CHROME) {
    return chromium.launch({ executablePath: process.env.CHROME })
  }
  try {
    return await chromium.launch({ channel: 'chrome' })
  } catch {
    return chromium.launch()
  }
}

async function openFilm(browser, htmlPath, { width, height, lang }) {
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  const url = pathToFileURL(htmlPath).href + (lang ? `?lang=${encodeURIComponent(lang)}` : '')
  await page.goto(url)
  await page.waitForFunction(() => typeof window.seek === 'function')
  if (lang) await page.evaluate((l) => window.setLang?.(l), lang)
  // Wait for any <img> shots (file:// captures) so stills aren’t blank.
  await page.waitForFunction(() => {
    const imgs = [...document.images]
    return imgs.length === 0 || imgs.every((img) => img.complete && img.naturalWidth > 0)
  }, { timeout: 20000 })
  return page
}

/** Write PNG stills at the given times (seconds). */
export async function stillsFilm({
  htmlPath,
  outDir,
  times,
  width = 1080,
  height = 1080,
  lang,
  prefix = 'still',
}) {
  await mkdir(outDir, { recursive: true })
  const browser = await launch()
  try {
    const page = await openFilm(browser, htmlPath, { width, height, lang })
    const paths = []
    for (const [i, t] of times.entries()) {
      await page.evaluate((time) => window.seek(time), t)
      const file = join(outDir, `${prefix}-${String(i).padStart(2, '0')}-${t.toFixed(2).replace('.', 'p')}.png`)
      await page.screenshot({ path: file, type: 'png' })
      paths.push(file)
    }
    return paths
  } finally {
    await browser.close()
  }
}

/**
 * Encode an MP4 from seek(t).
 * - Default: one sample per frame at `fps` (fast preview).
 * - `blur: true`: 4 subframes → ffmpeg tmix → 60 fps (skill’s look; slower).
 */
export async function renderFilm({
  htmlPath,
  outFile,
  duration,
  width = 1080,
  height = 1080,
  fps = 60,
  lang,
  blur = false,
  audioFile,
}) {
  await mkdir(join(outFile, '..'), { recursive: true })
  const browser = await launch()
  const tmp = `${outFile}.frames`
  await rm(tmp, { recursive: true, force: true })
  await mkdir(tmp, { recursive: true })

  try {
    const page = await openFilm(browser, htmlPath, { width, height, lang })

    if (!blur) {
      const ffmpeg = spawn(
        'ffmpeg',
        [
          '-loglevel', 'error', '-y',
          '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-',
          ...(audioFile
            ? ['-i', audioFile, '-map', '0:v', '-map', '1:a', '-shortest', '-c:a', 'aac', '-b:a', '192k']
            : ['-an']),
          '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p',
          '-profile:v', 'high', '-r', String(fps),
          '-movflags', '+faststart',
          outFile,
        ],
        { stdio: ['pipe', 'inherit', 'inherit'] },
      )
      const done = new Promise((resolve, reject) =>
        ffmpeg.on('exit', (code) => (code ? reject(new Error(`ffmpeg ${code}`)) : resolve())),
      )
      const frames = Math.round(duration * fps)
      for (let frame = 0; frame < frames; frame++) {
        await page.evaluate((t) => window.seek(t), frame / fps)
        const jpeg = await page.screenshot({ type: 'jpeg', quality: 95 })
        if (!ffmpeg.stdin.write(jpeg)) await new Promise((r) => ffmpeg.stdin.once('drain', r))
      }
      ffmpeg.stdin.end()
      await done
      return outFile
    }

    // 4 subframes / frame → 240 fps PNG sequence → tmix to 60 fps.
    const subFps = fps * 4
    const subframes = Math.round(duration * subFps)
    for (let i = 0; i < subframes; i++) {
      const t = Math.floor(i / 4) / fps + ((i % 4) - 1.5) / (fps * 4)
      await page.evaluate((time) => window.seek(time), Math.max(0, Math.min(duration, t)))
      const file = join(tmp, `s${String(i).padStart(5, '0')}.png`)
      await page.screenshot({ path: file, type: 'png' })
    }
    await browser.close()

    const listFile = join(tmp, 'concat.txt')
    // Prefer image2 sequence over concat demuxer for numbered PNGs.
    const vf =
      "tmix=frames=4:weights='1 1 1 1',select='eq(mod(n\\,4)\\,3)',setpts=N/(60*TB),scale=out_color_matrix=bt709:out_range=tv,format=yuv420p"
    const args = [
      '-loglevel', 'error', '-y',
      '-framerate', String(subFps), '-i', join(tmp, 's%05d.png'),
      '-vf', vf, '-r', String(fps),
      '-c:v', 'libx264', '-preset', 'slow', '-crf', '15', '-tune', 'film',
      '-pix_fmt', 'yuv420p',
      '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
      ...(audioFile ? ['-i', audioFile, '-map', '0:v', '-map', '1:a', '-shortest', '-c:a', 'aac', '-b:a', '192k'] : ['-an']),
      '-movflags', '+faststart',
      outFile,
    ]
    await new Promise((resolve, reject) => {
      const ff = spawn('ffmpeg', args, { stdio: 'inherit' })
      ff.on('exit', (code) => (code ? reject(new Error(`ffmpeg ${code}`)) : resolve()))
    })
    await writeFile(listFile, '') // touch so tmp isn’t empty-looking if inspected
    return outFile
  } finally {
    try {
      await browser.close()
    } catch {
      /* already closed after blur path */
    }
    await rm(tmp, { recursive: true, force: true })
  }
}
