#!/usr/bin/env node
// One local run: Pamer Studio web + the store-screenshot editor.
//   node shared/studio.mjs
//   Studio  → http://localhost:4173/   (Screenshots tab embeds the editor)
//   Editor  → http://127.0.0.1:3456/   (same Next process, also openable alone)

import { spawn } from 'node:child_process'
import { createReadStream, existsSync, statSync } from 'node:fs'
import http from 'node:http'
import { extname, join, normalize, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = fileURLToPath(new URL('..', import.meta.url))
const WEB = join(ROOT, 'web', 'public')
const SHOTS = join(ROOT, 'store-screenshots')
const STUDIO_PORT = Number(process.env.STUDIO_PORT) || 4173
const EDITOR_PORT = Number(process.env.EDITOR_PORT) || 3456
const EDITOR_HOST = '127.0.0.1'

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.map': 'application/json',
}

if (!existsSync(join(WEB, 'index.html'))) {
  console.error('Missing web/public/index.html')
  process.exit(1)
}
if (!existsSync(join(SHOTS, 'package.json'))) {
  console.error('Missing store-screenshots/package.json')
  process.exit(1)
}

const children = []
const stop = (code = 0) => {
  for (const child of children) {
    try { child.kill('SIGTERM') } catch {}
  }
  process.exit(code)
}
process.on('SIGINT', () => stop(0))
process.on('SIGTERM', () => stop(0))

const pm = existsSync(join(SHOTS, 'pnpm-lock.yaml')) ? 'pnpm'
  : existsSync(join(SHOTS, 'yarn.lock')) ? 'yarn' : 'npm'
const editorArgs = pm === 'npm'
  ? ['run', 'dev', '--', '-p', String(EDITOR_PORT), '-H', EDITOR_HOST]
  : pm === 'yarn'
    ? ['dev', '-p', String(EDITOR_PORT), '-H', EDITOR_HOST]
    : ['exec', 'next', 'dev', '-p', String(EDITOR_PORT), '-H', EDITOR_HOST]

console.log(`Starting screenshot editor on ${EDITOR_HOST}:${EDITOR_PORT} (${pm})…`)
const editor = spawn(pm, editorArgs, { cwd: SHOTS, stdio: 'inherit', shell: process.platform === 'win32' })
children.push(editor)
editor.on('exit', (code, signal) => {
  if (signal) return
  console.error(`Screenshot editor exited (${code ?? '?'}).`)
  stop(code || 1)
})

const safeFile = (urlPath) => {
  const decoded = decodeURIComponent((urlPath.split('?')[0] || '/'))
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\//, '')
  const full = normalize(join(WEB, relative))
  if (!full.startsWith(WEB + sep) && full !== WEB) return null
  return full
}

const server = http.createServer((req, res) => {
  const file = safeFile(req.url || '/')
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('Not found')
    return
  }
  res.writeHead(200, {
    'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-cache',
  })
  createReadStream(file).pipe(res)
})

server.listen(STUDIO_PORT, '127.0.0.1', () => {
  console.log(`
Pamer Studio (local)
  Web + Screenshots tab  http://127.0.0.1:${STUDIO_PORT}/
  Screenshot editor      http://127.0.0.1:${EDITOR_PORT}/

Sign in on the web tab as usual. Open Screenshots there to edit store shots in-page.
Ctrl+C stops both.
`)
})
server.on('error', (error) => {
  console.error(error.message)
  stop(1)
})
