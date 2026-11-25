// What shared/cli.mjs offers for this project. Each pick becomes a command
// argument in order (a `null` value leaves it out); `paid` actions get a dry
// run and a confirm before anything is bought.

export const menu = [
  {
    label: 'Sounds · export m4a (free while cached)',
    script: 'scripts/export.mjs',
    paid: true,
  },
  {
    label: 'Sounds · copy into app repo',
    script: 'scripts/install-audio.mjs',
  },
  {
    label: 'Promo · record congklak gameplay (simulator)',
    script: 'promo/record.mjs',
    flags: ['congklak'],
  },
  {
    label: 'Promo · record nearby lobby (simulator)',
    script: 'promo/record.mjs',
    flags: ['nearby'],
  },
  {
    label: 'Promo · record game picker swipe (simulator)',
    script: 'promo/record.mjs',
    flags: ['games'],
  },
  {
    label: 'Promo · render sneak peek (needs three clips)',
    script: 'promo/render.mjs',
  },
  {
    label: 'Promo · narrator VO (EN+ID)',
    script: 'promo/voice.mjs',
    paid: true,
  },
]
