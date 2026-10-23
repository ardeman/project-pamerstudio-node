// Bedug's notification sounds, made with ElevenLabs sound effects: the takes
// that were chosen, so a re-run finds them all cached. export.mjs turns them
// into the app's files.
//   node bedug/scripts/sounds.mjs [--dry-run] [--force]

import { dryRun, estimate, sfx } from '../../shared/eleven.mjs'

const dir = new URL('../audio/', import.meta.url).pathname

// iOS plays a notification sound only if it is under 30 seconds.
export const sounds = {
  // Single hits of a mosque bedug; export.mjs places them in the pattern,
  // since the model can't count strikes.
  clack: {
    name: 'bedug-clack',
    seconds: 1.5,
    take: 3,
    influence: 0.7,
    model: 'eleven_text_to_sound_v3',
    prompt:
      'One single hard knock of a thick wooden stick on a solid hollow wooden block, like a kentongan or temple block: a bright, dry, hollow woody tok, wood hitting wood, close up, one knock only, no metal, no drum skin, no reverb, no other sounds',
  },
  boom: {
    name: 'bedug-boom',
    seconds: 4,
    model: 'eleven_text_to_sound_v3',
    prompt:
      'One single deep booming hit on a huge Indonesian mosque bedug drum with a thick buffalo hide head, struck once with a padded wooden beater, low resonant boom with a long natural decay in a large mosque hall, one hit only, no other sounds',
  },
  siren: {
    name: 'siren',
    seconds: 10,
    prompt:
      'A long mechanical siren as Indonesian mosques sound it for imsak and iftar in Ramadan: a slow rising wail, a steady high tone, then falling away, heard across a town at night, no voices, no music',
  },
}

export const make = async () => {
  const files = {}
  for (const [key, sound] of Object.entries(sounds)) files[key] = await sfx({ dir, ...sound })
  return files
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const files = await make()
  if (dryRun) await estimate()
  else for (const [key, file] of Object.entries(files)) console.log(key, file)
}
