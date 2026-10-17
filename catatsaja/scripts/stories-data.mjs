// Demo accounts and content for the people in the stories videos, in both
// languages. Each persona has an account of their own, so names and shares
// on screen are theirs. Today in the demo is 2026-10-12.

const currency = {
  IDR: { code: 'IDR', symbol: 'Rp', maximumFractionDigits: 0 },
  JPY: { code: 'JPY', symbol: '¥', maximumFractionDigits: 0 },
}

// [id, date, type, category, description, amount, quantity?, currency?, rate?]
const entry = ([id, date, type, category, description, amount, quantity = 1, code = 'IDR', rate = 1]) => ({
  id: `e${id}`,
  date,
  type,
  category,
  description,
  quantity,
  amount,
  currency: currency[code],
  rate,
})

// A date this many days before today (YYYY-MM-DD).
const daysAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10)

// Everyone signs up with this password and passphrase (`<name> demo
// passphrase`, lower case).
export const accounts = {
  rina: { name: 'Rina', email: 'rina@example.com' },
  budi: { name: 'Budi', email: 'budi@example.com' },
  sari: { name: 'Sari', email: 'sari@example.com' },
  dimas: { name: 'Dimas', email: 'dimas@example.com' },
  adit: { name: 'Adit', email: 'adit@example.com' },
  maya: { name: 'Maya', email: 'maya@example.com' },
  andi: { name: 'Andi', email: 'andi@example.com' },
  nadia: { name: 'Nadia', email: 'nadia@example.com' },
}
export const passphraseOf = (key) => `${key} demo passphrase`

