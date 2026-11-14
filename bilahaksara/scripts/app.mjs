// Path to Bilah Aksara's Godot repo: BILAH_APP, or ../project-bilahaksara-godot.

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const app = resolve(
  process.env.BILAH_APP ?? fileURLToPath(new URL('../../../project-bilahaksara-godot', import.meta.url)),
)
