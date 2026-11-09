import type { DcaSpotConfig } from '#shared/types/bot'
import { toNumber } from '~/utils/formatNumber'

/** DCA_SPOT helpers: config limits and defaults, the order ladder (same formulas as app/strategies/dca_spot.py), phase labels. */

type Translate = (key: string, params?: Record<string, unknown>) => string

/** Server defaults of `DcaSpotConfig`; the sizes have none (required). */
export const DCA_SERVER_DEFAULTS = {
  safety_orders_count: 5,
  price_deviation_percent: 1.5,
  step_scale: 1,
  volume_scale: 1,
  take_profit_percent: 1.5,
  trailing_take_profit_percent: null as number | null,
  stop_loss_percent: null as number | null,
  auto_restart: true,
  restart_delay_seconds: 0,
}

/** What a new form starts with: a moderate ladder that covers a drop of about 12 %. */
export const DCA_FORM_DEFAULTS = {
  symbol: 'BTCUSDT',
  base_order_usdt: '20',
  safety_order_usdt: '20',
  safety_orders_count: '5',
  price_deviation_percent: '1.5',
  step_scale: '1.2',
  volume_scale: '1.5',
  take_profit_percent: '1.5',
  trailing_take_profit_percent: '0.5',
  stop_loss_percent: '15',
  restart_delay_seconds: '0',
}

/** Ranges of `DcaSpotConfig` on the server. */
export const DCA_LIMITS = {
  order_usdt_max: 10_000_000,
  safety_orders_count_max: 50,
  price_deviation_percent_max: 50,
  scale_min: 0.5,
  scale_max: 5,
  take_profit_percent_max: 100,
  trailing_take_profit_percent_max: 50,
  stop_loss_percent_max: 100,
  restart_delay_seconds_max: 86_400,
}

/**
 * Typical exchange minimum for one spot order (Binance BTCUSDT and most USDT pairs: 5 USDT).
 * Only a hint: the server checks the real pair limits before the bot is created.
 */
export const DCA_TYPICAL_MIN_ORDER_USDT = 5

export interface DcaLadderParams {
  baseOrderUsdt: number
  safetyOrderUsdt: number
  safetyOrdersCount: number
  priceDeviationPercent: number
  stepScale: number
  volumeScale: number
  takeProfitPercent: number
}

export interface DcaLadderRow {
  /** 0 = base order, k ≥ 1 = safety order k. */
  index: number
  /** Cumulative drop from the base fill price, %; 0 for the base order. */
  deviationPercent: number
  /** Order price relative to the base fill price (1 = base). */
  priceRatio: number
  sizeUsdt: number
  cumulativeUsdt: number
  /** Average entry after this order fills, relative to the base fill price. */
  avgRatio: number
  /** Take-profit price after this order fills, relative to the base fill price. */
  takeProfitRatio: number
}

/** Cumulative deviations of safety orders 1…N: dev₁ = d, devₖ = devₖ₋₁ + d·stepᵏ⁻¹. */
export function dcaSafetyDeviations(count: number, deviationPercent: number, stepScale: number): number[] {
  const result: number[] = []
  let total = 0
  for (let k = 1; k <= count; k += 1) {
    total += deviationPercent * stepScale ** (k - 1)
    result.push(total)
  }
  return result
}

/** Safety order sizes in USDT: s·volumeᵏ⁻¹. */
export function dcaSafetySizes(count: number, safetyOrderUsdt: number, volumeScale: number): number[] {
  return Array.from({ length: count }, (_, index) => safetyOrderUsdt * volumeScale ** index)
}

/** Base order plus every safety order, USDT: what the bot may spend in one cycle. */
export function dcaMaxFundsUsdt(params: Pick<DcaLadderParams, 'baseOrderUsdt' | 'safetyOrderUsdt' | 'safetyOrdersCount' | 'volumeScale'>): number {
  return dcaSafetySizes(params.safetyOrdersCount, params.safetyOrderUsdt, params.volumeScale)
    .reduce((sum, size) => sum + size, params.baseOrderUsdt)
}

/**
 * The whole ladder relative to the base fill price, without exchange rounding (the bot rounds prices and
 * quantities down to the pair's tick and step, so real values differ slightly). Fees are not included.
 */
export function buildDcaLadder(params: DcaLadderParams): DcaLadderRow[] {
  const deviations = dcaSafetyDeviations(params.safetyOrdersCount, params.priceDeviationPercent, params.stepScale)
  const sizes = dcaSafetySizes(params.safetyOrdersCount, params.safetyOrderUsdt, params.volumeScale)
  const tp = 1 + params.takeProfitPercent / 100

  const rows: DcaLadderRow[] = []
  let cost = params.baseOrderUsdt
  let qty = params.baseOrderUsdt
  rows.push({ index: 0, deviationPercent: 0, priceRatio: 1, sizeUsdt: cost, cumulativeUsdt: cost, avgRatio: 1, takeProfitRatio: tp })

  deviations.forEach((deviation, index) => {
    const ratio = 1 - deviation / 100
    const size = sizes[index] ?? 0
    cost += size
    // A price at or below zero is rejected by the form; keep the math finite meanwhile
    if (ratio > 0) qty += size / ratio
    const avg = qty > 0 ? cost / qty : 1
    rows.push({
      index: index + 1,
      deviationPercent: deviation,
      priceRatio: ratio,
      sizeUsdt: size,
      cumulativeUsdt: cost,
      avgRatio: avg,
      takeProfitRatio: avg * tp,
    })
  })

  return rows
}

