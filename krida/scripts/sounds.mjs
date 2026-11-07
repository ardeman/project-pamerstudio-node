// Krida's in-game sounds: congklak sound effects and short Indonesian voice
// lines, made with ElevenLabs and cached in krida/audio/. export.mjs turns
// them into the app's files.
//   node krida/scripts/sounds.mjs [--dry-run] [--force]

import { dryRun, estimate, music, sfx, speak } from '../../shared/eleven.mjs'

const dir = new URL('../audio/', import.meta.url).pathname

// Gavrila, a native Indonesian voice from the library (as in Catat Saja's
// stories), used by id without adding it to the account.
const VOICE = 'gjhfBUoH6DHh0DG1X4u0'

const MODEL = 'eleven_text_to_sound_v3'

// Seeds are cowrie shells or small stones, the board is carved wood.
export const effects = {
  sow: {
    name: 'sow',
    seconds: 0.5,
    model: MODEL,
    prompt:
      'One single small cowrie shell dropped into a shallow carved wooden bowl: a short, soft, bright wooden click, close up, one drop only, no reverb, no other sounds',
  },
  store: {
    name: 'store',
    seconds: 0.7,
    model: MODEL,
    prompt:
      'One single small cowrie shell dropped into a large deep wooden bowl already holding many shells: a short clack with a light rattle of shells, close up, one drop only, no reverb, no other sounds',
  },
  capture: {
    name: 'capture',
    seconds: 1.2,
    model: MODEL,
    prompt:
      'A handful of small cowrie shells scooped up and poured together into a deep wooden bowl: a quick satisfying rattling cascade of shells, close up, no reverb, no voices, no music',
  },
  turn: {
    name: 'turn',
    seconds: 0.6,
    model: MODEL,
    prompt: 'A soft, warm, short wooden chime, like a single gentle tap on a bamboo angklung, pleasant game notification, no reverb, no other sounds',
  },
  win: {
    name: 'win',
    seconds: 2.5,
    model: MODEL,
    prompt:
      'A short cheerful victory jingle played on a Javanese gamelan, bright bonang and saron notes rising to a happy ending, mobile game win sound, no voices',
  },
  lose: {
    name: 'lose',
    seconds: 2,
    model: MODEL,
    prompt: 'A short gentle falling melody of three soft gamelan notes, a friendly mobile game lose sound, not sad, no voices',
  },
}

// Spoken over the game, so short and clear.
export const lines = {
  your_turn: 'Giliranmu!',
  their_turn: 'Giliran lawan.',
  shoot: 'Tembak!',
  win: 'Kamu menang!',
  lose: 'Kamu kalah.',
  draw: 'Seri!',
}

// Background music under the menus and the board: calm enough to think over,
// looped in the app (export.mjs crossfades its ends).
export const bgm = {
  name: 'bgm',
  seconds: 60,
  prompt:
    'Calm, warm, loopable background music for a relaxed traditional Indonesian board game: a soft Javanese gamelan with gentle bonang and saron patterns, light kendang hand drum, a mellow bamboo flute melody now and then, steady medium-slow tempo, peaceful and friendly, no build-up, no big ending, instrumental',
}

export const make = async () => {
  const files = {}
  files.bgm = await music({ dir, ...bgm })
  for (const [key, sound] of Object.entries(effects)) files[`sfx_${key}`] = await sfx({ dir, ...sound })
  // The sound model gives near-silent UI taps; the seed click doubles as one.
  files.sfx_tap = files.sfx_sow
  for (const [key, text] of Object.entries(lines))
    files[`vo_${key}`] = (await speak({ dir, lang: 'id', name: `vo-${key}`, text, voice: VOICE })).file
  return files
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = await make()
  if (dryRun) await estimate()
  else for (const [key, file] of Object.entries(files)) console.log(key, file)
}
