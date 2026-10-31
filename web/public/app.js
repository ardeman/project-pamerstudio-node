// Pamer Studio on the web: each project's marketing plan (tick tasks, edit it),
// its posts (preview, approve, mark posted), its media and cloud renders. shared/cloud.mjs pushes both from the Mac and pulls web edits.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-app.js'
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-auth.js'
import {
  addDoc, collection, doc, getFirestore, onSnapshot, query, serverTimestamp, updateDoc, where,
} from 'https://www.gstatic.com/firebasejs/13.0.0/firebase-firestore.js'
import { caption, captionProblems, changePlan, chat as startChat, platforms, videoLines } from './ai.js'

// A web app's config is public; the rules are what keep the data private.
const app = initializeApp({
  apiKey: 'AIzaSyCuYmjdFtnIk2fQI4YxMwJardOFY5G26nM',
  authDomain: 'pamer-studio.firebaseapp.com',
  projectId: 'pamer-studio',
  storageBucket: 'pamer-studio.firebasestorage.app',
  appId: '1:1095331486954:web:39fa95d258c6eb1ce30b93',
})
const OWNER = 'are.theman@gmail.com'
const auth = getAuth(app)
const db = getFirestore(app)

const $ = (id) => document.getElementById(id)
const esc = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
const remember = (key, value) => { try { localStorage.setItem(key, value) } catch {} }
const recall = (key) => { try { return localStorage.getItem(key) } catch { return null } }

let projects = []
let current = recall('project')
let view = recall('view') || 'plan'
let lang = recall('lang') || 'all'
let editing = false
let unsubscribe = null
let posts = { project: null, list: [], unsubscribe: null }
let renders = { project: null, list: [], unsubscribe: null }
let dash = { account: null, renders: [], unsubscribe: [] }
let postsFilter = recall('postsFilter') || 'todo'
let aiMode = recall('aiMode') || 'chat'
let aiShown = '' // the project and mode the AI view shows, so a snapshot doesn't wipe it
const chats = new Map() // project id → { session, messages }

$('google').onclick = () => signInWithPopup(auth, new GoogleAuthProvider())
$('signout').onclick = () => signOut(auth)

onAuthStateChanged(auth, (user) => {
  const allowed = user?.email === OWNER
  $('signin').hidden = allowed
  $('denied').hidden = !user || allowed
  $('app').hidden = !allowed
  $('signout').hidden = !user
  $('who').textContent = user?.email ?? ''
  unsubscribe?.()
  unsubscribe = null
  posts.unsubscribe?.()
  posts = { project: null, list: [], unsubscribe: null }
  renders.unsubscribe?.()
  renders = { project: null, list: [], unsubscribe: null }
  for (const stop of dash.unsubscribe) stop()
  dash = { account: null, renders: [], unsubscribe: [] }
  if (!allowed) return
  dash.unsubscribe = [
    onSnapshot(doc(db, 'dashboard', 'account'), (snap) => { dash.account = snap.data() ?? null; if (view === 'dashboard') renderDashboard() }),
    onSnapshot(collection(db, 'renders'), (snap) => { dash.renders = snap.docs.map((d) => ({ id: d.id, ...d.data() })); if (view === 'dashboard') renderDashboard() }),
  ]
  unsubscribe = onSnapshot(collection(db, 'projects'), (snap) => {
    projects = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    if (!projects.some((p) => p.id === current)) current = projects[0]?.id
    render()
  })
})

for (const button of document.querySelectorAll('#views button')) {
  button.onclick = () => {
    view = button.dataset.view
    remember('view', view)
    render()
  }
}

function render() {
  $('projects').innerHTML = projects
    .map((p) => `<button data-id="${esc(p.id)}" class="${p.id === current ? 'on' : ''}">${esc(p.name || p.id)}</button>`)
    .join('')
  for (const button of $('projects').querySelectorAll('button')) {
    button.onclick = () => {
      current = button.dataset.id
      editing = false
      remember('project', current)
      render()
    }
  }
  for (const button of document.querySelectorAll('#views button')) button.classList.toggle('on', button.dataset.view === view)
  $('plan').hidden = view !== 'plan'
  $('posts').hidden = view !== 'posts'
  $('media').hidden = view !== 'media'
  $('ai').hidden = view !== 'ai'
  $('render').hidden = view !== 'render'
  $('dashboard').hidden = view !== 'dashboard'
  if (view === 'dashboard') renderDashboard()
  const project = projects.find((p) => p.id === current)
  if (!project) {
    $('plan').innerHTML = '<p class="note">Nothing pushed yet: run <code>node shared/cloud.mjs push</code> on the Mac.</p>'
    $('posts').innerHTML = ''
    $('media').innerHTML = ''
    $('ai').innerHTML = ''
    $('render').innerHTML = ''
    aiShown = ''
    return
  }
  if (!editing) renderPlan(project)
  watchPosts(project)
  renderMedia(project)
  watchRenders(project)
  if (view === 'ai' && aiShown !== `${project.id}/${aiMode}`) renderAI(project)
}

