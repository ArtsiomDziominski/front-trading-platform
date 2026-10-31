import type { RecurringSpotConfig } from '#shared/types/bot'
import { toNumber } from '~/utils/formatNumber'

/** RECURRING_SPOT helpers: config limits and defaults, the schedule preview, phase labels. */

type Translate = (key: string, params?: Record<string, unknown>) => string

/** Server defaults of `RecurringSpotConfig`; the amount has none (required). */
export const RECURRING_SERVER_DEFAULTS = {
  interval_hours: 24,
  dip_ma_period: null as number | null,
  dip_multiplier: 2,
  max_total_usdt: null as number | null,
}

/** What a new form starts with: 10 USDT of BTC a day, twice as much below the 20-day average. */
export const RECURRING_FORM_DEFAULTS = {
  symbol: 'BTCUSDT',
  amount_usdt: '10',
  interval_hours: '24',
  dip_ma_period: '20',
  dip_multiplier: '2',
  max_total_usdt: '1000',
}

/** Ranges of `RecurringSpotConfig` on the server. */
export const RECURRING_LIMITS = {
  amount_usdt_max: 10_000_000,
  interval_hours_min: 1,
  interval_hours_max: 8760,
  dip_ma_period_min: 2,
  dip_ma_period_max: 200,
  dip_multiplier_min: 1,
  dip_multiplier_max: 10,
  max_total_usdt_max: 1_000_000_000,
}

/** Interval presets of the form, hours. */
export const RECURRING_INTERVAL_PRESETS = [
  { hours: 1, key: 'bots.recurring_interval_hourly' },
  { hours: 4, key: 'bots.recurring_interval_4h' },
  { hours: 12, key: 'bots.recurring_interval_12h' },
  { hours: 24, key: 'bots.recurring_interval_daily' },
  { hours: 168, key: 'bots.recurring_interval_weekly' },
  { hours: 720, key: 'bots.recurring_interval_monthly' },
] as const

/** `24` → «каждый день», `36` → «каждые 36 ч». */
export function recurringIntervalLabel(t: Translate, hours: number | null | undefined): string {
  if (hours == null || !Number.isFinite(hours) || hours <= 0) return '—'
  const preset = RECURRING_INTERVAL_PRESETS.find((p) => p.hours === hours)
  if (preset) return t(preset.key)
  if (hours % 24 === 0) return t('bots.recurring_interval_every_days', { n: hours / 24 })
  return t('bots.recurring_interval_every_hours', { n: hours })
}

export interface RecurringPlan {
  /** Buys in 30 days at the plain amount. */
  buysPerMonth: number
  /** USDT in 30 days at the plain amount. */
  usdtPerMonth: number
  /** USDT in 30 days if every buy were a dip buy. */
  usdtPerMonthMax: number
  /** Buys until the budget is spent at the plain amount; null without a budget. */
  buysToBudget: number | null
  /** Days until the budget is spent at the plain amount; null without a budget. */
  daysToBudget: number | null
}

export function recurringPlan(params: {
  amountUsdt: number
  intervalHours: number
  dipMultiplier: number | null
  maxTotalUsdt: number | null
}): RecurringPlan {
  const buysPerMonth = (30 * 24) / params.intervalHours
  const usdtPerMonth = buysPerMonth * params.amountUsdt
  const buysToBudget = params.maxTotalUsdt != null && params.amountUsdt > 0
    ? Math.ceil(params.maxTotalUsdt / params.amountUsdt)
    : null
  return {
    buysPerMonth,
    usdtPerMonth,
    usdtPerMonthMax: usdtPerMonth * (params.dipMultiplier ?? 1),
    buysToBudget,
    daysToBudget: buysToBudget == null ? null : (buysToBudget * params.intervalHours) / 24,
  }
}

export function recurringIntervalHours(config: Record<string, unknown> | null | undefined): number | null {
  const value = toNumber(config?.interval_hours)
  return value != null && value > 0 ? value : null
}

export function recurringDipPeriod(config: Record<string, unknown> | null | undefined): number | null {
  const value = toNumber(config?.dip_ma_period)
  return value != null && value > 0 ? value : null
}

export type RecurringPhaseTone = 'live' | 'wait' | 'muted'

export function recurringPhaseLabel(t: Translate, phase: string | null | undefined): string {
  switch (phase) {
    case 'active': return t('bots.recurring_phase_active')
    case 'waiting_funds': return t('bots.recurring_phase_waiting_funds')
    case 'finished': return t('bots.recurring_phase_finished')
    case 'stopped': return t('bots.recurring_phase_stopped')
    default: return phase || '—'
  }
}

export function recurringPhaseTone(phase: string | null | undefined): RecurringPhaseTone {
  if (phase === 'active') return 'live'
  if (phase === 'waiting_funds') return 'wait'
  return 'muted'
}

/** Builds the config sent to POST /bots from already validated form values. */
export function buildRecurringConfig(values: {
  symbol: string
  amountUsdt: string
  intervalHours: number
  dipMaPeriod: number | null
  dipMultiplier: string
  maxTotalUsdt: string | null
}): RecurringSpotConfig {
  return {
    symbol: values.symbol,
    amount_usdt: values.amountUsdt,
    interval_hours: values.intervalHours,
    dip_ma_period: values.dipMaPeriod,
    dip_multiplier: values.dipMultiplier,
    max_total_usdt: values.maxTotalUsdt,
  }
}
