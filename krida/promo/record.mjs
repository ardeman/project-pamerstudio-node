// Record real Krida gameplay from a booted iOS Simulator into clips/.
// Like Coba Lagi's video frames — motion on the board, not a screenshot slideshow.
//
// Launch sneak peek needs congklak + nearby + games (menu picker).
//
//   node krida/promo/record.mjs congklak [--seconds 25]
//   node krida/promo/record.mjs nearby [--seconds 15]
//   node krida/promo/record.mjs games [--seconds 12]
//   node krida/promo/record.mjs ular|ludo|perang|gaple [--seconds N]
//
// Needs: Xcode, a booted simulator with Krida installed (scripts/install-ios.sh
// or Xcode Run). Congklak uses -openCongklakComputer (vs computer); you still
// tap your holes when it's your turn — the bot plays the other seat.
// Nearby opens a host room (-openNearby); show the lobby / QR, or join from a
// second device if you have one. Games opens the main menu — swipe the game
// card so the picker shows more boards (don't start them). Ctrl-C stops early.

import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { app } from '../scripts/app.mjs'

const ROOT = fileURLToPath(new URL('./', import.meta.url))
const CLIPS = join(ROOT, 'clips')
const BUNDLE = process.env.KRIDA_BUNDLE ?? 'com.ardeman.krida'
const secondsArg = process.argv.find((a) => a.startsWith('--seconds='))
const secondsFlag = process.argv.includes('--seconds')
  ? Number(process.argv[process.argv.indexOf('--seconds') + 1])
  : Number(secondsArg?.split('=')[1])
const clip =
  process.argv.slice(2).find((a) => !a.startsWith('--') && !/^\d+$/.test(a)) ?? 'congklak'
const SECONDS = Number.isFinite(secondsFlag) && secondsFlag > 0 ? secondsFlag : 25
const settleArg = process.argv.find((a) => a.startsWith('--settle='))
const settleFlag = process.argv.includes('--settle')
  ? Number(process.argv[process.argv.indexOf('--settle') + 1])
  : Number(settleArg?.split('=')[1])
const defaultSettle = clip === 'nearby' || clip === 'games' ? 7 : clip === 'congklak' ? 5 : 3
// Skip splash / board load so the clip starts on the useful screen.
const SETTLE = Number.isFinite(settleFlag) && settleFlag >= 0 ? settleFlag : defaultSettle
// Flows that run while the tape rolls (swipes, etc.).
const maestroDuring = { games: 'maestro-games.yaml' }[clip]
// Congklak: arm Autopilot before recording so the first frame already has sowing.
const maestroBefore = { congklak: 'maestro-congklak-arm.yaml' }[clip]

const LAUNCH = {
  congklak: ['-openCongklakComputer'],
  nearby: ['-openNearby'],
  // Main menu with the game card — swipe to tease more boards.
  games: [],
  ular: ['-openUlarTangga'],
  ludo: ['-openLudo'],
  perang: ['-openPerangKapal'],
  gaple: ['-openGaple'],
}

if (!(clip in LAUNCH)) {
  console.error(`Unknown clip "${clip}". Use: ${Object.keys(LAUNCH).join(', ')}`)
  process.exit(1)
}

mkdirSync(CLIPS, { recursive: true })
const out = join(CLIPS, `${clip}.mp4`)

const xcrun = (...args) => spawnSync('xcrun', args, { encoding: 'utf8' })
const booted = () => {
  const list = xcrun('simctl', 'list', 'devices', 'booted')
  const line = list.stdout.split('\n').find((l) => l.includes('(Booted)'))
  const udid = line?.match(/[0-9A-F-]{36}/i)?.[0]
  if (!udid) {
    console.error('No booted simulator. Boot an iPhone in Simulator, install Krida, then retry.')
    process.exit(1)
  }
  return udid
}

const udid = booted()
console.log('simulator', udid)
console.log('launch', BUNDLE, ...LAUNCH[clip], `(settle ${SETTLE}s, then record ${SECONDS}s)`)
const tip =
  clip === 'games'
    ? 'Tap Next game so more boards flash by — don’t Start.'
    : clip === 'nearby'
      ? 'Show the nearby host lobby / QR; a second device can join if you have one.'
      : 'Play your turns when the board waits on you (or Autopilot).'
console.log(`${tip} Ctrl-C stops early.\n`)

// Launch first, wait out the splash, then record only the useful screen.
xcrun('simctl', 'terminate', udid, BUNDLE)
await new Promise((r) => setTimeout(r, 400))
const launch = xcrun('simctl', 'launch', udid, BUNDLE, ...LAUNCH[clip])
if (launch.status !== 0) {
  console.error(launch.stderr || launch.stdout || 'simctl launch failed — is Krida installed on this simulator?')
  console.error(`App repo: ${app}`)
  process.exit(1)
}
console.log(`settling ${SETTLE}s…`)
await new Promise((r) => setTimeout(r, SETTLE * 1000))

const maestroEnv = {
  ...process.env,
  PATH: `${process.env.HOME}/.maestro/bin:${process.env.PATH}`,
}
const runMaestro = (flow, wait) => {
  const path = join(ROOT, flow)
  if (!existsSync(path)) return null
  console.log('maestro', path)
  const child = spawn('maestro', ['test', '--udid', udid, path], {
    stdio: 'inherit',
    env: maestroEnv,
  })
  if (!wait) return child
  return new Promise((resolve, reject) => {
    child.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`maestro exited ${code}`))))
  })
}

if (maestroBefore) {
  try {
    await runMaestro(maestroBefore, true)
  } catch (e) {
    console.error(String(e.message || e))
    console.error('Continuing to record anyway — play turns manually if needed.')
  }
}

console.log('recording', out)
const recorder = spawn(
  'xcrun',
  ['simctl', 'io', udid, 'recordVideo', '--codec=h264', '--force', out],
  { stdio: ['ignore', 'inherit', 'inherit'] },
)

const stop = () => {
  try {
    recorder.kill('SIGINT')
  } catch {
    /* already ended */
  }
}
process.on('SIGINT', () => {
  stop()
  process.exit(130)
})

if (maestroDuring) runMaestro(maestroDuring, false)

await new Promise((r) => setTimeout(r, SECONDS * 1000))
stop()
await new Promise((r) => recorder.on('close', r))

if (!existsSync(out)) {
  console.error('No clip written.')
  process.exit(1)
}
console.log('wrote', out)
