// Renders the promo videos frame by frame from stage.html and encodes them
// with ffmpeg. Usage:
//   node scripts/render.mjs [format|all] [en|id|all] [--stills] [--silent] [--dry-run] [--force]
// --stills writes a few frames per scene to out/stills instead of a video.
// Unless --silent, each scene gets its voice-over line (a scene is stretched
// to fit it) over an instrumental track, both from ElevenLabs
// (../../shared/eleven.mjs), cached in audio/.

import { mkdir } from 'node:fs/promises'

import { chromium } from 'playwright'

import { copy } from './copy.mjs'
import { dryRun, estimate, music, speak } from '../../shared/eleven.mjs'
import { narration, spoken } from './narration.mjs'
import { audioArgs, record } from './video.mjs'

const ROOT = new URL('../', import.meta.url).pathname
// The voice starts once a scene has faded in (an opener sets its own
// `voiceAt`: no one waits in a feed), and leaves a breath after.
const VOICE_AT = 0.35
const VOICE_TAIL = 0.45
const MUSIC_PROMPT =
  'Upbeat, warm and friendly acoustic pop for an app promo: light plucked guitar, soft claps, gentle bass and ' +
  'a bright glockenspiel hook, steady mid tempo, optimistic and modern, no vocals, leaves room for a voice-over, ' +
  'clean ending.'

const s = (type, key, d, extra = {}) => ({ type, key, d, ...extra })

const formats = {
  // Instagram Reels and YouTube Shorts.
  vertical: {
    width: 1080,
    height: 1920,
    scenes: [
      s('hook', 'opener', 3.6, { voiceAt: 0.1, shots: ['notes', 'task', 'finance', 'finance-analysis-2', 'health-me', 'health-child-body'] }),
      s('phone', 'notes', 3, { shots: ['notes'], crops: [{ shot: 'crop-note', at: 1.0 }] }),
      s('phone', 'tasks', 3, { shots: ['task'], crops: [{ shot: 'crop-task', at: 1.0, r: 2 }] }),
      s('phone', 'money', 3.2, { shots: ['finance'], crops: [{ shot: 'crop-balance', at: 1.0 }] }),
      s('phone', 'receipt', 3.3, { shots: ['receipt'], crops: [{ shot: 'crop-receipt', at: 1.1 }] }),
      s('phone', 'health', 3.2, { shots: ['health-me'], crops: [{ shot: 'crop-weight', at: 1.0 }] }),
      s('phone', 'growth', 3, { shots: ['health-child-body'], crops: [{ shot: 'crop-growth', at: 1.0, r: 1.5 }] }),
      s('phone', 'private', 3.5, { shots: ['unlock'], crops: [{ shot: 'crop-security', at: 1.1 }] }),
      s('cta', 'cta', 3.6),
    ],
  },
  // WhatsApp Status: shorter.
  whatsapp: {
    width: 1080,
    height: 1920,
    scenes: [
      s('title', 'hook', 2.6),
      s('phone', 'notes', 2.4, { shots: ['notes'] }),
      s('phone', 'tasks', 2.4, { shots: ['task'] }),
      s('phone', 'money', 2.8, { shots: ['finance'], crops: [{ shot: 'crop-balance', at: 0.8 }] }),
      s('phone', 'health', 2.8, { shots: ['health-me'], crops: [{ shot: 'crop-weight', at: 0.8 }] }),
      s('phone', 'private', 3, { shots: ['unlock'], crops: [{ shot: 'crop-security', at: 0.9 }] }),
      s('cta', 'cta', 3.4),
    ],
  },
  // LinkedIn feed (4:5).
  linkedin: {
    width: 1080,
    height: 1350,
    scenes: [
      s('title', 'hook', 3),
      s('brand', 'brand', 2.4),
      s('phone', 'notes', 3.2, { shots: ['notes'], crops: [{ shot: 'crop-note', at: 1.0 }] }),
      s('phone', 'tasks', 3.2, { shots: ['task'], crops: [{ shot: 'crop-task', at: 1.0, r: 2 }] }),
      s('phone', 'money', 3.5, { shots: ['finance'], crops: [{ shot: 'crop-balance', at: 1.0 }] }),
      s('phone', 'charts', 3.4, { shots: ['finance-analysis-2'], crops: [{ shot: 'crop-cashflow', at: 1.0 }] }),
      s('phone', 'smart', 3.5, { shots: ['entry-suggest'], crops: [{ shot: 'crop-entry', at: 1.1, r: 1.5 }] }),
      s('phone', 'health', 3.4, { shots: ['health-me'], crops: [{ shot: 'crop-weight', at: 1.0 }] }),
      s('phone', 'growth', 3.2, { shots: ['health-child-body'], crops: [{ shot: 'crop-growth', at: 1.0, r: 1.5 }] }),
      s('phone', 'share', 3.3, { shots: ['task'], crops: [{ shot: 'crop-share', at: 1.0 }] }),
      s('phone', 'private', 4, { shots: ['unlock'], crops: [{ shot: 'crop-security', at: 1.1 }] }),
      s('cta', 'cta', 4),
    ],
  },
  // YouTube (16:9).
  youtube: {
    width: 1920,
    height: 1080,
    scenes: [
      s('title', 'hook', 3.5),
      s('brand', 'brand', 3),
      s('phone', 'notes', 4.5, { shots: ['note'], desk: 'desk-notes' }),
      s('phone', 'tasks', 4.5, { shots: ['task'], desk: 'desk-tasks' }),
      s('phone', 'money', 4.5, { shots: ['finance'], crops: [{ shot: 'crop-balance', at: 1.2 }] }),
      s('phone', 'charts', 4.5, { shots: ['finance-analysis-2'], desk: 'desk-finance-analysis' }),
      s('phone', 'smart', 4.5, { shots: ['entry-suggest'], crops: [{ shot: 'crop-entry', at: 1.2, r: 1.5 }] }),
      s('phone', 'health', 4.5, { shots: ['health-me-body'], desk: 'desk-health' }),
      s('phone', 'growth', 4.2, { shots: ['health-child-body'], crops: [{ shot: 'crop-growth', at: 1.2, r: 1.5 }] }),
      s('phone', 'share', 4.2, { shots: ['task'], crops: [{ shot: 'crop-share', at: 1.2 }] }),
      s('phone', 'private', 5, { shots: ['unlock'], crops: [{ shot: 'crop-security', at: 1.3 }] }),
      s('phone', 'anywhere', 4.5, { shots: ['finance'], desk: 'desk-finance' }),
      s('phones', 'dark', 4.2, { shots: ['notes', 'notes-dark'] }),
      s('cta', 'cta', 5),
    ],
  },
}

