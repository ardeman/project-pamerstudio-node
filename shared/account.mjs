// Builds the Dashboard `dashboard/account` snapshot (credits + revenue).
// Used by `node shared/cloud.mjs account` on the Mac and by `cloud/sync.mjs`
// in the cloud. checkedBy labels who wrote it ("Mac", "cloud sync", …).

import { subscription, usage } from './eleven.mjs'
import { balance as falBalance } from './fal.mjs'
import { midtransRevenue } from './midtrans-revenue.mjs'
import { admobRevenue } from './admob.mjs'
import { appStoreRevenue, playStoreRevenue } from './store-revenue.mjs'

/**
 * @param {string} checkedBy
 * @returns {Promise<{ fields: object, log: string[] }>}
 */
export async function buildAccountSnapshot(checkedBy = 'Mac') {
  const log = []
  const fields = { checkedAt: new Date(), checkedBy }

  try {
    const account = await subscription()
    Object.assign(fields, account, {
      resetsAt: new Date(account.resetsAt),
      usage: usage().slice(-200),
    })
    log.push(`credits: ${account.limit - account.used} of ${account.limit} left, ${fields.usage.length} paid calls`)
  } catch (error) {
    log.push(`credits: ${error.message}`)
  }

  try {
    const fal = await falBalance()
    Object.assign(fields, {
      falBalance: fal.balance,
      falCurrency: fal.currency,
      falCheckedAt: new Date(),
      falCheckedBy: checkedBy,
    })
    log.push(`fal.ai: $${fal.balance.toFixed(2)} left`)
  } catch (error) {
    log.push(error.message)
  }

  const midtrans = await midtransRevenue(checkedBy)
  fields.midtrans = midtrans
  if (midtrans.error) log.push(`midtrans: ${midtrans.error}`)
  else log.push(`midtrans: Rp ${midtrans.grossIdr.toLocaleString('id-ID')} · ${midtrans.paidCount} paid (${midtrans.periodDays}d)`)

  const admob = await admobRevenue(checkedBy)
  fields.admob = admob
  if (admob.error) log.push(`admob: ${admob.error}`)
  else log.push(`admob: $${(admob.earningsMicros / 1e6).toFixed(2)} est. (${admob.periodDays}d)`)

  const appStore = await appStoreRevenue(checkedBy)
  fields.appStore = appStore
  if (appStore.error) log.push(`app store: ${appStore.error}`)
  else if (appStore.proceeds != null) log.push(`app store: $${appStore.proceeds.toFixed(2)} (${appStore.periodDays}d)`)
  else log.push(`app store: ${appStore.note || appStore.reason || 'ok'}`)

  const playStore = await playStoreRevenue(checkedBy)
  fields.playStore = playStore
  if (playStore.error) log.push(`play store: ${playStore.error}`)
  else if (playStore.earnings != null) log.push(`play store: $${playStore.earnings.toFixed(2)} (${playStore.periodDays}d)`)
  else log.push(`play store: ${playStore.note || playStore.reason || 'ok'}`)

  return { fields, log }
}
