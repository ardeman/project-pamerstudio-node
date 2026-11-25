// Generate Pamer VO for every Bilah narrative dialogue line (Indonesian primary).
// Reads keys from the Godot app's data/dialogue/*.json + seq/script usage.
//   node bilahaksara/scripts/dialogue-vo.mjs [--dry-run] [--en] [--only=key1,key2]
// Then: node bilahaksara/scripts/export-dialogue-vo.mjs && node bilahaksara/scripts/install-audio.mjs
//
// Credits ≈ 1 per character. Spoken lines only (talk / StoryCard / say_ids); toasts and UI stay silent.

import { readFileSync, readdirSync, existsSync, mkdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { dryRun, estimate, speak } from '../../shared/eleven.mjs'
import { app } from './app.mjs'
import {
  elevenVoiceId,
  resolveSpeaker,
  spokenText,
  voFileKey,
  voAssetStem,
} from './voices.mjs'

const dir = new URL('../audio/', import.meta.url).pathname
const VO_STORY = { stability: 0.48, similarity_boost: 0.72, style: 0.35, speed: 0.95 }
const VO_CHARACTER = { stability: 0.42, similarity_boost: 0.78, style: 0.42, speed: 1.0 }
const wantEn = process.argv.includes('--en')

// UI, toasts, labels, objectives — not spoken (see AGENTS.md prologue VO note).
const skipRe =
  /(\.hint$|\.btn[._]|\.npc_|title\.opt_|title\.lang|title\.mute|title\.tap$|title\.menu|title\.confirm|title\.name$|title\.subtitle|crew\.name_|crew\.cannon_|hud\.|gauge|trust\.|camp\.(food|med|morale)$|\.opt_|^(fail|pause|select|slots)\.|^ch9\.gate\.q\d_[abc]$|\.mat\.|world\.got_|world\.no_ammo|world\.rested|world\.skill\.|world\.recipe|world\.meal\.|world\.foe\.|world\.hidden$|world\.crouch$|world\.takedown$|world\.page_count|world\.sky_|world\.stone_|world\.patch_|world\.jala_|world\.barikade|world\.coast_gift|world\.meal_over|world\.quest|world\.map\.|world\.cook|world\.trade|world\.obj|world\.tracker|world\.place\.|world\.tab\.|world\.ammo|world\.weapon)/

const loadDialogue = () => {
  const folder = join(app, 'data/dialogue')
  const lines = {}
  const seqs = {}
  for (const name of readdirSync(folder)) {
    if (!name.endsWith('.json')) continue
    const data = JSON.parse(readFileSync(join(folder, name), 'utf8'))
    Object.assign(lines, data.lines ?? {})
    Object.assign(seqs, data.seqs ?? {})
  }
  return { lines, seqs }
}

const walkGd = (folder, out = []) => {
  for (const name of readdirSync(folder)) {
    const p = join(folder, name)
    if (statSync(p).isDirectory()) walkGd(p, out)
    else if (name.endsWith('.gd')) out.push(p)
  }
  return out
}

const collectKeys = (lines, seqs) => {
  const needed = new Set()
  for (const ids of Object.values(seqs)) for (const id of ids) needed.add(String(id))

  for (const path of walkGd(join(app, 'scripts'))) {
    const text = readFileSync(path, 'utf8')
    // Character talk bubbles: ["who", "dialogue.key"]
    for (const m of text.matchAll(/\["[a-z_]+",\s*"([^"]+)"\]/g)) needed.add(m[1])
    // Story cards / arrays of keys
    for (const m of text.matchAll(/StoryCard\.make\([^,]+,\s*\[([^\]]+)\]/g)) {
      for (const k of m[1].matchAll(/"([^"]+)"/g)) needed.add(k[1])
    }
    for (const m of text.matchAll(/Dialogue\.(?:line|seq_ids|seq)\("([^"]+)"\)/g)) {
      const key = m[1]
      if (seqs[key]) for (const id of seqs[key]) needed.add(String(id))
      // Dialogue.line alone includes toasts — only keep clearly narrative prefixes.
      else if (/^(pro|act|sauh|gudang|world\.(life|surau|room|sagara|dara|lintang|letnan|kapten|nelayan|ranti|bujang|kurir|aksara)|title\.tagline)/.test(key)) {
        needed.add(key)
      }
    }
    for (const m of text.matchAll(/say_ids\(\[([^\]]+)\]/g)) {
      for (const k of m[1].matchAll(/"([^"]+)"/g)) needed.add(k[1])
    }
    for (const m of text.matchAll(/say_seq\("([^"]+)"/g)) {
      for (const id of seqs[m[1]] ?? []) needed.add(String(id))
    }
    for (const m of text.matchAll(/Narrative\.show\([^,]+,\s*"([^"]+)"\)/g)) needed.add(m[1])
    for (const m of text.matchAll(/_say\([^,]+,\s*"([^"]+)"/g)) needed.add(m[1])
  }

  return [...needed]
    .filter((k) => lines[k] && typeof lines[k] === 'object')
    .filter((k) => !skipRe.test(k))
    .filter((k) => String(lines[k].id ?? '').trim().length >= 8)
    .sort()
}


const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const speakRetry = async (args, tries = 8) => {
  for (let i = 0; i < tries; i++) {
    try {
      const result = await speak(args)
      await sleep(700) // stay under ElevenLabs rate limits on long batches
      return result
    } catch (err) {
      const msg = String(err?.message ?? err)
      if (!msg.includes('429') && !msg.includes('rate_limit')) throw err
      const wait = 1500 * (i + 1)
      console.warn(`rate limited, wait ${wait}ms (${args.name})`)
      await sleep(wait)
    }
  }
  throw new Error(`rate limited too many times for ${args.name}`)
}

export const makeDialogueVo = async () => {
  mkdirSync(dir, { recursive: true })
  const { lines, seqs } = loadDialogue()
  // --only=key1,key2 regenerates just those lines (e.g. after a pronunciation fix).
  const onlyArg = process.argv.find((a) => a.startsWith('--only='))
  const only = onlyArg ? new Set(onlyArg.slice(7).split(',')) : null
  // With --only, take the listed keys as-is (they may be picked through variables in GDScript).
  const keys = only
    ? [...only].filter((k) => lines[k] && typeof lines[k] === 'object' && !skipRe.test(k)).sort()
    : collectKeys(lines, seqs)
  console.log(`narrative keys: ${keys.length}`)
  const files = {}
  let i = 0
  for (const key of keys) {
    i += 1
    const idText = spokenText(lines[key], 'id')
    const enText = spokenText(lines[key], 'en')
    const speaker = resolveSpeaker(key, lines[key])
    const asset = voAssetStem(key, speaker)
    const voice = elevenVoiceId(speaker)
    const settings = speaker === 'narrator' ? VO_STORY : VO_CHARACTER
    const name = `dlg-${asset}`
    if (i % 25 === 0) console.log(`… ${i}/${keys.length}`)
    files[voFileKey(key, speaker)] = (
      await speakRetry({ dir, lang: 'id', name, text: idText, voice, settings })
    ).file
    if (wantEn && enText) {
      files[`${voFileKey(key, speaker)}_en`] = (
        await speakRetry({
          dir,
          lang: 'en',
          name: `${name}-en`,
          text: enText,
          voice,
          settings,
        })
      ).file
    }
  }
  return files
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (!existsSync(join(app, 'data/dialogue'))) {
    console.error(`Godot dialogue folder missing at ${app}`)
    process.exit(1)
  }
  const files = await makeDialogueVo()
  if (dryRun) await estimate()
  else console.log(`${Object.keys(files).length} dialogue VO takes ready in bilahaksara/audio/`)
}