/** Saved config parsed into ladder parameters, server defaults for missing values; `null` without the sizes. */
export function readDcaLadderParams(config: Record<string, unknown> | null | undefined): DcaLadderParams | null {
  const raw = config ?? {}
  const baseOrderUsdt = toNumber(raw.base_order_usdt)
  const safetyOrderUsdt = toNumber(raw.safety_order_usdt)
  if (baseOrderUsdt == null || safetyOrderUsdt == null) return null
  return {
    baseOrderUsdt,
    safetyOrderUsdt,
    safetyOrdersCount: toNumber(raw.safety_orders_count) ?? DCA_SERVER_DEFAULTS.safety_orders_count,
    priceDeviationPercent: toNumber(raw.price_deviation_percent) ?? DCA_SERVER_DEFAULTS.price_deviation_percent,
    stepScale: toNumber(raw.step_scale) ?? DCA_SERVER_DEFAULTS.step_scale,
    volumeScale: toNumber(raw.volume_scale) ?? DCA_SERVER_DEFAULTS.volume_scale,
    takeProfitPercent: toNumber(raw.take_profit_percent) ?? DCA_SERVER_DEFAULTS.take_profit_percent,
  }
}

/** Trailing distance, % — `null` (or 0) means a fixed take profit. */
export function dcaTrailingPercent(config: Record<string, unknown> | null | undefined): number | null {
  const value = toNumber(config?.trailing_take_profit_percent)
  return value != null && value > 0 ? value : null
}

export function dcaStopLossPercent(config: Record<string, unknown> | null | undefined): number | null {
  const value = toNumber(config?.stop_loss_percent)
  return value != null && value > 0 ? value : null
}

export type DcaPhaseTone = 'live' | 'wait' | 'muted'

export function dcaPhaseLabel(t: Translate, phase: string | null | undefined): string {
  switch (phase) {
    case 'starting': return t('bots.dca_phase_starting')
    case 'open': return t('bots.dca_phase_open')
    case 'waiting_restart': return t('bots.dca_phase_waiting_restart')
    case 'stopped': return t('bots.dca_phase_stopped')
    default: return phase || '—'
  }
}

export function dcaPhaseTone(phase: string | null | undefined): DcaPhaseTone {
  if (phase === 'open') return 'live'
  if (phase === 'starting' || phase === 'waiting_restart') return 'wait'
  return 'muted'
}

export type DcaExitReason = 'take_profit' | 'trailing_take_profit' | 'stop_loss' | 'manual'

export function dcaExitReasonLabel(t: Translate, reason: string | null | undefined): string {
  switch (reason) {
    case 'take_profit': return t('bots.dca_reason_take_profit')
    case 'trailing_take_profit': return t('bots.dca_reason_trailing_take_profit')
    case 'stop_loss': return t('bots.dca_reason_stop_loss')
    case 'manual': return t('bots.dca_reason_manual')
    default: return reason || '—'
  }
}

/** `dca_take_profit_replaced` reason code → label; `null` for an unknown code, so no raw code reaches the feed. */
export function dcaTpReplacedReasonLabel(t: Translate, reason: string | null | undefined): string | null {
  switch (reason) {
    case 'missing': return t('bots.dca_tp_reason_missing')
    case 'qty_changed': return t('bots.dca_tp_reason_qty_changed')
    case 'price_changed': return t('bots.dca_tp_reason_price_changed')
    case 'canceled_on_exchange': return t('bots.dca_tp_reason_canceled_on_exchange')
    case 'partial_exit_remainder': return t('bots.dca_tp_reason_partial_exit_remainder')
    default: return null
  }
}

/** `order_filled` payload kind of a DCA order. */
export type DcaOrderKind = 'base' | 'safety' | 'take_profit' | 'exit'

export const DCA_ORDER_KINDS: readonly string[] = ['base', 'safety', 'take_profit', 'exit']

/** Builds the config sent to POST /bots from already validated form values. */
export function buildDcaConfig(values: {
  symbol: string
  baseOrderUsdt: string
  safetyOrderUsdt: string
  safetyOrdersCount: number
  priceDeviationPercent: string
  stepScale: string
  volumeScale: string
  takeProfitPercent: string
  trailingTakeProfitPercent: string | null
  stopLossPercent: string | null
  autoRestart: boolean
  restartDelaySeconds: number
}): DcaSpotConfig {
  return {
    symbol: values.symbol,
    base_order_usdt: values.baseOrderUsdt,
    safety_order_usdt: values.safetyOrderUsdt,
    safety_orders_count: values.safetyOrdersCount,
    price_deviation_percent: values.priceDeviationPercent,
    step_scale: values.stepScale,
    volume_scale: values.volumeScale,
    take_profit_percent: values.takeProfitPercent,
    trailing_take_profit_percent: values.trailingTakeProfitPercent,
    stop_loss_percent: values.stopLossPercent,
    auto_restart: values.autoRestart,
    restart_delay_seconds: values.restartDelaySeconds,
  }
}