const text = {
  en: {
    groceries: 'Groceries',
    items: [
      ['Milk', false],
      ['Eggs', false],
      ['Bread', false],
      ['Coffee beans', false],
      ['Bananas', false],
      ['Rice, 5 kg', false],
      ['Dish soap', false],
    ],
    // What Dimas ticks at the shop.
    ticked: ['Milk', 'Eggs', 'Bananas'],
    home: 'Home, October',
    homeEntries: [
      [1, '2026-10-01', 'income', 'income', 'Salary, Sari', 9_500_000],
      [2, '2026-10-01', 'income', 'income', 'Salary, Dimas', 8_750_000],
      [3, '2026-10-01', 'expense', 'bills', 'Rent', 3_500_000],
      [4, '2026-10-02', 'expense', 'bills', 'PLN token', 300_000],
      [5, '2026-10-03', 'expense', 'groceries', 'Superindo', 640_000],
      [6, '2026-10-05', 'expense', 'transport', 'Grab to the office', 38_000, 3],
      [7, '2026-10-06', 'expense', 'fnb', 'Martabak night', 85_000],
      [8, '2026-10-08', 'expense', 'bills', 'Indihome', 380_000],
      [9, '2026-10-09', 'expense', 'social', 'Wedding gift', 300_000],
      [10, '2026-10-11', 'expense', 'groceries', 'Indomaret', 145_000],
    ],
    typed: 'Grab home from work',
    trip: 'Tokyo, October',
    tripEntries: [
      [1, '2026-10-01', 'income', 'freelance', 'Logo for Kopi Senja', 7_500_000],
      [2, '2026-10-03', 'income', 'freelance', 'App icons, Tanam', 4_200_000],
      [3, '2026-10-04', 'expense', 'vacation', 'Flight to Tokyo', 5_100_000],
      [4, '2026-10-05', 'expense', 'vacation', 'Capsule hotel, 5 nights', 4_800, 5, 'JPY', 108],
      [5, '2026-10-05', 'expense', 'transport', 'Suica top-up', 3_000, 1, 'JPY', 108],
      [6, '2026-10-06', 'expense', 'bills', 'Coworking day pass', 2_500, 3, 'JPY', 108],
      [7, '2026-10-07', 'expense', 'fnb', 'Ramen at Ichiran', 1_280, 1, 'JPY', 108],
      [8, '2026-10-09', 'expense', 'groceries', '7-Eleven onigiri', 680, 1, 'JPY', 108],
      [9, '2026-10-10', 'expense', 'shopping', 'Sketchbook, Tokyu Hands', 1_650, 1, 'JPY', 108],
      [10, '2026-10-11', 'expense', 'fnb', 'Coffee at Blue Bottle', 720, 2, 'JPY', 108],
    ],
    child: 'Arka',
    dad: 'Dad',
  },
  id: {
    groceries: 'Belanja',
    items: [
      ['Susu', false],
      ['Telur', false],
      ['Roti', false],
      ['Biji kopi', false],
      ['Pisang', false],
      ['Beras 5 kg', false],
      ['Sabun cuci piring', false],
    ],
    ticked: ['Susu', 'Telur', 'Pisang'],
    home: 'Rumah, Oktober',
    homeEntries: [
      [1, '2026-10-01', 'income', 'income', 'Gaji Sari', 9_500_000],
      [2, '2026-10-01', 'income', 'income', 'Gaji Dimas', 8_750_000],
      [3, '2026-10-01', 'expense', 'bills', 'Sewa kontrakan', 3_500_000],
      [4, '2026-10-02', 'expense', 'bills', 'Token PLN', 300_000],
      [5, '2026-10-03', 'expense', 'groceries', 'Superindo', 640_000],
      [6, '2026-10-05', 'expense', 'transport', 'Grab ke kantor', 38_000, 3],
      [7, '2026-10-06', 'expense', 'fnb', 'Martabak malam', 85_000],
      [8, '2026-10-08', 'expense', 'bills', 'Indihome', 380_000],
      [9, '2026-10-09', 'expense', 'social', 'Kondangan', 300_000],
      [10, '2026-10-11', 'expense', 'groceries', 'Indomaret', 145_000],
    ],
    typed: 'Grab pulang kantor',
    trip: 'Tokyo, Oktober',
    tripEntries: [
      [1, '2026-10-01', 'income', 'freelance', 'Logo Kopi Senja', 7_500_000],
      [2, '2026-10-03', 'income', 'freelance', 'Ikon aplikasi Tanam', 4_200_000],
      [3, '2026-10-04', 'expense', 'vacation', 'Tiket pesawat ke Tokyo', 5_100_000],
      [4, '2026-10-05', 'expense', 'vacation', 'Hotel kapsul, 5 malam', 4_800, 5, 'JPY', 108],
      [5, '2026-10-05', 'expense', 'transport', 'Isi saldo Suica', 3_000, 1, 'JPY', 108],
      [6, '2026-10-06', 'expense', 'bills', 'Coworking harian', 2_500, 3, 'JPY', 108],
      [7, '2026-10-07', 'expense', 'fnb', 'Ramen Ichiran', 1_280, 1, 'JPY', 108],
      [8, '2026-10-09', 'expense', 'groceries', 'Onigiri 7-Eleven', 680, 1, 'JPY', 108],
      [9, '2026-10-10', 'expense', 'shopping', 'Buku sketsa, Tokyu Hands', 1_650, 1, 'JPY', 108],
      [10, '2026-10-11', 'expense', 'fnb', 'Kopi Blue Bottle', 720, 2, 'JPY', 108],
    ],
    child: 'Arka',
    dad: 'Bapak',
  },
}

