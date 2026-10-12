// Seeds a demo account on the local emulators and captures the app's
// screens for the promo videos. Run it from the app repo, with
// `pnpm emulators` running there:
//   node ../ai-generated-content/catatsaja/scripts/capture.mjs <en|id> [explore]

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

import { demo } from './demo-data.mjs'

const lang = process.argv[2] ?? 'en'
const explore = process.argv[3] === 'explore'
const OUT = new URL(`../shots/${lang}/`, import.meta.url).pathname
const DATABASE =
  'http://127.0.0.1:8080/v1/projects/demo-catatsaja/databases/(default)/documents'
const ADMIN = { Authorization: 'Bearer owner', 'Content-Type': 'application/json' }

const toValue = (value) => {
  if (value === null || value === undefined) return { nullValue: null }
  if (value instanceof Date) return { timestampValue: value.toISOString() }
  if (Array.isArray(value))
    return { arrayValue: { values: value.map((item) => toValue(item)) } }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number')
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value }
  if (typeof value === 'object')
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, toValue(item)]),
        ),
      },
    }
  return { stringValue: String(value) }
}

const ids = {}
let minutes = 0

const add = async (collection, item, me, partner) => {
  const { shared, pinned, ...data } = item
  const readers = shared ? [me, partner] : [me]
  minutes += 37
  const created = new Date(Date.parse('2026-10-11T09:00:00Z') - minutes * 60_000)
  const document = {
    ...data,
    owner: me,
    permissions: { read: readers, write: readers },
    createdAt: created,
    updatedAt: created,
    ...(pinned && { pinnedBy: [me] }),
  }
  const response = await fetch(`${DATABASE}/${collection}`, {
    method: 'POST',
    headers: ADMIN,
    body: JSON.stringify({ fields: toValue(document).mapValue.fields }),
  })
  const json = await response.json()
  if (!response.ok) throw new Error(JSON.stringify(json))
  const id = json.name.split('/').pop()
  ;(ids[collection] ??= []).push(id)
  return id
}

const currencyFormat =
  lang === 'id'
    ? {
        thousandSeparator: '.',
        decimalSeparator: ',',
        minimumFractionDigits: 0,
        currencyPlacement: 'before',
        currencyType: 'symbol',
        addSpace: true,
      }
    : {
        thousandSeparator: ',',
        decimalSeparator: '.',
        minimumFractionDigits: 0,
        currencyPlacement: 'before',
        currencyType: 'symbol',
        addSpace: true,
      }

