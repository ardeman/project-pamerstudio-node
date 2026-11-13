// Copies krida/out/*.m4a into the app's Android and iOS audio folders.
//   node krida/scripts/install-audio.mjs

import { cpSync, existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

import { app } from './app.mjs'

const out = new URL('../out/', import.meta.url).pathname
const targets = [
  join(app, 'androidApp/src/main/res/raw'),
  join(app, 'ios/Krida/Audio'),
]

if (!existsSync(out)) {
  console.error('No krida/out/ yet. Run: node krida/scripts/export.mjs')
  process.exit(1)
}

const files = readdirSync(out).filter((name) => name.endsWith('.m4a'))
if (!files.length) {
  console.error('krida/out/ has no .m4a files. Run: node krida/scripts/export.mjs')
  process.exit(1)
}

for (const dir of targets) {
  if (!existsSync(dir)) {
    console.error(`Missing app folder: ${dir}`)
    process.exit(1)
  }
  for (const name of files) {
    cpSync(join(out, name), join(dir, name))
    console.log(`${dir}/${name}`)
  }
}
console.log(`${files.length} files → ${targets.join(' and ')}`)