// The current version of a project, after any snapshot since the view was drawn.
const latest = (project) => projects.find((p) => p.id === project.id) ?? project

// The plan

const savePlan = (project, plan) =>
  updateDoc(doc(db, 'projects', project.id), { plan, editedOnWeb: true, updatedAt: serverTimestamp() })

const when = (ts) => (ts?.toDate ? ts.toDate().toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '')

function renderPlan(project) {
  if (!project.plan) {
    $('plan').innerHTML = '<p class="note">This project has no marketing plan.</p>'
    return
  }
  const state = project.editedOnWeb
    ? '<span class="chip warn" title="Run node shared/cloud.mjs pull on the Mac">Changed here: pull it on the Mac</span>'
    : '<span class="chip ok">Same as on the Mac</span>'
  const tasks = project.plan.match(/^\s*(-|\d+\.)\s+\[( |x)\]/gm) ?? []
  const done = tasks.filter((t) => t.includes('[x]')).length
  const progress = tasks.length
    ? `<span class="progress"><span class="track"><span class="fill" style="width:${(100 * done) / tasks.length}%"></span></span>${done} of ${tasks.length} done</span>`
    : ''
  $('plan').innerHTML = `
    <div class="bar">${state}${progress}<span class="grow"></span><span class="note">Updated ${esc(when(project.updatedAt))}</span><button id="edit">Edit</button></div>
    <article class="doc">${markdown(project.plan)}</article>`
  $('edit').onclick = () => editPlan(project)
  countTasks($('plan'))
  const lines = project.plan.split('\n')
  for (const box of $('plan').querySelectorAll('input[data-line]')) {
    box.onchange = () => {
      const n = Number(box.dataset.line)
      lines[n] = lines[n].replace(/\[( |x)\]/, box.checked ? '[x]' : '[ ]')
      savePlan(project, lines.join('\n')).catch((error) => alert(error.message))
    }
  }
  for (const button of $('plan').querySelectorAll('button[data-copy]')) {
    button.onclick = () => copy(button, button.dataset.copy)
  }
}

function editPlan(project) {
  editing = true
  $('plan').innerHTML = `
    <div class="bar"><span class="note">Markdown, as in the file on the Mac.</span>
      <button id="cancel">Cancel</button><button id="save" class="primary">Save</button></div>
    <form id="askplan" class="ask"><input id="planask" placeholder="Ask AI to change the plan, e.g. add a task to post the trailer on Threads" autocomplete="off">
      <button class="primary">Ask AI</button></form>
    <p id="planai" class="note" hidden></p>
    <textarea id="text" spellcheck="false"></textarea>`
  $('text').value = project.plan
  // The AI's plan only goes into the editor; it saves when Save is pressed.
  $('askplan').onsubmit = (event) => {
    event.preventDefault()
    const ask = $('planask').value.trim()
    if (!ask) return
    const before = $('text').value
    busy($('askplan'), $('planai'), async () => {
      const answer = await changePlan(app, project, before, ask)
      if (!answer.plan?.trim()) throw new Error('The answer came back empty; try again.')
      $('text').value = answer.plan
      $('planask').value = ''
      $('planai').innerHTML = `${esc(answer.summary || 'Changed.')} Check it, then Save. <button class="small" id="undo">Undo</button>`
      $('undo').onclick = () => { $('text').value = before; $('planai').hidden = true }
    })
  }
  $('cancel').onclick = () => { editing = false; render() }
  $('save').onclick = async () => {
    $('save').disabled = true
    try {
      await savePlan(project, $('text').value)
      editing = false
      render()
    } catch (error) {
      alert(error.message)
      $('save').disabled = false
    }
  }
}

// Done / all tasks next to each section heading that has tasks.
function countTasks(root) {
  for (const h2 of root.querySelectorAll('h2')) {
    let done = 0
    let all = 0
    for (let el = h2.nextElementSibling; el && el.tagName !== 'H2'; el = el.nextElementSibling) {
      for (const box of el.querySelectorAll('input[type=checkbox]')) { all++; if (box.checked) done++ }
    }
    if (all) h2.insertAdjacentHTML('beforeend', `<span class="count${done === all ? ' all' : ''}">${done}/${all}</span>`)
  }
}

async function copy(button, text) {
  await navigator.clipboard.writeText(text)
  const label = button.textContent
  button.textContent = 'Copied'
  setTimeout(() => { button.textContent = label }, 1200)
}

// Enough Markdown for the plans: headings, lists with tasks, tables, code, links.
function inline(text, { copyLinks = false } = {}) {
  const codes = []
  let out = esc(text).replace(/`([^`]+)`/g, (_, code) => `\u0000${codes.push(code) - 1}\u0000`)
  out = out
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, (_, pre, url) =>
      copyLinks
        ? `${pre}<span class="link"><a href="${url}" target="_blank" rel="noopener">${url}</a><button data-copy="${url}">Copy</button></span>`
        : `${pre}<a href="${url}" target="_blank" rel="noopener">${url}</a>`)
  return out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`)
}

