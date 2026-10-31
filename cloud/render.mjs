// The render job's steps for a request from the web page (renders/<id> in
// Firestore). cloud/trigger starts the job with RENDER_ID and RENDER_STEP:
//   price   a paid action runs --dry-run and writes what it would buy; the
//           page's Approve sets the request to `approved`. A free action, or
//           one with everything cached, goes on to render.
//   render  runs it again with --dry-run first: if it would now cost more
//           than was approved, it asks again. Then it renders without
//           --force, puts the new files in Storage under renders/<id>/ and
//           the clips it bought back in inputs/.
// Statuses: requested → queued → pricing → priced → approved → queued →
// rendering → done, or failed with the error and the end of the log.
// Run it on the Mac (signed in with gcloud) with the same variables to test.

import { execFileSync, spawn } from 'node:child_process'
import { randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { relative } from 'node:path'

import { subscription } from '../shared/eleven.mjs'
import { balance as falBalance } from '../shared/fal.mjs'
import { commandOf } from './actions.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const PROJECT = 'pamer-studio'
const BUCKET = 'pamer-studio.firebasestorage.app'
const { RENDER_ID: id, RENDER_STEP: step } = process.env
const DOC = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/renders/${id}`
const TYPES = { mp4: 'video/mp4', png: 'image/png', jpg: 'image/jpeg', wav: 'audio/wav', srt: 'text/plain', txt: 'text/plain', md: 'text/markdown', json: 'application/json' }
const LOG_TAIL = 4000

const token = process.env.CLOUD_RUN_JOB
  ? (await (await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' } })).json()).access_token
  : execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
// The quota project is for the gcloud account only; the job's account bills
// the project it runs in.
const headers = { authorization: `Bearer ${token}`, ...(!process.env.CLOUD_RUN_JOB && { 'x-goog-user-project': PROJECT }) }

async function call(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${url.split('?')[0]}: ${res.status} ${await res.text()}`)
  return res.json()
}

// Firestore's REST API wraps every value in its type.
const toValue = (v) =>
  v === null || v === undefined ? { nullValue: null }
  : v instanceof Date ? { timestampValue: v.toISOString() }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : Array.isArray(v) ? { arrayValue: { values: v.map(toValue) } }
  : typeof v === 'object' ? { mapValue: { fields: toFields(v) } }
  : { stringValue: String(v) }
const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]))
const fromValue = (v) =>
  'stringValue' in v ? v.stringValue
  : 'booleanValue' in v ? v.booleanValue
  : 'integerValue' in v ? Number(v.integerValue)
  : 'doubleValue' in v ? v.doubleValue
  : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(fromValue)
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, f]) => [k, fromValue(f)]))
  : null

const update = (fields) => {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&')
  return call(`${DOC}?${mask}`, { method: 'PATCH', body: JSON.stringify({ fields: toFields({ ...fields, updatedAt: new Date() }) }) })
}

// Runs a command with its output in the job's log, and keeps the output.
let log = ''
function run(args) {
  console.log(`$ node ${args.join(' ')}`)
  return new Promise((resolve, reject) => {
    const child = spawn('node', args, { cwd: ROOT })
    let out = ''
    const keep = (stream) => (chunk) => {
      stream.write(chunk)
      out += chunk
      log = (log + chunk).slice(-LOG_TAIL)
    }
    child.stdout.on('data', keep(process.stdout))
    child.stderr.on('data', keep(process.stderr))
    child.on('close', (code) => (code === 0 ? resolve(out) : reject(new Error(`${args[0]} stopped (exit ${code})`))))
  })
}

