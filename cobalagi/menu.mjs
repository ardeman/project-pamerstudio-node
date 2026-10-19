// What shared/cli.mjs offers for this project. Each pick becomes a command
// argument in order. Nothing here is paid: the videos use the app's own
// voice clips and music.

export const menu = [
  {
    label: 'Promo · render videos (free)',
    script: 'scripts/render.mjs',
    pick: [
      { title: 'Video', options: ['all', 'short', 'promo'] },
      { title: 'Store line', options: [{ label: 'coming soon', value: 'soon' }, { label: 'live on Google Play', value: 'live' }] },
    ],
  },
  { label: 'Promo · check YouTube text', script: 'scripts/youtube-text.mjs', flags: ['--check'] },
]
