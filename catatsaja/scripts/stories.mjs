// The stories videos: five stories, six people using Catat Saja in their own lives, each
// telling it in their own voice. Their accounts and data are in
// stories-data.mjs, their screens in shots/<lang>/stories/ (capture-stories.mjs).

// Who speaks, how they look (drawn in stage.html) and their voices. English
// voices are ElevenLabs premades; Indonesian ones are native speakers from
// the voice library, used by id without adding them to the account.
export const cast = {
  narrator: { voice: { en: 'cgSgspJ2msm6clMCkdW9', id: 'cgSgspJ2msm6clMCkdW9' } }, // Jessica, as in the promo
  rina: {
    name: 'Rina',
    look: { skin: '#c98f6b', hair: 'hijab', cloth: '#e8a0a8', top: '#f2c14e', bg: '#fde68a' },
    voice: { en: 'EXAVITQu4vr4xnSDxMaL', id: 'gjhfBUoH6DHh0DG1X4u0' }, // Sarah; Gavrila
  },
  sari: {
    name: 'Sari',
    look: { skin: '#d9a27c', hair: 'bun', hairColor: '#2b1d16', top: '#3fa7a0', earrings: true, bg: '#bfe6e1' },
    voice: { en: 'FGY2WhTYpPnrIDTdsKH5', id: 'iWydkXKoiVtvdn4vLKp9' }, // Laura; Cahaya
  },
  dimas: {
    name: 'Dimas',
    look: { skin: '#b57d58', hair: 'short', hairColor: '#1f1612', top: '#33507a', stubble: true, bg: '#c7d7f0' },
    voice: { en: 'bIHbv24MWmeRgasZH58o', id: 'plgKUYgnlZ1DCNh54DwJ' }, // Will; Dakocan
  },
  adit: {
    name: 'Adit',
    look: { skin: '#c48963', hair: 'messy', hairColor: '#231914', top: '#e07a3f', glasses: true, headphones: true, bg: '#fed7aa' },
    voice: { en: 'TX3LPaxmHKxFdv7VOQHJ', id: 'q8qwd1jY2jS3AWOBeq25' }, // Liam; Pratama
  },
  maya: {
    name: 'Maya',
    look: { skin: '#bf8661', hair: 'hijab', cloth: '#7fa68a', top: '#8a5a83', glasses: true, bg: '#d9ead3' },
    voice: { en: 'XrExE9yKIg1WjnnlVkGX', id: 'U3dExJoUNcmTY5H6GMuG' }, // Matilda; Maya
  },
  nadia: {
    name: 'Nadia',
    look: { skin: '#cf9670', hair: 'long', hairColor: '#2a1c15', top: '#d9667b', earrings: true, bg: '#f9d3dc' },
    voice: { en: 'Xb7hH8MSUJpSbSDYk0k2', id: 'ffTJE9l3Kt2ipEM32UOc' }, // Alice; Aita
  },
  // Drawn whole, in her kitchen: `bottom` and `shoe` dress the legs.
  wulan: {
    name: 'Wulan',
    look: { skin: '#c68d66', hair: 'hijab', cloth: '#4f7fa8', top: '#f2a65a', bottom: '#5b4636', shoe: '#3b2f2a', bg: '#fde2c4' },
    voice: { en: 'pFZP5JQG7iQjIQuC4Bku', id: 'yLyL4E4r0QfLyYpCwPir' }, // Lily; Sikedewo
  },
  // Runs a toko kelontong. His short is Indonesian only, so he has no
  // English voice yet.
  hendra: {
    name: 'Hendra',
    look: { skin: '#b9825c', hair: 'short', hairColor: '#4a4440', top: '#b8574a', stubble: true, bg: '#fde68a' },
    voice: { id: 'gP7FRCgEZ8Lr3rnyGgpw' }, // Andra
  },
}

// A line: [who, English, Indonesian].
export const hook = {
  text: {
    en: { title: 'Real people, real days 👋', sub: 'Here’s how they use Catat Saja.' },
    id: { title: 'Orang biasa, hari-hari biasa 👋', sub: 'Begini mereka pakai Catat Saja.' },
  },
  lines: [['narrator', 'Real people, real days. Here’s how they use Catat Saja.', 'Orang biasa, hari-hari biasa. Begini mereka pakai Catat Saja.']],
}

export const cta = {
  lines: [
    [
      'narrator',
      'Notes, tasks, money and health, for real life. Try Catat Saja, it’s free!',
      'Catatan, tugas, keuangan, kesehatan, buat hidup sehari-hari. Cobain Catat Saja, gratis!',
    ],
  ],
}

