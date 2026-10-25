// Koba's lines that only the videos use (the app has none for that moment),
// in Koba's own voice and settings from the app's tool/elevenlabs.json, so
// they sound like the app's clips. The words are in koba-lines.json. Paid once per line through
// shared/eleven.mjs, then cached in cobalagi/audio/.
//   node cobalagi/scripts/koba-voice.mjs <lang> <line> [--dry-run]
// prints the clip, trimmed and as loud as the app's clips (like the app's
// tool/src/voice_files.dart), and its words go in the video's captions.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { dryRun, estimate, speak } from '../../shared/eleven.mjs'

const HERE = new URL('../', import.meta.url).pathname
const app = process.env.COBALAGI_APP ?? `${HERE}../../project_cobalagi_flutter`
const lines = JSON.parse(readFileSync(`${HERE}scripts/koba-lines.json`, 'utf8'))
const config = JSON.parse(readFileSync(`${app}/tool/elevenlabs.json`, 'utf8'))
const [lang, line] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const text = lines[line]?.[lang]
if (!text) {
  console.error(`Usage: node cobalagi/scripts/koba-voice.mjs <${Object.keys(lines.hook)}> <${Object.keys(lines).filter((k) => !k.startsWith('_'))}> [--dry-run]`)
  process.exit(1)
}
const koba = config.voices.koba[lang]
const { file } = await speak({
  dir: `${HERE}audio/${lang}`,
  lang,
  name: `koba-${line}`,
  text,
  voice: koba.voice_id,
  settings: koba.settings,
  model: koba.model_id ?? config.model_id,
})
if (dryRun) {
  await estimate()
} else {
  const out = file.replace(/\.mp3$/, '.even.mp3')
  if (!existsSync(out)) {
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-af',
      'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse,loudnorm=I=-16:TP=-1.5:LRA=11',
      '-ac', '1', '-ar', '22050', '-b:a', '64k', out])
  }
  console.log(out)
}
