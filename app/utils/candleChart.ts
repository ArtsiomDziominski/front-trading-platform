/**
 * Pure geometry and formatting helpers for BotCandleChart.
 * Candles are evenly spaced by index; prices map to y with `priceToY` (0 at the top of the plot).
 */
import type { CandleOut } from '#shared/types/bot'

export type ChartTone = 'accent' | 'up' | 'down' | 'warning' | 'info' | 'muted'

/** Horizontal price line: breakout level, average entry, add-on trigger, approximate trailing stop. */
export interface ChartLevel {
  id: string
  price: number
  label: string
  tone: ChartTone
  dashed?: boolean
}

/** Event glyph on the candle that contains `time` (ISO, any moment inside the candle). */
export interface ChartMarker {
  id: string
  time: string
  price: number
  kind: 'entry' | 'addon' | 'exit'
  label: string
}

/** Overlay polyline; `values` has the same length and order as the candles, `null` where there is no value. */
export interface ChartLine {
  id: string
  label: string
  values: (number | null)[]
  tone: ChartTone
}

export const CHART_TONE_COLORS: Record<ChartTone, string> = {
  accent: 'var(--color-accent)',
  up: 'var(--color-up)',
  down: 'var(--color-down)',
  warning: 'var(--color-warning)',
  info: 'var(--color-info)',
  muted: 'var(--color-text-muted)',
}

const MINUTES_PER_DAY = 1440
const MS_PER_DAY = 86_400_000

