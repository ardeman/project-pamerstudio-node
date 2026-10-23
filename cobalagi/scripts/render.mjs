// Renders the promo videos into cobalagi/out/ (free: the voices and music
// are the app's own clips). Usage, from this repo's root:
//   node cobalagi/scripts/render.mjs [short|promo|app-store|all] [soon|live]
// "live" once the app is public on Google Play (the store end card and link).
import { spawnSync } from 'node:child_process'

const [which = 'all', store = 'soon'] = process.argv.slice(2)
const scripts = { short: 'short-video.sh', promo: 'promo-video.sh', 'app-store': 'app-store-video.sh' }
const picked = which === 'all' ? Object.values(scripts) : [scripts[which]]
if (picked.includes(undefined) || !['soon', 'live'].includes(store)) {
  console.error('Usage: node cobalagi/scripts/render.mjs [short|promo|app-store|all] [soon|live]')
  process.exit(64)
}
for (const script of picked) {
  const result = spawnSync('bash', [new URL(script, import.meta.url).pathname], {
    stdio: 'inherit',
    env: { ...process.env, STORE: store },
  })
  if (result.status !== 0) process.exit(result.status ?? 1)
}
