// Promo narrator lines → krida/audio/promo/<lang>/. Free with --dry-run.
// Beats that land in the sneak peek (no unused brand line).
//   node krida/promo/voice.mjs [--dry-run] [--force]
import { mkdirSync } from 'node:fs'
import { dryRun, estimate, speak } from '../../shared/eleven.mjs'
import { narration, spoken } from './narration.mjs'

const BEATS = ['hook', 'board', 'nearby', 'games', 'cta']
const ROOT = new URL('../audio/promo/', import.meta.url).pathname

for (const lang of ['en', 'id']) {
  const dir = `${ROOT}${lang}`
  mkdirSync(dir, { recursive: true })
  for (const beat of BEATS) {
    const text = spoken(narration[lang][beat], lang)
    await speak({ dir, lang, name: beat, text })
  }
}

if (dryRun) {
  await estimate()
  process.exit(0)
}

await estimate()
console.log('Voice clips ready under krida/audio/promo/. Wire them into the render next.')
