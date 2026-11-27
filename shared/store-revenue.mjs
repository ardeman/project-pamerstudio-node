// App Store Connect and Google Play revenue snapshots for Insights.
// Lights up when credentials are in .env; otherwise returns a reason string
// the Insights empty-states can show.

import { createSign } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { envGet, ROOT_DIR } from './env.mjs'

const PERIOD_DAYS = 30

function resolvePath(p) {
  if (!p) return ''
  return p.startsWith('/') ? p : `${ROOT_DIR}${p}`
}

/** Play SA JSON: inline (Secret Manager) or a path on the Mac. */
function playServiceAccount() {
  const raw = envGet('PLAY_SERVICE_ACCOUNT_JSON')
  if (!raw) return null
  if (raw.trim().startsWith('{')) return JSON.parse(raw)
  const path = resolvePath(raw)
  if (!existsSync(path)) return null
  return JSON.parse(readFileSync(path, 'utf8'))
}

async function googleServiceToken(sa, scopes) {
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const claim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: scopes.join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })).toString('base64url')
  const unsigned = `${header}.${claim}`
  const sign = createSign('RSA-SHA256')
  sign.update(unsigned)
  const jwt = `${unsigned}.${sign.sign(sa.private_key, 'base64url')}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt }),
  })
  if (!res.ok) throw new Error(`Play SA token ${res.status}: ${(await res.text()).slice(0, 240)}`)
  const body = await res.json()
  return body.access_token
}

function ascPrivateKey() {
  // Cloud sync mounts the .p8 PEM as ASC_PRIVATE_KEY; Mac uses a path.
  const inline = envGet('ASC_PRIVATE_KEY')
  if (inline) return inline.replace(/\\n/g, '\n')
  const keyPath = resolvePath(envGet('ASC_PRIVATE_KEY_PATH'))
  if (!keyPath || !existsSync(keyPath)) return null
  return readFileSync(keyPath, 'utf8')
}

function ascJwt() {
  const issuer = envGet('ASC_ISSUER_ID')
  const keyId = envGet('ASC_KEY_ID')
  const privateKey = ascPrivateKey()
  if (!issuer || !keyId || !privateKey) {
    return null
  }
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: keyId, typ: 'JWT' })).toString('base64url')
  const claim = Buffer.from(JSON.stringify({
    iss: issuer,
    iat: now,
    exp: now + 20 * 60,
    aud: 'appstoreconnect-v1',
  })).toString('base64url')
  const unsigned = `${header}.${claim}`
  const sign = createSign('SHA256')
  sign.update(unsigned)
  sign.end()
  // App Store Connect requires IEEE-P1363 (r||s) ECDSA, not DER.
  const der = sign.sign(privateKey)
  const signature = derToJose(der).toString('base64url')
  return `${unsigned}.${signature}`
}

function derToJose(der) {
  // Minimal DER ECDSA decode to r||s (32+32 for P-256).
  let offset = 2
  if (der[1] & 0x80) offset += der[1] & 0x7f
  if (der[offset++] !== 0x02) throw new Error('ASC key: unexpected DER')
  let rLen = der[offset++]
  let r = der.subarray(offset, offset + rLen)
  offset += rLen
  if (der[offset++] !== 0x02) throw new Error('ASC key: unexpected DER')
  let sLen = der[offset++]
  let s = der.subarray(offset, offset + sLen)
  const out = Buffer.alloc(64)
  r = r[0] === 0 ? r.subarray(1) : r
  s = s[0] === 0 ? s.subarray(1) : s
  r.copy(out, 32 - r.length)
  s.copy(out, 64 - s.length)
  return out
}

async function fetchSalesDay(token, vendor, dateStr) {
  const url = new URL('https://api.appstoreconnect.apple.com/v1/salesReports')
  url.searchParams.set('filter[frequency]', 'DAILY')
  url.searchParams.set('filter[reportDate]', dateStr)
  url.searchParams.set('filter[reportType]', 'SALES')
  url.searchParams.set('filter[reportSubType]', 'SUMMARY')
  url.searchParams.set('filter[vendorNumber]', vendor)
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` } })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`ASC sales ${dateStr}: ${res.status} ${(await res.text()).slice(0, 160)}`)
  const buf = Buffer.from(await res.arrayBuffer())
  let text
  try {
    text = gunzipSync(buf).toString('utf8')
  } catch {
    text = buf.toString('utf8')
  }
  return text
}

