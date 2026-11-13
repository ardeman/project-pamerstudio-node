// Path to Krida's app repo: KRIDA_APP, or ../project-krida-kmp next to this studio.

import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const app = resolve(
  process.env.KRIDA_APP ?? fileURLToPath(new URL('../../../project-krida-kmp', import.meta.url)),
)
