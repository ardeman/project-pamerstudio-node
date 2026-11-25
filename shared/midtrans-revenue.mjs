// Midtrans revenue for Insights: sum paid Dahlunas production orders
// (Firestore project dah-lunas, collection orders-production). No Midtrans
// server key is stored here — Dahlunas already settled the payments.

import { execFileSync } from 'node:child_process'

const DAHLUNAS = 'dah-lunas'
const COLLECTION = 'orders-production'
const DOCS = `https://firestore.googleapis.com/v1/projects/${DAHLUNAS}/databases/(default)/documents`
const PERIOD_DAYS = 30

const token = () => execFileSync('gcloud', ['auth', 'print-access-token'], { encoding: 'utf8' }).trim()

const fromValue = (v) =>
  'stringValue' in v ? v.stringValue
  : 'booleanValue' in v ? v.booleanValue
  : 'integerValue' in v ? Number(v.integerValue)
  : 'timestampValue' in v ? v.timestampValue
  : 'arrayValue' in v ? (v.arrayValue.values ?? []).map(fromValue)
  : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields ?? {}).map(([k, x]) => [k, fromValue(x)]))
  : null

async function listOrders(access) {
  const orders = []
  let pageToken = ''
  do {
    const url = `${DOCS}/${COLLECTION}?pageSize=300${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ''}`
    const res = await fetch(url, {
      headers: { authorization: `Bearer ${access}`, 'x-goog-user-project': DAHLUNAS },
    })
    if (!res.ok) throw new Error(`Dahlunas Firestore ${res.status}: ${(await res.text()).slice(0, 240)}`)
    const body = await res.json()
    for (const doc of body.documents ?? []) {
      const fields = Object.fromEntries(Object.entries(doc.fields ?? {}).map(([k, v]) => [k, fromValue(v)]))
      if (!fields.payload) continue
      try {
        orders.push(JSON.parse(fields.payload))
      } catch {
        // skip corrupt rows
      }
    }
    pageToken = body.nextPageToken ?? ''
  } while (pageToken)
  return orders
}

/**
 * @returns {{ grossIdr: number, paidCount: number, byProduct: object[], periodDays: number, checkedAt: Date, checkedBy: string }
 *   | { error: string, checkedAt: Date, checkedBy: string }}
 */
export async function midtransRevenue() {
  const checkedAt = new Date()
  const checkedBy = 'Mac'
  try {
    const access = token()
    const orders = await listOrders(access)
    const since = Date.now() - PERIOD_DAYS * 864e5
    // Empty Gateway in JSON means Midtrans (Dahlunas default).
    const midtransPaid = orders.filter((o) => {
      if (!o.Paid) return false
      const gateway = o.Product?.Gateway || 'midtrans'
      if (gateway !== 'midtrans') return false
      const created = Date.parse(o.Created)
      return Number.isFinite(created) && created >= since
    })
    const by = new Map()
    let grossIdr = 0
    for (const o of midtransPaid) {
      const price = Number(o.Product?.Price) || 0
      const slug = o.Product?.Slug || 'unknown'
      const name = o.Product?.NameEN || o.Product?.NameID || slug
      grossIdr += price
      const row = by.get(slug) ?? { slug, name, grossIdr: 0, count: 0 }
      row.grossIdr += price
      row.count += 1
      by.set(slug, row)
    }
    return {
      grossIdr,
      paidCount: midtransPaid.length,
      byProduct: [...by.values()].sort((a, b) => b.grossIdr - a.grossIdr),
      periodDays: PERIOD_DAYS,
      checkedAt,
      checkedBy,
    }
  } catch (error) {
    return { error: error.message, checkedAt, checkedBy }
  }
}
