// Voice-over for the launch sneak peek — short, one line per beat. Casual EN + ID.
// Same promise as the website: play together / main bareng.

export const narration = {
  en: {
    hook: 'Play together, anywhere.',
    brand: 'This is Krida — a sneak peek.',
    board: 'One warm table. Pass the phone, or sit side by side.',
    nearby: 'Friends next to you over Bluetooth or Wi‑Fi. No account needed.',
    games: 'And more boards waiting on the table.',
    cta: 'Come join as a closed tester at krida.ardeman.com.',
  },
  id: {
    hook: 'Main bareng, di mana saja.',
    brand: 'Ini Krida — cuplikan kecil saja.',
    board: 'Satu meja yang hangat. Gantian di satu HP, atau duduk berdampingan.',
    nearby: 'Teman di sebelah lewat Bluetooth atau Wi‑Fi. Tanpa akun.',
    games: 'Dan masih banyak permainan lainnya.',
    cta: 'Yuk gabung jadi closed tester di krida.ardeman.com.',
  },
}

// English voice reads Indonesian “c” as “k”; respell for the narrator only.
// Keep English loanwords (closed) intact so they aren’t turned into “chlosed”.
// Domain dots → “dot” (krida.ardeman.com → krida dot ardeman dot com).
// Pepet “e” in bareng → ə (barəng), as on howtopronounce.com/bareng.
const KEEP_EN = ['closed', 'com', 'dot']
export const spoken = (text, lang) => {
  if (lang !== 'id') return text
  // Dots first (before protecting “com”), then shield loanwords, then c→ch.
  let out = text.replaceAll(/(?<=\w)\.(?=\w)/g, ' dot ')
  out = out.replaceAll(/\b[Bb]areng\b/g, (m) => (m[0] === 'B' ? 'Barəng' : 'barəng'))
  const held = []
  for (const w of KEEP_EN) {
    out = out.replaceAll(new RegExp(`\\b${w}\\b`, 'g'), () => {
      held.push(w)
      return `\u0000${held.length - 1}\u0000`
    })
  }
  out = out.replaceAll(/c(?!h)/g, 'ch').replaceAll(/C(?!h)/g, 'Ch')
  return out.replaceAll(/\u0000(\d+)\u0000/g, (_, i) => held[Number(i)])
}