function markdown(text) {
  const lines = text.split('\n')
  const html = []
  let list = null
  const closeList = () => { if (list) html.push(`</${list}>`); list = null }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let m
    if (line.startsWith('```')) {
      closeList()
      const code = []
      while (++i < lines.length && !lines[i].startsWith('```')) code.push(lines[i])
      html.push(`<pre>${esc(code.join('\n'))}</pre>`)
    } else if ((m = line.match(/^(#{1,4})\s+(.*)/))) {
      closeList()
      html.push(`<h${m[1].length}>${inline(m[2])}</h${m[1].length}>`)
    } else if (line.startsWith('|')) {
      closeList()
      const rows = []
      while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++])
      i--
      const cells = (row) => row.replace(/^\||\|$/g, '').split('|').map((c) => c.trim())
      const body = rows.slice(rows[1]?.match(/^\|[\s:|-]+$/) ? 2 : 1)
      html.push(`<div class="table"><table><thead><tr>${cells(rows[0]).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body
        .map((row) => `<tr>${cells(row).map((c) => `<td>${inline(c, { copyLinks: true })}</td>`).join('')}</tr>`)
        .join('')}</tbody></table></div>`)
    } else if ((m = line.match(/^\s*(-|\d+\.)\s+(.*)/))) {
      const kind = m[1] === '-' ? 'ul' : 'ol'
      if (list !== kind) { closeList(); list = kind; html.push(`<${kind}>`) }
      const task = m[2].match(/^\[( |x)\]\s+(.*)/)
      html.push(task
        ? `<li class="task${task[1] === 'x' ? ' done' : ''}"><label><input type="checkbox" data-line="${i}"${task[1] === 'x' ? ' checked' : ''}><span>${inline(task[2])}</span></label></li>`
        : `<li>${inline(m[2])}</li>`)
    } else if (line.trim() === '') {
      closeList()
    } else {
      closeList()
      const para = [line]
      while (i + 1 < lines.length && lines[i + 1].trim() && !/^(#|\||```|\s*(-|\d+\.)\s)/.test(lines[i + 1])) para.push(lines[++i])
      html.push(`<p>${inline(para.join(' '))}</p>`)
    }
  }
  closeList()
  return html.join('\n')
}

// Posts: the calendar's entries (projects/{id}/posts), pushed with their
// captions checked or their drafts split into what gets pasted. Approving and
// marking posted reach calendar.json on pull.

function watchPosts(project) {
  if (posts.project === project.id) return renderPosts()
  posts.unsubscribe?.()
  posts = { project: project.id, list: [], unsubscribe: null, loaded: false }
  posts.unsubscribe = onSnapshot(collection(db, 'projects', project.id, 'posts'), (snap) => {
    posts.list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id))
    posts.loaded = true
    renderPosts()
  })
}

