// Gemini through Firebase AI Logic (Agent Platform Gemini API, billed to the
// pamer-studio project, as in Catat Saja), behind App Check: only this page
// on its own domains may call it. Loaded on first use, so the plan and the
// media don't wait for reCAPTCHA or the AI SDK.
// Check the model's retirement date on https://firebase.google.com/docs/ai-logic/models.
const MODEL = 'gemini-3.5-flash-lite'
const SDK = 'https://www.gstatic.com/firebasejs/13.0.0'
const SITE_KEY = '6LfkbAguAAAAALX2p5OEZjJLZDxOltIOjd97iD9y'

// Each app's caption limits: a copy of cobalagi/scripts/posting.mjs (keep both
// the same). `link` is what X counts for any link, however long.
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

const linkPattern = /\b(?:https?:\/\/\S+|[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|org|net|id|app|dev)(?:\/\S*)?)/gi

// Why a caption doesn't fit the app; empty when it does.
export function captionProblems(text, limits) {
  const problems = []
  const used = [...(limits.link ? text.replace(linkPattern, 'x'.repeat(limits.link)) : text)].length
  if (used > limits.caption) problems.push(`${used} characters (max ${limits.caption})`)
  const hashtags = text.match(/(?:^|\s)#[\p{L}\p{N}_]+/gu)?.length ?? 0
  if (limits.hashtags != null && hashtags > limits.hashtags) problems.push(`${hashtags} hashtags (max ${limits.hashtags})`)
  return problems
}

let loading = null
const load = (app) => (loading ??= (async () => {
  const [{ initializeAppCheck, ReCaptchaEnterpriseProvider }, ai] = await Promise.all([
    import(`${SDK}/firebase-app-check.js`),
    import(`${SDK}/firebase-ai.js`),
  ])
  // localhost needs a debug token registered in App Check; the SDK prints one.
  if (['localhost', '127.0.0.1'].includes(location.hostname)) self.FIREBASE_APPCHECK_DEBUG_TOKEN ??= true
  initializeAppCheck(app, { provider: new ReCaptchaEnterpriseProvider(SITE_KEY), isTokenAutoRefreshEnabled: true })
  return { ...ai, service: ai.getAI(app, { backend: new ai.AgentPlatformBackend() }) }
})())

// The rules in AGENTS.md that every answer follows. The plan is the only
// source of facts about the app.
const rules = (project) => `You help with marketing for the app "${project.name || project.id}". Everything you write is a draft the owner checks before use.
- Say only what the marketing plan below says the app does. Never invent features, numbers, prices, awards, reviews or dates. If something isn't in the plan, say so instead of guessing.
- Stories are about made-up people. Never present them as real customers or testimonials, and never name or describe real people or brands other than the app's own.
- Health topics: describe what is logged and shown, never a diagnosis or a medical promise.
- If the plan says the app isn't public yet, say "Coming soon"; never claim it is out.
- English and Indonesian are each written for that language: casual, the way people talk (Indonesian uses "kamu"), saying the same thing, never translated word for word.

The marketing plan:
${project.plan || '(none)'}`

async function json(app, project, prompt, properties) {
  const { getGenerativeModel, Schema, service } = await load(app)
  const fields = Object.fromEntries(Object.entries(properties).map(([key, kind]) =>
    [key, kind === 'list' ? Schema.array({ items: Schema.string() }) : Schema.string()]))
  const model = getGenerativeModel(service, {
    model: MODEL,
    systemInstruction: rules(project),
    generationConfig: { responseMimeType: 'application/json', responseSchema: Schema.object({ properties: fields }) },
  })
  const result = await model.generateContent(prompt)
  try {
    return JSON.parse(result.response.text())
  } catch {
    throw new Error('The answer came back unreadable; try again.')
  }
}

// A caption for one app, in both languages.
export const caption = (app, project, platform, ask) => {
  const limits = platforms[platform]
  const fit = [
    `at most ${limits.caption} characters${limits.link ? ` (every link counts as ${limits.link})` : ''}`,
    limits.hashtags != null && `at most ${limits.hashtags} hashtag${limits.hashtags === 1 ? '' : 's'}`,
  ].filter(Boolean).join(', ')
  return json(app, project,
    `Write a ${platform} caption, ${fit}, in English (en) and Indonesian (id). Use the plan's campaign link for ${platform} if it has one; otherwise leave links out. note: anything the owner should check, in one short English sentence, or empty.\n\nWhat it's for, or a caption to rewrite:\n${ask}`,
    { en: 'text', id: 'text', note: 'text' })
}

// Lines for a video, rendered later on the Mac.
export const videoLines = (app, project, ask) => json(app, project,
  `Draft the spoken lines for a short video, one line per item, in English (en) and Indonesian (id), the same number of lines in each. Short lines that are easy to say aloud. title: a short English working title.\n\nThe video:\n${ask}`,
  { title: 'text', en: 'list', id: 'list' })

// The whole plan with one change; summary says what changed.
export const changePlan = (app, project, plan, ask) => json(app, { ...project, plan }, `Change the marketing plan as asked below. plan: the whole plan in Markdown, changed only where the request needs it, everything else exactly as it was (headings, tables, links, ticked and unticked tasks). summary: what you changed, in one or two short English sentences.\n\nThe change:\n${ask}`,
  { plan: 'text', summary: 'text' })

// A chat about the project; it keeps its own history.
export async function chat(app, project) {
  const { getGenerativeModel, service } = await load(app)
  const model = getGenerativeModel(service, { model: MODEL, systemInstruction: `${rules(project)}\n\nAnswer in the language you are asked in, briefly, in Markdown.` })
  return model.startChat()
}
