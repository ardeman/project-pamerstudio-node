// The posting calendar (cobalagi/calendar.json): what goes out when, where,
// with which campaign link, and whether it is posted.
//   node cobalagi/scripts/calendar.mjs                  # what is not posted yet
//   node cobalagi/scripts/calendar.mjs --all            # everything
//   node cobalagi/scripts/calendar.mjs --posted <id> [YYYY-MM-DD] [notes]
//   node cobalagi/scripts/calendar.mjs --check          # links and drafts only
// Links come from Results in marketing-plan.md, so they stay in one place.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
const calendarFile = new URL('calendar.json', root)
const calendar = JSON.parse(readFileSync(calendarFile, 'utf8'))

// utm_source → its Play and App Store links, from the campaign links table.
function campaignLinks() {
  const links = {}
  const plan = readFileSync(new URL('marketing-plan.md', root), 'utf8')
  for (const line of plan.split('\n')) {
    const cells = line.split('|').map((cell) => cell.trim())
    const play = cells.find((cell) => cell.startsWith('https://play.google.com/'))
    const appStore = cells.find((cell) => cell.startsWith('https://apps.apple.com/'))
    const source = play && new URL(play).searchParams.get('utm_source')
    if (source && appStore) links[source] = { play, appStore }
  }
  return links
}

const today = new Date().toISOString().slice(0, 10)
const dateFormat = /^\d{4}-\d{2}-\d{2}$/

// Refuses a calendar with an unknown campaign source or a missing draft, so a
// wrong link is caught before it is posted.
function check(links) {
  const problems = []
  const ids = new Set()
  for (const entry of calendar.entries) {
    if (ids.has(entry.id)) problems.push(`${entry.id}: the id is used twice`)
    ids.add(entry.id)
    if (!dateFormat.test(entry.date)) problems.push(`${entry.id}: date ${entry.date} is not YYYY-MM-DD`)
    if (!links[entry.source]) problems.push(`${entry.id}: no campaign link for source "${entry.source}" in marketing-plan.md`)
    if (!['en', 'id', 'both'].includes(entry.lang)) problems.push(`${entry.id}: lang must be en, id or both`)
    if (entry.draft) {
      const file = new URL(entry.draft, root)
      if (!existsSync(file)) problems.push(`${entry.id}: no draft file ${entry.draft}`)
      else if (entry.section && !readFileSync(file, 'utf8').split('\n').some((line) => /^#+ /.test(line) && line.replace(/^#+ /, '') === entry.section)) {
        problems.push(`${entry.id}: no heading "${entry.section}" in ${entry.draft}`)
      }
    }
  }
  return problems
}

function markPosted(id, date = today, notes) {
  const entry = calendar.entries.find((e) => e.id === id)
  if (!entry) throw new Error(`No entry ${id}. Ids: ${calendar.entries.map((e) => e.id).join(', ')}`)
  if (!dateFormat.test(date)) throw new Error(`${date} is not YYYY-MM-DD`)
  entry.posted = date
  if (notes) entry.notes = notes
  writeFileSync(calendarFile, JSON.stringify(calendar, null, 2) + '\n')
  console.log(`${id}: posted ${date}`)
}

function list(links, all) {
  const entries = calendar.entries
    .filter((entry) => all || !entry.posted)
    .sort((a, b) => a.date.localeCompare(b.date))
  let date
  for (const entry of entries) {
    if (entry.date !== date) {
      date = entry.date
      const when = date < today ? ' (overdue)' : date === today ? ' (today)' : ''
      console.log(`\n${date}${when}`)
    }
    const status = entry.posted ? `posted ${entry.posted}` : entry.draft ? 'ready' : 'to draft'
    const draft = entry.draft ? `${entry.draft} → ${entry.section ?? ''}` : 'no draft yet'
    console.log(`  ${entry.id} · ${entry.platform} · ${entry.lang} · ${status}`)
    console.log(`    ${draft}`)
    console.log(`    ${links[entry.source]?.play ?? '?'}`)
    console.log(`    ${links[entry.source]?.appStore ?? '?'}`)
    if (entry.notes) console.log(`    ${entry.notes}`)
  }
  if (!entries.length) console.log('Everything is posted.')
}

const args = process.argv.slice(2)
const links = campaignLinks()
const problems = check(links)
for (const problem of problems) console.error(problem)

if (args[0] === '--posted') {
  if (!args[1]) throw new Error('Usage: --posted <id> [YYYY-MM-DD] [notes]')
  markPosted(args[1], args[2], args.slice(3).join(' '))
} else if (args[0] === '--check') {
  if (!problems.length) console.log(`${calendar.entries.length} entries, every link and draft found.`)
} else {
  list(links, args[0] === '--all')
}
process.exitCode = problems.length ? 1 : 0
