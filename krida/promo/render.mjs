// Runs promo-video.sh (gameplay clips → out/promo). Free while clips + promo BGM exist.
//   node krida/promo/render.mjs [en|id|all]
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const which = process.argv[2] ?? 'all'
if (!['en', 'id', 'all'].includes(which)) {
  console.error('Usage: node krida/promo/render.mjs [en|id|all]')
  process.exit(64)
}
const sh = fileURLToPath(new URL('./promo-video.sh', import.meta.url))
const result = spawnSync('bash', [sh, which], { stdio: 'inherit' })
process.exit(result.status ?? 1)
