// A menu in the terminal for every project here: the ElevenLabs credits on
// top, then each project's actions (<project>/menu.mjs). A paid render runs
// a free --dry-run first and asks before it buys anything. Usage:
//   npm start   (or node shared/cli.mjs)

import { spawnSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { emitKeypressEvents } from 'node:readline'

import { subscription, usage } from './eleven.mjs'

const ROOT = new URL('../', import.meta.url).pathname
const { stdin, stdout } = process
if (!stdin.isTTY) {
  console.error('Run this in a terminal.')
  process.exit(1)
}

const c = (code) => (text) => `\x1b[${code}m${text}\x1b[0m`
const bold = c(1)
const dim = c(2)
const cyan = c(36)
const yellow = c(33)
const num = (n) => Math.round(n).toLocaleString('en-US')
const day = (ms) => new Date(ms).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

const projects = []
for (const entry of readdirSync(ROOT, { withFileTypes: true })) {
  const file = `${ROOT}${entry.name}/menu.mjs`
  if (entry.isDirectory() && existsSync(file)) projects.push({ name: entry.name, menu: (await import(file)).menu })
}

let header = ''
const refresh = async () => {
  try {
    const a = await subscription()
    const width = Math.max(10, Math.min(30, stdout.columns - 50))
    const full = Math.round((a.used / a.limit) * width)
    header = `${bold('ElevenLabs')}  ${cyan('█'.repeat(full))}${dim('░'.repeat(width - full))}  ${bold(num(a.limit - a.used))} left of ${num(a.limit)} · resets ${day(a.resetsAt)}`
  } catch (error) {
    header = yellow(`Couldn’t read the credits: ${error.message.slice(0, 80)}`)
  }
  const last = usage().slice(-3).reverse()
  if (last.length) header += `\n${dim(last.map((u) => `${u.kind} ${u.lang ?? ''} ${u.name}: ${u.credits}`).join(' · '))}`
}

emitKeypressEvents(stdin)

// Arrow keys (or j/k) and Enter; Esc or q goes back (null).
const select = (title, items, start = 0) =>
  new Promise((resolve) => {
    let at = start
    const draw = () => {
      stdout.write('\x1b[2J\x1b[H\x1b[?25l')
      stdout.write(`${header}\n\n${bold(title)}\n`)
      for (const [i, item] of items.entries()) {
        if (item.heading) stdout.write(`\n${dim(item.heading)}\n`)
        stdout.write(i === at ? `${cyan('›')} ${bold(item.label)}\n` : `  ${item.label}\n`)
      }
      stdout.write(`\n${dim('↑↓ move · enter choose · esc back · q quit')}`)
    }
    const done = (value) => {
      stdin.off('keypress', onKey)
      stdout.write('\x1b[?25h')
      resolve(value)
    }
    const onKey = (_, key = {}) => {
      if (key.ctrl && key.name === 'c') done('quit')
      else if (key.name === 'up' || key.name === 'k') at = (at + items.length - 1) % items.length
      else if (key.name === 'down' || key.name === 'j') at = (at + 1) % items.length
      else if (key.name === 'return') return done(items[at])
      else if (key.name === 'escape') return done(null)
      else if (key.name === 'q') return done('quit')
      draw()
    }
    stdin.setRawMode(true)
    stdin.resume()
    stdin.on('keypress', onKey)
    draw()
  })

const confirm = async (question) => {
  const answer = await select(question, [{ label: 'No' }, { label: 'Yes' }])
  return answer?.label === 'Yes'
}

const run = (args, capture) => {
  stdin.setRawMode(false)
  stdin.pause()
  if (!capture) stdout.write(`\x1b[2J\x1b[H${dim(`$ node ${args.join(' ')}`)}\n\n`)
  const result = spawnSync('node', args, { cwd: ROOT, stdio: capture ? ['inherit', 'pipe', 'inherit'] : 'inherit', encoding: 'utf8' })
  return result
}

const pause = (message) =>
  new Promise((resolve) => {
    stdout.write(`\n${message}\n${dim('Press any key to go back.')}`)
    stdin.setRawMode(true)
    stdin.resume()
    stdin.once('keypress', () => resolve())
  })

const act = async (project, action) => {
  const args = []
  for (const pick of action.pick ?? []) {
    const options = pick.options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o))
    const chosen = await select(`${action.label} › ${pick.title}`, options)
    if (!chosen) return
    if (chosen === 'quit') return 'quit'
    if (chosen.value !== null) args.push(chosen.value)
  }
  const command = [`${project.name}/${action.script}`, ...args, ...(action.flags ?? [])]
  if (action.paid) {
    stdout.write(`\x1b[2J\x1b[H${dim('Checking what this would buy (free)…')}\n`)
    const dry = run([...command, '--dry-run'], true)
    if (dry.status !== 0) return pause(yellow('The dry run failed.'))
    // ElevenLabs costs credits (eleven.mjs), fal.ai dollars (fal.mjs).
    const cost = dry.stdout.match(/~(\d+)(\+?) credits for (\d+) new/) ?? dry.stdout.match(/~(\$[\d.]+)(\+?) for (\d+) new/)
    if (cost) {
      stdout.write(`\x1b[2J\x1b[H${dry.stdout}`)
      stdin.setRawMode(true)
      if (!(await confirm(`${dry.stdout.trim().split('\n').pop()}\nBuy ~${cost[1]}${cost[2]}${cost[1].startsWith('$') ? '' : ' credits'} and render?`))) return
    }
  }
  const result = run(command)
  await refresh()
  await pause(result.status === 0 ? cyan('Done.') : yellow(`Stopped (exit ${result.status}).`))
}

await refresh()
const items = [
  ...projects.flatMap((project) => project.menu.map((action, i) => ({ ...action, project, heading: i ? undefined : project.name }))),
  { label: 'Send the credits to the web dashboard', heading: 'everything', dashboard: true },
  { label: 'Quit', quit: true },
]
let at = 0
while (true) {
  const chosen = await select('What do you want to do?', items, at)
  if (!chosen || chosen === 'quit' || chosen.quit) break
  at = items.indexOf(chosen)
  if (chosen.dashboard) {
    const result = run(['shared/cloud.mjs', 'account'])
    await pause(result.status === 0 ? cyan('Done: see the Dashboard tab on pamer-studio.web.app.') : yellow(`Stopped (exit ${result.status}).`))
    continue
  }
  if ((await act(chosen.project, chosen)) === 'quit') break
}
stdin.setRawMode(false)
stdout.write('\x1b[2J\x1b[H')
process.exit(0)
