// Renders the stories videos (stories.mjs): the full one, and a short one
// per story. Usage:
//   node scripts/render-stories.mjs [video|all] [format|all] [en|id|all] [--stills] [--silent] [--dry-run] [--force] [--meta]
// video: full, rina, couple, adit, maya, nadia or wulan. The full video is made in every
// format; the short ones only vertically. Without a language, each format is
// made in the languages it is posted in (`formats`). --stills writes a frame per scene
// to out/stories/stills; --silent skips ElevenLabs (lines get an estimated
// length, so stills cost no credits). --meta writes what the upload forms
// take (subtitles, chapters, covers) without rendering.

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmSync, statSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'

import { chromium } from 'playwright'

import { copy } from './copy.mjs'
import { dryRun, estimate, music, speak } from '../../shared/eleven.mjs'
import { spoken } from './narration.mjs'
import { cast, cta, hook, stories } from './stories.mjs'
import { FPS, audioArgs, envelope, record } from './video.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const OUT = `${ROOT}out/stories/`
// The first line starts once a scene has faded in; lines are a breath apart.
const VOICE_AT = 0.35
const GAP = 0.3
const TAIL = 0.55
const MUSIC_PROMPT =
  'Warm, heartfelt acoustic pop for a short documentary-style app ad about everyday Indonesian families: soft ' +
  'fingerpicked guitar, light piano, gentle shaker and subtle claps, hopeful and modern, steady mid tempo, no vocals, ' +
  'leaves room for voices, clean ending.'

// Each format in the languages it is posted in (used when no language is
// given): vertical for Indonesian Reels, Shorts and Status, LinkedIn in
// English, YouTube in both.
const formats = {
  vertical: { width: 1080, height: 1920, langs: ['id'] },
  linkedin: { width: 1080, height: 1350, langs: ['en'] },
  youtube: { width: 1920, height: 1080, langs: ['en', 'id'] },
}

// The scenes of a video, before timing. Lines are [who, en, id].
const storyScenes = (key, landscape) => {
  const story = stories[key]
  return [
    ...(story.intro ? [{ type: 'person', key: `${key}-intro`, people: story.people, role: story.role, lines: story.intro, d: 3.5 }] : []),
    ...story.scenes.map((scene, index) => ({
      // A story told in a place opens there (`place`), then keeps it as a
      // band over the app's screens; `act` is what the person does.
      type: scene.type ?? (story.place && index === 0 ? 'place' : 'phone'),
      place: story.place,
      act: scene.act,
      key: `${key}-${index + 1}`,
      tag: scene.tag,
      lines: scene.lines,
      shots: scene.shots,
      labels: scene.labels,
      // 16:9 shows the laptop screen instead of the cards, where there is one.
      ...(landscape && scene.desk ? { desk: scene.desk } : { crops: scene.crops }),
      d: scene.d ?? 4,
    })),
  ]
}
const videos = {
  full: { formats: Object.keys(formats), scenes: (landscape) => [
    { type: 'title', key: 'hook', text: hook.text, lines: hook.lines, d: 3 },
    ...Object.keys(stories).filter((key) => stories[key].full !== false).flatMap((key) => storyScenes(key, landscape)),
    { type: 'cta', key: 'cta', lines: cta.lines, d: 4.5 },
  ] },
  ...Object.fromEntries(Object.keys(stories).map((key) => [key, { formats: ['vertical'], scenes: (landscape) => [
    ...storyScenes(key, landscape),
    { type: 'cta', key: 'cta', lines: cta.lines, d: 4.5 },
  ] }])),
}

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const [videoArg = 'all', formatArg = 'all', langArg] = args
const stills = process.argv.includes('--stills')
const silent = process.argv.includes('--silent')
const videoNames = videoArg === 'all' ? Object.keys(videos) : videoArg.split(',')
const langsOf = (format) => (!langArg ? formats[format].langs : langArg === 'all' ? ['en', 'id'] : langArg.split(','))

// A line said out loud: its clip, length and loudness per frame. The
// narrator is the promo's English voice, so it gets the promo's spellings.
const say = async (lang, name, [who, en, id]) => {
  const text = lang === 'en' ? en : id
  if (silent) return { who, text, d: text.split(/\s+/).length / (lang === 'id' ? 2.6 : 2.8) + 0.3 }
  const clip = await speak({
    dir: `${ROOT}audio/stories/${lang}`,
    lang,
    name,
    text: who === 'narrator' ? spoken(text, lang) : text,
    voice: cast[who].voice[lang],
  })
  return { who, text, d: clip.length, file: clip.file, levels: clip.file && envelope(clip.file) }
}

