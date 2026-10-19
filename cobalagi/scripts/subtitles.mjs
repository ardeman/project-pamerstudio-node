// Writes a video's subtitles (SubRip, .srt) from its narration: the words of
// each voice clip, from the app's ARB file, at the time the clip plays.
// Called by lib.sh when it finishes a video:
//   node cobalagi/scripts/subtitles.mjs <out.srt> <start|seconds|lang|clipId>...
// A clip id is snake_case and its words are under the camelCase ARB key
// (tutorial_loops → tutorialLoops), as in the app's VoiceClips.
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { app } from './app.mjs'

// Longest subtitle line, in characters; two lines per cue at most.
const lineLength = 42

const [out, ...entries] = process.argv.slice(2)
if (!out) {
  console.error('Usage: node cobalagi/scripts/subtitles.mjs <out.srt> <start|seconds|lang|clipId>...')
  process.exit(64)
}

const cues = []
for (const entry of entries) {
  const [start, seconds, lang, clip] = entry.split('|')
  const arb = JSON.parse(readFileSync(resolve(app, `lib/app/l10n/app_${lang}.arb`), 'utf8'))
  const key = clip.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
  const text = arb[key]
  if (text == null) throw new Error(`No "${key}" in app_${lang}.arb`)
  cues.push(...split(text, Number(start), Number(seconds)))
}
writeFileSync(out, cues.map(([from, to, text], i) => `${i + 1}\n${time(from)} --> ${time(to)}\n${text}\n\n`).join(''))

// Splits text into cues of at most two short lines, sharing the clip's
// seconds by their length.
function split(text, start, seconds) {
  const chunks = []
  for (const sentence of text.split(/(?<=[.!?])\s+/)) {
    const lines = wrap(sentence)
    for (let i = 0; i < lines.length; i += 2) chunks.push(lines.slice(i, i + 2).join('\n'))
  }
  const total = chunks.reduce((sum, c) => sum + c.length, 0)
  let at = start
  return chunks.map((chunk) => [at, (at += (seconds * chunk.length) / total), chunk])
}

function wrap(sentence) {
  const lines = []
  let line = ''
  for (const word of sentence.split(' ')) {
    if (line && line.length + 1 + word.length > lineLength) {
      lines.push(line)
      line = word
    } else {
      line = line ? `${line} ${word}` : word
    }
  }
  if (line) lines.push(line)
  return lines
}

function time(seconds) {
  const ms = Math.round(seconds * 1000)
  const two = (n) => String(n).padStart(2, '0')
  return `${two(Math.floor(ms / 3600000))}:${two(Math.floor(ms / 60000) % 60)}:` +
    `${two(Math.floor(ms / 1000) % 60)},${String(ms % 1000).padStart(3, '0')}`
}