// What a dry run would buy, from the line eleven.mjs and fal.mjs end it with
// (shared/cli.mjs reads the same line).
function priceOf(out) {
  const cost = out.match(/~(\d+)(\+?) credits for (\d+) new/) ?? out.match(/~\$([\d.]+)(\+?) for (\d+) new/)
  const line = out.trim().split('\n').pop()
  if (!cost) return { free: true, summary: line }
  return { free: false, amount: Number(cost[1]), unit: out.includes(' credits for ') ? 'credits' : 'dollars', unknown: cost[2] === '+', items: Number(cost[3]), summary: line, list: out.trim() }
}

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? (/frames$/.test(entry.name) ? [] : walk(`${dir}/${entry.name}`)) : [`${dir}/${entry.name}`],
  )

async function upload(name, file) {
  const downloadToken = randomUUID()
  const contentType = TYPES[file.split('.').pop()]
  const boundary = `pamer-${randomUUID()}`
  const meta = JSON.stringify({ name, contentType, metadata: { firebaseStorageDownloadTokens: downloadToken } })
  await call(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=multipart`, {
    method: 'POST',
    headers: { 'content-type': `multipart/related; boundary=${boundary}` },
    body: Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
      readFileSync(file),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
  })
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(name)}?alt=media&token=${downloadToken}`
}

// The files the render wrote, in Storage for the page to show.
async function publish(project, since) {
  const out = `${ROOT}${project}/out`
  const files = existsSync(out) ? walk(out).filter((f) => TYPES[f.split('.').pop()] && statSync(f).mtimeMs >= since).sort() : []
  const outputs = []
  for (const file of files) {
    const path = relative(`${ROOT}${project}`, file)
    outputs.push({ path, size: statSync(file).size, url: await upload(`renders/${id}/${path}`, file) })
  }
  return outputs
}

// Paid calls the render logged (eleven.mjs writes usage.jsonl), so the Mac's
// log can be told about them.
const usage = () =>
  existsSync(`${ROOT}usage.jsonl`) ? readFileSync(`${ROOT}usage.jsonl`, 'utf8').split('\n').filter(Boolean).map((line) => JSON.parse(line)) : []

async function main() {
  if (!id || !['price', 'render'].includes(step)) throw new Error('Set RENDER_ID and RENDER_STEP (price or render).')
  const doc = await call(DOC)
  const request = Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, fromValue(v)]))
  const action = await commandOf(request)
  await update({ status: step === 'price' && action.paid ? 'pricing' : 'rendering', error: null })
  await run(['cloud/inputs.mjs', 'pull', request.project, '--inputs'])

  if (action.paid) {
    const price = priceOf(await run([...action.command, '--dry-run']))
    const approved = step === 'render' && request.price
    const more = approved && !price.free && (price.unit !== approved.unit || price.amount > approved.amount || (price.unknown && !approved.unknown))
    if (!price.free && (step === 'price' || more)) {
      await update({ status: 'priced', price, ...(more && { error: 'It would cost more than was approved: check the new price.' }) })
      return
    }
    await update({ status: 'rendering', price })
  }

  const since = Date.now()
  await run(action.command)
  const outputs = await publish(request.project, since)
  await run(['cloud/inputs.mjs', 'push', request.project, '--caches'])
  await update({ status: 'done', outputs, usage: usage(), log, doneAt: new Date() })
}

// The credits and fal.ai balance left after the run, for the page's Dashboard tab (free to read).
async function balance() {
  const fields = { ...(await subscription()), checkedAt: new Date(), checkedBy: 'cloud render' }
  fields.resetsAt = new Date(fields.resetsAt)
  const fal = await falBalance().catch((error) => console.error(error.message))
  if (fal) Object.assign(fields, { falBalance: fal.balance, falCurrency: fal.currency, falCheckedAt: new Date(), falCheckedBy: 'cloud render' })
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&')
  await call(`${DOC.replace(/renders\/[^/]+$/, 'dashboard/account')}?${mask}`, { method: 'PATCH', body: JSON.stringify({ fields: toFields(fields) }) })
}

try {
  await main()
} catch (error) {
  console.error(error)
  await update({ status: 'failed', error: error.message, log }).catch(console.error)
  process.exitCode = 1
}
await balance().catch((error) => console.error('credits:', error.message))
