import type {
  BotListItem,
  GridCycleState,
  GridDirection,
  GridOrderUnit,
  GridProgressionType,
  MixedGridSettings,
} from '#shared/types/bot'

/** One row of the order table, as typed (strings, so a half-typed "0." survives). */
export interface MixedGridOrderRow {
  size: string
  unit: GridOrderUnit
  /** Step to the next order, %; empty = the grid step. */
  step: string
}

/** Form state of the mixed sizing mode (create form and the edit modal share it). */
export interface MixedGridForm {
  deposit: string
  fixedCount: string
  fixedUsdt: string
  totalOrders: string
  progressionType: GridProgressionType
  startValue: string
  unit: GridOrderUnit
  increment: string
  ratio: string
  step: string
  orders: MixedGridOrderRow[]
}

export const MIXED_GRID_MAX_ORDERS = 501
/** Same bound as the API: % of the deposit as notional, so with leverage it may exceed 100. */
export const MIXED_GRID_PERCENT_MAX = 1000

type Translate = (key: string, values?: Record<string, unknown>) => string

/** Unlike `toNullableNumber`, zero is a number here: 0 fixed orders and a +0 increment are valid. Accepts "1,5". */
function num(value: string | number | null | undefined): number | null {
  if (value == null) return null
  if (typeof value === 'number') return Number.isFinite(value) ? value : null
  const trimmed = value.trim().replace(',', '.')
  if (!trimmed) return null
  const parsed = Number(trimmed)
  return Number.isFinite(parsed) ? parsed : null
}

function intOr(value: string, fallback: number): number {
  const parsed = num(value)
  return parsed != null && Number.isInteger(parsed) ? parsed : fallback
}

/** Decimal text without float noise: 0.1 + 0.2 → "0.3", 5 × 2³ → "40". */
export function formatSize(value: number): string {
  if (!Number.isFinite(value)) return ''
  return String(Number(value.toFixed(8)))
}

export function fixedOrdersCount(form: MixedGridForm): number {
  return Math.max(0, intOr(form.fixedCount, 0))
}

/** The progression starts right after the fixed orders — the two are always consistent. */
export function progressionStartOrder(form: MixedGridForm): number {
  return fixedOrdersCount(form) + 1
}

export function progressionSizes(form: MixedGridForm, count: number): number[] {
  const start = num(form.startValue)
  if (start == null || count <= 0) return []

  if (form.progressionType === 'arithmetic') {
    const increment = num(form.increment) ?? 0
    return Array.from({ length: count }, (_, k) => start + increment * k)
  }
  if (form.progressionType === 'geometric') {
    const ratio = num(form.ratio) ?? 1
    return Array.from({ length: count }, (_, k) => start * ratio ** k)
  }

  return Array.from({ length: count }, () => start)
}

/**
 * Table grown or cut to `totalOrders`. Existing rows are kept as they are; only added rows get a size —
 * fixed amount or the progression value for their position.
 */
export function resizeOrders(form: MixedGridForm): MixedGridOrderRow[] {
  const total = Math.min(Math.max(intOr(form.totalOrders, form.orders.length), 0), MIXED_GRID_MAX_ORDERS)
  const rows = form.orders.slice(0, total)
  if (rows.length === total) return rows

  const fixedCount = fixedOrdersCount(form)
  const from = progressionStartOrder(form) - 1
  const sizes = progressionSizes(form, Math.max(total - from, 0))
  const step = form.step.trim()
  while (rows.length < total) {
    const index = rows.length
    if (index < fixedCount) {
      rows.push({ size: form.fixedUsdt.trim(), unit: 'USDT', step })
    } else {
      const size = sizes[index - from]
      rows.push({ size: size == null ? '' : formatSize(size), unit: form.unit, step })
    }
  }
  return rows
}

/** Explicit action: the first N rows become fixed USDT orders. Rows after them are not touched. */
export function applyFixedOrders(form: MixedGridForm): MixedGridOrderRow[] {
  const rows = resizeOrders(form)
  const count = Math.min(fixedOrdersCount(form), rows.length)
  const amount = form.fixedUsdt.trim()
  const step = form.step.trim()

  return rows.map((row, index) => (index < count ? { size: amount, unit: 'USDT', step: step || row.step } : row))
}

