// AdMob Network Report for Insights. Needs user OAuth (service accounts are
// not supported). One-time: node shared/cloud.mjs admob-login
// Then pushAccount() reads the refresh token from .secrets/admob-token.json.

import { createServer } from 'node:http'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { envGet, ROOT_DIR } from './env.mjs'

const SECRETS = `${ROOT_DIR}.secrets`
const TOKEN_FILE = `${SECRETS}/admob-token.json`
const PERIOD_DAYS = 30
const SCOPES = [
  'https://www.googleapis.com/auth/admob.readonly',
  'https://www.googleapis.com/auth/admob.report',
].join(' ')

const clientId = () => envGet('ADMOB_OAUTH_CLIENT_ID')
const clientSecret = () => envGet('ADMOB_OAUTH_CLIENT_SECRET')
const publisherId = () => envGet('ADMOB_PUBLISHER_ID') // pub-…

function loadToken() {
  // Cloud sync mounts the refresh token as ADMOB_REFRESH_TOKEN (Secret Manager).
  const fromEnv = envGet('ADMOB_REFRESH_TOKEN')
  if (fromEnv) return { refresh_token: fromEnv }
  if (!existsSync(TOKEN_FILE)) return null
  return JSON.parse(readFileSync(TOKEN_FILE, 'utf8'))
}

function saveToken(data) {
  mkdirSync(SECRETS, { recursive: true })
  writeFileSync(TOKEN_FILE, `${JSON.stringify(data, null, 2)}\n`, { mode: 0o600 })
}

async function exchange(body) {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(body),
  })
  if (!res.ok) throw new Error(`AdMob OAuth token ${res.status}: ${(await res.text()).slice(0, 240)}`)
  return res.json()
}

async function accessToken() {
  const stored = loadToken()
  if (!stored?.refresh_token) {
    throw new Error('AdMob not logged in: run node shared/cloud.mjs admob-login')
  }
  const id = clientId()
  const secret = clientSecret()
  if (!id || !secret) throw new Error('ADMOB_OAUTH_CLIENT_ID / ADMOB_OAUTH_CLIENT_SECRET missing from .env')
  const fresh = await exchange({
    client_id: id,
    client_secret: secret,
    refresh_token: stored.refresh_token,
    grant_type: 'refresh_token',
  })
  return fresh.access_token
}

/** One-time browser login; writes .secrets/admob-token.json */
export async function admobLoginFlow() {
  const id = clientId()
  const secret = clientSecret()
  if (!id || !secret) {
    throw new Error('Set ADMOB_OAUTH_CLIENT_ID and ADMOB_OAUTH_CLIENT_SECRET in .env (Google Cloud OAuth desktop client with AdMob API enabled).')
  }
  // Fixed port so the OAuth client's authorized redirect URI stays stable.
  const port = Number(envGet('ADMOB_OAUTH_PORT', '8765'))
  const redirect = `http://127.0.0.1:${port}/oauth2/callback`
  await new Promise((resolve, reject) => {
    const server = createServer(async (req, res) => {
      try {
        const url = new URL(req.url, 'http://127.0.0.1')
        if (url.pathname !== '/oauth2/callback') {
          res.writeHead(404)
          res.end()
          return
        }
        const err = url.searchParams.get('error')
        const value = url.searchParams.get('code')
        if (err) throw new Error(err)
        if (!value) throw new Error('No code returned')
        const tokens = await exchange({
          code: value,
          client_id: id,
          client_secret: secret,
          redirect_uri: redirect,
          grant_type: 'authorization_code',
        })
        if (!tokens.refresh_token) throw new Error('No refresh_token returned; revoke prior access and try again with prompt=consent')
        saveToken(tokens)
        res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })
        res.end('<p>AdMob login complete. You can close this tab.</p>')
        server.close()
        console.log(`Saved refresh token to ${TOKEN_FILE}`)
        resolve()
      } catch (error) {
        try {
          res.writeHead(500, { 'content-type': 'text/plain' })
          res.end(String(error.message))
        } catch { /* already closed */ }
        server.close()
        reject(error)
      }
    })
    server.on('error', reject)
    server.listen(port, '127.0.0.1', () => {
      const auth = new URL('https://accounts.google.com/o/oauth2/v2/auth')
      auth.searchParams.set('client_id', id)
      auth.searchParams.set('redirect_uri', redirect)
      auth.searchParams.set('response_type', 'code')
      auth.searchParams.set('scope', SCOPES)
      auth.searchParams.set('access_type', 'offline')
      auth.searchParams.set('prompt', 'consent')
      const href = auth.toString()
      console.log(`Authorized redirect URI on the OAuth client must be:\n  ${redirect}\nOpen:\n${href}`)
      try {
        execFileSync('open', [href], { stdio: 'ignore' })
      } catch {
        // open manually
      }
    })
    setTimeout(() => {
      server.close()
      reject(new Error('AdMob login timed out after 5 minutes'))
    }, 300_000)
  })
}

function dayParts(date) {
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() }
}

/**
 * @param {string} [checkedBy]
 * @returns {{ earningsMicros: number, currency: string, byApp: object[], periodDays: number, checkedAt: Date, checkedBy: string }
 *   | { error: string, checkedAt: Date, checkedBy: string }}
 */
export async function admobRevenue(checkedBy = 'Mac') {
  const checkedAt = new Date()
  const pub = publisherId()
  if (!pub) {
    return { error: 'ADMOB_PUBLISHER_ID missing from .env / secrets', checkedAt, checkedBy }
  }
  try {
    const access = await accessToken()
    const end = new Date()
    const start = new Date(Date.now() - (PERIOD_DAYS - 1) * 864e5)
    const res = await fetch(`https://admob.googleapis.com/v1/accounts/${pub}/networkReport:generate`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${access}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        reportSpec: {
          dateRange: { startDate: dayParts(start), endDate: dayParts(end) },
          dimensions: ['APP'],
          metrics: ['ESTIMATED_EARNINGS', 'IMPRESSIONS', 'CLICKS'],
          localizationSettings: { currencyCode: 'USD', languageCode: 'en-US' },
        },
      }),
    })
    if (!res.ok) throw new Error(`AdMob report ${res.status}: ${(await res.text()).slice(0, 320)}`)
    const rows = await res.json()
    const list = Array.isArray(rows) ? rows : [rows]
    let currency = 'USD'
    const byApp = []
    let earningsMicros = 0
    for (const part of list) {
      if (part.header?.localizationSettings?.currencyCode) {
        currency = part.header.localizationSettings.currencyCode
      }
      const row = part.row
      if (!row) continue
      const appDim = row.dimensionValues?.APP
      const earn = row.metricValues?.ESTIMATED_EARNINGS
      const micros = Number(earn?.microsValue ?? earn?.integerValue ?? 0)
      earningsMicros += micros
      byApp.push({
        appId: appDim?.value || 'unknown',
        name: appDim?.displayLabel || appDim?.value || 'App',
        earningsMicros: micros,
      })
    }
    byApp.sort((a, b) => b.earningsMicros - a.earningsMicros)
    return { earningsMicros, currency, byApp, periodDays: PERIOD_DAYS, checkedAt, checkedBy }
  } catch (error) {
    return { error: error.message, checkedAt, checkedBy }
  }
}
