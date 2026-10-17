// A story's person saying their line in their place, made by Kling AI Avatar
// on fal.ai from the scene's first frame (first-frame.mjs, run it first) and
// the line's voice clip, so the lips follow the voice. Paid per second:
// run with --dry-run for the price. Cached in ../art like the pictures.
//   node scripts/avatar.mjs [story] [scene number, from 1] [--dry-run]

import { existsSync } from 'node:fs'

import { dryRun, estimate, video } from '../../shared/fal.mjs'
import { speak } from '../../shared/eleven.mjs'
import { cast, stories } from './stories.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const [name = 'hendra', number = '1'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const scene = stories[name].scenes[Number(number) - 1]
const lang = 'id'
const frame = `${ROOT}out/stories/first-frames/${name}-${number}.png`
if (!existsSync(frame)) throw new Error(`No first frame yet: node scripts/first-frame.mjs ${name} ${number}`)

// The line as the short says it (render-stories.mjs `say`): already voiced,
// so this costs no credits.
const [who, , text] = scene.lines[0]
const clip = await speak({ dir: `${ROOT}audio/stories/${lang}`, lang, name: `${name}-${number}-0`, text, voice: cast[who].voice[lang] })
if (!clip.file) throw new Error('The line has no voice clip yet: render the short first.')

const path = await video({
  dir: `${ROOT}art`,
  project: 'catatsaja',
  name: `${name}-${number}-avatar`,
  model: 'fal-ai/kling-video/v1/standard/ai-avatar',
  input: {
    prompt: 'A flat 2D cartoon shopkeeper talks warmly to the camera behind his shop counter, small natural head movements and blinks. Keep the flat drawn style, the colours and the static camera; the boxes, receipts and shelves stay still.',
  },
  files: { image_url: frame, audio_url: clip.file },
  seconds: clip.length,
})
if (dryRun) estimate()
else console.log(path)
