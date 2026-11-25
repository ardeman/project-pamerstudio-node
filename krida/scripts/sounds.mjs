// Krida's in-game sounds: congklak sound effects and short voice lines in
// Indonesian and English, made with ElevenLabs and cached in krida/audio/. export.mjs turns
// them into the app's files.
//   node krida/scripts/sounds.mjs [--dry-run] [--force]

import { dryRun, estimate, music, sfx, speak } from '../../shared/eleven.mjs'

const dir = new URL('../audio/', import.meta.url).pathname

// Gavrila, a native Indonesian voice from the library (as in Catat Saja's
// stories), used by id without adding it to the account.
const VOICE = 'gjhfBUoH6DHh0DG1X4u0'
// Cheerful arcade announcer (Modoo Marble / Line Get Rich vibe): expressive, bright, quick.
const VO_CHEER = { stability: 0.25, similarity_boost: 0.68, style: 0.85, speed: 1.15 }

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
  // Ular tangga: a wooden die on the wooden board, and a pawn hopping one square.
  die: {
    name: 'die',
    seconds: 0.5,
    model: MODEL,
    prompt:
      'One single small wooden dice hitting a hard wooden table once: a sharp, hollow, bright clack, close up, one hit only, no rolling, no reverb, no other sounds',
  },
  step: {
    name: 'step',
    seconds: 0.5,
    model: MODEL,
    prompt:
      'A small rounded wooden game pawn set down once on a soft cloth-covered wooden board: a short, low, muffled, gentle tok, close up, one touch only, no reverb, no other sounds',
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
  // Perang kapal: a peg on the ocean / a ship, and a sinking.
  miss: {
    name: 'miss',
    seconds: 0.7,
    model: MODEL,
    prompt:
      'A small wooden peg dropped once into shallow water: a short soft splash, close up, one drop only, no reverb, no voices, no music',
  },
  hit: {
    name: 'hit',
    seconds: 0.6,
    model: MODEL,
    prompt:
      'A small wooden peg striking a hollow wooden toy ship once: a sharp short knock, close up, one hit only, no reverb, no voices, no music',
  },
  sunk: {
    name: 'sunk',
    seconds: 1.2,
    model: MODEL,
    prompt:
      'A small wooden toy ship sinking into water: a deeper splash with a short bubbling trail, close up, satisfying, no reverb, no voices, no music',
  },
  // Werewolf: night fall and dawn — short atmosphere stingers, no voices.
  night: {
    name: 'night',
    seconds: 1.4,
    model: MODEL,
    prompt:
      'A short distant wolf howl at night over a quiet village, soft and atmospheric, one howl only, fades quickly, no other animals, no voices, no music',
  },
  dawn: {
    name: 'dawn',
    seconds: 1.2,
    model: MODEL,
    prompt:
      'A short warm morning village chime: two soft wooden bamboo notes rising gently like sunrise, pleasant mobile game dawn sting, no rooster, no voices, no music',
  },
}

// Spoken over the game: short, punchy, cheerful (board-game announcer).
export const lines = {
  your_turn: 'Giliranmu!',
  their_turn: 'Giliran lawan!',
  shoot: 'Tembak!',
  win: 'Kamu menang!',
  lose: 'Kamu kalah!',
  draw: 'Seri!',
  pick: 'Pilih bidakmu!',
  roll_again: 'Lempar lagi!',
  captured: 'Kena!',
  home: 'Masuk rumah!',
  ladder: 'Naik tangga!',
  snake: 'Digigit ular!',
  pass: 'Pas!',
  dice_off: 'Lempar dadu untuk urutan main!',
  place_ships: 'Seret kapal ke lautmu!',
  die_1: 'Satu!',
  die_2: 'Dua!',
  die_3: 'Tiga!',
  die_4: 'Empat!',
  die_5: 'Lima!',
  die_6: 'Enam!',
  miss: 'Meleset!',
  hit: 'Kena!',
  sunk: 'Kapal tenggelam!',
  // Werewolf phase calls (short arcade announcer).
  night: 'Malam!',
  dawn: 'Fajar!',
  peaceful: 'Malam tenang!',
  day: 'Siang!',
  vote: 'Voting!',
  election: 'Pemilihan!',
  town_win: 'Desa menang!',
  wolves_win: 'Serigala menang!',
  you_died: 'Kamu gugur!',
}

// The same lines for the English app, in the same voice so the game keeps
// one narrator. Exported as vo_<key>_en.
export const linesEn = {
  your_turn: 'Your turn!',
  their_turn: "Opponent's turn!",
  shoot: 'Shoot!',
  win: 'You win!',
  lose: 'You lose!',
  draw: "It's a draw!",
  pick: 'Pick a token!',
  roll_again: 'Roll again!',
  captured: 'Captured!',
  home: 'Home!',
  ladder: 'Up the ladder!',
  snake: 'Snake!',
  pass: 'Pass!',
  dice_off: 'Throw the die for the playing order!',
  place_ships: 'Drag ships onto your ocean!',
  die_1: 'One!',
  die_2: 'Two!',
  die_3: 'Three!',
  die_4: 'Four!',
  die_5: 'Five!',
  die_6: 'Six!',
  miss: 'Miss!',
  hit: 'Hit!',
  sunk: 'Ship sunk!',
  night: 'Night!',
  dawn: 'Dawn!',
  peaceful: 'Peaceful night!',
  day: 'Day!',
  vote: 'Vote!',
  election: 'Election!',
  town_win: 'Town wins!',
  wolves_win: 'Wolves win!',
  you_died: 'You died!',
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
    files[`vo_${key}`] = (await speak({ dir, lang: 'id', name: `vo-${key}`, text, voice: VOICE, settings: VO_CHEER })).file
  for (const [key, text] of Object.entries(linesEn))
    files[`vo_${key}_en`] = (await speak({ dir, lang: 'en', name: `vo-${key}-en`, text, voice: VOICE, settings: VO_CHEER })).file
  return files
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = await make()
  if (dryRun) await estimate()
  else for (const [key, file] of Object.entries(files)) console.log(key, file)
}
