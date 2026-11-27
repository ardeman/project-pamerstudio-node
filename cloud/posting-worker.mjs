// Posting kit step 4 scaffold: finds captions approved on the web and would
 // hand them to platform APIs. Tokens live in Secret Manager later; for now
 // this only lists what is ready so the cloud path is clear.
 // Usage: node cloud/posting-worker.mjs [--dry-run]
 // Not wired to a schedule yet — run by hand or from a future Cloud Job.

import { execFileSync } from 'node:child_process'

const PROJECT = 'pamer-studio'
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const dryRun = process.argv.includes('--dry-run')

const token = process.env.CLOUD_RUN_JOB
  ? (await (await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' } })).json()).access_token
  : execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
const headers = { authorization: `Bearer ${token}`, ...(!process.env.CLOUD_RUN_JOB && { 'x-goog-user-project': PROJECT }) }

async function call(url) {
  const res = await fetch(url, { headers })
  if (!res.ok) throw new Error(`${url}: ${res.status} ${await res.text()}`)
  return res.json()
}

const fromValue = (v) =>
  'stringValue' in v ? v.stringValue
  : 'booleanValue' in v ? v.booleanValue
  : 'integerValue' in v ? Number(v.integerValue)
  : 'timestampValue' in v ? v.timestampValue
  : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(fromValue)
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, fromValue(x)]))
  : null

const projects = (await call(`${DOCS}/projects?pageSize=100`)).documents ?? []
let ready = 0
for (const doc of projects) {
  const id = doc.name.split('/').pop()
  const posts = (await call(`${DOCS}/projects/${id}/posts?pageSize=300`)).documents ?? []
  for (const post of posts) {
    const fields = Object.fromEntries(Object.entries(post.fields ?? {}).map(([k, v]) => [k, fromValue(v)]))
    if (!fields.approved || fields.posted) continue
    ready++
    const postId = post.name.split('/').pop()
    console.log(`${id}/${postId}: approved, not posted${dryRun ? ' (would post when tokens are wired)' : ' — posting APIs not configured yet'}`)
  }
}
console.log(ready ? `${ready} caption(s) waiting for platform tokens in Secret Manager` : 'No approved captions waiting')