/** Explicit action: rows from the start order on are filled by the progression; earlier rows are not touched. */
export function applyProgression(form: MixedGridForm): MixedGridOrderRow[] {
  const rows = resizeOrders(form)
  const from = progressionStartOrder(form) - 1
  if (from >= rows.length) return rows

  const sizes = progressionSizes(form, rows.length - from)
  const step = form.step.trim()

  return rows.map((row, index) => {
    if (index < from) return row
    const size = sizes[index - from]
    return { size: size == null ? row.size : formatSize(size), unit: form.unit, step: step || row.step }
  })
}

export function defaultMixedGridForm(): MixedGridForm {
  const form: MixedGridForm = {
    deposit: '2000',
    fixedCount: '4',
    fixedUsdt: '1',
    totalOrders: '8',
    progressionType: 'arithmetic',
    startValue: '5',
    unit: 'PERCENT',
    increment: '5',
    ratio: '2',
    step: '1',
    orders: [],
  }
  form.orders = applyFixedOrders(form)
  form.orders = applyProgression(form)
  return form
}

export function orderNotionalUsdt(row: Pick<MixedGridOrderRow, 'size' | 'unit'>, deposit: number | null): number | null {
  const size = num(row.size)
  if (size == null || size <= 0) return null
  if (row.unit === 'USDT') return size
  if (deposit == null || deposit <= 0) return null
  // Same rounding as the bot: down to cents
  return Math.floor(((deposit * size) / 100) * 100 + 1e-9) / 100
}

export function totalNotionalUsdt(form: MixedGridForm, deposit: number | null): number | null {
  let total = 0
  for (const row of form.orders) {
    const notional = orderNotionalUsdt(row, deposit)
    if (notional == null) return null
    total += notional
  }
  return total
}

/** Limit price of every order when the anchor is known: #1 is the market entry at the anchor. */
export function orderPrices(form: MixedGridForm, anchor: number | null, direction: GridDirection, gridStep: string): (number | null)[] {
  if (anchor == null || anchor <= 0) return form.orders.map(() => null)

  const fallback = num(gridStep)
  const prices: (number | null)[] = [anchor]
  let price: number | null = anchor
  for (let index = 1; index < form.orders.length; index += 1) {
    const step = num(form.orders[index - 1]?.step ?? '') ?? fallback
    price = price == null || step == null ? null : price * (direction === 'LONG' ? 1 - step / 100 : 1 + step / 100)
    prices.push(price)
  }
  return prices
}

/** First problem of the form, or null. Exchange minimums are checked by the API (400 with the order numbers). */
export function validateMixedGrid(form: MixedGridForm, t: Translate): string | null {
  const deposit = num(form.deposit)
  if (deposit == null || deposit <= 0) return t('bots.mixed_error_deposit')

  const fixedCount = num(form.fixedCount)
  if (fixedCount == null || !Number.isInteger(fixedCount) || fixedCount < 0) return t('bots.mixed_error_fixed_count')

  if (form.orders.length < 2 || form.orders.length > MIXED_GRID_MAX_ORDERS) {
    return t('bots.mixed_error_orders_count', { max: MIXED_GRID_MAX_ORDERS })
  }
  if (fixedCount > form.orders.length) return t('bots.mixed_error_fixed_too_many')

  if (fixedCount > 0) {
    const fixedUsdt = num(form.fixedUsdt)
    if (fixedUsdt == null || fixedUsdt <= 0) return t('bots.mixed_error_fixed_usdt')
  }

  if (fixedCount < form.orders.length) {
    const start = num(form.startValue)
    if (start == null || start <= 0) return t('bots.mixed_error_start_value')
    if (form.unit === 'PERCENT' && start > MIXED_GRID_PERCENT_MAX) return t('bots.mixed_error_percent_max', { max: MIXED_GRID_PERCENT_MAX })
    if (form.progressionType === 'arithmetic') {
      const increment = num(form.increment)
      if (increment == null || increment < 0) return t('bots.mixed_error_increment')
    }
    if (form.progressionType === 'geometric') {
      const ratio = num(form.ratio)
      if (ratio == null || ratio <= 0 || ratio > 100) return t('bots.mixed_error_ratio')
    }
  }

  const progressionStep = form.step.trim()
  if (progressionStep) {
    const step = num(progressionStep)
    if (step == null || step <= 0 || step > 100) return t('bots.mixed_error_step')
  }

  for (const [index, row] of form.orders.entries()) {
    const size = num(row.size)
    if (size == null || size <= 0) return t('bots.mixed_error_order_size', { number: index + 1 })
    if (row.unit === 'PERCENT' && size > MIXED_GRID_PERCENT_MAX) {
      return t('bots.mixed_error_order_percent', { number: index + 1, max: MIXED_GRID_PERCENT_MAX })
    }
    if (row.step.trim()) {
      const step = num(row.step)
      if (step == null || step <= 0 || step > 100) return t('bots.mixed_error_order_step', { number: index + 1 })
    }
  }

  return null
}

