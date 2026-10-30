// Captions for the calendar's posts (cobalagi/captions.json), each filled with
// its entry's campaign links and checked against its app's limits.
//   node cobalagi/scripts/captions.mjs           # every caption not posted yet, ready to paste
//   node cobalagi/scripts/captions.mjs <id>...   # just these entries
//   node cobalagi/scripts/captions.mjs --check   # limits only
// Refuses to print while any caption doesn't fit, so a cut-off post can't be
// pasted.
import { campaignLinks, captionProblems, captionsOf, platformOf, readCalendar, readCaptions, length } from './posting.mjs'

const calendar = readCalendar()
const { posts } = readCaptions()
const links = campaignLinks()

function check() {
  const problems = []
  const entries = new Map(calendar.entries.map((entry) => [entry.id, entry]))
  for (const id of Object.keys(posts)) {
    const entry = entries.get(id)
    if (!entry) { problems.push(`${id}: not in calendar.json`); continue }
    if (entry.draft !== 'captions.json') problems.push(`${id}: its calendar entry's draft isn't captions.json`)
    const limits = platformOf(entry.platform)
    if (!limits) { problems.push(`${id}: no limits for platform "${entry.platform}" in posting.mjs`); continue }
    for (const { lang, title, caption } of captionsOf(entry, posts, links)) {
      if (caption == null) problems.push(`${id}: no ${lang} caption`)
      else problems.push(...captionProblems(caption, limits).map((p) => `${id} (${lang}): ${p}`))
      if (limits.title) {
        if (!title) problems.push(`${id} (${lang}): no title`)
        else problems.push(...captionProblems(title, limits, 'title').map((p) => `${id} (${lang}): ${p}`))
      }
    }
  }
  return problems
}

function print(entry) {
  const limits = platformOf(entry.platform)
  console.log(`\n=== ${entry.id} · ${entry.platform} · ${entry.date}${entry.posted ? ` · posted ${entry.posted}` : ''}`)
  for (const { lang, title, caption } of captionsOf(entry, posts, links)) {
    if (title) console.log(`\n--- ${lang} title (${length(title, limits)}/${limits.title})\n${title}`)
    console.log(`\n--- ${lang} (${length(caption, limits)}/${limits.caption})\n${caption}`)
  }
}

const args = process.argv.slice(2)
const problems = check()
if (problems.length) {
  console.error(problems.join('\n'))
  process.exit(1)
}
if (args[0] === '--check') {
  console.log(`${Object.keys(posts).length} posts, every caption fits.`)
} else {
  const unknown = args.filter((id) => !posts[id])
  if (unknown.length) {
    console.error(`No captions for ${unknown.join(', ')}. Captions: ${Object.keys(posts).join(', ') || 'none yet'}`)
    process.exit(1)
  }
  const entries = calendar.entries
    .filter((entry) => (args.length ? args.includes(entry.id) : posts[entry.id] && !entry.posted))
    .sort((a, b) => a.date.localeCompare(b.date))
  for (const entry of entries) print(entry)
  if (!entries.length) console.log('No captions waiting to be posted.')
}
