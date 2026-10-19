// Seeds one demo account per person in the stories videos on the local
// emulators, and captures their screens into shots/<lang>/stories/. Run it
// from the app repo, with `pnpm emulators` running there:
//   node ../../assets/ai-generated-content/catatsaja/scripts/capture-stories.mjs <en|id>
// ONLY=name,name captures just those shots (the accounts are seeded anyway).

import { readFileSync } from 'node:fs'
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

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
} from '../../../../github/project-catatsaja-reactrouter/tests/e2e/helpers.mjs'

import { bookSeed } from './book-seed.mjs'
import { accounts, content, hendraReceipt, passphraseOf, wulanReceipt } from './stories-data.mjs'

const lang = process.argv[2] ?? 'en'
// Gemini's fixed answer for the people who scan a receipt.
const receipts = { wulan: wulanReceipt(), hendra: hendraReceipt() }
const OUT = new URL(`../shots/${lang}/stories/`, import.meta.url).pathname
const DATABASE =
  'http://127.0.0.1:8080/v1/projects/demo-catatsaja/databases/(default)/documents'
const ADMIN = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }
// The app's own words, so the shots find the same labels it shows.
const t = JSON.parse(
  readFileSync(new URL(`../../../../github/project-catatsaja-reactrouter/app/localization/locales/${lang}/common.json`, import.meta.url), 'utf8'),
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

// Gemini's answer to a receipt scan, as the e2e tests fake it: the screens
// stay real without calling Gemini.
const fakeGemini = (context, receipt) =>
  context.route('**/firebasevertexai.googleapis.com/**', (route) =>
    route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        candidates: [{ index: 0, finishReason: 'STOP', content: { role: 'model', parts: [{ text: JSON.stringify(receipt) }] } }],
      }),
    }),
  )

const uids = {}
const ids = {}
let minutes = 0