// Each story: who is in it, an introduction, then two scenes in the app.
// A story without an introduction opens on its first scene, the problem
// said over the real screen, so the first second is a reason to stay;
// `full: false` keeps it to its own short.
// A scene has a tag (what the app does), lines, a phone screen (`shots`),
// cards that pop up over it (`crops`) and, for 16:9, a laptop screen (`desk`).
export const stories = {
  rina: {
    people: ['rina'],
    role: { en: '29 · first-time mum', id: '29 · ibu baru' },
    intro: [['rina', 'Hi, I’m Rina. Arka’s two and a half, and I want to know he’s growing well.', 'Halo, aku Rina. Arka udah dua setengah tahun, aku pengin tahu tumbuh kembangnya baik.']],
    scenes: [
      {
        tag: { en: 'Growth vs WHO standards 📈', id: 'Tumbuh kembang vs standar WHO 📈' },
        lines: [['rina', 'I log his weight and height, and see them next to the WHO standards.', 'Aku catat berat dan tingginya, langsung kelihatan dibanding standar WHO.']],
        shots: ['rina-arka'],
        crops: [{ shot: 'rina-crop-growth', r: 1.5 }],
        desk: 'rina-desk-arka',
      },
      {
        tag: { en: 'Reminders, shared with Budi ⏰', id: 'Pengingat, dibagi ke Budi ⏰' },
        lines: [['rina', 'It reminds me when to weigh him again, and Budi sees the same log.', 'Ada pengingat kapan nimbang lagi, dan Budi juga lihat catatan yang sama.']],
        shots: ['rina-overview'],
        crops: [{ shot: 'rina-crop-reminders' }, { shot: 'rina-crop-share', at: 2.6, dy: 380, r: 2 }],
      },
    ],
  },
  couple: {
    people: ['sari', 'dimas'],
    role: { en: 'Married · one home, one budget', id: 'Pasutri · satu rumah, satu dompet' },
    intro: [
      ['dimas', 'Babe, what else do we need?', 'Yang, apa lagi yang mesti dibeli?'],
      ['sari', 'It’s all on our list. Just open it!', 'Udah ada di daftar kita. Buka aja!'],
    ],
    scenes: [
      {
        tag: { en: 'One list, synced live 🛒', id: 'Satu daftar, langsung sinkron 🛒' },
        lines: [['sari', 'When Dimas ticks something off at the shop, my phone shows it right away.', 'Pas Dimas centang di supermarket, di HP-ku langsung kelihatan.']],
        type: 'phones',
        shots: ['dimas-task', 'sari-task'],
        labels: ['Dimas', 'Sari'],
      },
      {
        tag: { en: 'A money book, sorted for you 💸', id: 'Buku keuangan, rapi otomatis 💸' },
        lines: [['dimas', 'Every rupiah goes in our monthly book. Type “Grab”, and it picks Transport.', 'Semua pengeluaran masuk buku bulanan kami. Ketik “Grab”, langsung masuk Transportasi.']],
        shots: ['sari-book'],
        crops: [{ shot: 'sari-crop-entry', r: 1.5 }],
        desk: 'sari-desk-book',
      },
    ],
  },
  adit: {
    people: ['adit'],
    role: { en: '26 · freelance designer', id: '26 · desainer lepas' },
    intro: [['adit', 'I’m Adit. I design for clients back home, and this month I’m working from Tokyo.', 'Aku Adit, desainer lepas. Bulan ini aku kerja dari Tokyo.']],
    scenes: [
      {
        tag: { en: 'Spend in yen, see it in rupiah 💴', id: 'Belanja yen, hitungannya rupiah 💴' },
        lines: [['adit', 'I pay in yen, and my book adds it all up in rupiah.', 'Belanja pakai yen, bukunya otomatis hitung dalam rupiah.']],
        shots: ['adit-book-2'],
        crops: [{ shot: 'adit-crop-balance' }],
        desk: 'adit-desk-book',
      },
      {
        tag: { en: 'Where did it all go? 📊', id: 'Uangnya ke mana aja? 📊' },
        lines: [['adit', 'And I can see exactly where it went. Mostly the trip, honestly.', 'Dan kelihatan jelas uangnya ke mana. Paling banyak buat jalan-jalan, sih.']],
        shots: ['adit-analysis'],
        crops: [{ shot: 'adit-crop-categories', r: 1.5 }],
      },
    ],
  },
  maya: {
    people: ['maya'],
    role: { en: '41 · looking after her dad', id: '41 · merawat bapaknya' },
    intro: [['maya', 'I’m Maya. Dad has diabetes, and I’m the one who keeps track of his check-ups.', 'Aku Maya. Bapak kena diabetes, aku yang pantau cek kesehatannya.']],
    scenes: [
      {
        tag: { en: 'Blood sugar, with the normal range 🩸', id: 'Gula darah, lengkap rentang normalnya 🩸' },
        lines: [['maya', 'Every week I log his blood sugar. It’s coming down, and I can see it.', 'Tiap minggu aku catat gula darahnya. Turun terus, dan kelihatan jelas.']],
        shots: ['maya-dad'],
        crops: [{ shot: 'maya-crop-glucose', r: 1.5 }],
        desk: 'maya-desk-dad',
      },
      {
        tag: { en: 'Shared with family, encrypted 🔒', id: 'Dibagi ke keluarga, terenkripsi 🔒' },
        lines: [['maya', 'My brother Andi can see it too. And it’s end-to-end encrypted, so it stays in the family.', 'Adikku Andi juga bisa lihat. Terenkripsi end-to-end, jadi tetap urusan keluarga.']],
        shots: ['maya-overview'],
        crops: [{ shot: 'maya-crop-share', r: 2 }],
      },
    ],
  },
  nadia: {
    people: ['nadia'],
    full: false,
    scenes: [
      {
        tag: { en: 'Period calendar 📅', id: 'Kalender haid 📅' },
        lines: [['nadia', 'My period always caught me off guard.', 'Haid-ku sering datang tiba-tiba. Panik terus.']],
        shots: ['nadia-calendar'],
      },
      {
        tag: { en: 'When the next one’s likely 🗓️', id: 'Kira-kira kapan berikutnya 🗓️' },
        lines: [['nadia', 'Now I log it, and the calendar shows when the next one’s likely to start.', 'Sekarang aku catat, kalendernya kasih tahu kira-kira kapan haid berikutnya.']],
        shots: ['nadia-calendar'],
        crops: [{ shot: 'nadia-crop-next', r: 1.5 }],
      },
      {
        tag: { en: 'A reminder, end-to-end encrypted 🔒', id: 'Ada pengingat, terenkripsi 🔒' },
        lines: [['nadia', 'I get a reminder three days before. And it’s end-to-end encrypted, so it’s just mine.', 'Tiga hari sebelumnya ada pengingat. Terenkripsi end-to-end, jadi cuma aku yang bisa baca.']],
        shots: ['nadia-overview'],
        crops: [{ shot: 'nadia-crop-reminders' }, { shot: 'nadia-crop-encryption', at: 2.6, dy: 420, r: 2 }],
      },
    ],
  },
  // In a place: the opening is the place itself, the person acting.
  wulan: {
    people: ['wulan'],
    full: false,
    place: 'kitchen',
    scenes: [
      {
        act: 'arrive',
        d: 5.2,
        tag: { en: 'Scan a receipt 🧾', id: 'Pindai struk 🧾' },
        lines: [['wulan', 'After the big monthly shop, I never typed in the receipt. Too many items.', 'Habis belanja bulanan, struknya nggak pernah kucatat. Kebanyakan barangnya.']],
      },
      {
        act: 'snap',
        tag: { en: 'Gemini reads it, you check ✅', id: 'Gemini yang baca, kamu cek ✅' },
        lines: [['wulan', 'Now I just snap it. Gemini reads every item, and I check before adding.', 'Sekarang tinggal foto. Gemini yang baca tiap barang, aku cek dulu sebelum ditambah.']],
        shots: ['wulan-receipt'],
        crops: [{ shot: 'wulan-crop-receipt', at: 1.6 }],
      },
      {
        act: 'unpack',
        tag: { en: 'Where did it go? 📊', id: 'Uangnya ke mana? 📊' },
        lines: [['wulan', 'Categories come from my own entries, so I can see where the money went.', 'Kategorinya dari catatanku sendiri, jadi kelihatan uangnya ke mana aja.']],
        shots: ['wulan-added'],
        crops: [{ shot: 'wulan-crop-categories' }],
      },
    ],
  },
  hendra: {
    people: ['hendra'],
    full: false,
    place: 'shop',
    scenes: [
      {
        act: 'restock',
        d: 5.2,
        tag: { en: 'Supplier receipts 🧾', id: 'Nota supplier 🧾' },
        lines: [['hendra', 'Every delivery from a supplier comes with a receipt. By the weekend, it’s a pile.', 'Tiap barang datang dari supplier, ada notanya. Akhir minggu, udah numpuk.']],
      },
      {
        act: 'scan',
        tag: { en: 'Gemini reads it, you check ✅', id: 'Gemini yang baca, kamu cek ✅' },
        lines: [['hendra', 'Now I snap each one. Gemini reads the items, and I check before adding.', 'Sekarang tinggal kufoto satu-satu. Gemini yang baca barangnya, aku cek dulu sebelum ditambah.']],
        shots: ['hendra-receipt'],
        crops: [{ shot: 'hendra-crop-receipt', at: 1.6 }],
      },
      {
        act: 'file',
        tag: { en: 'Income and expenses, per week 📊', id: 'Pemasukan dan pengeluaran per minggu 📊' },
        lines: [['hendra', 'Every week I see what came in, what went out, and how much I kept.', 'Tiap minggu kelihatan yang masuk, yang keluar, dan berapa yang tersisa.']],
        shots: ['hendra-analysis'],
        crops: [{ shot: 'hendra-crop-cashflow' }],
      },
    ],
  },
}
