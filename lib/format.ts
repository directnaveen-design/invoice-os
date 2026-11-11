export function formatCurrency(
  value: number,
  currency: string = 'USD',
  opts: { compact?: boolean } = {}
) {
  const curr = (currency || 'USD').toUpperCase()
  const locale = curr === 'INR' ? 'en-IN' : 'en-US'

  if (opts.compact) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: curr,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value)
  }

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatDate(
  iso: string,
  opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
) {
  if (!iso) return ''
  const date = new Date(iso.includes('T') ? iso : `${iso}T00:00:00`)
  return new Intl.DateTimeFormat('en-IN', {
    ...opts,
    timeZone: 'Asia/Kolkata',
  }).format(date)
}
