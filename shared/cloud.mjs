// Puts each project's marketing plan and finished media on Pamer Studio
// (https://pamer-studio.web.app), and brings plan edits made there back. Usage:
//   node shared/cloud.mjs push [project...] [--dry-run] [--force]
//   node shared/cloud.mjs pull [project...] [--force]
//   node shared/cloud.mjs account        the Dashboard tab's credits and paid calls only
// It signs in as the gcloud account (`gcloud auth login`), so no key is stored.
// Media uploads only what changed (by MD5) and deletes cloud files that are gone
// here, so Storage holds only what out/ has. A plan edited on the web is never overwritten without --force.
// A project with a posting calendar (calendar.json and scripts/posting.mjs) also
// gets its posts, one document each; pull brings back what was marked posted
// or approved on the web. A post marked posted here stays posted.
// Firestore holds the plans: marketing-plan.md is a local copy that git ignores,
// written by pull (also when it's missing). A plan that a push or a web save
// replaces is kept in projects/<id>/versions, in place of git's history.

import { execFileSync } from 'node:child_process'
import { createHash, randomUUID } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { relative } from 'node:path'

import { cloudActions } from '../cloud/actions.mjs'
import { subscription, usage } from './eleven.mjs'
import { balance as falBalance } from './fal.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const PROJECT = 'pamer-studio'
const BUCKET = 'pamer-studio.firebasestorage.app'
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const PLAN = 'marketing-plan.md'

// What gets pushed from out/: the finished files, not the stills and frames
// that are only there to check a render.
const TYPES = { mp4: 'video', jpg: 'image', wav: 'audio', srt: 'text', txt: 'text', md: 'text' }
const MIME = { mp4: 'video/mp4', jpg: 'image/jpeg', wav: 'audio/wav', srt: 'text/plain', txt: 'text/plain', md: 'text/markdown' }
const SKIP = /^(stills|.*frames)$/
const INLINE_TEXT = 50_000

const [command, ...rest] = process.argv.slice(2)
const flags = new Set(rest.filter((a) => a.startsWith('--')))
const named = rest.filter((a) => !a.startsWith('--'))
const dryRun = flags.has('--dry-run')
const force = flags.has('--force')

const token = execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
const headers = { authorization: `Bearer ${token}`, 'x-goog-user-project': PROJECT }

async function call(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  if (res.status === 404 && (options.method ?? 'GET') === 'GET') return null
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${url.split('?')[0]}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

// Firestore's REST API wraps every value in its type.
const toValue = (v) =>
  v === null || v === undefined ? { nullValue: null }
  : v instanceof Date ? { timestampValue: v.toISOString() }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? { integerValue: String(Math.round(v)) }
  : Array.isArray(v) ? { arrayValue: { values: v.map(toValue) } }
  : typeof v === 'object' ? { mapValue: { fields: toFields(v) } }
  : { stringValue: String(v) }
const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]))
const fromValue = (v) =>
  'stringValue' in v ? v.stringValue
  : 'booleanValue' in v ? v.booleanValue
  : 'integerValue' in v ? Number(v.integerValue)
  : 'timestampValue' in v ? v.timestampValue
  : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(fromValue)
  : 'mapValue' in v ? fromFields(v.mapValue.fields ?? {})
  : null
const fromFields = (f) => Object.fromEntries(Object.entries(f).map(([k, v]) => [k, fromValue(v)]))

const getDoc = async (id) => {
  const doc = await call(`${DOCS}/projects/${id}`)
  return doc ? fromFields(doc.fields ?? {}) : null
}
const setFields = (id, fields) => {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&')
  return call(`${DOCS}/projects/${id}?${mask}`, { method: 'PATCH', body: JSON.stringify({ fields: toFields(fields) }) })
}
// The plan a save replaces, so the web page can show and restore it.
const saveVersion = (id, plan, by) =>
  call(`${DOCS}/projects/${id}/versions`, { method: 'POST', body: JSON.stringify({ fields: toFields({ plan, by, savedAt: new Date() }) }) })
const listPosts = async (id) => {
  const res = await call(`${DOCS}/projects/${id}/posts?pageSize=300`)
  return new Map((res?.documents ?? []).map((d) => [d.name.split('/').pop(), fromFields(d.fields ?? {})]))
}

const sha = (text) => createHash('sha1').update(text).digest('hex')
const mb = (bytes) => `${(bytes / 1e6).toFixed(1)} MB`

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? (SKIP.test(entry.name) ? [] : walk(`${dir}/${entry.name}`)) : [`${dir}/${entry.name}`],
  )

const allProjects = readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && [PLAN, 'out', 'calendar.json'].some((f) => existsSync(`${ROOT}${e.name}/${f}`)))
  .map((e) => e.name)
const unknown = named.filter((n) => !allProjects.includes(n))
if (unknown.length) throw new Error(`No such project: ${unknown.join(', ')} (have: ${allProjects.join(', ')})`)
const projects = named.length ? named : allProjects