const add = async (collection, owner, item) => {
  const { with: shared = {}, pinned, ...fields } = item
  const { data, months } = collection === 'finances' ? bookSeed(fields) : { data: fields, months: [] }
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
  const id = json.name.split('/').pop()
  ids[`${owner}.${collection}`] = id
  for (const { month, content } of months) {
    const monthResponse = await fetch(`${DATABASE}/finances/${id}/months?documentId=${month}`, {
      method: 'POST',
      headers: ADMIN,
      body: JSON.stringify({ fields: toValue({ month, content }).mapValue.fields }),
    })
    if (!monthResponse.ok) throw new Error(await monthResponse.text())
  }
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
      // The people who scan have said yes to Gemini already, so the notice doesn't show.
      ...(receipts[key] && { aiConsent: toValue(true) }),
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
    if (receipts[key]) await fakeGemini(context, receipts[key])
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
  for (const owner of ['rina', 'sari', 'adit', 'maya', 'nadia', 'wulan', 'hendra']) {
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
      // A card, or the top part of one drawn in two (the book's totals,
      // which float on their own, above its accounts).
      const isCard = (n) => n.classList?.contains('border') && (n.classList.contains('rounded-xl') || n.classList.contains('rounded-t-xl'))
      while (box && !isCard(box)) box = box.parentElement
      const r = (box ?? node).getBoundingClientRect()
      const rest = box?.classList.contains('rounded-t-xl') ? box.nextElementSibling : undefined
      if (rest?.classList.contains('rounded-b-xl')) {
        const b = rest.getBoundingClientRect()
        return { x: r.x, y: r.y, width: r.width, height: b.bottom - r.y }
      }
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    })
  }
  const text = (value) => (page) => page.getByText(value, { exact: true })
  // The top of a card, down to an element in it (a long card's first part).
  const cardTo = (locate, until) => async (page) => {
    const box = await cardOf(locate)(page)
    const end = await until(page).first().boundingBox()
    return { ...box, height: end.y + end.height + 20 - box.y }
  }
  // The email field and the person's row, down to their email.
  const shareCard = (key) => async (page) => {
    const dialog = page.getByRole('dialog')
    const a = await dialog.locator('input[name=user]').boundingBox()
    const b = await dialog.getByText(accounts[key].email, { exact: true }).boundingBox()
    return { x: a.x - 16, y: a.y - 16, width: a.width + 32, height: b.y + b.height + 20 - a.y }
  }

  const shoot = async ({ name, who, path, desk, full, act, card }) => {
    const page = await deviceOf(who, desk)
    // An unsaved entry is kept as a draft and would reopen on the next shot.
    await page.evaluate(() => {
      for (const storage of [localStorage, sessionStorage])
        for (const key of Object.keys(storage)) if (key.startsWith('catatsaja-draft:')) storage.removeItem(key)
    })
    await page.goto(`${APP}${path}`)
    // Past the start-up screen, which the first page of a device can take a while on.
    await page.getByRole('navigation').first().waitFor({ timeout: 60_000 })
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
  const cycle = `/health/${ids['nadia.healthLogs']}`
  const household = `/finances/${ids['wulan.finances']}`
  const shop = `/finances/${ids['hendra.finances']}`
  // A photo to choose; its content doesn't matter, Gemini's answer is fixed.
  const receiptPhoto = path.join(await mkdtemp(path.join(tmpdir(), 'catatsaja-stories-')), 'receipt.jpg')
  await writeFile(receiptPhoto, await (await deviceOf('wulan')).screenshot({ type: 'jpeg' }))
  // Scanned and checked item by item, as she'd add a big shop.
  const scan = async (page) => {
    await page.getByRole('button', { name: 'Gemini', exact: true }).click()
    const chooser = page.waitForEvent('filechooser')
    await page.getByRole('button', { name: t.finances.receipt.scan }).click()
    await (await chooser).setFiles(receiptPhoto)
    await page.getByText(t.finances.receipt.review).first().waitFor({ timeout: 30_000 })
    await tab(t.finances.receipt.mode.items)(page)
  }
  const countOf = (key) => receipts[key].items.length
  // Adds the scanned items: the shots after it show them in the book.
  const addReceipt = (key) => async (page) => {
    await scan(page)
    await page.getByRole('button', { name: t.finances.receipt.add_other.replace('{{count}}', countOf(key)) }).click()
    await page.waitForTimeout(4000)
  }
  // From "Check the receipt" down, without the Gemini card's header, so every item stays readable.
  const receiptCard = (key) => async (page) => {
    const total = text(t.finances.receipt.chosenTotal_other.replace('{{count}}', countOf(key)))
    const box = await cardTo(text(t.finances.receipt.review), total)(page)
    const top = (await text(t.finances.receipt.review)(page).first().boundingBox()).y - 14
    return { ...box, y: top, height: box.y + box.height - top }
  }
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
    // Nadia: her period calendar, the reminder before it, and encryption on.
    { name: 'nadia-calendar', who: 'nadia', path: cycle, act: async (page) => { await tab(t.health.kinds.period)(page); await scroll(page, 460) } },
    { name: 'nadia-crop-next', who: 'nadia', path: cycle, act: tab(t.health.kinds.period), card: cardTo(text(t.health.period.next), (page) => page.getByText(t.health.period.disclaimer.split(':')[0], { exact: false })) },
    { name: 'nadia-overview', who: 'nadia', path: cycle },
    { name: 'nadia-crop-reminders', who: 'nadia', path: cycle, card: cardTo(text(t.health.reminders.title), text(t.health.reminders.periodBefore_other.replace('{{count}}', 3))) },
    { name: 'nadia-crop-encryption', who: 'nadia', path: '/settings/account', card: cardTo(text(t.encryption.settings.on), text(t.encryption.settings.on)) },
    // Wulan: her monthly-shop receipt, read by Gemini, checked item by item,
    // then where the money went. `wulan-added` adds it, so it comes after the
    // receipt shots and before the analysis ones.
    { name: 'wulan-book', who: 'wulan', path: household },
    { name: 'wulan-receipt', who: 'wulan', path: household, act: scan },
    { name: 'wulan-receipt-2', who: 'wulan', path: household, act: async (page) => { await scan(page); await scroll(page, 500) } },
    { name: 'wulan-crop-receipt', who: 'wulan', path: household, act: scan, card: receiptCard('wulan') },
    { name: 'wulan-added', who: 'wulan', path: household, act: addReceipt('wulan') },
    { name: 'wulan-analysis', who: 'wulan', path: household, act: async (page) => { await tab(t.finances.view.analysis)(page); await scroll(page, 520) } },
    { name: 'wulan-crop-categories', who: 'wulan', path: household, act: tab(t.finances.view.analysis), card: cardOf(text(t.finances.analysis.categories.title)) },
    // Hendra: a wholesaler's invoice, then his weeks. Nine weeks of entries,
    // so the cash flow is per week, as his line and tag say.
    { name: 'hendra-book', who: 'hendra', path: shop },
    { name: 'hendra-receipt', who: 'hendra', path: shop, act: scan },
    { name: 'hendra-crop-receipt', who: 'hendra', path: shop, act: scan, card: receiptCard('hendra') },
    { name: 'hendra-added', who: 'hendra', path: shop, act: addReceipt('hendra') },
    { name: 'hendra-analysis', who: 'hendra', path: shop, act: async (page) => { await tab(t.finances.view.analysis)(page); await scroll(page, 520) } },
    { name: 'hendra-crop-cashflow', who: 'hendra', path: shop, act: tab(t.finances.view.analysis), card: cardOf(text(t.finances.analysis.cashFlow.title)) },
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
