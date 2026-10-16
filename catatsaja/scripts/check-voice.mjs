// Transcribes the voice-over clips in use with ElevenLabs Speech to Text, to
// check that a "c" is said "ch" ("cha-tat", not "katat"). Usage:
//   node scripts/check-voice.mjs [scenes] [ind|eng]   (default: the scenes with a "c" in Indonesian)

import { readFileSync } from 'node:fs'

import { speak } from '../../shared/eleven.mjs'
import { narration, spoken } from './narration.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const env = readFileSync(`${ROOT}../.env`, 'utf8')
const key = env.match(/^ELEVENLABS_API_KEY=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '')
const [scenes = 'opener|hook|brand|notes|charts|health|growth|share|private|cta', heardAs = 'ind'] = process.argv.slice(2)

for (const lang of ['en', 'id']) {
  for (const name of Object.keys(narration[lang]).filter((scene) => new RegExp(`^(${scenes})$`).test(scene))) {
    // The same call render.mjs makes, so this is the clip in use (cached).
    const { file } = await speak({ dir: `${ROOT}audio/${lang}`, lang, name, text: spoken(narration[lang][name], lang) })
    const form = new FormData()
    form.append('model_id', 'scribe_v1')
    form.append('language_code', heardAs)
    form.append('file', new Blob([readFileSync(file)], { type: 'audio/mpeg' }), 'clip.mp3')
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: { 'xi-api-key': key },
      body: form,
    })
    const { text } = await response.json()
    console.log(/\b(katat|kuma|kobain|keki?l|diba[kg]a|ba[kg]a\b|coba saja)/i.test(text) ? '✗' : '✓', lang, name, '→', text)
  }
}
