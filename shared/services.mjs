// Builds the Shared → Services catalog written to Firestore `services/{id}`.
// Status only — never secret values. Used by cloud/sync.mjs (and optionally
// the Mac account push).

const HOSTING_URL = 'https://pamer-studio.web.app'
const PROJECT = 'pamer-studio'

const ok = (notes = '') => ({ status: 'ok', notes })
const warn = (notes) => ({ status: 'warn', notes })
const error = (notes) => ({ status: 'error', notes })
const missing = (notes) => ({ status: 'missing', notes })

function vendorFromSnap(snap, readyNote) {
  if (!snap) return missing('Not synced yet')
  if (snap.error) return error(snap.error)
  if (snap.reason || (snap.note && snap.proceeds == null && snap.earnings == null && snap.grossIdr == null && snap.earningsMicros == null)) {
    return warn(snap.note || snap.reason)
  }
  return ok(readyNote)
}

/**
 * @param {object} account  dashboard/account fields (from buildAccountSnapshot)
 * @param {{ secretStatus?: object, github?: object, gcp?: object }} extra
 */
export function buildServicesCatalog(account = {}, extra = {}) {
  const checkedAt = new Date()
  const rows = []

  const push = (id, fields) => {
    rows.push({
      id,
      checkedAt,
      ...fields,
    })
  }

  push('elevenlabs', {
    name: 'ElevenLabs',
    kind: 'vendor',
    url: 'https://elevenlabs.io/app/subscription',
    ...(account.limit != null
      ? ok(`${account.limit - account.used} of ${account.limit} credits left`)
      : missing('Credits not synced')),
  })

  push('fal', {
    name: 'fal.ai',
    kind: 'vendor',
    url: 'https://fal.ai/dashboard',
    ...(account.falBalance != null
      ? ok(`$${Number(account.falBalance).toFixed(2)} ${account.falCurrency || 'USD'} left`)
      : missing('Balance not synced')),
  })

  push('midtrans', {
    name: 'Midtrans (Dahlunas)',
    kind: 'vendor',
    url: 'https://console.firebase.google.com/project/dah-lunas',
    ...vendorFromSnap(account.midtrans, account.midtrans?.grossIdr != null
      ? `Rp ${Number(account.midtrans.grossIdr).toLocaleString('id-ID')} · ${account.midtrans.periodDays}d`
      : 'ok'),
  })

  push('admob', {
    name: 'AdMob',
    kind: 'vendor',
    url: 'https://admob.google.com/',
    ...vendorFromSnap(account.admob, account.admob?.earningsMicros != null
      ? `$${(account.admob.earningsMicros / 1e6).toFixed(2)} est. · ${account.admob.periodDays}d`
      : 'ok'),
  })

  push('app-store', {
    name: 'App Store Connect',
    kind: 'vendor',
    url: 'https://appstoreconnect.apple.com/',
    ...vendorFromSnap(account.appStore, account.appStore?.proceeds != null
      ? `$${Number(account.appStore.proceeds).toFixed(2)} · ${account.appStore.periodDays}d`
      : 'ok'),
  })

  push('play-store', {
    name: 'Google Play',
    kind: 'vendor',
    url: 'https://play.google.com/console',
    ...vendorFromSnap(account.playStore, account.playStore?.earnings != null
      ? `$${Number(account.playStore.earnings).toFixed(2)} · ${account.playStore.periodDays}d`
      : 'ok'),
  })

  push('firebase-ai', {
    name: 'Firebase AI Logic',
    kind: 'firebase',
    url: `https://console.firebase.google.com/project/${PROJECT}/genai`,
    ...ok('Gemini drafts on the AI tab (App Check enforced)'),
  })

  push('gcp-pamer-studio', {
    name: 'GCP / Firebase pamer-studio',
    kind: 'firebase',
    url: `https://console.cloud.google.com/home/dashboard?project=${PROJECT}`,
    ...(extra.gcp ?? ok('Project home')),
  })

  push('render-job', {
    name: 'Cloud render job',
    kind: 'firebase',
    url: `https://console.cloud.google.com/run/jobs/details/asia-southeast2/render?project=${PROJECT}`,
    ...(extra.render ?? ok('Cloud Run Job · asia-southeast2')),
  })

  push('sync-job', {
    name: 'Cloud sync job',
    kind: 'firebase',
    url: `https://console.cloud.google.com/run/jobs/details/asia-southeast2/sync?project=${PROJECT}`,
    ...(extra.sync ?? ok('Dashboard + Services refresh')),
  })

  push('hosting', {
    name: 'Hosting',
    kind: 'hosting',
    url: HOSTING_URL,
    ...(extra.hosting ?? missing('Not checked')),
  })

  push('github-studio', {
    name: 'GitHub · project-pamerstudio-node',
    kind: 'github',
    url: 'https://github.com/ardeman/project-pamerstudio-node',
    ...(extra.github ?? ok('Studio repo')),
  })

  for (const [id, name, url] of [
    ['github-catatsaja', 'GitHub · Catat Saja', 'https://github.com/ardeman/project-catatsaja-reactrouter'],
    ['github-cobalagi', 'GitHub · Coba Lagi', 'https://github.com/ardeman/project_cobalagi_flutter'],
    ['github-krida', 'GitHub · Krida', 'https://github.com/ardeman/project-krida-kmp'],
    ['github-bilahaksara', 'GitHub · Bilah Aksara', 'https://github.com/ardeman/project-bilahaksara-godot'],
  ]) {
    push(id, { name, kind: 'github', url, ...ok('Linked app repo') })
  }

  if (extra.secrets) {
    for (const [id, row] of Object.entries(extra.secrets)) {
      push(`secret-${id}`, {
        name: `Secret · ${id}`,
        kind: 'vendor',
        url: `https://console.cloud.google.com/security/secret-manager/secret/${id}?project=${PROJECT}`,
        ...row,
      })
    }
  }

  return rows
}

/** Probe Hosting; safe to call from Mac or cloud. */
export async function checkHosting() {
  try {
    const res = await fetch(HOSTING_URL, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(8000) })
    if (res.ok || res.status === 405) return ok(`HTTP ${res.status}`)
    return warn(`HTTP ${res.status}`)
  } catch (e) {
    return error(e.message)
  }
}
