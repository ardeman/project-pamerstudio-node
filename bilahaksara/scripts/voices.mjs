// Shared Bilah dialogue VO casting (mirrors data/vo_voices.json in the Godot app).
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from './app.mjs'

const CONFIG_PATH = join(app, 'data/vo_voices.json')

let _cfg
const cfg = () => {
  if (_cfg) return _cfg
  _cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8'))
  return _cfg
}

export const NARRATOR = () => cfg().narrator ?? 'narrator'

export const stem = (key) => key.replace(/\./g, '_').replace(/\//g, '_')

/** Asset stem under assets/audio/vo: dlg_ch1_empty_0 or dlg_lukas_true_1_lukas */
export const voAssetStem = (key, speaker) => {
  const base = stem(key)
  if (!speaker || speaker === NARRATOR()) return base
  return `${base}_${speaker}`
}

export const voFileKey = (key, speaker) => `vo_dlg_${voAssetStem(key, speaker)}`

export const elevenVoiceId = (speaker) => {
  const voices = cfg().voices ?? {}
  const id = voices[speaker]?.eleven_id
  if (id) return id
  return voices.narrator?.eleven_id ?? 'plgKUYgnlZ1DCNh54DwJ'
}

const tagSpeaker = (idText) => {
  const m = String(idText ?? '').match(/^([^:]{2,48}):/)
  if (!m) return null
  const tag = m[1].trim().replace(/\s*\([^)]*\)\s*$/, '')
  return cfg().line_tags?.[tag] ?? null
}

/** Text to speak: drop a leading "Name:" label when the ID line's tag is a cast speaker,
 *  so the character says the line instead of reading out who is talking. */
export const spokenText = (entry, lang) => {
  // Optional per-line pronunciation override: "vo_id" / "vo_en" (spelled for the TTS, never shown).
  const override = String(entry?.[`vo_${lang}`] ?? '').trim()
  if (override) return override
  const text = String(entry?.[lang] ?? '').trim()
  if (!tagSpeaker(entry?.id)) return text
  return text.replace(/^[^:]{2,48}:\s*/, '')
}

export const resolveSpeaker = (key, entry) => {
  // A cast tag ("Penjaga: …") wins over a stale narrator default.
  const fromTag = tagSpeaker(entry?.id)
  if (fromTag) return fromTag
  if (entry?.speaker) return String(entry.speaker)
  for (const [prefix, speaker] of cfg().prefix_speakers ?? []) {
    if (key.startsWith(prefix)) return speaker
  }
  return NARRATOR()
}