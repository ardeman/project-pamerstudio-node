// fal.ai helpers shared by every project in this folder: generated pictures,
// cached in the caller's folder so a re-render costs nothing (a file is named
// after what made it, so a changed prompt or setting is generated again).
// Settings come from ../.env:
//   FAL_API_KEY  required
// Every paid call is logged to ../fal-usage.jsonl (apart from usage.jsonl,
// which the dashboard reads as ElevenLabs credits). With --dry-run nothing is
// bought: missing pictures are collected for estimate(), priced by fal's own
// pricing API.

import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { appendFile, mkdir, writeFile } from 'node:fs/promises'

const ROOT = new URL('../', import.meta.url).pathname
const envFile = `${ROOT}.env`
const usageFile = `${ROOT}fal-usage.jsonl`
export const dryRun = process.argv.includes('--dry-run')
const env = Object.fromEntries(
  existsSync(envFile)
    ? readFileSync(envFile, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const at = line.indexOf('=')
          return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, '')]
        })
    : [],
)
const key = env.FAL_API_KEY ?? process.env.FAL_API_KEY
const headers = () => {
  if (!key) throw new Error('FAL_API_KEY is missing from ai-generated-content/.env')
  return { Authorization: `Key ${key}`, 'Content-Type': 'application/json' }
}

// Price of one picture in USD. Recraft's vector styles cost twice its listed
// price (fal's model page), so they are estimated at that.
const prices = {}
const price = async (model, input) => {
  if (!(model in prices)) {
    const response = await fetch(`https://api.fal.ai/v1/models/pricing?endpoint_id=${encodeURIComponent(model)}`, { headers: headers() })
    const [p] = response.ok ? (await response.json()).prices : []
    prices[model] = p?.unit === 'images' ? p.unit_price : undefined
  }
  const each = prices[model]
  return each && (String(input.style ?? '').startsWith('vector') ? each * 2 : each)
}

const pending = []
export const estimate = () => {
  for (const p of pending) console.log('picture', p.name, p.model, p.usd ? `~$${p.usd.toFixed(2)}` : 'cost unknown')
  const total = pending.reduce((sum, p) => sum + (p.usd ?? 0), 0)
  const unknown = pending.some((p) => !p.usd)
  console.log(pending.length ? `~$${total.toFixed(2)}${unknown ? '+' : ''} for ${pending.length} new` : 'Everything is cached: free.')
  return { pending, total }
}

const extension = (type) => ({ 'image/svg+xml': 'svg', 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' })[type] ?? 'bin'

// One picture from `model` with `input`, saved as <dir>/<name>-<hash>.<ext>;
// returns its path, or undefined in a dry run when it isn't cached yet.
export const picture = async ({ dir, project, name, model, input }) => {
  const hash = createHash('sha256').update(JSON.stringify([model, input])).digest('hex').slice(0, 10)
  const stem = `${name}-${hash}.`
  const cached = existsSync(dir) && readdirSync(dir).find((file) => file.startsWith(stem))
  if (cached) return `${dir}/${cached}`
  const usd = await price(model, input)
  if (dryRun) {
    pending.push({ name, model, usd })
    return
  }
  const response = await fetch(`https://fal.run/${model}`, { method: 'POST', headers: headers(), body: JSON.stringify(input) })
  if (!response.ok) throw new Error(`fal ${model}: ${response.status} ${await response.text()}`)
  const [image] = (await response.json()).images
  const file = await fetch(image.url)
  const path = `${dir}/${stem}${extension(image.content_type ?? file.headers.get('content-type'))}`
  await mkdir(dir, { recursive: true })
  await writeFile(path, Buffer.from(await file.arrayBuffer()))
  await appendFile(usageFile, `${JSON.stringify({ at: new Date().toISOString(), project, kind: 'picture', name, model, usd })}\n`)
  return path
}
