// The Coba Lagi app repo, which has the words, voices, music, screenshots and
// version the videos use: COBALAGI_APP, or ../project_cobalagi_flutter.
import { resolve } from 'node:path'

export const app = resolve(process.env.COBALAGI_APP ?? new URL('../../../project_cobalagi_flutter', import.meta.url).pathname)
