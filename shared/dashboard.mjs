// A local page to look over every project: the ElevenLabs credits (read on
// this machine, so the key never goes in the page), what each paid call cost
// (../usage.jsonl), and every project's stills and videos. Usage:
//   node shared/dashboard.mjs [--no-open]
// It writes ../dashboard.html; run it again to refresh.

import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { relative } from 'node:path'

import { subscription, usage } from './eleven.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const OUT = `${ROOT}dashboard.html`

const esc = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const src = (file) => encodeURI(relative(ROOT, file))
const num = (n) => Math.round(n).toLocaleString('en-US')
const day = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

const walk = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
  )

const projects = readdirSync(ROOT, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(`${ROOT}${entry.name}/out`))
  .map(({ name }) => {
    const files = walk(`${ROOT}${name}/out`)
    // Stills are named <format>-<lang>-<nn>-<scene>.png: group them per video.
    const groups = {}
    for (const file of files.filter((f) => f.includes('/stills/') && f.endsWith('.png')).sort()) {
      const match = file.split('/').pop().match(/^(.+)-(\d\d)-(.+)\.png$/)
      if (!match) continue
      const key = `${relative(`${ROOT}${name}/out`, file.slice(0, file.lastIndexOf('/stills/')))}|${match[1]}`
      ;(groups[key] ??= []).push({ file, scene: match[3] })
    }
    const videos = files
      .filter((f) => f.endsWith('.mp4'))
      .map((file) => ({ file, ...statSync(file) }))
      .sort((a, b) => b.mtimeMs - a.mtimeMs)
    return { name, groups, videos }
  })

let account
try {
  account = await subscription()
} catch (error) {
  console.error('credits:', error.message)
}
const log = usage().reverse()
const period = account ? log.filter((u) => Date.parse(u.at) > account.resetsAt - 30 * 864e5) : log
const spent = {}
for (const u of period) spent[u.project] = (spent[u.project] ?? 0) + (u.credits ?? 0)

const langOf = (group) => group.split('-').pop()
const langs = [...new Set(projects.flatMap((p) => Object.keys(p.groups).map(langOf)))].sort()

const credits = account
  ? `<div class="credits">
      <div class="big">${num(account.limit - account.used)} <span>credits left</span></div>
      <div class="bar" role="img" aria-label="${num(account.used)} of ${num(account.limit)} used"><i style="width:${Math.min(100, (account.used / account.limit) * 100).toFixed(1)}%"></i></div>
      <div class="muted">${num(account.used)} of ${num(account.limit)} used · resets ${day(account.resetsAt)} · ${esc(account.tier)} plan</div>
    </div>`
  : '<p class="muted">Couldn’t read the credits (see the terminal).</p>'

const spending = log.length
  ? `<p class="muted">This period: ${Object.entries(spent).map(([p, c]) => `${esc(p)} ${num(c)}`).join(' · ') || 'nothing yet'}</p>
    <div class="scroll"><table>
      <thead><tr><th>When</th><th>Project</th><th>What</th><th>Size</th><th class="r">Estimate</th><th class="r">Charged</th><th class="r">Left</th></tr></thead>
      <tbody>${log
        .slice(0, 50)
        .map(
          (u) => `<tr><td>${esc(new Date(u.at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }))}</td><td>${esc(u.project)}</td><td>${esc(u.kind)} ${esc(u.lang ?? '')} ${esc(u.name)}</td><td>${u.chars ? `${u.chars} chars` : `${u.seconds} s`}</td><td class="r">${num(u.estimate ?? 0)}</td><td class="r">${num(u.credits ?? 0)}</td><td class="r">${num(u.left ?? 0)}</td></tr>`,
        )
        .join('')}</tbody>
    </table></div>`
  : '<p class="muted">No paid calls logged yet. Each new voice clip or music track adds a row.</p>'

