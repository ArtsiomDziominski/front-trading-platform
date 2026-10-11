/**
 * Number and date formatting for bot data in the UI locale.
 * API values come as numbers or decimal strings (config and cycle state keep Decimals as strings).
 */

const formatters = new Map<string, Intl.NumberFormat>()

function numberFormat(locale: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = formatters.get(key)
  if (!formatter) {
    formatter = new Intl.NumberFormat(locale, options)
    formatters.set(key, formatter)
  }
  return formatter
}

/** Number from an API value; `null` for empty, non-numeric or non-finite input. */
export function toNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  if (typeof value !== 'string' || !value.trim()) return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

/** Fraction digits that keep about four significant digits: 64 250.50, 22.94, 2.556, 0.198, 0.00001234. */
export function priceFractionDigits(value: number): number {
  const abs = Math.abs(value)
  if (!Number.isFinite(abs) || abs >= 100 || abs === 0) return 2
  if (abs >= 1) return 4
  return Math.min(8, 3 - Math.floor(Math.log10(abs)))
}

/** Price with adaptive precision; pass `fractionDigits` to keep a column or an axis aligned. */
export function formatPrice(value: number, locale: string, fractionDigits?: number): string {
  const digits = fractionDigits ?? priceFractionDigits(value)
  return numberFormat(locale, {
    minimumFractionDigits: fractionDigits ?? Math.min(2, digits),
    maximumFractionDigits: digits,
  }).format(value)
}

/** USDT amount with two decimals; `signed` adds `+` to positive values. */
export function formatUsdt(value: number, locale: string, signed = false): string {
  return numberFormat(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value)
}

/** Percent value given in percent units (`3.12` → `3,12 %` in ru); `signed` adds `+`. */
export function formatPercentValue(value: number, locale: string, signed = false): string {
  return numberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(value / 100)
}

/** Coin or contract quantity: as many decimals as the value has, up to 8. */
export function formatQuantity(value: number, locale: string): string {
  return numberFormat(locale, { maximumFractionDigits: 8 }).format(value)
}

/** Plain integer or short number (counts, periods). */
export function formatCount(value: number, locale: string): string {
  return numberFormat(locale, { maximumFractionDigits: 2 }).format(value)
}

/** Short date and time, or the raw value when it is not a date. */
export function formatDateTime(value: string, locale: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short' }).format(date)
}