// A scene's person talking in their place (avatar.mjs, the newest clip if it
// was remade), as frames the stage draws in place of the drawn scene. Its lips
// follow the Indonesian line, so other languages keep the drawn scene.
const avatarOf = (key, lang) => {
  const clips = existsSync(`${ROOT}art`) ? readdirSync(`${ROOT}art`).filter((file) => file.startsWith(`${key}-avatar-`) && file.endsWith('.mp4')) : []
  if (lang !== 'id' || !clips.length) return undefined
  const clip = clips.sort((a, b) => statSync(`${ROOT}art/${b}`).mtimeMs - statSync(`${ROOT}art/${a}`).mtimeMs)[0]
  const dir = `${OUT}avatar-frames/${clip.replace(/\.mp4$/, '')}/`
  if (!existsSync(dir)) {
    // Into a temporary folder first, so a stopped run leaves no half set.
    const part = dir.replace(/\/$/, '.part/')
    rmSync(part, { recursive: true, force: true })
    mkdirSync(part, { recursive: true })
    execFileSync('ffmpeg', ['-loglevel', 'error', '-i', `${ROOT}art/${clip}`, '-vf', `fps=${FPS}`, '-q:v', '2', `${part}%04d.jpg`])
    renameSync(part, dir)
  }
  return { url: `file://${dir}`, frames: readdirSync(dir).length, fps: FPS }
}

// Lines one after another; a scene lasts until its last line ends.
const timed = async (lang, scene) => {
  const lines = []
  let at = VOICE_AT
  for (const [index, line] of scene.lines.entries()) {
    const said = await say(lang, `${scene.key}-${index}`, line)
    lines.push({ ...said, at })
    at += said.d + GAP
  }
  const end = at - GAP + TAIL + (scene.type === 'cta' ? 0.6 : 0)
  return {
    ...scene,
    avatar: scene.place ? avatarOf(scene.key, lang) : undefined,
    lines,
    d: Math.max(scene.d, end),
    role: scene.role?.[lang],
    tag: scene.tag?.[lang],
    text: scene.type === 'cta' ? copy[lang].cta : scene.text?.[lang],
  }
}

await mkdir(`${OUT}stills`, { recursive: true })

const plans = []
for (const video of videoNames) {
  const names = formatArg === 'all' ? videos[video].formats : formatArg.split(',').filter((f) => videos[video].formats.includes(f))
  for (const format of names) {
    for (const lang of langsOf(format)) {
      const scenes = []
      for (const scene of videos[video].scenes(format === 'youtube')) scenes.push(await timed(lang, scene))
      plans.push({ video, format, lang, scenes, total: scenes.reduce((sum, scene) => sum + scene.d, 0) })
    }
  }
}

