// What the web page may ask the render job to run: each project's menu
// (<project>/menu.mjs) cut down to the scripts that work in the cloud. The
// job checks a request against this list; shared/cloud.mjs pushes it to the
// project's document for the page's Render tab. Coba Lagi waits for a font
// to stand in for SF Pro Rounded (README → Roadmap).

const CLOUD = {
  catatsaja: ['scripts/render.mjs', 'scripts/render-stories.mjs'],
}

export async function cloudActions(id) {
  if (!CLOUD[id]) return []
  const { menu } = await import(`../${id}/menu.mjs`)
  return menu
    .filter((action) => CLOUD[id].includes(action.script))
    .map(({ label, script, pick = [], flags = [], paid = false }) => ({
      label,
      script,
      paid,
      flags,
      pick: pick.map((p) => ({ title: p.title, options: p.options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o)) })),
    }))
}

// The command for a request ({ project, action, args }), or an error if it
// isn't on the list.
export async function commandOf({ project, action, args = [] }) {
  const chosen = (await cloudActions(project)).find((a) => a.label === action)
  if (!chosen) throw new Error(`Not a cloud render: ${project} · ${action}`)
  // Picks come in order; one with a null option may be left out, as in the menu.
  let at = 0
  for (const options of chosen.pick.map((p) => p.options.map((o) => o.value))) {
    if (at < args.length && options.includes(args[at])) at++
    else if (!options.includes(null)) throw new Error(`Not an option: ${args[at] ?? '(none)'} (${options.join(', ')})`)
  }
  if (at !== args.length) throw new Error(`Too many choices: ${args.join(' ')}`)
  return { ...chosen, command: [`${project}/${chosen.script}`, ...args, ...chosen.flags] }
}