/** Typed decimal as the API takes it ("1,5" → "1.5"); null when empty. */
function text(value: string): string | null {
  const trimmed = value.trim().replace(',', '.')
  return trimmed ? trimmed : null
}

export function buildMixedGridPayload(form: MixedGridForm): MixedGridSettings {
  const fixedCount = fixedOrdersCount(form)
  const hasProgression = fixedCount < form.orders.length

  return {
    deposit_usdt: text(form.deposit) ?? '',
    fixed_orders_count: fixedCount,
    fixed_order_usdt: fixedCount > 0 ? text(form.fixedUsdt) : null,
    progression: hasProgression
      ? {
          start_order: fixedCount + 1,
          type: form.progressionType,
          start_value: text(form.startValue) ?? '',
          unit: form.unit,
          increment: form.progressionType === 'arithmetic' ? text(form.increment) ?? '0' : null,
          ratio: form.progressionType === 'geometric' ? text(form.ratio) : null,
          step_percent: text(form.step),
        }
      : null,
    orders: form.orders.map((row) => ({
      size: text(row.size) ?? '',
      unit: row.unit,
      step_percent: text(row.step),
    })),
  }
}

function asText(value: unknown): string {
  return value == null ? '' : String(value).trim()
}

/** Form state from a stored `mixed_grid` (bot config or a creation-history payload); null when it is not one. */
export function parseMixedGrid(raw: unknown): MixedGridForm | null {
  if (!raw || typeof raw !== 'object') return null
  const grid = raw as Record<string, unknown>
  if (!Array.isArray(grid.orders) || grid.orders.length < 2) return null

  const orders: MixedGridOrderRow[] = []
  for (const item of grid.orders) {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    const unit = row.unit === 'PERCENT' ? 'PERCENT' : 'USDT'
    orders.push({ size: asText(row.size), unit, step: asText(row.step_percent) })
  }

  const progression = (grid.progression && typeof grid.progression === 'object'
    ? grid.progression
    : {}) as Record<string, unknown>
  const type = progression.type
  const defaults = defaultMixedGridForm()

  return {
    deposit: asText(grid.deposit_usdt),
    fixedCount: asText(grid.fixed_orders_count) || '0',
    fixedUsdt: asText(grid.fixed_order_usdt),
    totalOrders: String(orders.length),
    progressionType: type === 'geometric' || type === 'none' ? type : 'arithmetic',
    startValue: asText(progression.start_value) || defaults.startValue,
    unit: progression.unit === 'USDT' ? 'USDT' : 'PERCENT',
    increment: asText(progression.increment) || defaults.increment,
    ratio: asText(progression.ratio) || defaults.ratio,
    step: asText(progression.step_percent),
    orders,
  }
}

export function isMixedConfig(config: Record<string, unknown> | null | undefined): boolean {
  return config?.sizing_mode === 'mixed' && !!config.mixed_grid
}

/** A mixed cycle is running on its frozen settings: saved changes apply from the next cycle. */
export function isMixedCycleInProgress(bot: Pick<BotListItem, 'cycle_state' | 'config_version'>): boolean {
  const cycle = (bot.cycle_state as GridCycleState | null | undefined)?.cycle
  return !!cycle && cycle.config_version === bot.config_version && !cycle.settled
}
