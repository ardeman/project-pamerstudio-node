// What the posting scripts share: the calendar, the campaign links from
// marketing-plan.md, and each app's caption limits.
import { readFileSync } from 'node:fs'

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