// What each account owns. `with` lists who it is shared with and how.
export const content = (lang) => {
  const t = text[lang]
  return {
    rina: {
      healthLogs: [
        {
          name: t.child,
          birthDate: '2024-03-15',
          sex: 'male',
          calorieTarget: null,
          with: { budi: 'write' },
          pinned: true,
          content: [
            { id: 'k1', kind: 'body', date: '2024-03-15', weight: 3.3, height: 50, head: 34.5 },
            { id: 'k2', kind: 'body', date: '2024-07-15', weight: 7.0, height: 65, head: 42 },
            { id: 'k3', kind: 'body', date: '2024-11-15', weight: 8.6, height: 71.5, head: 44.5 },
            { id: 'k4', kind: 'body', date: '2025-03-15', weight: 9.7, height: 76, head: 46 },
            { id: 'k5', kind: 'body', date: '2025-09-15', weight: 10.9, height: 82.5, head: 47.2 },
            { id: 'k6', kind: 'body', date: '2026-03-15', weight: 12.1, height: 88, head: 48 },
            { id: 'k7', kind: 'body', date: '2026-09-10', weight: 13.1, height: 92.2, head: 48.6 },
          ],
          // Weighed every 30 days: due since 2026-10-10.
          reminders: [{ id: 'r1', kind: 'body', everyDays: 30, time: '08:00' }],
        },
      ],
    },
    sari: {
      tasks: [
        {
          title: t.groceries,
          with: { dimas: 'write' },
          pinned: true,
          content: t.items.map(([item, checked]) => ({ item, checked })),
        },
      ],
      finances: [
        {
          title: t.home,
          with: { dimas: 'write' },
          pinned: true,
          currency: currency.IDR,
          content: t.homeEntries.map((row) => entry(row)),
        },
      ],
    },
    adit: {
      finances: [
        {
          title: t.trip,
          pinned: true,
          currency: currency.IDR,
          content: t.tripEntries.map((row) => entry(row)),
        },
      ],
    },
    maya: {
      healthLogs: [
        {
          name: t.dad,
          birthDate: '1958-04-02',
          sex: 'male',
          calorieTarget: 1800,
          with: { andi: 'read' },
          pinned: true,
          content: [
            { id: 'g1', kind: 'glucose', date: '2026-08-10', time: '07:00', value: 142, context: 'fasting' },
            { id: 'g2', kind: 'glucose', date: '2026-08-17', time: '07:00', value: 136, context: 'fasting' },
            { id: 'g3', kind: 'glucose', date: '2026-08-24', time: '07:00', value: 131, context: 'fasting' },
            { id: 'g4', kind: 'glucose', date: '2026-08-31', time: '07:00', value: 127, context: 'fasting' },
            { id: 'g5', kind: 'glucose', date: '2026-09-07', time: '07:00', value: 121, context: 'fasting' },
            { id: 'g6', kind: 'glucose', date: '2026-09-14', time: '07:00', value: 118, context: 'fasting' },
            { id: 'g7', kind: 'glucose', date: '2026-09-21', time: '07:00', value: 112, context: 'fasting' },
            { id: 'g8', kind: 'glucose', date: '2026-09-28', time: '07:00', value: 109, context: 'fasting' },
            { id: 'g9', kind: 'glucose', date: '2026-10-05', time: '07:00', value: 104, context: 'fasting' },
            { id: 'b1', kind: 'body', date: '2026-10-05', weight: 71.5, height: 166 },
            { id: 'c1', kind: 'cholesterol', date: '2026-09-07', total: 214, ldl: 136, hdl: 44, triglycerides: 168 },
            { id: 'u1', kind: 'uricAcid', date: '2026-09-07', value: 6.8 },
          ],
          // Every Sunday morning: due today.
          reminders: [{ id: 'r1', kind: 'glucose', everyDays: 7, time: '07:00' }],
        },
      ],
    },
    nadia: {
      healthLogs: [
        {
          name: 'Nadia',
          birthDate: '2002-05-08',
          sex: 'female',
          calorieTarget: null,
          pinned: true,
          // 28-day cycles, counted from the day of capture (the app uses the
          // real date): the next is expected in two days.
          content: [[4, 5, 'medium'], [3, 6, 'heavy'], [2, 5, 'medium'], [1, 6, 'medium']].map(([back, days, flow], index) => ({
            id: `p${index + 1}`,
            kind: 'period',
            date: daysAgo(back * 28 - 2),
            end: daysAgo(back * 28 - 2 - days + 1),
            flow,
          })),
          // Three days before the expected period: due since yesterday.
          reminders: [{ id: 'r1', kind: 'period', daysBefore: 3 }],
        },
      ],
    },
    typed: t.typed,
    ticked: t.ticked,
  }
}
