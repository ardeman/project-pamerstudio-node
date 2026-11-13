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

console.log('Editor → http://localhost:3456/  (Ctrl+C to stop)\n')
const result = spawnSync('npm', ['run', 'dev', '--', '-p', '3456'], {
  cwd: dir,
  stdio: 'inherit',
  shell: process.platform === 'win32',
})
process.exit(result.status ?? 1)