export function clampToRange(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/** Centre of a 1px line on the pixel grid, so it is drawn sharp. */
export function crispPixel(value: number): number {
  return Math.round(value) + 0.5
}

export interface PriceScale {
  min: number
  max: number
  /** Plot height in px. */
  height: number
}

/** All four prices are finite numbers; anything else would put NaN into the SVG paths. */
export function isFiniteCandle(candle: CandleOut): boolean {
  return [candle.open, candle.high, candle.low, candle.close].every(value => typeof value === 'number' && Number.isFinite(value))
    && Number.isFinite(Date.parse(candle.timestamp))
}

export function priceToY(scale: PriceScale, price: number): number {
  return ((scale.max - price) / (scale.max - scale.min)) * scale.height
}

export function yToPrice(scale: PriceScale, y: number): number {
  return scale.max - (y / scale.height) * (scale.max - scale.min)
}

/**
 * Lowest low / highest high widened to every finite `extra` price, then padded by `padding` of the span.
 * A flat window gets a ±1% band so the candles sit in the middle instead of on a zero-height scale.
 */
export function priceDomain(
  candles: readonly CandleOut[],
  extra: Iterable<number> = [],
  padding = 0.06,
): { min: number, max: number } | null {
  let min = Infinity
  let max = -Infinity
  for (const candle of candles) {
    if (Number.isFinite(candle.low)) min = Math.min(min, candle.low)
    if (Number.isFinite(candle.high)) max = Math.max(max, candle.high)
  }
  for (const price of extra) {
    if (!Number.isFinite(price)) continue
    min = Math.min(min, price)
    max = Math.max(max, price)
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null

  if (max - min <= 0) {
    const half = Math.abs(max) * 0.01 || 0.5
    min -= half
    max += half
  }
  const pad = (max - min) * padding
  return { min: min - pad, max: max + pad }
}

/** Decimal places needed to print `step` exactly: 0.25 → 2, 50 → 0. */
export function stepFractionDigits(step: number): number {
  for (let digits = 0; digits < 12; digits++) {
    const scaled = step * 10 ** digits
    if (scaled >= 1 - 1e-9 && Math.abs(scaled - Math.round(scaled)) < 1e-6 * scaled) return digits
  }
  return 12
}

export interface PriceTicks {
  values: number[]
  step: number
  /** Fraction digits shared by every tick label. */
  digits: number
}

const NICE_MANTISSAS = [1, 2, 2.5, 5]

/** Round ticks inside [min, max]: the smallest 1 / 2 / 2.5 / 5 × 10ⁿ step that gives at most `maxCount` of them. */
export function niceTicks(min: number, max: number, maxCount: number): PriceTicks {
  if (!(max > min) || !Number.isFinite(min) || !Number.isFinite(max) || maxCount < 1) {
    return { values: [], step: 0, digits: 0 }
  }

  let exponent = Math.floor(Math.log10((max - min) / maxCount))
  for (let attempt = 0; attempt < 4; attempt++, exponent++) {
    for (const mantissa of NICE_MANTISSAS) {
      // Dividing by 10ⁿ keeps small steps exact (2.5 / 1e5 rather than 2.5 * 1e-5)
      const step = exponent >= 0 ? mantissa * 10 ** exponent : mantissa / 10 ** -exponent
      const first = Math.ceil(min / step - 1e-9)
      const last = Math.floor(max / step + 1e-9)
      if (last - first + 1 > maxCount) continue

      const digits = stepFractionDigits(step)
      const values: number[] = []
      for (let k = first; k <= last; k++) values.push(Number((k * step).toFixed(digits)))
      return { values, step, digits }
    }
  }
  return { values: [], step: 0, digits: 0 }
}

/** Candle body width for a slot: ~66% of it, 1–25px, odd so the 1px wick sits on the middle pixel. */
export function candleBodyWidth(slot: number): number {
  const width = clampToRange(Math.round(slot * 0.66), 1, 25)
  return width > 2 && width % 2 === 0 ? width - 1 : width
}

export interface CandleShape {
  /** Left edge of the body. */
  x: number
  width: number
  /** Pixel-centred x of the wick (also the candle centre for crosshair and markers). */
  wickX: number
  highY: number
  lowY: number
  bodyY: number
  bodyHeight: number
  rising: boolean
}

export function candleShape(
  candle: CandleOut,
  index: number,
  slot: number,
  bodyWidth: number,
  toY: (price: number) => number,
): CandleShape {
  const x = Math.round(index * slot + (slot - bodyWidth) / 2)
  const bodyTop = Math.round(toY(Math.max(candle.open, candle.close)))
  const bodyBottom = Math.round(toY(Math.min(candle.open, candle.close)))
  return {
    x,
    width: bodyWidth,
    wickX: x + Math.floor((bodyWidth - 1) / 2) + 0.5,
    highY: Math.round(toY(candle.high)),
    lowY: Math.round(toY(candle.low)),
    bodyY: bodyTop,
    bodyHeight: Math.max(1, bodyBottom - bodyTop),
    rising: candle.close >= candle.open,
  }
}

export interface CandlePaths {
  upWicks: string
  upBodies: string
  downWicks: string
  downBodies: string
}

/** All candles as four path strings, so hundreds of candles cost four DOM nodes and hover never re-renders them. */
export function candlePaths(
  candles: readonly CandleOut[],
  slot: number,
  toY: (price: number) => number,
): CandlePaths {
  const bodyWidth = candleBodyWidth(slot)
  const upWicks: string[] = []
  const upBodies: string[] = []
  const downWicks: string[] = []
  const downBodies: string[] = []

  candles.forEach((candle, index) => {
    const shape = candleShape(candle, index, slot, bodyWidth, toY)
    const wick = `M${shape.wickX} ${shape.highY}V${shape.lowY}`
    const body = `M${shape.x} ${shape.bodyY}h${bodyWidth}v${shape.bodyHeight}h${-bodyWidth}Z`
    if (shape.rising) {
      upWicks.push(wick)
      upBodies.push(body)
    }
    else {
      downWicks.push(wick)
      downBodies.push(body)
    }
  })

  return {
    upWicks: upWicks.join(''),
    upBodies: upBodies.join(''),
    downWicks: downWicks.join(''),
    downBodies: downBodies.join(''),
  }
}

/** Polyline through the non-null values; a null breaks the line and the next value starts a new segment. */
export function linePath(
  values: readonly (number | null)[],
  count: number,
  toX: (index: number) => number,
  toY: (value: number) => number,
): string {
  let path = ''
  let drawing = false
  const length = Math.min(count, values.length)
  for (let index = 0; index < length; index++) {
    const value = values[index]
    if (value == null || !Number.isFinite(value)) {
      drawing = false
      continue
    }
    path += `${drawing ? 'L' : 'M'}${toX(index).toFixed(1)} ${toY(value).toFixed(1)}`
    drawing = true
  }
  return path
}

/** Candle under a plot x coordinate, clamped to the window; -1 when there are no candles. */
export function indexAtX(x: number, slot: number, count: number): number {
  if (count <= 0 || !(slot > 0)) return -1
  return clampToRange(Math.floor(x / slot), 0, count - 1)
}

/** Index of the candle whose [start, start + interval) contains `time`, or -1. `starts` must be ascending. */
export function candleIndexAt(starts: readonly number[], time: number, intervalMs: number): number {
  if (!Number.isFinite(time)) return -1
  let low = 0
  let high = starts.length - 1
  let found = -1
  while (low <= high) {
    const middle = (low + high) >> 1
    const start = starts[middle] ?? Number.NaN
    if (start <= time) {
      found = middle
      low = middle + 1
    }
    else {
      high = middle - 1
    }
  }
  if (found < 0) return -1
  const start = starts[found] ?? Number.NaN
  return time < start + intervalMs ? found : -1
}

/**
 * Spreads tag centres so neighbours are at least `size` apart, keeping them inside [min, max].
 * Overlapping tags are grouped and each group is centred on the mean of its wanted positions; input order is kept.
 */
export function spreadLabels(positions: readonly number[], size: number, min: number, max: number): number[] {
  const sorted = positions
    .map((position, index) => ({ position: clampToRange(position, min, max), index }))
    .sort((a, b) => a.position - b.position)

  interface Group { top: number, sum: number, items: number[] }
  const groups: Group[] = []
  const place = (group: Group) => {
    const count = group.items.length
    const top = group.sum / count - ((count - 1) * size) / 2
    group.top = clampToRange(top, min, Math.max(min, max - (count - 1) * size))
  }

  for (const item of sorted) {
    const group: Group = { top: item.position, sum: item.position, items: [item.index] }
    place(group)
    groups.push(group)
    while (groups.length > 1) {
      const current = groups[groups.length - 1]
      const previous = groups[groups.length - 2]
      if (!current || !previous) break
      const previousBottom = previous.top + (previous.items.length - 1) * size
      if (current.top - previousBottom >= size) break
      previous.sum += current.sum
      previous.items.push(...current.items)
      place(previous)
      groups.pop()
    }
  }

  const result = Array.from<number>({ length: positions.length })
  for (const group of groups) {
    group.items.forEach((index, offset) => {
      result[index] = group.top + offset * size
    })
  }
  return result
}

const TIME_STEPS_MINUTES = [15, 30, 60, 120, 180, 240, 360, 720, 1440, 2880, 4320, 10080]

/** Smallest round step (a multiple of the candle interval) that keeps the labels within `maxCount`. */
export function pickTimeStep(spanMinutes: number, intervalMinutes: number, maxCount: number): number {
  for (const step of TIME_STEPS_MINUTES) {
    if (step < intervalMinutes || step % intervalMinutes !== 0) continue
    if (Math.floor(spanMinutes / step) <= maxCount) return step
  }
  return Math.ceil(spanMinutes / Math.max(1, maxCount) / MINUTES_PER_DAY) * MINUTES_PER_DAY
}

/** Whether a moment is a round step boundary in the local time zone (multi-day steps count days from the epoch). */
export function isTimeTick(time: number, stepMinutes: number): boolean {
  const date = new Date(time)
  if (date.getSeconds() !== 0 || date.getMilliseconds() !== 0) return false
  const minuteOfDay = date.getHours() * 60 + date.getMinutes()
  if (stepMinutes < MINUTES_PER_DAY) return minuteOfDay % stepMinutes === 0
  if (minuteOfDay !== 0) return false

  const day = Math.round(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / MS_PER_DAY)
  const days = Math.round(stepMinutes / MINUTES_PER_DAY)
  // Day 0 (1970-01-01) was a Thursday; weekly ticks fall on Mondays
  return (days === 7 ? day + 3 : day) % days === 0
}

export interface TimeTick {
  index: number
  time: number
  /** `day` at local midnight, `dayTime` when the date changed without a midnight candle, `time` otherwise. */
  kind: 'day' | 'dayTime' | 'time'
}

/** Candles whose open time is a round local time for a step that fits `maxCount` labels. */
export function timeTicks(starts: readonly number[], intervalMinutes: number, maxCount: number): TimeTick[] {
  const valid = starts.filter(Number.isFinite)
  const first = valid[0]
  const last = valid.at(-1)
  if (first == null || last == null) return []

  const spanMinutes = (last - first) / 60_000 + intervalMinutes
  const step = pickTimeStep(spanMinutes, intervalMinutes, maxCount)
  const ticks: TimeTick[] = []
  let previousDay: string | null = null

  starts.forEach((time, index) => {
    if (!Number.isFinite(time) || !isTimeTick(time, step)) return
    const date = new Date(time)
    const day = date.toDateString()
    const midnight = date.getHours() === 0 && date.getMinutes() === 0
    const dayChanged = previousDay != null && previousDay !== day
    ticks.push({ index, time, kind: midnight ? 'day' : dayChanged ? 'dayTime' : 'time' })
    previousDay = day
  })
  if (ticks.length) return ticks

  // Interval that never lands on round times: fall back to evenly spaced candles
  const every = Math.max(1, Math.ceil(starts.length / Math.max(1, maxCount)))
  const fallback: TimeTick[] = []
  for (let index = Math.floor(every / 2); index < starts.length; index += every) {
    const time = starts[index]
    if (time != null && Number.isFinite(time)) fallback.push({ index, time, kind: 'time' })
  }
  return fallback
}

const dateFormats = new Map<string, Intl.DateTimeFormat>()

function dateFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let format = dateFormats.get(key)
  if (!format) {
    format = new Intl.DateTimeFormat(locale, options)
    dateFormats.set(key, format)
  }
  return format
}

/** Local "HH:mm" (24-hour in every locale). */
export function formatChartTime(time: number, locale: string): string {
  return dateFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(time)
}

/** Local short day: "11 окт" / "Oct 11" (the abbreviation dot is dropped). */
export function formatChartDay(time: number, locale: string): string {
  return dateFormat(locale, { day: 'numeric', month: 'short' })
    .formatToParts(time)
    .map(part => (part.type === 'month' ? part.value.replace(/\.$/, '') : part.value))
    .join('')
}

/** "11 окт, 14:15" */
export function formatChartMoment(time: number, locale: string): string {
  return `${formatChartDay(time, locale)}, ${formatChartTime(time, locale)}`
}

/** Candle span in local time: "11 окт, 14:15–14:30"; daily and longer candles show the day only. */
export function formatCandleRange(start: number, intervalMs: number, locale: string): string {
  if (intervalMs >= MS_PER_DAY) return formatChartDay(start, locale)
  return `${formatChartMoment(start, locale)}–${formatChartTime(start + intervalMs, locale)}`
}

/** Rough advance width of 11px tabular text, enough to size axis tags without measuring the DOM. */
export function estimateTextWidth(text: string, fontSize = 11): number {
  return text.length * fontSize * 0.62
}
