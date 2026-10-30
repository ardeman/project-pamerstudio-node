// Syncs what the renders read with Storage (inputs/ in the pamer-studio
// bucket), so the render job has it and a cloud render buys nothing a Mac
// render already bought. Usage:
//   node cloud/inputs.mjs push [project...] [--caches] [--dry-run]   # here → Storage
//   node cloud/inputs.mjs pull [project...] [--inputs] [--dry-run]   # Storage → here
// Caches (paid clips, tracks and pictures) are named by what made them and
// never change, so both sides only add the files the other lacks; nothing is
// deleted. Inputs (captured screens, files from the app repos) go one way:
// push makes Storage match the Mac, skipping any that aren't on this machine.
// The job runs `pull --inputs` before a render and `push --caches` after it.
// On the Mac it signs in as the gcloud account; on Cloud Run as the job's
// service account.

import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'

const ROOT = new URL('../', import.meta.url).pathname
const PROJECT = 'pamer-studio'
const BUCKET = 'pamer-studio.firebasestorage.app'
const API = `https://storage.googleapis.com/storage/v1/b/${BUCKET}/o`

// Paths in each repo: this one ('studio') or an app repo next to it. The
// App Store video's frames (iphone-*, ipad-*) and Apple's bezels stay on the
// Mac: the bezels' license allows them only in App Store material.
const INPUTS = {
  bedug: [{ repo: 'studio', path: 'bedug/audio', cache: true }],
  catatsaja: [
    { repo: 'studio', path: 'catatsaja/audio', cache: true },
    { repo: 'studio', path: 'catatsaja/art', cache: true },
    { repo: 'studio', path: 'catatsaja/shots' },
    { repo: 'project-catatsaja-reactrouter', path: 'public/apple-touch-icon.png' },
  ],
  cobalagi: [
    { repo: 'studio', path: 'cobalagi/audio', cache: true },
    ...['pubspec.yaml', 'branding/icon.svg', 'tool/elevenlabs.json', 'assets/audio', 'website/screenshots'].map((path) => ({ repo: 'project_cobalagi_flutter', path })),
    { repo: 'project_cobalagi_flutter', path: 'lib/app/l10n', only: /\.arb$/ },
    { repo: 'project_cobalagi_flutter', path: 'tool/screenshots/out/video', skip: /^ip(hone|ad)-/ },
  ],
}

const [command, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((a) => a.startsWith('--')))
const named = rest.filter((a) => !a.startsWith('--'))
const dryRun = flags.has('--dry-run')
const unknown = named.filter((n) => !INPUTS[n])
if (unknown.length) throw new Error(`No inputs for: ${unknown.join(', ')} (have: ${Object.keys(INPUTS).join(', ')})`)
const projects = named.length ? named : Object.keys(INPUTS)

