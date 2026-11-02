// What shared/cli.mjs offers for this project. Each pick becomes a command
// argument in order. The videos use the app's own voice clips and music;
// only the short's few lines of Koba's own (koba-voice.mjs) are bought, once,
// and cached in cobalagi/audio/.

export const menu = [
  {
    label: 'Promo · render videos (free once Koba\'s lines are cached)',
    script: 'scripts/render.mjs',
    pick: [
      { title: 'Video', options: ['all', 'short', 'short-2', 'promo'] },
      { title: 'Store line', options: [{ label: 'coming soon', value: 'soon' }, { label: 'live on Google Play', value: 'live' }] },
    ],
  },
  { label: 'Promo · check YouTube text', script: 'scripts/youtube-text.mjs', flags: ['--check'] },
]
