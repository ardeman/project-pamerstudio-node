// What shared/cli.mjs offers for this project. Each pick becomes a command
// argument in order (a `null` value leaves it out); `paid` actions get a dry
// run and a confirm before anything is bought.

const lang = { title: 'Language', options: ['all', 'en', 'id'] }
const promo = [{ title: 'Format', options: ['all', 'vertical', 'whatsapp', 'linkedin', 'youtube'] }, lang]
const stories = [
  { title: 'Video', options: ['all', 'full', 'rina', 'couple', 'adit', 'maya', 'nadia', 'wulan', 'hendra'] },
  { title: 'Format', options: ['all', 'vertical', 'linkedin', 'youtube'] },
  { title: 'Language', options: [{ label: 'where it’s posted', value: null }, 'all', 'en', 'id'] },
]

export const menu = [
  { label: 'Promo · preview stills (free)', script: 'scripts/render.mjs', pick: promo, flags: ['--stills', '--silent'] },
  { label: 'Promo · render video', script: 'scripts/render.mjs', pick: promo, paid: true },
  { label: 'Stories · preview stills (free)', script: 'scripts/render-stories.mjs', pick: stories, flags: ['--stills', '--silent'] },
  { label: 'Stories · render video', script: 'scripts/render-stories.mjs', pick: stories, paid: true },
  { label: 'Stories · subtitles, covers, chapters', script: 'scripts/render-stories.mjs', pick: stories, flags: ['--meta'] },
  { label: 'Places · drawings (fal.ai)', script: 'scripts/places-art.mjs', paid: true },
]
