// Checks that this machine (the render image, or the Mac) has what the renders
// use: Chrome through Playwright (Catat Saja), Chrome itself as $CHROME (Coba
// Lagi's cards), fonts with emoji, and ffmpeg with H.264 and AAC. Makes no paid
// calls and needs no inputs. Usage: node cloud/check.mjs

import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { chromium } from 'playwright'

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const tmp = mkdtempSync(join(tmpdir(), 'check-'))
const page = join(tmp, 'page.html')
writeFileSync(page, '<!doctype html><meta charset="utf-8"><body style="font:700 64px sans-serif">Catat Saja 📒 Coba Lagi 🤖</body>')

let failed = false
async function check(name, run) {
  try {
    console.log(`ok    ${name}: ${await run()}`)
  } catch (error) {
    failed = true
    console.log(`FAIL  ${name}: ${error.message.split('\n')[0]}`)
  }
}

const size = (file) => `${Math.round(statSync(file).size / 1024)} KB`

await check('Playwright Chrome', async () => {
  const browser = await chromium.launch({ channel: 'chrome' })
  const tab = await browser.newPage({ viewport: { width: 1080, height: 400 } })
  await tab.goto(`file://${page}`)
  await tab.screenshot({ path: join(tmp, 'playwright.png') })
  const version = browser.version()
  await browser.close()
  return `${version}, ${size(join(tmp, 'playwright.png'))}`
})

await check('$CHROME', async () => {
  execFileSync(CHROME, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--window-size=1080,400',
    `--screenshot=${join(tmp, 'chrome.png')}`, `file://${page}`], { stdio: 'ignore' })
  return size(join(tmp, 'chrome.png'))
})

await check('emoji font', async () => {
  const fonts = execFileSync('fc-list', [':charset=1f4d2', 'family'], { encoding: 'utf8' }).trim()
  if (!fonts) throw new Error('no font has 📒')
  return fonts.split('\n')[0]
})

await check('ffmpeg H.264 + AAC', async () => {
  const out = join(tmp, 'clip.mp4')
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', 'testsrc2=size=1080x1920:rate=30:duration=2',
    '-f', 'lavfi', '-i', 'sine=duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-shortest', out])
  return size(out)
})

rmSync(tmp, { recursive: true, force: true })
process.exit(failed ? 1 : 0)
