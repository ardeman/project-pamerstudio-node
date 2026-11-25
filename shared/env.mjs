// Shared .env loader for Mac-side sync scripts.
import { existsSync, readFileSync } from 'node:fs'

const ROOT = new URL('../', import.meta.url).pathname
const envFile = `${ROOT}.env`

export const ROOT_DIR = ROOT

export const env = Object.fromEntries(
  existsSync(envFile)
    ? readFileSync(envFile, 'utf8')
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && !line.startsWith('#') && line.includes('='))
        .map((line) => {
          const at = line.indexOf('=')
          return [line.slice(0, at).trim(), line.slice(at + 1).trim().replace(/^["']|["']$/g, '')]
        })
    : [],
)

export const envGet = (key, fallback = '') => env[key] ?? process.env[key] ?? fallback