const today = () => new Date().toLocaleDateString('en-CA')
const day = (date) => new Date(`${date}T12:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
const setPost = (post, fields) =>
  updateDoc(doc(db, 'projects', posts.project, 'posts', post.id), { ...fields, changedOnWeb: serverTimestamp() }).catch((error) => alert(error.message))

function renderPosts() {
  if (!posts.loaded) return
  if (!posts.list.length) {
    $('posts').innerHTML = '<p class="note">No posting calendar for this project.</p>'
    return
  }
  const shown = posts.list.filter((p) => postsFilter === 'all' || !p.posted)
  const texts = [] // what each Copy button copies
  const copyButton = (text, label = 'Copy') => `<button class="small" data-copy-text="${texts.push(text) - 1}">${label}</button>`
  const groups = Map.groupBy(shown, (p) => p.date)
  $('posts').innerHTML = `
    <div class="bar"><nav class="filters">${[['todo', 'To post'], ['all', 'All']].map(([key, label]) => `<button data-filter="${key}" class="${key === postsFilter ? 'on' : ''}">${label}</button>`).join('')}</nav>
      <span class="note">${posts.list.filter((p) => p.posted).length} of ${posts.list.length} posted</span></div>
    ${shown.length ? '' : '<p class="note">Everything is posted.</p>'}
    ${[...groups].map(([date, items]) => {
      const due = date < today() ? ' <span class="chip warn">Overdue</span>' : date === today() ? ' <span class="chip ok">Today</span>' : ''
      return `<h2 class="day">${esc(day(date))}${due}</h2>${items.map((p) => postCard(p, copyButton)).join('')}`
    }).join('')}`
  for (const button of $('posts').querySelectorAll('button[data-filter]')) {
    button.onclick = () => { postsFilter = button.dataset.filter; remember('postsFilter', postsFilter); renderPosts() }
  }
  for (const button of $('posts').querySelectorAll('button[data-copy-text]')) {
    button.onclick = () => copy(button, texts[button.dataset.copyText])
  }
  for (const button of $('posts').querySelectorAll('button[data-act]')) {
    const post = posts.list.find((p) => p.id === button.closest('[data-post]').dataset.post)
    button.onclick = () => {
      button.disabled = true
      setPost(post, {
        approve: { approved: new Date().toISOString() },
        unapprove: { approved: null },
        posted: { posted: today() },
        unposted: { posted: null },
      }[button.dataset.act])
    }
  }
}

function postCard(p, copyButton) {
  const ready = p.captions?.every((c) => !c.problems.length)
  const status = p.posted ? `<span class="chip ok">Posted ${esc(day(p.posted))}</span>`
    : p.approved ? '<span class="chip ok">Approved</span>'
    : p.captions || p.parts ? '<span class="chip">Ready</span>'
    : '<span class="chip warn">To draft</span>'
  const langs = p.lang === 'both' ? 'EN + ID' : p.lang.toUpperCase()
  const links = p.link
    ? `<div class="links"><span class="note">Campaign links</span>${copyButton(p.link.play, 'Google Play')}${copyButton(p.link.appStore, 'App Store')}</div>`
    : '<p class="note error">No campaign link for this source.</p>'
  const body = p.captions ? p.captions.map((c) => captionPreview(p, c, copyButton)).join('')
    : p.parts ? p.parts.map((part) => part.label
      ? `<div class="part"><div class="part-head"><span class="label">${esc(part.label)}</span>${copyButton(part.text)}</div><div class="part-text">${linkify(part.text)}</div></div>`
      : `<div class="doc guide">${markdown(part.text)}</div>`).join('')
    : '<p class="note">Not drafted yet: a session on the Mac drafts it into captions.json.</p>'
  // Approving is for apps the server will post to (captions); the rest are posted by hand.
  const actions = [
    p.captions && !p.posted && (p.approved
      ? '<button class="small" data-act="unapprove">Unapprove</button>'
      : `<button class="small primary" data-act="approve"${ready ? '' : ' disabled title="Fix the captions first"'}>Approve</button>`),
    p.posted ? '<button class="small" data-act="unposted">Not posted</button>' : '<button class="small" data-act="posted">Mark as posted</button>',
  ].filter(Boolean).join('')
  return `<article class="post" data-post="${esc(p.id)}">
    <div class="post-head"><div><div class="name">${esc(p.platform)}</div><div class="meta"><span class="lang">${langs}</span><span>${esc(p.id)}</span>${p.draft ? `<span>${esc(p.draft)}</span>` : ''}</div></div>${status}</div>
    ${p.notes ? `<p class="note">${esc(p.notes)}</p>` : ''}
    ${body}
    ${links}
    <div class="actions">${p.approved && !p.posted ? '<span class="note">The server posts approved drafts once scheduled posting is built; until then, post it by hand.</span>' : ''}<span class="grow"></span>${actions}</div>
  </article>`
}

// A caption as the app shows it, with its length against the app's limit.
function captionPreview(p, c, copyButton) {
  const count = c.used != null ? `<span class="${c.used > p.limits.caption ? 'over' : ''}">${c.used} / ${p.limits.caption}</span>` : ''
  return `<div class="preview-post">
    <div class="part-head"><span class="label">${esc(p.platform)} · ${c.lang.toUpperCase()}</span>${count}<span class="grow"></span>${c.title ? copyButton(c.title, 'Copy title') : ''}${c.caption != null ? copyButton(c.caption) : ''}</div>
    ${c.title ? `<div class="post-title">${esc(c.title)}</div>` : ''}
    <div class="part-text">${c.caption != null ? linkify(c.caption) : ''}</div>
    ${c.problems.length ? `<p class="note error">${c.problems.map(esc).join(' · ')}</p>` : ''}
  </div>`
}

const linkify = (text) => esc(text).replace(/https?:\/\/[^\s<)]+/g, (url) => `<a href="${url}" target="_blank" rel="noopener">${url}</a>`)

// Media

function renderMedia(project) {
  const media = project.media ?? []
  if (!media.length) {
    $('media').innerHTML = '<p class="note">No media pushed for this project.</p>'
    return
  }
  const shown = media.filter((m) => lang === 'all' || new RegExp(`[-_.]${lang}([-_.]|$)`).test(m.path) || !/[-_.](en|id)([-_.]|$)/.test(m.path))
  // Paths start with out/; files right in it are the project's main media.
  const groups = Map.groupBy(shown, (m) => m.path.replace(/\/?[^/]+$/, '').replace(/^out\/?/, '') || 'Main')
  $('media').innerHTML = `
    <div class="bar"><nav class="filters">${['all', 'en', 'id'].map((l) => `<button data-lang="${l}" class="${l === lang ? 'on' : ''}">${l === 'all' ? 'All' : l.toUpperCase()}</button>`).join('')}</nav>
      <span class="note">${shown.length} files</span></div>
    ${[...groups].map(([folder, items]) => `<h2>${esc(folder)} <span class="note">${items.length}</span></h2><div class="grid">${items.map(item).join('')}</div>`).join('')}`
  for (const button of $('media').querySelectorAll('button[data-lang]')) {
    button.onclick = () => { lang = button.dataset.lang; remember('lang', lang); render() }
  }
  for (const button of $('media').querySelectorAll('button[data-text]')) {
    button.onclick = () => copy(button, media.find((m) => m.path === button.dataset.text).text)
  }
  for (const button of $('media').querySelectorAll('button[data-rewrite]')) {
    button.onclick = () => {
      view = 'ai'
      aiMode = 'caption'
      aiShown = ''
      render()
      $('captionask').value = `Rewrite this caption:\n\n${media.find((m) => m.path === button.dataset.rewrite).text}`
    }
  }
}

function item(m) {
  const name = m.path.split('/').pop()
  const size = m.size > 1e6 ? `${(m.size / 1e6).toFixed(1)} MB` : `${Math.ceil(m.size / 1e3)} KB`
  const preview = {
    video: `<video src="${esc(m.url)}#t=0.1" controls playsinline preload="metadata"></video>`,
    image: `<img src="${esc(m.url)}" loading="lazy" alt="">`,
    audio: `<audio src="${esc(m.url)}" controls preload="none"></audio>`,
    text: m.text != null ? `<pre>${esc(m.text)}</pre>` : '',
  }[m.type] ?? ''
  const language = name.match(/[-_.](en|id)([-_.]|$)/)?.[1]
  const copyText = m.text != null ? `<button class="small" data-text="${esc(m.path)}">Copy text</button>` : ''
  const rewrite = m.text != null && name.endsWith('.txt') ? `<button class="small" data-rewrite="${esc(m.path)}">Rewrite with AI</button>` : ''
  return `<div class="item"><div class="preview">${preview}</div><div class="info">
    <div><div class="name">${esc(name)}</div>
      <div class="meta">${language ? `<span class="lang">${language.toUpperCase()}</span>` : ''}<span>${m.type} · ${size}</span></div></div>
    <div class="actions"><a class="button small" href="${esc(m.url)}" target="_blank" rel="noopener">Open</a>${copyText}${rewrite}</div></div></div>`
}

// Render: ask the render job in the cloud (cloud/render.mjs) for a project's
// stills or video. A paid render is priced first, and only Approve buys it.

const STATUS = {
  requested: 'Waiting for the job', queued: 'Starting', pricing: 'Checking the price', priced: 'Waiting for approval',
  approved: 'Approved, waiting for the job', rendering: 'Rendering', done: 'Done', failed: 'Failed',
}
let renderForm = null // the action and picks being filled in, kept across snapshots

function watchRenders(project) {
  if (renders.project === project.id) return renderRenders(project)
  renders.unsubscribe?.()
  renders = { project: project.id, list: [], unsubscribe: null }
  renders.unsubscribe = onSnapshot(query(collection(db, 'renders'), where('project', '==', project.id)), (snap) => {
    renders.list = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt?.seconds ?? Infinity) - (a.createdAt?.seconds ?? Infinity))
    renderRenders(latest(project))
  })
}

function renderRenders(project) {
  const actions = project.renders ?? []
  if (!actions.length) {
    $('render').innerHTML = '<p class="note">No cloud renders for this project yet: rendering stays on the Mac.</p>'
    return
  }
  if (renderForm?.project !== project.id) renderForm = { project: project.id, action: actions[0].label, picks: {} }
  const action = actions.find((a) => a.label === renderForm.action) ?? actions[0]
  const select = (key, title, options, chosen) =>
    `<label class="field">${esc(title)} <select data-pick="${esc(key)}">${options.map((o) => `<option value="${esc(o.value ?? '')}"${(o.value ?? '') === chosen ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`
  const picks = action.pick.map((p, i) => select(i, p.title, p.options, renderForm.picks[i] ?? p.options[0].value ?? ''))
  $('render').innerHTML = `
    <form id="renderform" class="stack">
      <div class="bar">${select('action', 'Render', actions.map((a) => ({ label: a.label, value: a.label })), action.label)}</div>
      <div class="bar">${picks.join('')}</div>
      <div class="bar"><button class="primary">Request</button>
        <span class="note">${action.paid ? 'Priced first: nothing is bought until you approve.' : 'Free: no paid calls.'}</span></div>
    </form>
    ${renders.list.map(renderCard).join('') || '<p class="note">No requests yet.</p>'}`
  for (const el of $('render').querySelectorAll('select[data-pick]')) {
    el.onchange = () => {
      if (el.dataset.pick === 'action') renderForm = { project: project.id, action: el.value, picks: {} }
      else renderForm.picks[el.dataset.pick] = el.value
      renderRenders(latest(project))
    }
  }
  $('renderform').onsubmit = (event) => {
    event.preventDefault()
    const args = action.pick.map((p, i) => renderForm.picks[i] ?? p.options[0].value ?? '').filter(Boolean)
    addDoc(collection(db, 'renders'), { project: project.id, action: action.label, args, status: 'requested', createdAt: serverTimestamp() })
      .catch((error) => alert(error.message))
  }
  for (const button of $('render').querySelectorAll('button[data-approve]')) {
    button.onclick = () => {
      button.disabled = true
      updateDoc(doc(db, 'renders', button.dataset.approve), { status: 'approved', approvedAt: serverTimestamp() }).catch((error) => alert(error.message))
    }
  }
}

function renderCard(r) {
  const status = STATUS[r.status] ?? r.status
  const chip = r.status === 'done' ? 'ok' : r.status === 'failed' || r.status === 'priced' ? 'warn' : ''
  const price = r.price && !r.price.free
    ? `<p><strong>${r.price.unit === 'dollars' ? `~$${r.price.amount}` : `~${r.price.amount} credits`}${r.price.unknown ? '+' : ''}</strong> for ${r.price.items} new · ${esc(r.price.summary.split('·').pop().trim())}</p>
       <details><summary>What it buys</summary><pre>${esc(r.price.list)}</pre></details>`
    : r.price?.free ? '<p class="note">Everything is cached: free.</p>' : ''
  const approve = r.status === 'priced' ? `<div class="bar"><button class="primary" data-approve="${esc(r.id)}">Approve and render</button></div>` : ''
  const outputs = (r.outputs ?? []).map((o) => item({ ...o, type: /\.mp4$/.test(o.path) ? 'video' : /\.(png|jpg)$/.test(o.path) ? 'image' : /\.wav$/.test(o.path) ? 'audio' : 'file' }))
  return `<article class="post">
    <div class="bar"><strong>${esc(r.action)}</strong><span class="note">${esc((r.args ?? []).join(' · '))}</span>
      <span class="chip ${chip}">${esc(status)}</span><span class="note">${when(r.createdAt)}</span></div>
    ${r.error ? `<p class="note error">${esc(r.error)}</p>` : ''}
    ${price}${approve}
    ${outputs.length ? `<div class="grid">${outputs.join('')}</div>` : ''}
    ${r.log ? `<details><summary>Log</summary><pre>${esc(r.log)}</pre></details>` : ''}
  </article>`
}

// Dashboard: the ElevenLabs credits and what each paid call cost, as the Mac
// (shared/cloud.mjs push) or the last cloud render read them; the page can't
// hold the key to read them itself. Cloud renders' calls are on their requests.
const num = (n) => Math.round(n ?? 0).toLocaleString('en-US')

function renderDashboard() {
  const a = dash.account
  if (!a) {
    $('dashboard').innerHTML = '<p class="note">No credits pushed yet: run <code>node shared/cloud.mjs account</code> on the Mac.</p>'
    return
  }
  const calls = [
    ...(a.usage ?? []).map((u) => ({ ...u, where: 'Mac' })),
    ...dash.renders.flatMap((r) => (r.usage ?? []).map((u) => ({ ...u, where: 'Cloud' }))),
  ].sort((x, y) => y.at.localeCompare(x.at))
  const resets = a.resetsAt?.toDate?.()
  const period = resets ? calls.filter((u) => Date.parse(u.at) > resets - 30 * 864e5) : calls
  const spent = {}
  for (const u of period) spent[u.project] = (spent[u.project] ?? 0) + (u.credits ?? 0)
  const stale = Date.now() - (a.checkedAt?.toMillis?.() ?? 0) > 864e5
  const used = Math.min(100, (a.used / a.limit) * 100).toFixed(1)
  const short = (at) => new Date(at).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })
  const requests = [...dash.renders].sort((x, y) => (y.createdAt?.seconds ?? Infinity) - (x.createdAt?.seconds ?? Infinity)).slice(0, 20)
  $('dashboard').innerHTML = `
    <article class="post">
      <div class="bar"><strong>ElevenLabs credits</strong><span class="chip ${stale ? 'warn' : ''}">As of ${when(a.checkedAt)} · ${esc(a.checkedBy ?? '')}</span></div>
      <div class="stat">${num(a.limit - a.used)} <span>credits left</span></div>
      <div class="meter" role="img" aria-label="${num(a.used)} of ${num(a.limit)} used"><i style="width:${used}%"></i></div>
      <p class="note">${num(a.used)} of ${num(a.limit)} used · resets ${resets ? resets.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '?'} · ${esc(a.tier)} plan</p>
      ${stale ? '<p class="note">Over a day old: <code>node shared/cloud.mjs account</code> on the Mac refreshes it, and so does every cloud render.</p>' : ''}
      <p class="note">fal.ai's balance can't be read: check it in fal's dashboard.</p>
    </article>
    <h2>Spending <span class="note">this period: ${Object.entries(spent).map(([p, c]) => `${esc(p)} ${num(c)}`).join(' · ') || 'nothing yet'}</span></h2>
    ${calls.length ? `<div class="table wide"><table>
      <thead><tr><th>When</th><th>Where</th><th>Project</th><th>What</th><th>Size</th><th class="r">Estimate</th><th class="r">Charged</th><th class="r">Left</th></tr></thead>
      <tbody>${calls.slice(0, 50).map((u) => `<tr><td>${esc(short(u.at))}</td><td>${u.where}</td><td>${esc(u.project)}</td><td>${esc(u.kind)} ${esc(u.lang ?? '')} ${esc(u.name)}</td>
        <td>${u.chars ? `${u.chars} chars` : `${u.seconds} s`}</td><td class="r">${num(u.estimate)}</td><td class="r">${num(u.credits)}</td><td class="r">${num(u.left)}</td></tr>`).join('')}</tbody>
    </table></div>` : '<p class="note">No paid calls logged yet. Each new voice clip or music track adds a row.</p>'}
    <h2>Cloud renders <span class="note">${dash.renders.length}</span></h2>
    ${requests.length ? `<div class="table wide"><table>
      <thead><tr><th>When</th><th>Project</th><th>Render</th><th>Status</th><th class="r">Price</th><th class="r">Charged</th></tr></thead>
      <tbody>${requests.map((r) => `<tr><td>${when(r.createdAt)}</td><td>${esc(r.project)}</td><td>${esc(r.action)} <span class="note">${esc((r.args ?? []).join(' · '))}</span></td>
        <td><span class="chip ${r.status === 'done' ? 'ok' : r.status === 'failed' || r.status === 'priced' ? 'warn' : ''}">${esc(STATUS[r.status] ?? r.status)}</span></td>
        <td class="r">${r.price?.free ? 'free' : r.price ? `${r.price.unit === 'dollars' ? `$${r.price.amount}` : num(r.price.amount)}${r.price.unknown ? '+' : ''}` : ''}</td>
        <td class="r">${r.usage?.length ? num(r.usage.reduce((sum, u) => sum + (u.credits ?? 0), 0)) : ''}</td></tr>`).join('')}</tbody>
    </table></div>` : '<p class="note">No cloud renders yet.</p>'}`
}