const token = process.env.CLOUD_RUN_JOB
  ? (await (await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' } })).json()).access_token
  : execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
const headers = { authorization: `Bearer ${token}`, 'x-goog-user-project': PROJECT }

async function call(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${url.split('?')[0]}: ${res.status} ${await res.text()}`)
  return res
}

async function listObjects(prefix) {
  const objects = new Map()
  let page = ''
  do {
    const res = await (await call(`${API}?prefix=${encodeURIComponent(prefix)}&fields=items(name,md5Hash,size,metadata),nextPageToken${page ? `&pageToken=${page}` : ''}`)).json()
    for (const o of res.items ?? []) objects.set(o.name, o)
    page = res.nextPageToken
  } while (page)
  return objects
}

// With the file's modification time: Catat Saja picks the newest avatar clip by it.
async function upload(name, file) {
  const boundary = `pamer-${randomUUID()}`
  const meta = JSON.stringify({ name, contentType: 'application/octet-stream', metadata: { mtime: String(Math.round(statSync(file).mtimeMs)) } })
  await call(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=multipart`, {
    method: 'POST',
    headers: { 'content-type': `multipart/related; boundary=${boundary}` },
    body: Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`),
      readFileSync(file),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]),
  })
}

// Thousands of small frames: send a few at a time instead of one by one.
async function pool(items, run, size = 16) {
  let next = 0
  await Promise.all(Array.from({ length: size }, async () => {
    while (next < items.length) await run(items[next++])
  }))
}

const local = (repo, path) => (repo === 'studio' ? `${ROOT}${path}` : `${ROOT}../${repo}/${path}`)
const walk = (path) => (statSync(path).isDirectory() ? readdirSync(path).filter((f) => f !== '.DS_Store').flatMap((f) => walk(`${path}/${f}`)) : [path])
const md5 = (file) => createHash('md5').update(readFileSync(file)).digest('base64')
const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`
const wanted = (entry, name) => (!entry.only || entry.only.test(name)) && !entry.skip?.test(name)

// Storage names this machine's files would have, with their local paths.
function localFiles(entry) {
  const base = local(entry.repo, entry.path)
  const prefix = `inputs/${entry.repo}/${entry.path}`
  if (!existsSync(base)) return null
  const files = statSync(base).isDirectory() ? walk(base) : [base]
  return new Map(files.filter((f) => wanted(entry, f.split('/').pop())).map((f) => [prefix + f.slice(base.length), f]))
}

async function push(id) {
  for (const entry of INPUTS[id].filter((e) => e.cache || !flags.has('--caches'))) {
    const label = `${entry.repo}/${entry.path}`
    const files = localFiles(entry)
    if (!files) {
      console.log(`${id}: ${label} isn't on this machine, skipped`)
      continue
    }
    const remote = await listObjects(`inputs/${entry.repo}/${entry.path}`)
    const send = [...files].filter(([name, file]) => !remote.has(name) || (!entry.cache && remote.get(name).md5Hash !== md5(file)))
    const stale = entry.cache ? [] : [...remote.keys()].filter((name) => !files.has(name))
    const bytes = send.reduce((sum, [, file]) => sum + statSync(file).size, 0)
    console.log(`${id}: ${label}: ${files.size} files, ${send.length} ${dryRun ? 'to upload' : 'uploaded'} (${mb(bytes)})${stale.length ? `, ${stale.length} ${dryRun ? 'to delete' : 'deleted'}` : ''}`)
    if (dryRun) continue
    await pool(send, ([name, file]) => upload(name, file))
    await pool(stale, (name) => call(`${API}/${encodeURIComponent(name)}`, { method: 'DELETE' }))
  }
}

async function pull(id) {
  for (const entry of INPUTS[id].filter((e) => e.cache || flags.has('--inputs'))) {
    const label = `${entry.repo}/${entry.path}`
    const prefix = `inputs/${entry.repo}/${entry.path}`
    const remote = await listObjects(prefix)
    const files = localFiles(entry) ?? new Map()
    const get = [...remote.values()].filter((o) => !files.has(o.name) || (!entry.cache && o.md5Hash !== md5(files.get(o.name))))
    const bytes = get.reduce((sum, o) => sum + Number(o.size), 0)
    console.log(`${id}: ${label}: ${remote.size} in Storage, ${get.length} ${dryRun ? 'to download' : 'downloaded'} (${mb(bytes)})`)
    if (dryRun) continue
    await pool(get, async (o) => {
      const file = local(entry.repo, entry.path) + o.name.slice(prefix.length)
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, Buffer.from(await (await call(`${API}/${encodeURIComponent(o.name)}?alt=media`)).arrayBuffer()))
      if (o.metadata?.mtime) utimesSync(file, new Date(), new Date(Number(o.metadata.mtime)))
    })
  }
}

if (command === 'push') for (const id of projects) await push(id)
else if (command === 'pull') for (const id of projects) await pull(id)
else {
  console.log('Usage: node cloud/inputs.mjs push|pull [project...] [--caches|--inputs] [--dry-run]')
  process.exitCode = 1
}
