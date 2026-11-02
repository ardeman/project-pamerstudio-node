// Renders the promo videos into cobalagi/out/ (free: the voices and music
// are the app's own clips). Usage, from this repo's root:
//   node cobalagi/scripts/render.mjs [short|short-2|promo|app-store|all] [live|soon]
// "live" (the default; Google Play since 2026-10-30) puts the Play link in
// the YouTube text, "soon" says it's coming.
import { spawnSync } from 'node:child_process'

const [which = 'all', store = 'live'] = process.argv.slice(2)
const scripts = { short: 'short-video.sh', 'short-2': 'short-video-2.sh', promo: 'promo-video.sh', 'app-store': 'app-store-video.sh' }
const picked = which === 'all' ? Object.values(scripts) : [scripts[which]]
if (picked.includes(undefined) || !['soon', 'live'].includes(store)) {
  console.error('Usage: node cobalagi/scripts/render.mjs [short|short-2|promo|app-store|all] [live|soon]')
  process.exit(64)
}
for (const script of picked) {
  const result = spawnSync('bash', [new URL(script, import.meta.url).pathname], {
    stdio: 'inherit',
    env: { ...process.env, STORE: store },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