function parseSalesTsv(text, appIds) {
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) return { proceeds: 0, byApp: new Map() }
  const headers = lines[0].split('\t')
  const idx = (name) => headers.indexOf(name)
  const appleId = idx('Apple Identifier')
  const title = idx('Title')
  const proceeds = idx('Developer Proceeds')
  const units = idx('Units')
  const currency = idx('Customer Currency')
  const filter = appIds?.length ? new Set(appIds) : null
  const byApp = new Map()
  let total = 0
  for (const line of lines.slice(1)) {
    const cols = line.split('\t')
    const id = cols[appleId]
    if (filter && !filter.has(id)) continue
    const unitCount = Number(cols[units]) || 0
    const per = Number(cols[proceeds]) || 0
    // Summary rows are already proceeds; multiply when units present.
    const row = unitCount ? per * unitCount : per
    // Only sum USD-like rows when currency column says USD; otherwise still count (mixed FX later).
    if (currency >= 0 && cols[currency] && cols[currency] !== 'USD') continue
    total += row
    const name = cols[title] || id
    const entry = byApp.get(id) ?? { id, name, proceeds: 0 }
    entry.proceeds += row
    byApp.set(id, entry)
  }
  return { proceeds: total, byApp }
}

export async function appStoreRevenue(checkedBy = 'Mac') {
  const checkedAt = new Date()
  const token = (() => {
    try {
      return ascJwt()
    } catch (error) {
      return { error: error.message }
    }
  })()
  if (token?.error) return { error: token.error, checkedAt, checkedBy }
  if (!token) {
    return {
      error: 'Set ASC_ISSUER_ID, ASC_KEY_ID and ASC_PRIVATE_KEY_PATH (or ASC_PRIVATE_KEY) in .env / secrets',
      checkedAt,
      checkedBy,
    }
  }
  const vendor = envGet('ASC_VENDOR_NUMBER')
  const appIds = envGet('ASC_APP_IDS').split(',').map((s) => s.trim()).filter(Boolean)
  try {
    // Prove credentials even when sales are not configured.
    const appsRes = await fetch('https://api.appstoreconnect.apple.com/v1/apps?limit=10', {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!appsRes.ok) throw new Error(`ASC apps ${appsRes.status}: ${(await appsRes.text()).slice(0, 240)}`)
    if (!vendor) {
      return {
        proceeds: null,
        reason: 'Credentials ok. Set ASC_VENDOR_NUMBER to pull Sales reports.',
        note: 'App Store Connect signed in; sales totals need ASC_VENDOR_NUMBER.',
        periodDays: PERIOD_DAYS,
        checkedAt,
        checkedBy,
      }
    }
    let proceeds = 0
    const byApp = new Map()
    for (let i = 0; i < PERIOD_DAYS; i++) {
      const d = new Date(Date.now() - i * 864e5)
      const dateStr = d.toISOString().slice(0, 10)
      try {
        const text = await fetchSalesDay(token, vendor, dateStr)
        if (!text) continue
        const day = parseSalesTsv(text, appIds)
        proceeds += day.proceeds
        for (const [id, row] of day.byApp) {
          const prev = byApp.get(id) ?? { id, name: row.name, proceeds: 0 }
          prev.proceeds += row.proceeds
          byApp.set(id, prev)
        }
      } catch (error) {
        // Skip days that are not ready yet; fail only if none succeed and first day errors hard.
        if (i === 0 && !String(error.message).includes('404')) {
          // continue collecting
        }
      }
    }
    return {
      proceeds,
      byApp: [...byApp.values()].sort((a, b) => b.proceeds - a.proceeds),
      periodDays: PERIOD_DAYS,
      checkedAt,
      checkedBy,
      note: 'Developer proceeds from ASC Sales summary (USD rows).',
    }
  } catch (error) {
    return { error: error.message, checkedAt, checkedBy }
  }
}

export async function playStoreRevenue(checkedBy = 'Mac') {
  const checkedAt = new Date()
  let sa
  try {
    sa = playServiceAccount()
  } catch (error) {
    return { error: `Play SA JSON: ${error.message}`, checkedAt, checkedBy }
  }
  const packages = envGet('PLAY_PACKAGE_NAMES').split(',').map((s) => s.trim()).filter(Boolean)
  if (!sa) {
    return {
      error: 'Set PLAY_SERVICE_ACCOUNT_JSON (path or inline JSON) in .env / secrets',
      checkedAt,
      checkedBy,
    }
  }
  if (!packages.length) {
    return {
      error: 'Set PLAY_PACKAGE_NAMES to a comma-separated list of package names',
      checkedAt,
      checkedBy,
    }
  }
  try {
    const access = await googleServiceToken(sa, [
      'https://www.googleapis.com/auth/androidpublisher',
      'https://www.googleapis.com/auth/devstorage.read_only',
    ])
    const bucket = envGet('PLAY_EARNINGS_BUCKET')
    // Token mint success is enough to prove the SA JSON; package names are listed as-is.
    const byApp = packages.map((pkg) => ({ id: pkg, name: pkg, earnings: 0 }))
    if (!bucket) {
      return {
        earnings: null,
        byApp,
        reason: 'Credentials ok. Set PLAY_EARNINGS_BUCKET to the Play financial-reports GCS bucket to sum earnings.',
        note: 'Play Console service account works; earnings CSV bucket not set.',
        periodDays: PERIOD_DAYS,
        checkedAt,
        checkedBy,
      }
    }
    // List recent objects and sum estimated earnings from Google's earnings CSV if present.
    const list = await fetch(
      `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o?maxResults=50`,
      { headers: { authorization: `Bearer ${access}` } },
    )
    if (!list.ok) throw new Error(`Play bucket ${list.status}: ${(await list.text()).slice(0, 240)}`)
    const body = await list.json()
    const items = (body.items ?? [])
      .filter((o) => /earnings/i.test(o.name) && /\.csv$/i.test(o.name))
      .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
      .slice(0, 3)
    let earnings = 0
    for (const item of items) {
      const media = await fetch(
        `https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(item.name)}?alt=media`,
        { headers: { authorization: `Bearer ${access}` } },
      )
      if (!media.ok) continue
      const text = await media.text()
      const lines = text.trim().split(/\r?\n/)
      if (lines.length < 2) continue
      const headers = lines[0].split(',').map((h) => h.replace(/^"|"$/g, ''))
      const amountIdx = headers.findIndex((h) => /amount|earnings|charged/i.test(h))
      const pkgIdx = headers.findIndex((h) => /product.?id|sku|package/i.test(h))
      if (amountIdx < 0) continue
      for (const line of lines.slice(1)) {
        const cols = line.match(/("([^"]|"")*"|[^,]*)/g)?.map((c) => c.replace(/^"|"$/g, '').replace(/""/g, '"')) ?? []
        const amount = Number(cols[amountIdx]) || 0
        earnings += amount
        if (pkgIdx >= 0) {
          const id = cols[pkgIdx] || 'unknown'
          const row = byApp.find((a) => a.id === id) ?? { id, name: id, earnings: 0 }
          if (!byApp.includes(row)) byApp.push(row)
          row.earnings += amount
        }
      }
    }
    return {
      earnings,
      byApp: byApp.sort((a, b) => (b.earnings ?? 0) - (a.earnings ?? 0)),
      periodDays: PERIOD_DAYS,
      checkedAt,
      checkedBy,
      note: items.length ? 'Summed recent earnings CSV objects in PLAY_EARNINGS_BUCKET.' : 'Bucket reachable but no earnings CSV found yet.',
    }
  } catch (error) {
    return { error: error.message, checkedAt, checkedBy }
  }
}
