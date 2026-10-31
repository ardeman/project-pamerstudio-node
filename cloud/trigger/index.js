// Starts the render job (cloud/render.mjs) for render requests, one at a
// time: `requested` gets priced, `approved` gets rendered. Every write to
// renders/<id> calls this, the job's own included, so the job's last write
// starts the oldest waiting request. It claims a request by setting it to
// `queued` only if nothing changed it since it was read, and runs as one
// instance handling one event at a time (cloud/build.sh), so two writes can't
// both find the job free. Its one dependency, the Functions Framework, is
// installed when it is deployed.

const functions = require('@google-cloud/functions-framework')

const PROJECT = 'pamer-studio'
const REGION = 'asia-southeast2'
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const STEP = { requested: 'price', approved: 'render' }
const ACTIVE = ['queued', 'pricing', 'rendering']
// The job's timeout is an hour; one killed by it never writes `failed`.
const STUCK = 70 * 60 * 1000

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
        from: [{ collectionId: 'renders' }],
        where: { fieldFilter: { field: { fieldPath: 'status' }, op: 'IN', value: { arrayValue: { values: statuses.map((s) => ({ stringValue: s })) } } } },
      },
    }),
  })
  if (!res.ok) throw new Error(`Can't list render requests: ${res.status} ${JSON.stringify(res.body)}`)
  return res.body.filter((r) => r.document).map((r) => r.document)
}

// Only if nothing changed the request since it was read.
const patch = (doc, fields) =>
  call(`https://firestore.googleapis.com/v1/${doc.name}?${Object.keys(fields).map((f) => `updateMask.fieldPaths=${f}`).join('&')}&currentDocument.updateTime=${encodeURIComponent(doc.updateTime)}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields }),
  })

functions.cloudEvent('trigger', async (event) => {
  if (event.subject?.split('/').at(-2) !== 'renders') return console.log(`Not a render request: ${event.subject}`)

  let busy = false
  for (const doc of await withStatus(ACTIVE)) {
    if (Date.now() - Date.parse(doc.updateTime) < STUCK) busy = true
    else if ((await patch(doc, { status: { stringValue: 'failed' }, error: { stringValue: 'The render job stopped without saying why (it may have run past its hour).' } })).ok)
      console.log(`${doc.name.split('/').pop()}: stuck, marked failed`)
  }
  if (busy) return console.log('A render is running; the rest wait.')

  const waiting = (await withStatus(Object.keys(STEP))).sort((a, b) => a.createTime.localeCompare(b.createTime))
  const doc = waiting[0]
  if (!doc) return
  const id = doc.name.split('/').pop()
  const step = STEP[doc.fields.status.stringValue]
  const claim = await patch(doc, { status: { stringValue: 'queued' } })
  if (!claim.ok) return console.log(`renders/${id}: already taken (${claim.status})`)
  const run = await call(`https://run.googleapis.com/v2/projects/${PROJECT}/locations/${REGION}/jobs/render:run`, {
    method: 'POST',
    body: JSON.stringify({
      overrides: {
        containerOverrides: [{
          args: ['node', 'cloud/render.mjs'],
          env: [{ name: 'RENDER_ID', value: id }, { name: 'RENDER_STEP', value: step }],
        }],
      },
    }),
  })
  if (!run.ok) {
    console.error(`renders/${id}: the job didn't start`, run.status, JSON.stringify(run.body))
    await patch(claim.body, { status: { stringValue: 'failed' }, error: { stringValue: `The render job didn't start (${run.status}).` } })
    return
  }
  console.log(`renders/${id}: ${step} started`)
})
