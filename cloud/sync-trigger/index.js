// Starts the sync job when the web page requests a refresh (syncs/<id>
// written with status `requested`). Cloud Scheduler also runs the job on a
// cron without going through Firestore.

const functions = require('@google-cloud/functions-framework')

const PROJECT = 'pamer-studio'
const REGION = 'asia-southeast2'
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const ACTIVE = ['queued', 'running']
const STUCK = 20 * 60 * 1000

const token = async () =>
  (await (await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' } })).json()).access_token

async function call(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' } })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
}

async function withStatus(statuses) {
  const res = await call(`${DOCS}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'syncs' }],
        where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'IN', value: { arrayValue: { values: statuses.map((s) => ({ stringValue: s })) } } } },
      },
    }),
  })
  if (!res.ok) throw new Error(`Can't list syncs: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body.filter((r) => r.document).map((r) => r.document)
}

const patch = (doc, fields) =>
  call(`https://firestore.googleapis.com/v1/${doc.name}?${Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&')}&currentDocument.updateTime=${encodeURIComponent(doc.updateTime)}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })

functions.cloudEvent('trigger', async (event) => {
  if (event.subject?.split('/').at(-2) !== 'syncs') return console.log(`Not a sync request: ${event.subject}`)

  let busy = false
  for (const doc of await withStatus(ACTIVE)) {
    if (Date.now() - Date.parse(doc.updateTime) < STUCK) busy = true
    else if ((await patch(doc, { status: { stringValue: 'failed' }, error: { stringValue: 'The sync job stopped without finishing.' } })).ok)
      console.log(`${doc.name.split('/').pop()}: stuck, marked failed`)
  }
  if (busy) return console.log('A sync is running; the rest wait.')

  const waiting = (await withStatus(['requested'])).sort((a, b) => a.createTime.localeCompare(b.createTime))
  const doc = waiting[0]
  if (!doc) return
  const id = doc.name.split('/').pop()
  const claim = await patch(doc, { status: { stringValue: 'queued' } })
  if (!claim.ok) return console.log(`syncs/${id}: already taken (${claim.status})`)

  const run = await call(`https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/jobs/sync:run`, {
    method: 'POST',
    body: JSON.stringify({
      overrides: {
        containerOverrides: [{
          args: ['node', 'cloud/sync.mjs'],
          env: [{ name: 'SYNC_ID', value: id }],
        }],
      },
    }),
  })
  if (!run.ok) {
    console.error(`syncs/${id}: the job didn't start`, run.status, JSON.stringify(run.body))
    await patch(claim.body, { status: { stringValue: 'failed' }, error: { stringValue: `The sync job didn't start (${run.status}).` } })
    return
  }
  console.log(`syncs/${id}: started`)
})
