// Demo content for the promo screenshots, in both languages. Today in the
// demo is 2026-10-11.

const idr = { code: 'IDR', symbol: 'Rp', maximumFractionDigits: 0 }

const entry = (id, date, type, category, description, amount, quantity = 1) => ({
  id: `e${id}`,
  date,
  type,
  category,
  description,
  quantity,
  amount,
  currency: idr,
  rate: 1,
})

const text = {
  en: {
    notes: [
      {
        title: 'Weekly plan',
        content:
          '- Call the bank\n- **Review** the budget\n- Book the dentist\n- Pick up Arka at 4',
        pinned: true,
      },
      {
        title: 'Gift ideas for Mum',
        content:
          '## Birthday, 2 Nov\n- Batik scarf\n- New reading glasses\n- *Dinner at her favourite place*',
      },
      {
        title: 'Sambal matah',
        content:
          '**You need**\n- 10 shallots\n- 5 bird\'s eye chillies\n- 2 lemongrass stalks\n- Lime, salt, coconut oil\n\nSlice thin, mix, squeeze the lime. Done!',
      },
      {
        title: 'Book club picks',
        content:
          '1. *Laut Bercerita*, Leila S. Chudori\n2. *Atomic Habits*\n3. *Bumi Manusia*',
      },
      {
        title: 'Side project ideas',
        content:
          '- A tiny habit tracker\n- Photo book of the Bali trip\n- Learn to make **kombucha**',
      },
    ],
    tasks: [
      {
        title: 'Groceries',
        shared: true,
        pinned: true,
        items: [
          ['Milk', true],
          ['Eggs', true],
          ['Bread', false],
          ['Coffee beans', false],
          ['Bananas', false],
          ['Rice, 5 kg', false],
        ],
      },
      {
        title: 'Bali packing list',
        items: [
          ['Passport', true],
          ['Swimsuit', true],
          ['Sunscreen', false],
          ['Phone charger', false],
          ['Snorkel', false],
        ],
      },
      {
        title: 'Weekend chores',
        items: [
          ['Water the plants', true],
          ['Wash the car', false],
          ['Fix the leaking tap', false],
        ],
      },
    ],
    books: [
      {
        title: 'October 2026',
        pinned: true,
        entries: [
          [1, '2026-10-01', 'income', 'income', 'Salary', 12_500_000],
          [2, '2026-10-01', 'expense', 'bills', 'Rent', 3_000_000],
          [3, '2026-10-02', 'expense', 'investment', 'Mutual fund', 1_000_000],
          [4, '2026-10-02', 'expense', 'bills', 'PLN token', 300_000],
          [5, '2026-10-03', 'expense', 'groceries', 'Superindo', 650_000],
          [6, '2026-10-04', 'expense', 'transport', 'Grab to the office', 45_000, 4],
          [7, '2026-10-05', 'expense', 'fnb', 'Lunch with the team', 85_000],
          [8, '2026-10-06', 'expense', 'entertainment', 'Netflix', 186_000],
          [9, '2026-10-07', 'expense', 'family', 'Diapers for Arka', 220_000],
          [10, '2026-10-08', 'expense', 'transport', 'Pertamax', 250_000],
          [11, '2026-10-09', 'expense', 'bills', 'Indihome', 380_000],
          [12, '2026-10-09', 'expense', 'social', 'Wedding gift', 300_000],
          [13, '2026-10-10', 'expense', 'fnb', 'Kopi Kenangan', 28_000, 2],
          [14, '2026-10-10', 'expense', 'health', 'Vitamins', 150_000],
          [15, '2026-10-11', 'expense', 'groceries', 'Indomaret', 120_000],
        ],
      },
      {
        title: 'Bali trip',
        shared: true,
        entries: [
          [1, '2026-09-20', 'income', 'income', 'Trip budget', 6_000_000],
          [2, '2026-09-21', 'expense', 'vacation', 'Flights', 1_850_000],
          [3, '2026-09-22', 'expense', 'vacation', 'Villa in Ubud', 2_400_000],
          [4, '2026-09-24', 'expense', 'fnb', 'Dinner at Jimbaran', 275_000],
          [5, '2026-09-25', 'expense', 'shopping', 'Souvenirs', 400_000],
          [6, '2026-09-25', 'expense', 'transport', 'Scooter rental', 150_000],
        ],
      },
    ],
    people: { me: 'Rina', partner: 'Budi', mum: 'Mum', child: 'Arka' },
    noteForEntry: 'After the morning run',
  },
  id: {
    notes: [
      {
        title: 'Rencana minggu ini',
        content:
          '- Telepon bank\n- **Cek** anggaran\n- Janji ke dokter gigi\n- Jemput Arka jam 4',
        pinned: true,
      },
      {
        title: 'Ide kado buat Ibu',
        content:
          '## Ulang tahun, 2 Nov\n- Selendang batik\n- Kacamata baca baru\n- *Makan malam di tempat favoritnya*',
      },
      {
        title: 'Sambal matah',
        content:
          '**Bahan**\n- 10 bawang merah\n- 5 cabai rawit\n- 2 batang serai\n- Jeruk limau, garam, minyak kelapa\n\nIris tipis, campur, peras limaunya. Beres!',
      },
      {
        title: 'Daftar buku klub baca',
        content:
          '1. *Laut Bercerita*, Leila S. Chudori\n2. *Atomic Habits*\n3. *Bumi Manusia*',
      },
      {
        title: 'Ide proyek sampingan',
        content:
          '- Aplikasi pelacak kebiasaan\n- Album foto liburan Bali\n- Belajar bikin **kombucha**',
      },
    ],
    tasks: [
      {
        title: 'Belanja',
        shared: true,
        pinned: true,
        items: [
          ['Susu', true],
          ['Telur', true],
          ['Roti', false],
          ['Biji kopi', false],
          ['Pisang', false],
          ['Beras 5 kg', false],
        ],
      },
      {
        title: 'Bawaan ke Bali',
        items: [
          ['Paspor', true],
          ['Baju renang', true],
          ['Sunscreen', false],
          ['Charger HP', false],
          ['Snorkel', false],
        ],
      },
      {
        title: 'Beres-beres akhir pekan',
        items: [
          ['Siram tanaman', true],
          ['Cuci mobil', false],
          ['Benerin keran bocor', false],
        ],
      },
    ],
    books: [
      {
        title: 'Oktober 2026',
        pinned: true,
        entries: [
          [1, '2026-10-01', 'income', 'income', 'Gaji', 12_500_000],
          [2, '2026-10-01', 'expense', 'bills', 'Sewa kontrakan', 3_000_000],
          [3, '2026-10-02', 'expense', 'investment', 'Reksadana', 1_000_000],
          [4, '2026-10-02', 'expense', 'bills', 'Token PLN', 300_000],
          [5, '2026-10-03', 'expense', 'groceries', 'Superindo', 650_000],
          [6, '2026-10-04', 'expense', 'transport', 'Grab ke kantor', 45_000, 4],
          [7, '2026-10-05', 'expense', 'fnb', 'Makan siang bareng tim', 85_000],
          [8, '2026-10-06', 'expense', 'entertainment', 'Netflix', 186_000],
          [9, '2026-10-07', 'expense', 'family', 'Popok Arka', 220_000],
          [10, '2026-10-08', 'expense', 'transport', 'Pertamax', 250_000],
          [11, '2026-10-09', 'expense', 'bills', 'Indihome', 380_000],
          [12, '2026-10-09', 'expense', 'social', 'Kondangan', 300_000],
          [13, '2026-10-10', 'expense', 'fnb', 'Kopi Kenangan', 28_000, 2],
          [14, '2026-10-10', 'expense', 'health', 'Vitamin', 150_000],
          [15, '2026-10-11', 'expense', 'groceries', 'Indomaret', 120_000],
        ],
      },
      {
        title: 'Liburan ke Bali',
        shared: true,
        entries: [
          [1, '2026-09-20', 'income', 'income', 'Dana liburan', 6_000_000],
          [2, '2026-09-21', 'expense', 'vacation', 'Tiket pesawat', 1_850_000],
          [3, '2026-09-22', 'expense', 'vacation', 'Villa di Ubud', 2_400_000],
          [4, '2026-09-24', 'expense', 'fnb', 'Makan di Jimbaran', 275_000],
          [5, '2026-09-25', 'expense', 'shopping', 'Oleh-oleh', 400_000],
          [6, '2026-09-25', 'expense', 'transport', 'Sewa motor', 150_000],
        ],
      },
    ],
    people: { me: 'Rina', partner: 'Budi', mum: 'Ibu', child: 'Arka' },
    noteForEntry: 'Habis lari pagi',
  },
}