await mkdir(OUT, { recursive: true })
await resetEmulators()
const server = await startApp()
const browser = await launch()
try {
  const data = demo(lang)

  // The partner first, so shared items can be sealed for them too.
  const partnerContext = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  const partnerPage = await partnerContext.newPage()
  await signUp(partnerPage, data.people.partner, 'budi@example.com')
  await partnerPage.getByText('Protect your data').waitFor({ timeout: 60_000 })
  await setUpEncryption(partnerPage, 'budi demo passphrase')
  await partnerContext.close()

  const setup = await browser.newContext({ viewport: { width: 1100, height: 900 } })
  const page = await setup.newPage()
  await signUp(page, data.people.me, 'rina@example.com')
  await page.getByText('Protect your data').waitFor({ timeout: 60_000 })
  await setUpEncryption(page, 'rina demo passphrase')
  await page.waitForURL(/\/notes/, { timeout: 30_000 })

  const me = await uidOf('rina@example.com')
  const partner = await uidOf('budi@example.com')
  await dbPatch(`users/${me}`, {
    language: toValue(lang),
    theme: toValue('light'),
    currencyFormat: toValue(currencyFormat),
    defaultCurrency: toValue('IDR'),
  })
  // Oldest first, so the first of each list ends up newest.
  for (const note of data.notes.toReversed()) await add('notes', note, me, partner)
  for (const task of data.tasks.toReversed()) await add('tasks', task, me, partner)
  for (const book of data.books.toReversed()) await add('finances', book, me, partner)
  for (const log of data.health.toReversed()) await add('healthLogs', log, me, partner)
  for (const key of Object.keys(ids)) ids[key].reverse()

  // Reloading unlocked encrypts the seeded items (encryptOwnItems).
  await page.reload()
  await page.waitForTimeout(8000)
  await setup.close()

  const contexts = {}
  const deviceFor = async (width) => {
    const key = width > 800 ? 'desk' : 'phone'
    if (contexts[key]) return contexts[key]
    const context = await browser.newContext({
      viewport: { width, height: 844 },
      deviceScaleFactor: key === 'desk' ? 2 : 3,
    })
    const devicePage = await context.newPage()
    await signIn(devicePage, 'rina@example.com')
    const gate = devicePage.getByText(/Unlock your data|Buka datamu/).first()
    await gate.waitFor({ timeout: 30_000 })
    await devicePage.locator('input[name=passphrase]').fill('rina demo passphrase')
    await devicePage.locator('input[name=passphrase]').press('Enter')
    await gate.waitFor({ state: 'hidden', timeout: 30_000 })
    await context.addCookies([{ name: 'i18next', value: lang, url: APP }])
    contexts[key] = devicePage
    return devicePage
  }

  const shoot = async ({ name, path, width = 390, height = 844, scheme = 'light', full = false, act, card }) => {
    const shotPage = await deviceFor(width)
    await shotPage.setViewportSize({ width, height })
    await shotPage.emulateMedia({ colorScheme: scheme })
    await shotPage.goto(`${APP}${path}`)
    await shotPage.waitForTimeout(3500)
    await shotPage.evaluate((dark) => document.documentElement.classList.toggle('dark', dark), scheme === 'dark')
    if (act) await act(shotPage)
    await shotPage.waitForTimeout(300)
    if (card) {
      // The card (rounded, bordered box) around an element, or a box.
      const box = await card(shotPage)
      await shotPage.screenshot({ path: `${OUT}${name}.png`, clip: box })
    } else await shotPage.screenshot({ path: `${OUT}${name}.png`, fullPage: full })
    console.log('shot', name)
  }

  const L = {
    en: { analysis: 'Analysis', body: 'Body', share: 'Share', add: 'Add entry', security: 'Security', unlock: 'Unlock your data', typed: 'Grab to the airport' },
    id: { analysis: 'Analisis', body: 'Tubuh', share: 'Bagikan', add: 'Tambah entri', security: 'Keamanan', unlock: 'Buka datamu', typed: 'Grab ke bandara' },
  }[lang]
  const scroll = async (shotPage, y) => {
    await shotPage.mouse.move(195, 420)
    await shotPage.mouse.wheel(0, y)
    await shotPage.waitForTimeout(800)
  }
  const tab = (name) => async (shotPage) => {
    await shotPage.getByText(name, { exact: true }).first().click()
    await shotPage.waitForTimeout(2000)
  }

  const shots = [
    { name: 'notes', path: '/notes' },
    { name: 'note', path: `/notes/${ids.notes[0]}` },
    { name: 'tasks', path: '/tasks' },
    { name: 'task', path: `/tasks/${ids.tasks[0]}` },
    { name: 'finances', path: '/finances' },
    { name: 'finance', path: `/finances/${ids.finances[0]}` },
    { name: 'finance-analysis', path: `/finances/${ids.finances[0]}`, act: async (p) => { await tab(L.analysis)(p); await scroll(p, 520) } },
    { name: 'finance-analysis-2', path: `/finances/${ids.finances[0]}`, act: async (p) => { await tab(L.analysis)(p); await scroll(p, 1250) } },
    { name: 'entry-suggest', path: `/finances/${ids.finances[0]}`, act: async (p) => {
      await p.getByRole('button', { name: L.add }).first().click()
      await p.waitForTimeout(1200)
      await p.locator('input[name=description]').fill(L.typed)
      await p.locator('input[name=description]').blur()
      await p.waitForTimeout(1500)
    } },
    { name: 'share', path: `/finances/${ids.finances[1]}`, act: async (p) => {
      await p.getByRole('button', { name: L.share }).first().click()
      await p.waitForTimeout(2500)
    } },
    { name: 'health', path: '/health' },
    { name: 'health-me', path: `/health/${ids.healthLogs[0]}` },
    { name: 'health-me-body', path: `/health/${ids.healthLogs[0]}`, act: tab(L.body) },
    { name: 'health-child-body', path: `/health/${ids.healthLogs[1]}`, act: tab(L.body) },
    { name: 'health-child-body-2', path: `/health/${ids.healthLogs[1]}`, act: async (p) => { await tab(L.body)(p); await scroll(p, 500) } },
    { name: 'security', path: '/settings/account', act: async (p) => {
      await p.getByText(L.security, { exact: true }).first().scrollIntoViewIfNeeded()
      await p.getByText(L.security, { exact: true }).first().evaluate((el) => el.scrollIntoView({ block: 'start' }))
      await scroll(p, -90)
    } },
    { name: 'notes-dark', path: '/notes', scheme: 'dark' },
    { name: 'finance-dark', path: `/finances/${ids.finances[0]}`, scheme: 'dark', act: async (p) => { await tab(L.analysis)(p); await scroll(p, 520) } },
    { name: 'desk-notes', path: '/notes', width: 1440, height: 900 },
    { name: 'desk-tasks', path: '/tasks', width: 1440, height: 900 },
    { name: 'desk-finance', path: `/finances/${ids.finances[0]}`, width: 1440, height: 900 },
    { name: 'desk-finance-analysis', path: `/finances/${ids.finances[0]}`, width: 1440, height: 900, act: async (p) => { await tab(L.analysis)(p); await scroll(p, 300) } },
    { name: 'desk-health', path: `/health`, width: 1440, height: 900 },
    { name: 'desk-health-child', path: `/health/${ids.healthLogs[1]}`, width: 1440, height: 900, act: tab(L.body) },
    { name: 'desk-share', path: `/finances/${ids.finances[1]}`, width: 1440, height: 900, act: async (p) => {
      await p.getByRole('button', { name: L.share }).first().click()
      await p.waitForTimeout(2500)
    } },
  ]
  const L2 = {
    en: { balance: 'Balance', categories: 'By category', cashFlow: 'Cash flow', weight: 'Weight over time', growth: 'Growth (WHO standards)' },
    id: { balance: 'Saldo', categories: 'Per kategori', cashFlow: 'Arus kas', weight: 'Berat badan dari waktu ke waktu', growth: 'Tumbuh kembang (standar WHO)' },
  }[lang]
  const cardOf = (locate) => async (p) => {
    const target = locate(p).first()
    await target.scrollIntoViewIfNeeded()
    await target.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await p.waitForTimeout(700)
    return target.evaluate((el) => {
      let node = el
      while (node && !(node.classList?.contains('rounded-xl') && node.classList.contains('border'))) node = node.parentElement
      const r = (node ?? el).getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    })
  }
  const text = (value) => (p) => p.getByText(value, { exact: true })
  const data2 = demo(lang)
  shots.push(
    { name: 'crop-note', path: '/notes', card: cardOf(text(data2.notes[0].title)) },
    { name: 'crop-task', path: '/tasks', card: cardOf(text(data2.tasks[0].title)) },
    { name: 'crop-balance', path: `/finances/${ids.finances[0]}`, card: cardOf(text(L2.balance)) },
    { name: 'crop-categories', path: `/finances/${ids.finances[0]}`, act: tab(L.analysis), card: cardOf(text(L2.categories)) },
    { name: 'crop-cashflow', path: `/finances/${ids.finances[0]}`, act: tab(L.analysis), card: cardOf(text(L2.cashFlow)) },
    { name: 'crop-entry', path: `/finances/${ids.finances[0]}`, act: shots.find((x) => x.name === 'entry-suggest').act, card: cardOf((p) => p.locator('input[name=description]')) },
    { name: 'crop-health-me', path: '/health', card: cardOf(text(data2.people.me)) },
    { name: 'crop-weight', path: `/health/${ids.healthLogs[0]}`, act: tab(L.body), card: cardOf(text(L2.weight)) },
    { name: 'crop-growth', path: `/health/${ids.healthLogs[1]}`, act: tab(L.body), card: cardOf(text(L2.growth)) },
    { name: 'crop-security', path: '/settings/account', card: cardOf(text(L.security)) },
    { name: 'crop-share', path: `/finances/${ids.finances[1]}`, act: shots.find((x) => x.name === 'share').act, card: async (p) => {
      const a = await p.getByRole('dialog').locator('input[name=user]').boundingBox()
      const b = await p.getByRole('dialog').getByText(data2.people.partner, { exact: true }).boundingBox()
      return { x: a.x - 16, y: a.y - 16, width: a.width + 32, height: b.y + b.height + 30 - a.y }
    } },
  )
  const only = process.env.ONLY?.split(',')
  for (const shot of shots) if (!only || only.includes(shot.name)) await shoot(shot)

  // Signed out: the landing page and the unlock screen.
  for (const [name, width, height] of [['landing', 390, 844], ['desk-landing', 1440, 900]]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: width > 800 ? 2 : 3 })
    await context.addCookies([{ name: 'i18next', value: lang, url: APP }])
    const fresh = await context.newPage()
    await fresh.goto(`${APP}/`)
    await fresh.waitForTimeout(3000)
    await fresh.screenshot({ path: `${OUT}${name}.png` })
    if (width < 800) {
      await signIn(fresh, 'rina@example.com')
      await fresh.getByText(L.unlock).first().waitFor({ timeout: 30_000 })
      await fresh.waitForTimeout(1500)
      await fresh.screenshot({ path: `${OUT}unlock.png` })
    }
    await context.close()
    console.log('shot', name)
  }
  console.log(JSON.stringify(ids))
} finally {
  await browser.close()
  stopApp(server)
}
