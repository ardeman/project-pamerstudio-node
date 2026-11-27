// Cloud Dashboard + Services sync. Cloud Scheduler / sync-trigger starts the
// Cloud Run Job `sync` with:
//   node cloud/sync.mjs            scheduled refresh
//   SYNC_ID=<id>                   on-demand (Firestore syncs/<id>)
// Reads vendor keys from Secret Manager (mounted as env by cloud/build.sh).
// Never prints secret values.

import { execFileSync } from 'node:child_process'

import { cloudActions } from './actions.mjs'
import { buildAccountSnapshot } from '../shared/account.mjs'
import { buildServicesCatalog, checkHosting } from '../shared/services.mjs'

const PROJECT = 'pamer-studio'
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const { SYNC_ID: syncId } = process.env

const token = process.env.CLOUD_RUN_JOB
  ? (await (await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' } })).json()).access_token
  : execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()
const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(!process.env.CLOUD_RUN_JOB && { 'x-goog-user-project': PROJECT }) }

async function call(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } })
  if (!res.ok) throw new Error(`${options.method ?? 'GET'} ${url.split('?')[0]}: ${res.status} ${await res.text()}`)
  return res.status === 204 ? null : res.json()
}

const toValue = (v) =>
  v === null || v === undefined ? { nullValue: null }
  : v instanceof Date ? { timestampValue: v.toISOString() }
  : typeof v === 'boolean' ? { booleanValue: v }
  : typeof v === 'number' ? (Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v })
  : Array.isArray(v) ? { arrayValue: { values: v.map(toValue) } }
  : typeof v === 'object' ? { mapValue: { fields: toFields(v) } }
  : { stringValue: String(v) }
const toFields = (o) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, toValue(v)]))

const patch = (path, fields) => {
  const mask = Object.keys(fields).map((k) => `updateMask.fieldPaths=${k}`).join('&')
  return call(`${DOCS}/${path}?${mask}`, { method: 'PATCH', body: JSON.stringify({ fields: toFields(fields) }) })
}

async function secretAges() {
  const secrets = [
    'elevenlabs-api-key', 'fal-api-key',
    'admob-refresh-token', 'admob-oauth-client-id', 'admob-oauth-client-secret', 'admob-publisher-id',
    'asc-issuer-id', 'asc-key-id', 'asc-private-key', 'asc-vendor-number', 'asc-app-ids',
    'play-service-account-json', 'play-package-names', 'play-earnings-bucket',
  ]
  const out = {}
  for (const name of secrets) {
    try {
      const res = await call(`https://secretmanager.googleapis.com/v1/projects/${PROJECT}/secrets/${name}/versions?filter=state:ENABLED`)
      const versions = res?.versions ?? []
      if (!versions.length) {
        out[name] = { status: 'missing', notes: 'No enabled version' }
        continue
      }
      const newest = versions[0]
      const created = newest.createTime ? new Date(newest.createTime) : null
      const ageDays = created ? Math.floor((Date.now() - created) / 864e5) : null
      out[name] = {
        status: 'ok',
        notes: ageDays == null ? 'Enabled' : `Newest version ${ageDays}d old`,
      }
    } catch (error) {
      out[name] = { status: 'missing', notes: error.message.includes('404') ? 'Not created yet' : error.message.slice(0, 160) }
    }
  }
  return out
}

async function main() {
  if (syncId) await patch(`syncs/${syncId}`, { status: 'running', error: null, startedAt: new Date() })

  const checkedBy = syncId ? 'cloud sync (on-demand)' : 'cloud sync'
  const { fields, log } = await buildAccountSnapshot(checkedBy)
  for (const line of log) console.log(line)
  await patch('dashboard/account', fields)

  // Keep Render-tab catalogs current without a Mac push.
  const projectList = (await call(`${DOCS}/projects?pageSize=100`).catch(() => null))?.documents ?? []
  for (const doc of projectList) {
    const id = doc.name.split('/').pop()
    try {
      const renders = await cloudActions(id)
      if (renders.length) await patch(`projects/${id}`, { renders })
    } catch (error) {
      console.log(`renders catalog ${id}: ${error.message}`)
    }
  }

  const hosting = await checkHosting()
  let secrets = {}
  try {
    secrets = await secretAges()
  } catch (error) {
    console.error('secrets:', error.message)
  }

  const catalog = buildServicesCatalog(fields, {
    hosting,
    sync: { status: 'ok', notes: `Synced ${new Date().toISOString()}` },
    secrets,
  })
  for (const row of catalog) {
    const { id, ...rest } = row
    await patch(`services/${id}`, rest)
  }
  console.log(`services: ${catalog.length} rows`)

  if (syncId) await patch(`syncs/${syncId}`, { status: 'done', doneAt: new Date(), log: log.join('\n') })
}

try {
  await main()
} catch (error) {
  console.error(error)
  if (syncId) {
    await patch(`syncs/${syncId}`, { status: 'failed', error: error.message, doneAt: new Date() }).catch(console.error)
  }
  process.exitCode = 1
}
