// The first frame an AI video of a story's person starts from: their place
// as the vertical short shows it (stage.html), with them standing in it
// (`figure`) and the scene's things where they end up. Free: nothing is
// bought. Writes out/stories/first-frames/<story>-<scene>.png.
//   node scripts/first-frame.mjs [story] [scene number, from 1]

import { readFileSync, readdirSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'

import { chromium } from 'playwright'

import { cast, stories } from './stories.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const OUT = `${ROOT}out/stories/first-frames/`
const [name = 'hendra', number = '1'] = process.argv.slice(2)
const scene = stories[name].scenes[Number(number) - 1]
// The vertical short's place band (stage.html): 64% of 1920 for the opening
// scene, 30% for the strip a phone scene keeps over the app.
const view = Number(number) === 1 ? 'full' : 'strip'
const width = 1080
const height = Math.round(1920 * (view === 'full' ? 0.64 : 0.3))

await mkdir(OUT, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome' })
try {
  const page = await browser.newPage({ viewport: { width, height: 1920 } })
  await page.goto(`file://${ROOT}scripts/stage.html`)
  const d = scene.d ?? 5
  await page.evaluate((cfg) => window.setup(cfg), {
    width,
    height: 1920,
    shots: '',
    art: Object.fromEntries(readdirSync(`${ROOT}places`).map((file) => [file.replace(/\.svg$/, ''), readFileSync(`${ROOT}places/${file}`, 'utf8')])),
    cast,
    scenes: [{ type: 'place', view, place: stories[name].place, act: scene.act, d, tag: '', figure: true, lines: [{ who: scene.lines[0][0], text: '', at: 0, d: 0 }] }],
  })
  await page.evaluate((t) => {
    window.seek(t)
    // Only the place: the band's fade into the page is the stage's, drawn
    // over the video when it plays.
    document.querySelectorAll('.scene > .abs > .abs').forEach((node) => { node.style.display = 'none' })
  }, d)
  const path = `${OUT}${name}-${number}.png`
  await page.screenshot({ path, clip: { x: 0, y: 0, width, height } })
  console.log(path)
} finally {
  await browser.close()
}
