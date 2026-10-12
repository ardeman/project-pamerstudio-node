// ElevenLabs helpers shared by every project in this folder: voice-over lines
// and instrumental music, cached in the caller's folder so a re-render costs
// no credits (a file is named after what made it, so a changed line or prompt
// is regenerated). Settings come from ../.env:
//   ELEVENLABS_API_KEY  required
//   VOICE_<LANG>        a voice id per language (VOICE_EN, VOICE_ID, ...)
//   TTS_MODEL           a model id; otherwise the newest one for the language

import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'

const API = 'https://api.elevenlabs.io'
const envFile = new URL('../.env', import.meta.url).pathname
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
  if (!key) throw new Error('ELEVENLABS_API_KEY is missing from ai-generated-content/.env')
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

// Speaks `text` in `lang` and saves it in `dir` as <name>-<hash>.mp3.
export const speak = async ({ dir, lang, name, text, voice, settings }) => {
  const model = await modelFor(lang)
  const voiceId = voice ?? env[`VOICE_${lang.toUpperCase()}`] ?? env.VOICE_EN ?? DEFAULT_VOICE
  const voiceSettings = { stability: 0.45, similarity_boost: 0.75, style: 0.35, speed: 1.05, ...settings }
  const file = `${dir}/${name}-${hash(settings ? [text, model, voiceId, voiceSettings] : [text, model, voiceId])}.mp3`
  if (!existsSync(file)) {
    await mkdir(dir, { recursive: true })
    const response = await call(`/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
      text,
      model_id: model,
      ...(model !== 'eleven_multilingual_v2' && { language_code: lang }),
      voice_settings: voiceSettings,
    })
    await writeFile(file, Buffer.from(await response.arrayBuffer()))
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
    await mkdir(dir, { recursive: true })
    const response = await call('/v1/music', {
      prompt,
      music_length_ms: Math.max(3000, length * 1000),
      force_instrumental: true,
    })
    await writeFile(file, Buffer.from(await response.arrayBuffer()))
    console.log('music', name, length, 's')
  }
  return file
}
