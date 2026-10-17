// A book's list summary, as the app's bookSummary (finance-analysis.ts)
// writes it: the app keeps it only from its own saves.
const bookTotal = (entry) => entry.quantity * entry.amount * entry.rate
const bookSummary = (entries) => {
  let income = 0
  let expense = 0
  const byCategory = new Map()
  for (const entry of entries) {
    if (entry.type === 'income') income += bookTotal(entry)
    else {
      expense += bookTotal(entry)
      byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + bookTotal(entry))
    }
  }
  const sorted = Array.from(byCategory, ([category, total]) => ({ category, total, share: total / expense })).toSorted((a, b) => b.total - a.total)
  const rest = sorted.slice(6).reduce((sum, item) => sum + item.total, 0)
  const spending = expense === 0 ? [] : sorted.length <= 7 ? sorted : [...sorted.slice(0, 6), { category: 'rest', total: rest, share: rest / expense }]
  const recent = entries
    .map((entry, index) => ({ entry, index }))
    .toSorted((a, b) => b.entry.date.localeCompare(a.entry.date) || b.index - a.index)
    .map(({ entry }) => entry)
    .slice(0, 50)
  return { count: entries.length, income, expense, spending, recent }
}

// A seeded book as the app stores it: its entries go in its months
// (finances/{id}/months/{YYYY-MM}), never in the book, and the book keeps
// `entryStore` 2 and the summary. Seeded plain; unlocking the app encrypts both.
export const bookSeed = ({ content: entries = [], ...book }) => ({
  data: { ...book, entryStore: 2, summary: bookSummary(entries) },
  months: Array.from(Map.groupBy(entries, (entry) => entry.date.slice(0, 7)), ([month, content]) => ({ month, content })),
})