// AI: a chat about the project, captions and video lines. Answers are drafts:
// copy them, or add them to the plan's Drafts section to reach the Mac on pull.

async function busy(form, out, work) {
  const buttons = form.querySelectorAll('button')
  for (const button of buttons) button.disabled = true
  out.hidden = false
  out.classList.remove('error')
  out.textContent = 'Thinking…'
  try {
    await work()
  } catch (error) {
    out.classList.add('error')
    out.textContent = error.message
  } finally {
    for (const button of buttons) button.disabled = false
  }
}

// Puts a draft at the end of the plan's Drafts section, making one if needed.
function addDraft(project, title, body) {
  const lines = (latest(project).plan ?? '').replace(/\s+$/, '').split('\n')
  let at = lines.findIndex((line) => /^##\s+Drafts\s*$/.test(line))
  if (at < 0) lines.push('', '## Drafts', '', 'Made with AI on the web: check every claim against the app before use.')
  else {
    const next = lines.findIndex((line, i) => i > at && /^##\s/.test(line))
    at = next < 0 ? lines.length : next
  }
  const draft = ['', `### ${title} (${new Date().toLocaleDateString('en-GB', { dateStyle: 'medium' })})`, '', body.trim(), '']
  if (at < 0) lines.push(...draft)
  else lines.splice(at, 0, ...draft)
  return savePlan(project, lines.join('\n').replace(/\n+$/, '\n'))
}

function draftButton(button, project, title, body) {
  button.onclick = () => {
    button.disabled = true
    addDraft(project, title, body)
      .then(() => { button.textContent = 'Added to Drafts' })
      .catch((error) => { alert(error.message); button.disabled = false })
  }
}

const fence = (text) => `\`\`\`\n${text.trim()}\n\`\`\``

function renderAI(project) {
  aiShown = `${project.id}/${aiMode}`
  const modes = { chat: 'Chat', caption: 'Caption', lines: 'Video lines' }
  $('ai').innerHTML = `
    <div class="bar"><nav class="filters">${Object.entries(modes).map(([mode, label]) => `<button data-mode="${mode}" class="${mode === aiMode ? 'on' : ''}">${label}</button>`).join('')}</nav>
      <span class="note">Knows this project's plan. Answers are drafts: check them before use.</span></div>
    <div id="aibody"></div>`
  for (const button of $('ai').querySelectorAll('button[data-mode]')) {
    button.onclick = () => { aiMode = button.dataset.mode; remember('aiMode', aiMode); render() }
  }
  ;({ chat: renderChat, caption: renderCaption, lines: renderLines })[aiMode](project)
}

function renderChat(project) {
  const chat = chats.get(project.id) ?? { session: null, messages: [] }
  chats.set(project.id, chat)
  $('aibody').innerHTML = `
    <div id="messages" class="messages"></div>
    <p id="chatout" class="note" hidden></p>
    <form id="chatform" class="ask"><textarea id="chatask" rows="2" placeholder="Ask about ${esc(project.name || project.id)}"></textarea>
      <button class="primary">Send</button></form>
    <div class="bar"><span class="grow"></span><button id="newchat" class="small ghost">New chat</button></div>`
  const show = () => {
    $('messages').innerHTML = chat.messages.map((m, i) => `<div class="message ${m.role}">${m.role === 'model'
      ? `<div class="doc">${markdown(m.text)}</div><div class="actions"><button class="small" data-copy="${i}">Copy</button><button class="small" data-draft="${i}">Add to Drafts</button></div>`
      : esc(m.text)}</div>`).join('')
    for (const button of $('messages').querySelectorAll('button[data-copy]')) button.onclick = () => copy(button, chat.messages[button.dataset.copy].text)
    for (const button of $('messages').querySelectorAll('button[data-draft]')) {
      const i = Number(button.dataset.draft)
      draftButton(button, project, `Chat: ${chat.messages[i - 1]?.text.slice(0, 60) ?? 'answer'}`, chat.messages[i].text)
    }
  }
  show()
  $('chatask').onkeydown = (event) => { if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) $('chatform').requestSubmit() }
  $('chatform').onsubmit = (event) => {
    event.preventDefault()
    const text = $('chatask').value.trim()
    if (!text) return
    busy($('chatform'), $('chatout'), async () => {
      // The chat sees the plan as it was when it started; New chat picks up edits.
      chat.session ??= await startChat(app, latest(project))
      const result = await chat.session.sendMessage(text)
      chat.messages.push({ role: 'user', text }, { role: 'model', text: result.response.text() })
      $('chatask').value = ''
      $('chatout').hidden = true
      show()
    })
  }
  $('newchat').onclick = () => { chats.delete(project.id); renderChat(project) }
}

function renderCaption(project) {
  const platform = recall('platform') || 'Instagram'
  $('aibody').innerHTML = `
    <form id="captionform" class="stack">
      <label class="field">App <select id="platform">${Object.keys(platforms).map((p) => `<option${p === platform ? ' selected' : ''}>${p}</option>`).join('')}</select></label>
      <textarea id="captionask" rows="5" placeholder="What the post is for (a video, an update, a campaign), or paste a caption to rewrite"></textarea>
      <div class="bar"><button class="primary">Write caption</button></div>
    </form>
    <p id="captionout" class="note" hidden></p>
    <div id="captions" class="grid"></div>`
  $('platform').onchange = () => remember('platform', $('platform').value)
  $('captionform').onsubmit = (event) => {
    event.preventDefault()
    const ask = $('captionask').value.trim()
    const name = $('platform').value
    if (!ask) return
    busy($('captionform'), $('captionout'), async () => {
      const answer = await caption(app, latest(project), name, ask)
      $('captionout').hidden = !answer.note
      $('captionout').textContent = answer.note ?? ''
      $('captions').innerHTML = ['en', 'id'].map((l) => {
        const problems = captionProblems(answer[l] ?? '', platforms[name])
        return `<div class="item"><pre>${esc(answer[l] ?? '')}</pre><div class="info">
          <div class="meta"><span class="lang">${l.toUpperCase()}</span><span>${name}</span>${problems.length
            ? `<span class="chip warn">${esc(problems.join(', '))}</span>`
            : '<span class="chip ok">Fits</span>'}</div>
          <div class="actions"><button class="small" data-copy="${l}">Copy</button><button class="small" data-draft="${l}">Add to Drafts</button></div></div></div>`
      }).join('')
      for (const button of $('captions').querySelectorAll('button[data-copy]')) button.onclick = () => copy(button, answer[button.dataset.copy])
      for (const button of $('captions').querySelectorAll('button[data-draft]')) {
        draftButton(button, project, `${name} caption, ${button.dataset.draft.toUpperCase()}`, fence(answer[button.dataset.draft]))
      }
    })
  }
}

function renderLines(project) {
  $('aibody').innerHTML = `
    <form id="linesform" class="stack">
      <textarea id="linesask" rows="5" placeholder="The video: who it's about, what happens, how long, e.g. a 20-second story of a made-up student who…"></textarea>
      <div class="bar"><button class="primary">Draft lines</button><span class="note">New lines go into a video on the Mac; the Render tab renders what is there.</span></div>
    </form>
    <p id="linesout" class="note" hidden></p>
    <div id="lines"></div>`
  $('linesform').onsubmit = (event) => {
    event.preventDefault()
    const ask = $('linesask').value.trim()
    if (!ask) return
    busy($('linesform'), $('linesout'), async () => {
      const answer = await videoLines(app, latest(project), ask)
      const en = answer.en ?? []
      const id = answer.id ?? []
      const body = `**EN**\n\n${en.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n\n**ID**\n\n${id.map((l, i) => `${i + 1}. ${l}`).join('\n')}`
      // An English narrator reads Indonesian "c" as "k": spoken() fixes it on the Mac.
      $('linesout').hidden = !id.some((l) => /c/i.test(l))
      $('linesout').textContent = 'An Indonesian line has a "c": if the narrator says it, check it with check-voice.mjs on the Mac.'
      $('lines').innerHTML = `<article class="doc"><h3>${esc(answer.title || 'Video lines')}</h3>${markdown(body)}</article>
        <div class="bar"><button class="small" id="copylines">Copy</button><button class="small" id="draftlines">Add to Drafts</button></div>`
      $('copylines').onclick = () => copy($('copylines'), body.replace(/\*\*/g, ''))
      draftButton($('draftlines'), project, `Video lines: ${answer.title || 'draft'}`, body)
    })
  }
}
