// Studio-wide App Store / Play screenshot editor (shared, not per-app).
// Decks for every app live here; switch appName / slides in the editor.
// Prefer "Studio" so the web UI and editor share one local run.

export const menu = [
  {
    label: 'Studio · web + screenshots (http://127.0.0.1:4173)',
    script: 'scripts/studio.mjs',
  },
  {
    label: 'Editor only · http://127.0.0.1:3456',
    script: 'scripts/dev.mjs',
  },
]
