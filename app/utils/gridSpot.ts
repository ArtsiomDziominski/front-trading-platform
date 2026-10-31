import type { GridSpotConfig } from '#shared/types/bot'

/** GRID_SPOT helpers: config limits and defaults, the level ladder (same formulas as app/strategies/grid_spot.py), phase labels. */

type Translate = (key: string, params?: Record<string, unknown>) => string

/** Ranges of `GridSpotConfig` on the server. */
export const GRID_SPOT_LIMITS = {
  grid_count_min: 2,
  grid_count_max: 150,
  order_usdt_max: 10_000_000,
  /** The narrowest cell, % of its lower level. */
  min_step_percent: 0.1,
}

export const GRID_SPOT_SERVER_DEFAULTS = {
  grid_count: 20,
  geometric: false,
}

/** What a new form starts with: the range is filled from the current price (±10%). */
export const GRID_SPOT_FORM_DEFAULTS = {
  symbol: 'BTCUSDT',
  grid_count: '20',
  order_usdt: '10',
  range_percent: 10,
}

/** The `count` + 1 levels from lower to upper, evenly spaced or by an equal ratio. */
export function gridSpotLevels(lower: number, upper: number, count: number, geometric: boolean): number[] {
  if (!(count >= 1) || !(lower > 0) || !(upper > lower)) return []
  const out: number[] = []
  if (geometric) {
    const ratio = (upper / lower) ** (1 / count)
    for (let k = 0; k < count; k += 1) out.push(lower * ratio ** k)
  } else {
    const step = (upper - lower) / count
    for (let k = 0; k < count; k += 1) out.push(lower + step * k)
  }
  out.push(upper)
  return out
}

export function gridSpotMinStepPercent(levels: number[]): number | null {
  let min: number | null = null
  for (let k = 0; k + 1 < levels.length; k += 1) {
    const lower = levels[k]!
    const step = (levels[k + 1]! / lower - 1) * 100
    if (min == null || step < min) min = step
  }
  return min
}

export interface GridSpotPlan {
  levels: number[]
  /** Cells above the start price: they get their coins with the start's market buy. */
  sellingCells: number
  buyingCells: number
  /** USDT the start locks / spends (no lot rounding). */
  fundsUsdt: number
  /** Profit of one round trip of the narrowest / widest cell, USDT, before fees. */
  minProfitUsdt: number
  maxProfitUsdt: number
  minStepPercent: number | null
  maxStepPercent: number | null
}

export function gridSpotPlan(params: {
  lower: number
  upper: number
  count: number
  geometric: boolean
  orderUsdt: number
  price: number | null
}): GridSpotPlan | null {
  const levels = gridSpotLevels(params.lower, params.upper, params.count, params.geometric)
  if (!levels.length || !(params.orderUsdt > 0)) return null
  let selling = 0
  let funds = 0
  let minProfit: number | null = null
  let maxProfit: number | null = null
  let maxStep: number | null = null
  for (let k = 0; k + 1 < levels.length; k += 1) {
    const buy = levels[k]!
    const sell = levels[k + 1]!
    const qty = params.orderUsdt / buy
    const holds = params.price != null && buy > params.price
    if (holds) selling += 1
    funds += holds && params.price != null ? qty * params.price : params.orderUsdt
    const profit = qty * (sell - buy)
    minProfit = minProfit == null ? profit : Math.min(minProfit, profit)
    maxProfit = maxProfit == null ? profit : Math.max(maxProfit, profit)
    const step = (sell / buy - 1) * 100
    maxStep = maxStep == null ? step : Math.max(maxStep, step)
  }
  return {
    levels,
    sellingCells: selling,
    buyingCells: levels.length - 1 - selling,
    fundsUsdt: funds,
    minProfitUsdt: minProfit ?? 0,
    maxProfitUsdt: maxProfit ?? 0,
    minStepPercent: gridSpotMinStepPercent(levels),
    maxStepPercent: maxStep,
  }
}

export type GridSpotPhaseTone = 'live' | 'wait' | 'muted'

export function gridSpotPhaseLabel(t: Translate, phase: string | null | undefined): string {
  switch (phase) {
    case 'starting': return t('bots.grid_spot_phase_starting')
    case 'running': return t('bots.grid_spot_phase_running')
    case 'exiting': return t('bots.grid_spot_phase_exiting')
    case 'stopped': return t('bots.grid_spot_phase_stopped')
    default: return phase || '—'
  }
}

export function gridSpotPhaseTone(phase: string | null | undefined): GridSpotPhaseTone {
  if (phase === 'running') return 'live'
  if (phase === 'starting' || phase === 'exiting') return 'wait'
  return 'muted'
}

export function gridSpotExitReasonLabel(t: Translate, reason: string | null | undefined): string {
  switch (reason) {
    case 'stop_loss': return t('bots.grid_spot_exit_stop_loss')
    case 'take_profit': return t('bots.grid_spot_exit_take_profit')
    case 'manual': return t('bots.grid_spot_exit_manual')
    default: return reason || '—'
  }
}

/** Builds the config sent to POST /bots from already validated form values. */
export function buildGridSpotConfig(values: {
  symbol: string
  lowerPrice: string
  upperPrice: string
  gridCount: number
  orderUsdt: string
  geometric: boolean
  stopLossPrice: string | null
  takeProfitPrice: string | null
}): GridSpotConfig {
  return {
    symbol: values.symbol,
    lower_price: values.lowerPrice,
    upper_price: values.upperPrice,
    grid_count: values.gridCount,
    order_usdt: values.orderUsdt,
    geometric: values.geometric,
    stop_loss_price: values.stopLossPrice,
    take_profit_price: values.takeProfitPrice,
  }
}