export const demo = (lang) => {
  const t = text[lang]
  const books = t.books.map((book) => ({
    title: book.title,
    shared: book.shared,
    pinned: book.pinned,
    currency: idr,
    content: book.entries.map((row) => entry(...row)),
  }))
  const health = [
    {
      name: t.people.me,
      birthDate: '1994-05-20',
      sex: 'female',
      calorieTarget: 1900,
      pinned: true,
      content: [
        { id: 'b1', kind: 'body', date: '2026-06-01', weight: 61.5, height: 160 },
        { id: 'b2', kind: 'body', date: '2026-07-01', weight: 60.8, height: 160 },
        { id: 'b3', kind: 'body', date: '2026-08-01', weight: 60.1, height: 160 },
        { id: 'b4', kind: 'body', date: '2026-09-01', weight: 59.4, height: 160 },
        { id: 'b5', kind: 'body', date: '2026-10-11', weight: 58.6, height: 160, note: t.noteForEntry },
        { id: 'g1', kind: 'glucose', date: '2026-10-11', time: '07:10', value: 88, context: 'fasting' },
        { id: 'p1', kind: 'period', date: '2026-08-02', end: '2026-08-06', flow: 'medium' },
        { id: 'p2', kind: 'period', date: '2026-08-31', end: '2026-09-04', flow: 'medium' },
        { id: 'p3', kind: 'period', date: '2026-09-28', end: '2026-10-02', flow: 'light' },
        { id: 'c1', kind: 'calories', date: '2026-10-11', time: '07:30', kcal: 420, meal: 'breakfast' },
        { id: 'c2', kind: 'calories', date: '2026-10-11', time: '12:30', kcal: 650, meal: 'lunch' },
      ],
    },
    {
      name: t.people.child,
      birthDate: '2024-03-15',
      sex: 'male',
      calorieTarget: null,
      content: [
        { id: 'k1', kind: 'body', date: '2024-03-15', weight: 3.3, height: 50, head: 34.5 },
        { id: 'k2', kind: 'body', date: '2024-07-15', weight: 7.0, height: 65, head: 42 },
        { id: 'k3', kind: 'body', date: '2024-11-15', weight: 8.6, height: 71.5, head: 44.5 },
        { id: 'k4', kind: 'body', date: '2025-03-15', weight: 9.7, height: 76, head: 46 },
        { id: 'k5', kind: 'body', date: '2025-09-15', weight: 10.9, height: 82.5, head: 47.2 },
        { id: 'k6', kind: 'body', date: '2026-03-15', weight: 12.1, height: 88, head: 48 },
        { id: 'k7', kind: 'body', date: '2026-10-01', weight: 13.2, height: 92.5, head: 48.6 },
      ],
    },
    {
      name: t.people.mum,
      birthDate: '1968-11-02',
      sex: 'female',
      calorieTarget: 1700,
      shared: true,
      content: [
        { id: 'm1', kind: 'body', date: '2026-10-05', weight: 58.5, height: 155 },
        { id: 'm2', kind: 'glucose', date: '2026-09-05', time: '07:00', value: 104, context: 'fasting' },
        { id: 'm3', kind: 'glucose', date: '2026-10-05', time: '07:00', value: 96, context: 'fasting' },
        { id: 'm4', kind: 'cholesterol', date: '2026-10-05', total: 192, ldl: 118, hdl: 52, triglycerides: 140 },
        { id: 'm5', kind: 'uricAcid', date: '2026-10-05', value: 5.4 },
      ],
    },
  ]
  return {
    notes: t.notes,
    tasks: t.tasks.map((task) => ({
      title: task.title,
      shared: task.shared,
      pinned: task.pinned,
      content: task.items.map(([item, checked]) => ({ item, checked })),
    })),
    books,
    health,
    people: t.people,
  }
}
