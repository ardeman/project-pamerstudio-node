// ElevenLabs helpers shared by every project in this folder: voice-over lines,
// instrumental music and sound effects, cached in the caller's folder so a
// re-render costs no credits (a file is named after what made it, so a
// changed line or prompt is regenerated). Settings come from ../.env:
//   ELEVENLABS_API_KEY  required
//   VOICE_<LANG>        a voice id per language (VOICE_EN, VOICE_ID, ...)
//   TTS_MODEL           a model id; otherwise the newest one for the language
// Every paid call is checked against the credits left and logged to
// ../usage.jsonl. With --dry-run nothing is bought: missing clips and tracks
// are collected for estimate(); --force buys past the balance.

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'
import { relative } from 'node:path'

const API = 'https://api.elevenlabs.io'
const ROOT = new URL('../', import.meta.url).pathname
const envFile = `${ROOT}.env`
export const usageFile = `${ROOT}usage.jsonl`
export const dryRun = process.argv.includes('--dry-run')
const force = process.argv.includes('--force')
const env = Object.fromEntries(
  existsSync(envFile)
    ? readFileSync(envFile, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const at = line.indexOf('=')
          return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, '')]
        })
    : [],
)
const key = env.ELEVENLABS_API_KEY ?? process.env.ELEVENLABS_API_KEY

const call = async (path, body) => {
  if (!key) throw new Error('ELEVENLABS_API_KEY is missing from project-pamerstudio-node/.env')
  const response = await fetch(`${API}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'xi-api-key': key, ...(body && { 'Content-Type': 'application/json' }) },
    body: body && JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`)
  return response
}

export const duration = (file) =>
  Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString())

// The account's credits: free to read, and the only cost that is exact.
export const subscription = async () => {
  const s = await (await call('/v1/user/subscription')).json()
  return { tier: s.tier, used: s.character_count, limit: s.character_limit, resetsAt: s.next_character_count_reset_unix * 1000 }
}

export const usage = () =>
  existsSync(usageFile)
    ? readFileSync(usageFile, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line))
    : []

// Credits per second of music or sound effects, from what earlier ones
// really cost.
const rateOf = (kind) => {
  const made = usage().filter((u) => u.kind === kind && u.credits > 0)
  return made.length ? made.reduce((sum, u) => sum + u.credits, 0) / made.reduce((sum, u) => sum + u.seconds, 0) : undefined
}
const musicRate = () => rateOf('music')
// ElevenLabs' help pages give 11 or 20 credits per API second; assume the
// higher until a sound effect is logged.
const sfxRate = () => rateOf('sfx') ?? 20

// Voice credits are about one per character; the log keeps what was charged.
const pending = []
const buy = async (entry, estimate, run) => {
  const before = await subscription()
  const left = before.limit - before.used
  if (estimate > left && !force) throw new Error(`${entry.name} needs ~${Math.round(estimate)} credits, ${left} left (--force to buy anyway)`)
  const result = await run()
  const after = await subscription()
  const project = relative(ROOT, entry.dir).split('/')[0]
  const { dir, ...rest } = entry
  await appendFile(usageFile, `${JSON.stringify({ at: new Date().toISOString(), project, ...rest, estimate: Math.round(estimate), credits: after.used - before.used, left: after.limit - after.used })}\n`)
  return result
}

// What a --dry-run would buy, against the credits left. Call it once the
// clips and tracks are planned, then stop.
export const estimate = async () => {
  const account = await subscription()
  const left = account.limit - account.used
  const rate = musicRate()
  for (const p of pending) p.estimate = p.kind === 'voice' ? p.chars : p.kind === 'sfx' ? p.seconds * sfxRate() : rate && p.seconds * rate
  for (const p of pending) console.log(p.kind, p.lang ?? '', p.name, p.chars ? `${p.chars} chars` : `${p.seconds} s`, p.estimate ? `~${Math.round(p.estimate)} credits` : 'cost unknown')
  const total = pending.reduce((sum, p) => sum + (p.estimate ?? 0), 0)
  const unknown = pending.some((p) => !p.estimate)
  console.log(pending.length ? `~${Math.round(total)}${unknown ? '+' : ''} credits for ${pending.length} new` : 'Everything is cached: free.', `· ${left} of ${account.limit} left`)
  if (total > left) console.log('Not enough credits for this render.')
  return { pending, total, left }
}

const hash = (value) => createHash('sha1').update(JSON.stringify(value)).digest('hex').slice(0, 10)

