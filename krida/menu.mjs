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
]
