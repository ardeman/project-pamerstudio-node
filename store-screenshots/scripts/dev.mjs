// Starts the shared store-screenshots editor on :3456.
//   node store-screenshots/scripts/dev.mjs

import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('..', import.meta.url))
if (!existsSync(`${dir}/package.json`)) {
  console.error('Missing store-screenshots/package.json. Scaffold with the app-store-screenshots skill.')
  process.exit(1)
}

console.log('Editor → http://127.0.0.1:3456/  (Ctrl+C to stop)')
console.log('Tip: npm run studio  → web + this editor, Screenshots tab embeds it\n')
const result = spawnSync('npm', ['run', 'dev', '--', '-p', '3456', '-H', '127.0.0.1'], {
  cwd: dir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
