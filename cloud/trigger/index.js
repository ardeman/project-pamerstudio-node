// Starts the render job (cloud/render.mjs) when the web page writes a render
// request: `requested` gets priced, `approved` gets rendered. Every write to
// renders/<id> calls this, the job's own included, so it claims a request by
// setting it to `queued` only if nothing changed it since it was read: one
// write starts one job. Deployed by cloud/build.sh; its one dependency, the
// Functions Framework, is installed there.

const functions = require('@google-cloud/functions-framework')

const PROJECT = 'pamer-studio'
const REGION = 'asia-southeast2'
const DOCS = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents`
const STEP = { requested: 'price', approved: 'render' }

const token = async () =>
  (await (await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', { headers: { 'Metadata-Flavor': 'Google' } })).json()).access_token

async function call(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { authorization: `Bearer ${await token()}`, 'content-type': 'application/json' } })
  return { ok: res.ok, status: res.status, body: await res.json().catch(() => null) }
}

functions.cloudEvent('trigger', async (event) => {
  // The subject is documents/renders/<id>; the data itself is protobuf.
  const id = event.subject?.split('/').pop()
  if (!id || event.subject.split('/').at(-2) !== 'renders') return console.log(`Not a render request: ${event.subject}`)
  const doc = await call(`${DOCS}/renders/${id}`)
  if (!doc.ok) return console.error(`renders/${id}: can't read it`, doc.status, JSON.stringify(doc.body))
  const step = STEP[doc.body.fields?.status?.stringValue]
  if (!step) return
  const claim = await call(`${DOCS}/renders/${id}?updateMask.fieldPaths=status&currentDocument.updateTime=${encodeURIComponent(doc.body.updateTime)}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: { status: { stringValue: 'queued' } } }),
  })
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
    await call(`${DOCS}/renders/${id}?updateMask.fieldPaths=status&updateMask.fieldPaths=error`, {
      method: 'PATCH',
      body: JSON.stringify({ fields: { status: { stringValue: 'failed' }, error: { stringValue: `The render job didn't start (${run.status}).` } } }),
    })
    return
  }
  console.log(`renders/${id}: ${step} started`)
})
