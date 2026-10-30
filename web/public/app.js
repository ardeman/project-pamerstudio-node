// Pamer Studio on the web: each project's marketing plan (tick tasks, edit it)
// and its media. shared/cloud.mjs pushes both from the Mac and pulls web edits.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js'
import {
  getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js'
import {
  collection, doc, getFirestore, onSnapshot, serverTimestamp, updateDoc,
} from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js'

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
  if (!allowed) return
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
  $('media').hidden = view !== 'media'
  const project = projects.find((p) => p.id === current)
  if (!project) {
    $('plan').innerHTML = '<p class="note">Nothing pushed yet: run <code>node shared/cloud.mjs push</code> on the Mac.</p>'
    $('media').innerHTML = ''
    return
  }
  if (!editing) renderPlan(project)
  renderMedia(project)
}

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
    <textarea id="text" spellcheck="false"></textarea>`
  $('text').value = project.plan
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
  return `<div class="item"><div class="preview">${preview}</div><div class="info">
    <div><div class="name">${esc(name)}</div>
      <div class="meta">${language ? `<span class="lang">${language.toUpperCase()}</span>` : ''}<span>${m.type} · ${size}</span></div></div>
    <div class="actions"><a class="button small" href="${esc(m.url)}" target="_blank" rel="noopener">Open</a>${copyText}</div></div></div>`
}