// Jessica, a friendly, conversational premade voice.
const DEFAULT_VOICE = 'cgSgspJ2msm6clMCkdW9'
const PREFERRED_MODELS = ['eleven_v4', 'eleven_v3', 'eleven_multilingual_v2']

let models
const modelFor = async (lang) => {
  if (env.TTS_MODEL) return env.TTS_MODEL
  models ??= (await (await call('/v1/models')).json()).filter((m) => m.can_do_text_to_speech)
  const speaks = (m) => m.languages?.some((l) => l.language_id === lang)
  return (
    PREFERRED_MODELS.find((id) => models.some((m) => m.model_id === id && speaks(m))) ??
    models.find(speaks)?.model_id ??
    'eleven_multilingual_v2'
  )
}

// Speaks `text` in `lang` and saves it in `dir` as <name>-<hash>.mp3, with
// `model` if given (to match a voice made with it elsewhere).
export const speak = async ({ dir, lang, name, text, voice, settings, model: wanted }) => {
  const model = wanted ?? (await modelFor(lang))
  const voiceId = voice ?? env[`VOICE_${lang.toUpperCase()}`] ?? env.VOICE_EN ?? DEFAULT_VOICE
  const voiceSettings = { stability: 0.45, similarity_boost: 0.75, style: 0.35, speed: 1.05, ...settings }
  const file = `${dir}/${name}-${hash(settings ? [text, model, voiceId, voiceSettings] : [text, model, voiceId])}.mp3`
  if (!existsSync(file)) {
    if (dryRun) {
      pending.push({ kind: 'voice', lang, name, chars: text.length })
      return { file: null, length: text.split(/\s+/).length / 2.7 + 0.3 }
    }
    await mkdir(dir, { recursive: true })
    await buy({ kind: 'voice', dir, lang, name, chars: text.length, model }, text.length, async () => {
      const response = await call(`/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
        text,
        model_id: model,
        ...(model !== 'eleven_multilingual_v2' && { language_code: lang }),
        voice_settings: voiceSettings,
      })
      await writeFile(file, Buffer.from(await response.arrayBuffer()))
    })
    console.log('voice', lang, name, model)
  }
  return { file, length: duration(file) }
}

// An instrumental track at least `seconds` long, saved in `dir`.
export const music = async ({ dir, name, prompt, seconds }) => {
  const length = Math.ceil(seconds) + 2
  // Reuse any track made with this prompt that is long enough, so a small
  // timing change doesn't buy a new one. Tracks are asked for 2 s longer than
  // needed, so one made for a slightly shorter video often still fits.
  const existing = Array.from({ length: 64 }, (_, step) => `${dir}/music-${name}-${hash([prompt, length - 4 + step])}.mp3`).find(
    (file) => existsSync(file) && duration(file) >= seconds,
  )
  const file = existing ?? `${dir}/music-${name}-${hash([prompt, length])}.mp3`
  if (!existing) {
    if (dryRun) {
      pending.push({ kind: 'music', name, seconds: length })
      return null
    }
    await mkdir(dir, { recursive: true })
    await buy({ kind: 'music', dir, name, seconds: length }, (musicRate() ?? 0) * length, async () => {
      const response = await call('/v1/music', {
        prompt,
        music_length_ms: Math.max(3000, length * 1000),
        force_instrumental: true,
      })
      await writeFile(file, Buffer.from(await response.arrayBuffer()))
    })
    console.log('music', name, length, 's')
  }
  return file
}

// A sound effect `seconds` long (0.5 to 30), saved in `dir`; `take` makes
// another version of the same prompt, `model` picks a sound model.
export const sfx = async ({ dir, name, prompt, seconds, take = 1, influence = 0.5, model }) => {
  const file = `${dir}/${name}-${hash(model ? [prompt, seconds, influence, take, model] : [prompt, seconds, influence, take])}.mp3`
  if (!existsSync(file)) {
    if (dryRun) {
      pending.push({ kind: 'sfx', name: `${name} #${take}`, seconds })
      return null
    }
    await mkdir(dir, { recursive: true })
    await buy({ kind: 'sfx', dir, name, seconds }, sfxRate() * seconds, async () => {
      const response = await call('/v1/sound-generation?output_format=mp3_44100_128', {
        text: prompt,
        duration_seconds: seconds,
        prompt_influence: influence,
        ...(model && { model_id: model }),
      })
      await writeFile(file, Buffer.from(await response.arrayBuffer()))
    })
    console.log('sfx', name, take, seconds, 's')
  }
  return file
}
