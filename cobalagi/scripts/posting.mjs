// What the posting scripts share: the calendar, the campaign links from
// marketing-plan.md, and each app's caption limits.
import { readFileSync, writeFileSync } from 'node:fs'

const root = new URL('../', import.meta.url)
export const calendarFile = new URL('calendar.json', root)
export const captionsFile = new URL('captions.json', root)
export const readCalendar = () => JSON.parse(readFileSync(calendarFile, 'utf8'))
export const readCaptions = () => JSON.parse(readFileSync(captionsFile, 'utf8'))

// utm_source → its Play and App Store links, from the campaign links table.
export function campaignLinks() {
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

// Each app's limits, the strictest of what its app and its posting API allow.
// `link` is what X counts for any link, however long. web/public/ai.js has a
// copy for the AI tab: change both together.
export const platforms = {
  X: { caption: 280, link: 23 },
  Threads: { caption: 500, hashtags: 1 },
  Instagram: { caption: 2200, hashtags: 5 },
  TikTok: { caption: 2200 },
  LinkedIn: { caption: 3000 },
  YouTube: { title: 100, caption: 5000 },
  Facebook: { caption: 63206 },
  WhatsApp: { caption: 700 },
}

// The platform for a name like "Instagram (Reels and Stories)".
export function platformOf(name) {
  const key = Object.keys(platforms).find((key) => name === key || name.startsWith(`${key} `))
  return key && platforms[key]
}

// Links with or without https://, as the apps turn both into links.
const linkPattern = /\b(?:https?:\/\/\S+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|id|app|dev)(?:\/\S*)?)/gi

// Its length as the app counts it: characters, not UTF-16 units.
export function length(text, limits) {
  const counted = limits.link ? text.replace(linkPattern, 'x'.repeat(limits.link)) : text
  return [...counted].length
}

// Why a text doesn't fit the app; empty when it does.
export function captionProblems(text, limits, field = 'caption') {
  const problems = []
  const max = limits[field]
  const used = length(text, limits)
  if (used > max) problems.push(`${field} is ${used} characters (max ${max})`)
  const hashtags = text.match(/(?:^|\s)#[\p{L}\p{N}_]+/gu)?.length ?? 0
  if (field === 'caption' && limits.hashtags != null && hashtags > limits.hashtags) problems.push(`${hashtags} hashtags (max ${limits.hashtags})`)
  if (/\{[a-zA-Z]+\}/.test(text)) problems.push(`${field} has an unfilled {…}`)
  return problems
}

export const langsOf = (entry) => (entry.lang === 'both' ? ['en', 'id'] : [entry.lang])
export const writeCalendar = (calendar) => writeFileSync(calendarFile, JSON.stringify(calendar, null, 2) + '\n')

// Puts the entry's campaign links in: {play} and {appStore} in captions,
// "<Play link, …>" and "<App Store link, …>" (or "<link Play, …>") in drafts.
export function fillLinks(text, link) {
  return text
    .replaceAll('{play}', link?.play ?? '{play}')
    .replaceAll('{appStore}', link?.appStore ?? '{appStore}')
    .replace(/<(?:Play link|link Play)\b[^>]*>/g, (m) => link?.play ?? m)
    .replace(/<(?:App Store link|link App Store)\b[^>]*>/g, (m) => link?.appStore ?? m)
}

// [{ lang, title?, caption }] for an entry in captions.json, filled.
export function captionsOf(entry, posts, links) {
  const post = posts[entry.id]
  const fill = (text) => fillLinks(text, links[entry.source])
  return langsOf(entry).map((lang) => ({
    lang,
    title: post.title && fill(post.title[lang] ?? ''),
    caption: post[lang] == null ? null : fill(post[lang]),
  }))
}

// A Markdown draft's section in order: what gets pasted ("- **Title:** …",
// To and Subject lines, quoted text, each with its label) and the advice
// between them (label null).
export function draftParts(entry, link) {
  const lines = readFileSync(new URL(entry.draft, root), 'utf8').split('\n')
  const start = lines.findIndex((line) => /^#+ /.test(line) && line.replace(/^#+ /, '') === entry.section)
  if (start < 0) return null
  const level = lines[start].match(/^#+/)[0].length
  const parts = []
  let label = null
  const add = (part) => {
    const last = parts.at(-1)
    if (part.label === null && last?.label === null && !last.quote) last.text += `\n${part.text}`
    else if (part.quote && last?.quote) last.text += `\n${part.text}`
    else parts.push(part)
  }
  for (const line of lines.slice(start + 1)) {
    const heading = line.match(/^(#+) /)
    if (heading && heading[1].length <= level) break
    let m
    if (line.startsWith('>')) add({ label: label ?? 'Text', text: line.replace(/^> ?/, ''), quote: true })
    else if ((m = line.match(/^- \*\*([^*]+?):\*\*\s+(\S.*)$/))) add({ label: m[1], text: m[2] })
    else if ((m = line.match(/^(To|Subject): (.+)$/))) add({ label: m[1], text: m[2] })
    else {
      m = line.match(/^- \*\*([^*]+?):?\*\*/)
      if (m) label = m[1]
      // A bare "- **Description:**" only names the quote below it.
      if (!/^- \*\*[^*]+\*\*:?\s*$/.test(line)) add({ label: null, text: line })
    }
  }
  return parts
    .map(({ label, text }) => ({ label, text: fillLinks(text.trim(), link) }))
    .filter((part) => part.text)
}

// Each calendar entry as Pamer Studio shows it: [id, post], with its
// captions checked against the app's limits, or its draft split into parts.
// shared/cloud.mjs pushes these; `posted` and `approved` come back on pull.
export function cloudPosts() {
  const links = campaignLinks()
  const { posts } = readCaptions()
  return readCalendar().entries.map((entry) => {
    const link = links[entry.source] ?? null
    const limits = platformOf(entry.platform) ?? null
    const post = {
      date: entry.date,
      platform: entry.platform,
      lang: entry.lang,
      source: entry.source,
      link,
      draft: entry.draft ? [entry.draft, entry.section].filter(Boolean).join(' → ') : null,
      notes: entry.notes ?? '',
      limits,
      captions: null,
      parts: null,
    }
    if (entry.draft === 'captions.json' && posts[entry.id]) {
      post.captions = captionsOf(entry, posts, links).map(({ lang, title, caption }) => ({
        lang,
        title: title ?? null,
        caption,
        used: limits && caption != null ? length(caption, limits) : null,
        problems: caption == null ? [`no ${lang} caption`]
          : !limits ? [`no limits for ${entry.platform}`]
          : [...captionProblems(caption, limits), ...(limits.title ? (title ? captionProblems(title, limits, 'title') : ['no title']) : [])],
      }))
    } else if (entry.draft && entry.draft !== 'captions.json') {
      post.parts = draftParts(entry, link)
    }
    return [entry.id, post]
  })
}