// --meta: what the upload forms take, from the same timings as the videos,
// so nothing is rendered: subtitles (.srt), chapters (meta.json) and a cover
// frame from the rendered video (a person's introduction, or the hook of a
// story without one, all words in).
const pad = (n, size = 2) => String(n).padStart(size, '0')
const srtTime = (t) => {
  const ms = Math.round(t * 1000)
  return `${pad(Math.floor(ms / 3_600_000))}:${pad(Math.floor(ms / 60_000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`
}
const clock = (t) => `${Math.floor(t / 60)}:${pad(Math.floor(t) % 60)}`
// A line in cues of at most two rows of 42 characters, timed by length.
const cues = (text, from, to) => {
  const parts = []
  for (const word of text.split(' ')) {
    const last = parts.at(-1)
    if (last && `${last} ${word}`.length <= 80 && !/[.!?]$/.test(last)) parts[parts.length - 1] = `${last} ${word}`
    else parts.push(word)
  }
  const per = (to - from) / text.length
  let at = from
  return parts.map((part) => {
    const words = part.split(' ')
    let split = words.length
    while (split > 1 && words.slice(0, split).join(' ').length > 42) split--
    const rows = [words.slice(0, split).join(' '), words.slice(split).join(' ')].filter(Boolean)
    const cue = { from: at, to: at + part.length * per, text: rows.join('\n') }
    at = cue.to + per
    return cue
  })
}
if (process.argv.includes('--meta')) {
  const { execFileSync } = await import('node:child_process')
  const { existsSync, readFileSync, writeFileSync } = await import('node:fs')
  const metaFile = `${OUT}meta.json`
  const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, 'utf8')) : {}
  for (const { video, format, lang, scenes, total } of plans) {
    const label = `${video}-${format}-${lang}`
    let start = 0
    const lines = []
    const chapters = []
    let cover
    for (const scene of scenes) {
      for (const line of scene.lines) lines.push(...cues(line.text, start + line.at, start + line.at + line.d))
      if (scene.type === 'person') {
        chapters.push({ at: clock(start), title: `${stories[scene.key.split('-')[0]].people.map((key) => cast[key].name).join(' & ')}: ${scene.role}` })
        // The couple shows two faces: the full video's cover.
        if (!cover || scene.people.length > 1) cover = start + scene.d - 0.4
      }
      start += scene.d
    }
    // No introduction: the hook, all words in, over its screen.
    cover ??= scenes[0].d - 0.4
    writeFileSync(`${OUT}catatsaja-stories-${label}.srt`, lines.map((cue, i) => `${i + 1}\n${srtTime(cue.from)} --> ${srtTime(cue.to)}\n${cue.text}\n`).join('\n'))
    const mp4 = `${OUT}catatsaja-stories-${label}.mp4`
    if (existsSync(mp4)) execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-ss', cover.toFixed(2), '-i', mp4, '-frames:v', '1', '-q:v', '2', `${OUT}catatsaja-stories-${label}-cover.jpg`])
    // YouTube wants chapters of 10 s or more from 0:00: the opening and
    // the ending are too short, so the first person starts at 0:00.
    meta[label] = { length: Math.round(total * 10) / 10, chapters: chapters.map((chapter, i) => (i ? chapter : { ...chapter, at: '0:00' })) }
    console.log('meta', label)
  }
  writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`)
  process.exit(0)
}

// One track for the full videos and one for the short ones, long enough for
// the longest of them.
const tracks = {}
if (!silent && !stills) {
  for (const kind of ['full', 'short']) {
    const lengths = plans.filter((plan) => (plan.video === 'full') === (kind === 'full')).map((plan) => plan.total)
    if (lengths.length) tracks[kind] = await music({ dir: `${ROOT}audio`, name: `stories-${kind}`, prompt: MUSIC_PROMPT, seconds: Math.max(...lengths) })
  }
}
if (dryRun) {
  await estimate()
  process.exit(0)
}

const browser = await chromium.launch({ channel: 'chrome' })
try {
  for (const { video, format, lang, scenes } of plans) {
    const { width, height } = formats[format]
    const page = await browser.newPage({ viewport: { width, height } })
    await page.goto(`file://${ROOT}scripts/stage.html`)
    const total = await page.evaluate((cfg) => window.setup(cfg), {
      width,
      height,
      shots: `file://${ROOT}shots/${lang}/stories/`,
      logo: `file://${ROOT}../../../github/project-catatsaja-reactrouter/public/apple-touch-icon.png`,
      // The places Recraft drew (places-art.mjs), inlined: an <image> would
      // still be loading when the first frame is taken.
      art: Object.fromEntries(readdirSync(`${ROOT}places`).map((file) => [file.replace(/\.svg$/, ''), readFileSync(`${ROOT}places/${file}`, 'utf8')])),
      cast,
      scenes: scenes.map(({ lines, ...scene }) => ({ ...scene, lines: lines.map(({ file, ...line }) => line) })),
    })
    const label = `${video}-${format}-${lang}`
    if (stills) {
      let start = 0
      for (const [index, scene] of scenes.entries()) {
        // Halfway through the last line, so the mouth is open and the words are in.
        const last = scene.lines.at(-1)
        const at = scene.type === 'cta' ? scene.d * 0.85 : last.at + last.d * 0.6
        await page.evaluate((t) => window.seek(t), start + Math.min(at, scene.d - 0.05))
        await page.screenshot({ path: `${OUT}stills/${label}-${String(index).padStart(2, '0')}-${scene.key}.png` })
        start += scene.d
      }
      console.log('stills', label, total.toFixed(1), 's')
    } else {
      const clips = []
      let start = 0
      for (const scene of scenes) {
        for (const line of scene.lines) if (line.file) clips.push({ file: line.file, at: start + line.at })
        start += scene.d
      }
      const file = `${OUT}catatsaja-stories-${label}.mp4`
      await record(page, total, file, audioArgs(clips, tracks[video === 'full' ? 'full' : 'short'], total))
      console.log('video', file, `${total.toFixed(1)} s`)
    }
    await page.close()
  }
} finally {
  await browser.close()
}
