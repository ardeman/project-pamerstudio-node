// Seeds one demo account per person in the stories videos on the local
// emulators, and captures their screens into shots/<lang>/stories/. Run it
// from the app repo, with `pnpm emulators` running there:
//   node ../ai-generated-content/catatsaja/scripts/capture-stories.mjs <en|id>
// ONLY=name,name captures just those shots (the accounts are seeded anyway).

import { readFileSync } from 'node:fs'
import { mkdir } from 'node:fs/promises'

import {
  APP,
  dbPatch,
  launch,
  resetEmulators,
  setUpEncryption,
  signIn,
  signUp,
  startApp,
  stopApp,
  uidOf,
} from '../../../project-catatsaja-reactrouter/tests/e2e/helpers.mjs'

import { accounts, content, passphraseOf } from './stories-data.mjs'

const lang = process.argv[2] ?? 'en'
const OUT = new URL(`../shots/${lang}/stories/`, import.meta.url).pathname
const DATABASE =
  'http://127.0.0.1:8080/v1/projects/demo-catatsaja/databases/(default)/documents'
const ADMIN = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }
// The app's own words, so the shots find the same labels it shows.
const t = JSON.parse(
  readFileSync(new URL(`../../../project-catatsaja-reactrouter/app/localization/locales/${lang}/common.json`, import.meta.url), 'utf8'),
)

const toValue = (value) => {
  if (value === null || value === undefined) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value)) return { arrayValue: { values: value.map((item) => toValue(item)) } }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number')
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value }
  if (typeof value === 'object')
    return { mapValue: { fields: Object.fromEntries(Object.entries(value).map(([key, item]) => [key, toValue(item)])) } }
  return { stringValue: String(value) }
}

const currencyFormat = {
  thousandSeparator: lang === 'id' ? '.' : ',',
  decimalSeparator: lang === 'id' ? ',' : '.',
  minimumFractionDigits: 0,
  currencyPlacement: 'before',
  currencyType: 'symbol',
  addSpace: true,
}

const uids = {}
const ids = {}
let minutes = 0