const media = projects
  .map(
    (p) => `<section>
      <h2>${esc(p.name)}</h2>
      ${Object.entries(p.groups)
        .map(([key, stills]) => {
          const [folder, group] = key.split('|')
          return `<details class="group" data-lang="${esc(langOf(group))}" open>
            <summary>${esc(folder ? `${folder} · ` : '')}${esc(group)} <span class="muted">${stills.length} stills</span></summary>
            <div class="stills">${stills.map((s) => `<a href="${src(s.file)}" target="_blank"><img loading="lazy" src="${src(s.file)}" alt="${esc(s.scene)}"><span>${esc(s.scene)}</span></a>`).join('')}</div>
          </details>`
        })
        .join('')}
      ${
        p.videos.length
          ? `<h3>Videos</h3><div class="videos">${p.videos
              .map((v) => `<figure><video controls preload="none" src="${src(v.file)}"></video><figcaption>${esc(v.file.split('/').pop())}<br><span class="muted">${(v.size / 1e6).toFixed(1)} MB · ${day(v.mtimeMs)}</span></figcaption></figure>`)
              .join('')}</div>`
          : ''
      }
    </section>`,
  )
  .join('')

writeFileSync(
  OUT,
  `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Media Dashboard</title>
<style>
  :root { --bg: #f7f7f5; --card: #fff; --text: #1d1d1b; --muted: #6b6b66; --line: #e3e3de; --accent: #2f6fdf; --track: #e6e9ef; }
  @media (prefers-color-scheme: dark) { :root { --bg: #141413; --card: #1e1e1c; --text: #ececea; --muted: #9a9a94; --line: #33332f; --accent: #6b9cf5; --track: #2a2d33; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--bg); color: var(--text); font: 15px/1.5 system-ui, sans-serif; }
  main { max-width: 1200px; margin: 0 auto; padding: 24px 16px 64px; }
  header { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 8px; }
  h1 { font-size: 22px; margin: 0; } h2 { font-size: 18px; margin: 32px 0 8px; } h3 { font-size: 15px; margin: 20px 0 8px; }
  .muted { color: var(--muted); font-size: 13px; font-weight: normal; }
  .card { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 16px; margin-top: 16px; }
  .big { font-size: 32px; font-weight: 600; font-variant-numeric: tabular-nums; } .big span { font-size: 15px; font-weight: normal; color: var(--muted); }
  .bar { height: 10px; background: var(--track); border-radius: 5px; overflow: hidden; margin: 8px 0; } .bar i { display: block; height: 100%; background: var(--accent); }
  .scroll { overflow-x: auto; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; font-variant-numeric: tabular-nums; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid var(--line); white-space: nowrap; } th { color: var(--muted); font-weight: 500; } .r { text-align: right; }
  .filters { display: flex; gap: 6px; margin: 16px 0 0; flex-wrap: wrap; }
  .filters button { font: inherit; padding: 4px 12px; border-radius: 999px; border: 1px solid var(--line); background: var(--card); color: var(--text); cursor: pointer; }
  .filters button[aria-pressed="true"] { background: var(--accent); border-color: var(--accent); color: #fff; }
  details.group { margin: 8px 0; } summary { cursor: pointer; font-weight: 500; padding: 4px 0; }
  .stills { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 8px; margin-top: 6px; }
  .stills a { color: var(--muted); text-decoration: none; font-size: 12px; } .stills img { width: 100%; display: block; border-radius: 6px; border: 1px solid var(--line); background: var(--track); }
  .videos { display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px; }
  figure { margin: 0; } video { width: 100%; max-height: 360px; background: #000; border-radius: 8px; } figcaption { font-size: 13px; word-break: break-all; }
</style>
</head>
<body>
<main>
  <header><h1>Media dashboard</h1><span class="muted">Updated ${esc(new Date().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }))} · node shared/dashboard.mjs to refresh</span></header>
  <div class="card"><h2 style="margin-top:0">ElevenLabs credits</h2>${credits}</div>
  <div class="card"><h2 style="margin-top:0">Spending</h2>${spending}</div>
  <div class="filters" role="group" aria-label="Language">${['all', ...langs].map((l) => `<button data-lang="${esc(l)}" aria-pressed="${l === 'all'}">${l === 'all' ? 'All' : esc(l.toUpperCase())}</button>`).join('')}</div>
  ${media}
</main>
<script>
  const buttons = document.querySelectorAll('.filters button')
  for (const button of buttons) button.addEventListener('click', () => {
    for (const b of buttons) b.setAttribute('aria-pressed', b === button)
    for (const g of document.querySelectorAll('.group')) g.hidden = button.dataset.lang !== 'all' && g.dataset.lang !== button.dataset.lang
  })
</script>
</body>
</html>
`,
)
console.log(`dashboard: ${relative(process.cwd(), OUT) || OUT}`)
if (!process.argv.includes('--no-open')) execFileSync('open', [OUT])