const objectUrl = (name, downloadToken) =>
  `https://firebasestorage.googleapis.com/v0/b/${BUCKET}/o/${encodeURIComponent(name)}?alt=media&token=${downloadToken}`

async function listObjects(prefix) {
  const objects = new Map()
  let page = ''
  do {
    const res = await call(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o?prefix=${encodeURIComponent(prefix)}&fields=items(name,md5Hash,metadata),nextPageToken${page ? `&pageToken=${page}` : ''}`)
    for (const o of res?.items ?? []) objects.set(o.name, o)
    page = res?.nextPageToken
  } while (page)
  return objects
}

async function upload(name, data, contentType, downloadToken) {
  const boundary = `pamer-${randomUUID()}`
  const meta = JSON.stringify({ name, contentType, metadata: { firebaseStorageDownloadTokens: downloadToken } })
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`),
    data,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ])
  await call(`https://storage.googleapis.com/upload/storage/v1/b/${BUCKET}/o?uploadType=multipart`, {
    method: 'POST',
    headers: { 'content-type': `multipart/related; boundary=${boundary}` },
    body,
  })
}

async function pushPlan(id, remote) {
  const file = `${ROOT}${id}/${PLAN}`
  if (!existsSync(file)) return {}
  const plan = readFileSync(file, 'utf8')
  const name = plan.match(/^# (.*?)( marketing plan)?$/m)?.[1] ?? id
  if (remote?.plan === plan) {
    console.log(`${id}: plan unchanged`)
    return remote.editedOnWeb ? { editedOnWeb: false, planHash: sha(plan) } : {}
  }
  if (remote?.editedOnWeb && !force) {
    throw new Error(`${id}: the plan was changed on the web. Run \`node shared/cloud.mjs pull ${id}\` first, or push with --force to overwrite it.`)
  }
  console.log(`${id}: plan ${dryRun ? 'would be ' : ''}pushed`)
  if (remote?.plan && !dryRun) await saveVersion(id, remote.plan, 'Mac')
  return { name, plan, planHash: sha(plan), editedOnWeb: false, updatedAt: new Date() }
}

async function pushMedia(id) {
  if (!existsSync(`${ROOT}${id}/out`)) return {}
  const prefix = `media/${id}/`
  const remote = await listObjects(prefix)
  const files = walk(`${ROOT}${id}/out`).filter((f) => TYPES[f.split('.').pop()]).sort()
  const media = []
  let sent = 0
  let bytes = 0
  for (const file of files) {
    const ext = file.split('.').pop()
    const path = relative(`${ROOT}${id}`, file)
    const name = `${prefix}${path}`
    const data = readFileSync(file)
    const md5 = createHash('md5').update(data).digest('base64')
    let downloadToken = remote.get(name)?.md5Hash === md5 && remote.get(name)?.metadata?.firebaseStorageDownloadTokens?.split(',')[0]
    if (!downloadToken) {
      downloadToken = randomUUID()
      sent++
      bytes += data.length
      if (dryRun) console.log(`  would upload ${path} (${mb(data.length)})`)
      else {
        process.stdout.write(`  ${path} (${mb(data.length)})… `)
        await upload(name, data, MIME[ext], downloadToken)
        console.log('done')
      }
    }
    const entry = { path, type: TYPES[ext], size: statSync(file).size, url: objectUrl(name, downloadToken) }
    if (TYPES[ext] === 'text' && data.length <= INLINE_TEXT) entry.text = data.toString('utf8')
    media.push(entry)
  }
  const local = new Set(media.map((m) => `${prefix}${m.path}`))
  const stale = [...remote.keys()].filter((name) => !local.has(name))
  console.log(`${id}: ${files.length} media files, ${sent} ${dryRun ? 'to upload' : 'uploaded'} (${mb(bytes)})`)
  for (const name of stale) {
    if (dryRun) console.log(`  would delete ${name}`)
    else await call(`https://storage.googleapis.com/storage/v1/b/${BUCKET}/o/${encodeURIComponent(name)}`, { method: 'DELETE' })
  }
  if (stale.length) console.log(`${id}: ${stale.length} cloud files ${dryRun ? 'to delete' : 'deleted'}`)
  return { media, mediaAt: new Date() }
}

// The project's posting helpers, or null when it has no calendar.
const postingOf = async (id) => {
  const file = `${ROOT}${id}/scripts/posting.mjs`
  return existsSync(`${ROOT}${id}/calendar.json`) && existsSync(file) ? import(file) : null
}

async function pushPosts(id) {
  const posting = await postingOf(id)
  if (!posting) return
  const posts = posting.cloudPosts()
  const remote = await listPosts(id)
  let sent = 0
  for (const [postId, post] of posts) {
    const { posted, ...content } = post
    const was = remote.get(postId)
    const hash = sha(JSON.stringify(content))
    const fields = { ...content, hash, updatedAt: new Date() }
    if (posted && was?.posted !== posted) fields.posted = posted
    else if (was?.hash === hash) continue
    if (!was) Object.assign(fields, { posted: posted ?? null, approved: null })
    sent++
    if (dryRun) console.log(`  would push post ${postId}`)
    else {
      const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&')
      await call(`${DOCS}/projects/${id}/posts/${postId}?${mask}`, { method: 'PATCH', body: JSON.stringify({ fields: toFields(fields) }) })
    }
  }
  const stale = [...remote.keys()].filter((postId) => !posts.some(([p]) => p === postId))
  for (const postId of stale) {
    if (dryRun) console.log(`  would delete post ${postId}`)
    else await call(`${DOCS}/projects/${id}/posts/${postId}`, { method: 'DELETE' })
  }
  const webOnly = posts.filter(([postId, post]) => !post.posted && remote.get(postId)?.posted).map(([postId]) => postId)
  console.log(`${id}: ${posts.length} posts, ${sent} ${dryRun ? 'to push' : 'pushed'}${stale.length ? `, ${stale.length} ${dryRun ? 'to delete' : 'deleted'}` : ''}`)
  if (webOnly.length) console.log(`${id}: marked posted on the web, pull to bring it here: ${webOnly.join(', ')}`)
}

async function push(id) {
  const remote = await getDoc(id)
  // What the Render tab may ask the render job for (cloud/actions.mjs).
  const fields = { ...(await pushPlan(id, remote)), ...(await pushMedia(id)), renders: await cloudActions(id) }
  if (!remote && !fields.name) fields.name = id
  if (!dryRun && Object.keys(fields).length) await setFields(id, fields)
  await pushPosts(id)
}

async function pullPosts(id) {
  const posting = await postingOf(id)
  if (!posting) return
  const calendar = posting.readCalendar()
  const remote = await listPosts(id)
  const changes = []
  for (const entry of calendar.entries) {
    const post = remote.get(entry.id)
    if (!post) continue
    if (post.posted && !entry.posted) {
      entry.posted = post.posted
      changes.push(`${entry.id} posted ${post.posted}`)
    }
    if ((post.approved ?? null) !== (entry.approved ?? null)) {
      entry.approved = post.approved ?? null
      changes.push(`${entry.id} ${post.approved ? 'approved' : 'no longer approved'}`)
    }
  }
  if (changes.length) posting.writeCalendar(calendar)
  console.log(`${id}: ${changes.length ? `calendar.json: ${changes.join(', ')}` : 'posts already the same'}`)
}

async function pull(id) {
  await pullPlan(id)
  await pullPosts(id)
}

async function pullPlan(id) {
  const remote = await getDoc(id)
  const file = `${ROOT}${id}/${PLAN}`
  if (!remote?.plan) return console.log(`${id}: no plan on the web`)
  const local = existsSync(file) ? readFileSync(file, 'utf8') : ''
  if (local === remote.plan) {
    if (remote.editedOnWeb) await setFields(id, { editedOnWeb: false, planHash: sha(local) })
    return console.log(`${id}: plan already the same`)
  }
  if (!remote.editedOnWeb && local) return console.log(`${id}: not changed on the web; the file here is newer, push it`)
  // Both sides changed since the last push or pull: don't lose the Mac's edits.
  if (local && sha(local) !== remote.planHash && !force) {
    throw new Error(`${id}: the plan changed both here and on the web. Merge by hand, or pull with --force to take the web's version.`)
  }
  writeFileSync(file, remote.plan)
  await setFields(id, { editedOnWeb: false, planHash: sha(remote.plan) })
  console.log(`${id}: pulled the web's plan into ${id}/${PLAN}`)
}

// The ElevenLabs credits, usage.jsonl's paid calls and the fal.ai balance for the
// Dashboard tab: the page can't hold the keys, so the Mac reads them (free) on every push.
async function pushAccount() {
  let account
  try {
    account = await subscription()
  } catch (error) {
    return console.log(`credits: ${error.message}`)
  }
  const fields = { ...account, resetsAt: new Date(account.resetsAt), checkedAt: new Date(), checkedBy: 'Mac', usage: usage().slice(-200) }
  console.log(`credits: ${account.limit - account.used} of ${account.limit} left, ${fields.usage.length} paid calls${dryRun ? ' (not pushed)' : ''}`)
  try {
    const fal = await falBalance()
    Object.assign(fields, { falBalance: fal.balance, falCurrency: fal.currency, falCheckedAt: new Date(), falCheckedBy: 'Mac' })
    console.log(`fal.ai: $${fal.balance.toFixed(2)} left`)
  } catch (error) {
    console.log(error.message)
  }
  if (dryRun) return
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&')
  await call(`${DOCS}/dashboard/account?${mask}`, { method: 'PATCH', body: JSON.stringify({ fields: toFields(fields) }) })
}

if (command === 'push') {
  for (const id of projects) await push(id)
  await pushAccount()
} else if (command === 'pull') for (const id of projects) await pull(id)
else if (command === 'account') await pushAccount()
else {
  console.log('Usage: node shared/cloud.mjs push|pull [project...] [--dry-run] [--force], or account')
  process.exitCode = 1
}