const [formatArg = 'all', langArg = 'all'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const stills = process.argv.includes('--stills')
const silent = process.argv.includes('--silent')
const formatNames = formatArg === 'all' ? Object.keys(formats) : formatArg.split(',')
const langs = langArg === 'all' ? ['en', 'id'] : langArg.split(',')

await mkdir(`${ROOT}out/stills`, { recursive: true })

// Voice first: it sets each scene's length, and so the music's.
const plans = {}
for (const name of formatNames) {
  for (const lang of langs) {
    const scenes = []
    for (const scene of formats[name].scenes) {
      if (silent) {
        scenes.push(scene)
        continue
      }
      const voice = await speak({ dir: `${ROOT}audio/${lang}`, lang, name: scene.key, text: spoken(narration[lang][scene.key], lang) })
      scenes.push({ ...scene, d: Math.max(scene.d, (scene.voiceAt ?? VOICE_AT) + voice.length + VOICE_TAIL), voice: voice.file })
    }
    plans[`${name}-${lang}`] = scenes
  }
}
const tracks = {}
if (!silent && !stills) {
  for (const name of formatNames) {
    const longest = Math.max(...langs.map((lang) => plans[`${name}-${lang}`].reduce((sum, scene) => sum + scene.d, 0)))
    tracks[name] = await music({ dir: `${ROOT}audio`, name, prompt: MUSIC_PROMPT, seconds: longest })
  }
}
if (dryRun) {
  await estimate()
  process.exit(0)
}

// The voice clips at their place in the video.
const clipsOf = (scenes) => {
  const clips = []
  let start = 0
  for (const scene of scenes) {
    if (scene.voice) clips.push({ file: scene.voice, at: start + (scene.voiceAt ?? VOICE_AT) })
    start += scene.d
  }
  return clips
}

const browser = await chromium.launch({ channel: 'chrome' })
try {
  for (const lang of langs) {
    for (const name of formatNames) {
      const format = { ...formats[name], scenes: plans[`${name}-${lang}`] }
      const page = await browser.newPage({ viewport: { width: format.width, height: format.height } })
      await page.goto(`file://${ROOT}scripts/stage.html`)
      const total = await page.evaluate((cfg) => window.setup(cfg), {
        width: format.width,
        height: format.height,
        shots: `file://${ROOT}shots/${lang}/`,
        logo: `file://${ROOT}../../../github/project-catatsaja-reactrouter/public/apple-touch-icon.png`,
        scenes: format.scenes.map((scene) => ({ ...scene, text: copy[lang][scene.key] })),
      })
      const label = `${name}-${lang}`
      if (stills) {
        let start = 0
        for (const [index, scene] of format.scenes.entries()) {
          for (const at of [scene.d * 0.85]) {
            await page.evaluate((t) => window.seek(t), start + at)
            await page.screenshot({ path: `${ROOT}out/stills/${label}-${String(index).padStart(2, '0')}-${scene.key}.png` })
          }
          start += scene.d
        }
        console.log('stills', label, total.toFixed(1), 's')
      } else {
        const file = `${ROOT}out/catatsaja-${label}.mp4`
        await record(page, total, file, audioArgs(clipsOf(format.scenes), tracks[name], total))
        console.log('video', file, `${total.toFixed(1)} s`)
      }
      await page.close()
    }
  }
} finally {
  await browser.close()
}
