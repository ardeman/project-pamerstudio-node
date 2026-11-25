// Bilah Aksara in-game beds, SFX and short VO (ID + EN), via ElevenLabs.
// Cached in bilahaksara/audio/. export.mjs turns them into Godot .ogg files.
//   node bilahaksara/scripts/sounds.mjs [--dry-run] [--force]
//
// Design (docs/game-design.md): frame drums, flutes, plucked strings + chiptune;
// one theme per era; epilogue thins the same motif; Tuan Hikayat-style short
// Indonesian chants. Never name real history in VO text.

import { dryRun, estimate, music, sfx, speak } from '../../shared/eleven.mjs'
import { elevenVoiceId } from './voices.mjs'

const dir = new URL('../audio/', import.meta.url).pathname

// Dakocan — young standard Indonesian male (narrator / UI stingers). See data/vo_voices.json.

const VOICE = elevenVoiceId('narrator')
// Storyteller, not arcade announcer: steady, warm, a touch of chant.
const VO_STORY = { stability: 0.48, similarity_boost: 0.72, style: 0.35, speed: 0.95 }

const MODEL = 'eleven_text_to_sound_v3'

// Shared fictional motif description (remember / sea-blade) for every bed.
const MOTIF =
  'a short memorable five-note motif on plucked strings that feels like remembering, never dramatic, no vocals, no lyrics'

export const effects = {
  ui_tap: {
    name: 'ui-tap',
    seconds: 0.5,
    model: MODEL,
    prompt:
      'One soft wooden UI tap: a tiny bright tok on carved wood, close up, one hit only, no reverb, no voices, no music',
  },
  ui_confirm: {
    name: 'ui-confirm',
    seconds: 0.7,
    model: MODEL,
    prompt:
      'A short warm confirm chime of two soft bamboo notes rising, pleasant mobile UI accept sound, no voices, no reverb',
  },
  blade_chime: {
    name: 'blade-chime',
    seconds: 1.6,
    model: MODEL,
    prompt:
      'A sacred short metal blade chime: one clear ringing strike of a thin bronze blade with a gentle sustain, mystical but soft, close up, no voices, no music bed',
  },
  cannon: {
    name: 'cannon',
    seconds: 1.2,
    model: MODEL,
    prompt:
      'A single wooden ship cannon firing once: a short deep boom with a quick wooden rattle, close up, one shot only, no voices, no music',
  },
  hit: {
    name: 'hit',
    seconds: 0.6,
    model: MODEL,
    prompt:
      'A short wooden sword clash: two light sticks striking once, sharp dry knock, close up, one hit only, no voices, no music',
  },
  sail: {
    name: 'sail',
    seconds: 0.9,
    model: MODEL,
    prompt:
      'A canvas sail catching wind once: a short soft whoosh of cloth and rope, close up, one gust only, no voices, no music',
  },
}

// Short player-facing lines only (fictional; no real-history names).
export const lines = {
  title: 'Bilah Aksara.',
  start: 'Mulai.',
  blade: 'Nusa.',
  fire: 'Tembak!',
  remember: 'Nusa.',
}

export const linesEn = {
  title: 'Bilah Aksara.',
  start: 'Begin.',
  blade: 'Nusa.',
  fire: 'Fire!',
  remember: 'Nusa.',
}

const bed = (name, colour) => ({
  name,
  seconds: 48,
  prompt: `Loopable background music for a pixel-art Indonesian island adventure game, ${colour}, frame drums and soft kendang pulse, bamboo flute, plucked strings, light chiptune layer under the acoustic instruments, ${MOTIF}, medium-slow tempo, seamless loop feel, no build-up, no big ending, instrumental only, no vocals`,
})

export const beds = {
  title: bed(
    'title',
    'inviting harbour dusk with warm gold over deep sea blue, hopeful and quiet',
  ),
  era1: bed(
    'era1',
    'open sea adventure under navy and gold, brave young sailor energy, breezy',
  ),
  ga: bed(
    'ga',
    'prosperous golden-age harbour, brighter gold over calm sea, proud but gentle',
  ),
  era2: bed(
    'era2',
    'occupied city at night under lamp browns and spreading orange, tense but restrained',
  ),
  era3: bed(
    'era3',
    'jungle resistance camp, deep greens fading toward grey, weary courage',
  ),
  epilogue: {
    name: 'epilogue',
    seconds: 40,
    prompt: `Sparse loopable epilogue music for a pixel-art story game: only one soft plucked-string instrument playing the same five-note remembering motif slowly, almost alone, faint distant frame-drum heartbeat, thin and reflective, ${MOTIF}, no flute lead, no chiptune sparkle, no vocals, seamless loop feel`,
  },
}

export const make = async () => {
  const files = {}
  for (const [key, track] of Object.entries(beds)) files[`music_${key}`] = await music({ dir, ...track })
  for (const [key, sound] of Object.entries(effects)) files[`sfx_${key}`] = await sfx({ dir, ...sound })
  for (const [key, text] of Object.entries(lines))
    files[`vo_${key}`] = (await speak({ dir, lang: 'id', name: `vo-${key}`, text, voice: VOICE, settings: VO_STORY })).file
  for (const [key, text] of Object.entries(linesEn))
    files[`vo_${key}_en`] = (await speak({ dir, lang: 'en', name: `vo-${key}-en`, text, voice: VOICE, settings: VO_STORY })).file
  return files
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = await make()
  if (dryRun) await estimate()
  else for (const [key, file] of Object.entries(files)) console.log(key, file)
}
