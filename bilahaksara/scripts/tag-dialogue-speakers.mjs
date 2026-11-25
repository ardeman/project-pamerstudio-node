// Write optional `speaker` into data/dialogue/*.json from VO line tags + prefix rules.
//   node bilahaksara/scripts/tag-dialogue-speakers.mjs [--dry-run]
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from './app.mjs'
import { resolveSpeaker } from './voices.mjs'

const dry = process.argv.includes('--dry-run')
const folder = join(app, 'data/dialogue')
let touched = 0

for (const name of readdirSync(folder)) {
  if (!name.endsWith('.json')) continue
  const path = join(folder, name)
  const data = JSON.parse(readFileSync(path, 'utf8'))
  const lines = data.lines ?? {}
  let fileTouched = false
  for (const [key, entry] of Object.entries(lines)) {
    if (!entry || typeof entry !== 'object') continue
    const speaker = resolveSpeaker(key, entry)
    if (entry.speaker === speaker) continue
    entry.speaker = speaker
    fileTouched = true
    touched += 1
  }
  if (fileTouched && !dry) {
    writeFileSync(path, `${JSON.stringify(data, null, '\t')}\n`)
    console.log('updated', name)
  }
}
console.log(dry ? `would tag ${touched} lines` : `tagged ${touched} lines`)