const add = async (collection, owner, item) => {
  const { with: shared = {}, pinned, ...data } = item
  const people = Object.keys(shared)
  minutes += 37
  const created = new Date(Date.parse('2026-10-12T02:00:00Z') - minutes * 60_000)
  const document = {
    ...data,
    owner: uids[owner],
    permissions: {
      read: [uids[owner], ...people.map((key) => uids[key])],
      write: [uids[owner], ...people.filter((key) => shared[key] === 'write').map((key) => uids[key])],
    },
    createdAt: created,
    updatedAt: created,
    ...(pinned && { pinnedBy: [uids[owner]] }),
  }
  const response = await fetch(`${DATABASE}/${collection}`, {
    method: 'POST',
    headers: ADMIN,
    body: JSON.stringify({ fields: toValue(document).mapValue.fields }),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(json))
  ids[`${owner}.${collection}`] = json.name.split('/').pop()
}

await mkdir(OUT, { recursive: true })
await resetEmulators()
const server = await startApp()
const browser = await launch()
try {
  const data = content(lang)

  // Everyone signs up first, so items can be sealed for whoever they're
  // shared with.
  for (const [key, account] of Object.entries(accounts)) {
    const context = await browser.newContext({ viewport: { width: 1100, height: 900 } })
    const page = await context.newPage()
    await signUp(page, account.name, account.email)
    await page.getByText('Protect your data').waitFor({ timeout: 60_000 })
    await setUpEncryption(page, passphraseOf(key))
    await page.waitForURL(/\/notes/, { timeout: 30_000 })
    uids[key] = await uidOf(account.email)
    await dbPatch(`users/${uids[key]}`, {
      language: toValue(lang),
      theme: toValue('light'),
      currencyFormat: toValue(currencyFormat),
      defaultCurrency: toValue('IDR'),
    })
    await context.close()
    console.log('account', key)
  }

  for (const owner of Object.keys(accounts)) {
    for (const collection of ['notes', 'tasks', 'finances', 'healthLogs'])
      for (const item of data[owner]?.[collection] ?? []) await add(collection, owner, item)
  }

  // Signed in and unlocked, per person and screen size. Opening the app
  // unlocked encrypts the seeded items (encryptOwnItems).
  const devices = {}
  const deviceOf = async (key, desk = false) => {
    const name = `${key}-${desk ? 'desk' : 'phone'}`
    if (devices[name]) return devices[name]
    const context = await browser.newContext({
      viewport: desk ? { width: 1440, height: 900 } : { width: 390, height: 844 },
      deviceScaleFactor: desk ? 2 : 3,
    })
    await context.addCookies([{ name: 'i18next', value: lang, url: APP }])
    const page = await context.newPage()
    await signIn(page, accounts[key].email)
    const gate = page.getByText(t.encryption.unlock.title).first()
    await gate.waitFor({ timeout: 30_000 })
    await page.locator('input[name=passphrase]').fill(passphraseOf(key))
    await page.locator('input[name=passphrase]').press('Enter')
    await gate.waitFor({ state: 'hidden', timeout: 30_000 })
    devices[name] = page
    return page
  }
  for (const owner of ['rina', 'sari', 'adit', 'maya']) {
    const page = await deviceOf(owner)
    await page.waitForTimeout(8000)
  }

  const scroll = async (page, y) => {
    await page.mouse.move(195, 420)
    await page.mouse.wheel(0, y)
    await page.waitForTimeout(800)
  }
  // A section or view button (Segmented), not a card that shares its name.
  const tab = (name) => async (page) => {
    await page.getByRole('group').getByRole('button', { name, exact: true }).first().click()
    await page.waitForTimeout(2000)
  }
  const share = async (page) => {
    await page.getByRole('button', { name: t.actions.share }).first().click()
    await page.waitForTimeout(2500)
  }
  // The card (rounded, bordered box) around an element.
  const cardOf = (locate) => async (page) => {
    const target = locate(page).first()
    await target.scrollIntoViewIfNeeded()
    await target.evaluate((node) => node.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(700)
    return target.evaluate((node) => {
      let box = node
      while (box && !(box.classList?.contains('rounded-xl') && box.classList.contains('border'))) box = box.parentElement
      const r = (box ?? node).getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    })
  }
  const text = (value) => (page) => page.getByText(value, { exact: true })
  // The email field and the person's row, down to their email.
  const shareCard = (key) => async (page) => {
    const dialog = page.getByRole('dialog')
    const a = await dialog.locator('input[name=user]').boundingBox()
    const b = await dialog.getByText(accounts[key].email, { exact: true }).boundingBox()
    return { x: a.x - 16, y: a.y - 16, width: a.width + 32, height: b.y + b.height + 20 - a.y }
  }

  const shoot = async ({ name, who, path, desk, full, act, card }) => {
    const page = await deviceOf(who, desk)
    await page.goto(`${APP}${path}`)
    await page.waitForTimeout(3500)
    if (act) await act(page)
    await page.waitForTimeout(300)
    const file = `${OUT}${name}.png`
    if (card) {
      // Tall enough that a long card clears the bottom menu.
      const size = page.viewportSize()
      await page.setViewportSize({ width: size.width, height: 1600 })
      await page.waitForTimeout(500)
      await page.screenshot({ path: file, clip: await card(page) })
      await page.setViewportSize(size)
    } else await page.screenshot({ path: file, fullPage: full })
    console.log('shot', name)
  }

  const arka = `/health/${ids['rina.healthLogs']}`
  const groceries = `/tasks/${ids['sari.tasks']}`
  const home = `/finances/${ids['sari.finances']}`
  const trip = `/finances/${ids['adit.finances']}`
  const dad = `/health/${ids['maya.healthLogs']}`
  const typeEntry = async (page) => {
    await page.getByRole('button', { name: t.finances.entry.add }).first().click()
    await page.waitForTimeout(1200)
    await page.locator('input[name=description]').fill(data.typed)
    await page.locator('input[name=description]').blur()
    await page.waitForTimeout(1500)
  }
  const tick = async (page) => {
    for (const item of data.ticked) {
      await page.getByRole('checkbox', { name: item }).click()
      await page.waitForTimeout(400)
    }
    await page.waitForTimeout(3000)
  }

  const shots = [
    // Rina: Arka's growth, the reminder to weigh him, shared with Budi.
    { name: 'rina-arka', who: 'rina', path: arka, act: tab(t.health.kinds.body) },
    { name: 'rina-overview', who: 'rina', path: arka },
    { name: 'rina-crop-growth', who: 'rina', path: arka, act: tab(t.health.kinds.body), card: cardOf(text(t.health.growth.title)) },
    { name: 'rina-crop-reminders', who: 'rina', path: arka, card: cardOf(text(t.health.reminders.title)) },
    { name: 'rina-crop-share', who: 'rina', path: arka, act: share, card: shareCard('budi') },
    { name: 'rina-desk-arka', who: 'rina', path: arka, desk: true, act: tab(t.health.kinds.body) },
    // Sari and Dimas: the list before, Dimas ticks at the shop, Sari sees it.
    { name: 'sari-task-before', who: 'sari', path: groceries },
    { name: 'dimas-task', who: 'dimas', path: groceries, act: tick },
    { name: 'sari-task', who: 'sari', path: groceries },
    { name: 'sari-book', who: 'sari', path: home },
    { name: 'sari-entry-suggest', who: 'sari', path: home, act: typeEntry },
    { name: 'sari-crop-entry', who: 'sari', path: home, act: typeEntry, card: cardOf((page) => page.locator('input[name=description]')) },
    { name: 'sari-desk-book', who: 'sari', path: home, desk: true },
    // Adit: a trip book in rupiah with entries in yen.
    { name: 'adit-book', who: 'adit', path: trip },
    { name: 'adit-book-2', who: 'adit', path: trip, act: async (page) => scroll(page, 600) },
    { name: 'adit-crop-balance', who: 'adit', path: trip, card: cardOf(text(t.finances.summary.balance)) },
    { name: 'adit-analysis', who: 'adit', path: trip, act: async (page) => { await tab(t.finances.view.analysis)(page); await scroll(page, 520) } },
    { name: 'adit-crop-categories', who: 'adit', path: trip, act: tab(t.finances.view.analysis), card: cardOf(text(t.finances.analysis.categories.title)) },
    { name: 'adit-desk-book', who: 'adit', path: trip, desk: true },
    // Maya: her dad's blood sugar, the weekly reminder, shared with Andi.
    { name: 'maya-dad', who: 'maya', path: dad, act: tab(t.health.kinds.glucose) },
    { name: 'maya-overview', who: 'maya', path: dad },
    { name: 'maya-crop-glucose', who: 'maya', path: dad, act: tab(t.health.kinds.glucose), card: cardOf(text(t.health.ranges.glucose)) },
    { name: 'maya-crop-reminders', who: 'maya', path: dad, card: cardOf(text(t.health.reminders.title)) },
    { name: 'maya-crop-share', who: 'maya', path: dad, act: share, card: shareCard('andi') },
    { name: 'maya-desk-dad', who: 'maya', path: dad, desk: true, act: tab(t.health.kinds.glucose) },
  ]
  const only = process.env.ONLY?.split(',')
  for (const shot of shots) {
    if (only && !only.includes(shot.name)) continue
    try {
      await shoot(shot)
    } catch (error) {
      console.log('failed', shot.name, error.message.split('\n')[0])
    }
  }
  console.log(JSON.stringify(ids))
} finally {
  await browser.close()
  stopApp(server)
}
