// Voice-over, one line per scene key, casual, in both languages. Lines are
// short so they fit their scene; render.mjs stretches a scene if its line
// runs longer.

export const narration = {
  en: {
    hook: 'Notes in one app, budget in another, health stuff… who knows where?',
    brand: 'Meet Catat Saja. Just write it down.',
    notes: 'Notes that format themselves. Just type.',
    tasks: 'Checklists you share, synced live.',
    money: 'A money book for every month or trip.',
    charts: 'And charts that actually make sense.',
    smart: 'Type "Grab", and it picks Transport for you.',
    health: "Health logs for the whole family.",
    growth: "Even your kid's growth, next to the WHO standards.",
    share: 'Share with anyone. Read-only or editable.',
    private: "And it's all end-to-end encrypted. Not even we can read it.",
    anywhere: 'On your phone or your laptop. Works offline too.',
    dark: 'Light or dark, English or Bahasa.',
    cta: "Give Catat Saja a try. It's free!",
  },
  id: {
    hook: 'Catatan di sini, keuangan di sana, data kesehatan… entah di mana?',
    brand: 'Kenalin, Catat Saja. Catat aja.',
    notes: 'Catatan yang rapi sendiri. Tinggal ketik.',
    tasks: 'Daftar tugas bareng, langsung sinkron.',
    money: 'Buku keuangan buat tiap bulan atau liburan.',
    charts: 'Plus grafik yang gampang dibaca.',
    smart: 'Ketik "Grab", langsung masuk Transportasi.',
    health: 'Catatan kesehatan buat sekeluarga.',
    growth: 'Sampai tumbuh kembang si kecil, pakai standar WHO.',
    share: 'Bagikan ke siapa aja. Cuma baca, atau bisa edit.',
    private: 'Semuanya terenkripsi end-to-end. Kami pun nggak bisa baca.',
    anywhere: 'Di HP atau laptop. Bisa offline juga.',
    dark: 'Terang atau gelap, Indonesia atau Inggris.',
    cta: 'Catat Saja. Gratis. Cobain yuk!',
  },
}

// How the voice should read words it gets wrong. The voice reads an
// Indonesian "c" as "k" ("katat" for "catat", "kuma" for "cuma"), so in
// Indonesian every "c" is spelled "ch", and in English the name is. Only the
// spoken text changes; scripts/check-voice.mjs transcribes the clips to check.
export const spoken = (text, lang) =>
  lang === 'id'
    ? text.replaceAll(/c(?!h)/g, 'ch').replaceAll(/C(?!h)/g, 'Ch')
    : text.replaceAll(/\bCatat(?= Saja\b)/g, 'Chatat')
