// What shared/cli.mjs offers for Bilah Aksara. Paid actions dry-run first.

export const menu = [
  {
    label: 'Sounds · export mp3 (free while cached)',
    script: 'scripts/export.mjs',
    paid: true,
  },
  {
    label: 'Sounds · copy into Godot assets/audio',
    script: 'scripts/install-audio.mjs',
  },
]
