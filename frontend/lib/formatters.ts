export function fmtBDT(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M'
  if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K'
  return v.toLocaleString('en-US', { minimumFractionDigits: 0 })
}

export function fmtDate(d: string | Date | null | undefined): string {
  if (!d) return '—'
  try {
    const date = new Date(d)
    if (isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return '—'
  }
}

export function fmt(v: number, dec = 0): string {
  return v.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

export function parsePct(v: unknown): number {
  return parseFloat(String(v)) || 0
}
