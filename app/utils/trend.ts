import type { TrendSignalTimeframe, TrendTrendTimeframe } from '#shared/types/bot'
import { formatCount, formatDateTime, formatPercentValue, formatPrice, formatQuantity, toNumber } from '~/utils/formatNumber'

/** TREND_FUTURES helpers: config defaults, state / reason / exit-reason labels, R formatting. */

type Translate = (key: string, params?: Record<string, unknown>) => string

export const TREND_SIGNAL_TIMEFRAMES: TrendSignalTimeframe[] = ['15m', '30m', '1h', '2h']
export const TREND_TREND_TIMEFRAMES: TrendTrendTimeframe[] = ['1h', '2h', '4h', '6h', '12h', '1d']

export const TREND_TIMEFRAME_MINUTES: Record<string, number> = {
  '15m': 15,
  '30m': 30,
  '1h': 60,
  '2h': 120,
  '4h': 240,
  '6h': 360,
  '12h': 720,
  '1d': 1440,
}

/** Server defaults of `TrendFuturesConfig` (docs/ru/frontend-trend-futures.md). */
export const TREND_DEFAULTS = {
  signal_timeframe: '1h' as TrendSignalTimeframe,
  trend_timeframe: '4h' as TrendTrendTimeframe,
  ema_fast: 50,
  ema_slow: 200,
  adx_period: 14,
  adx_min: 20,
  atr_period: 14,
  donchian_entry: 48,
  donchian_exit: 24,
  volume_mult: 0,
  volume_sma_period: 20,
  risk_per_unit_pct: 2,
  stop_atr: 2,
  add_step_atr: 1,
  max_units: 4,
  trail_atr: 3,
  exit_on_regime_flip: true,
  cooldown_bars: 4,
  daily_stop_pct: 10,
  monthly_stop_pct: 35,
  max_notional_x: 8,
  exchange_leverage: 10,
  capital_usdt: null as number | null,
  close_on_stop: false,
}

export type TrendConfigView = typeof TREND_DEFAULTS

/** Form presets: they only set the risk of one unit. */
export const TREND_PRESETS = [
  { id: 'moderate', labelKey: 'bots.trend_preset_moderate', risk: '2' },
  { id: 'aggressive', labelKey: 'bots.trend_preset_aggressive', risk: '4' },
] as const

export function timeframeMinutes(value: string | null | undefined, fallback = 60): number {
  return (value && TREND_TIMEFRAME_MINUTES[value]) || fallback
}

/** Saved config with the server defaults filled in, numbers parsed. */
export function readTrendConfig(config: Record<string, unknown> | null | undefined): TrendConfigView {
  const raw = config ?? {}
  const num = (key: keyof TrendConfigView, fallback: number) => toNumber(raw[key]) ?? fallback
  const bool = (key: keyof TrendConfigView, fallback: boolean) => (typeof raw[key] === 'boolean' ? raw[key] as boolean : fallback)
  const signal = typeof raw.signal_timeframe === 'string' && raw.signal_timeframe in TREND_TIMEFRAME_MINUTES
    ? raw.signal_timeframe as TrendSignalTimeframe
    : TREND_DEFAULTS.signal_timeframe
  const trend = typeof raw.trend_timeframe === 'string' && raw.trend_timeframe in TREND_TIMEFRAME_MINUTES
    ? raw.trend_timeframe as TrendTrendTimeframe
    : TREND_DEFAULTS.trend_timeframe

  return {
    signal_timeframe: signal,
    trend_timeframe: trend,
    ema_fast: num('ema_fast', TREND_DEFAULTS.ema_fast),
    ema_slow: num('ema_slow', TREND_DEFAULTS.ema_slow),
    adx_period: num('adx_period', TREND_DEFAULTS.adx_period),
    adx_min: num('adx_min', TREND_DEFAULTS.adx_min),
    atr_period: num('atr_period', TREND_DEFAULTS.atr_period),
    donchian_entry: num('donchian_entry', TREND_DEFAULTS.donchian_entry),
    donchian_exit: num('donchian_exit', TREND_DEFAULTS.donchian_exit),
    volume_mult: num('volume_mult', TREND_DEFAULTS.volume_mult),
    volume_sma_period: num('volume_sma_period', TREND_DEFAULTS.volume_sma_period),
    risk_per_unit_pct: num('risk_per_unit_pct', TREND_DEFAULTS.risk_per_unit_pct),
    stop_atr: num('stop_atr', TREND_DEFAULTS.stop_atr),
    add_step_atr: num('add_step_atr', TREND_DEFAULTS.add_step_atr),
    max_units: num('max_units', TREND_DEFAULTS.max_units),
    trail_atr: num('trail_atr', TREND_DEFAULTS.trail_atr),
    exit_on_regime_flip: bool('exit_on_regime_flip', TREND_DEFAULTS.exit_on_regime_flip),
    cooldown_bars: num('cooldown_bars', TREND_DEFAULTS.cooldown_bars),
    daily_stop_pct: num('daily_stop_pct', TREND_DEFAULTS.daily_stop_pct),
    monthly_stop_pct: num('monthly_stop_pct', TREND_DEFAULTS.monthly_stop_pct),
    max_notional_x: num('max_notional_x', TREND_DEFAULTS.max_notional_x),
    exchange_leverage: num('exchange_leverage', TREND_DEFAULTS.exchange_leverage),
    capital_usdt: toNumber(raw.capital_usdt),
    close_on_stop: bool('close_on_stop', TREND_DEFAULTS.close_on_stop),
  }
}

const STATE_KEYS: Record<string, string> = {
  WARMUP: 'bots.trend_state_warmup',
  WAITING_TREND: 'bots.trend_state_waiting_trend',
  WAITING_BREAKOUT: 'bots.trend_state_waiting_breakout',
  IN_LONG: 'bots.trend_state_in_long',
  IN_SHORT: 'bots.trend_state_in_short',
  COOLDOWN: 'bots.trend_state_cooldown',
  PAUSED_RISK: 'bots.trend_state_paused_risk',
}

export function trendStateLabel(t: Translate, state: string | null | undefined): string {
  if (!state) return '—'
  const key = STATE_KEYS[state]
  return key ? t(key) : state
}

/** Colour of a state chip: in a position, waiting, or held back. */
export function trendStateTone(state: string | null | undefined): 'long' | 'short' | 'wait' | 'pause' | 'muted' {
  if (state === 'IN_LONG') return 'long'
  if (state === 'IN_SHORT') return 'short'
  if (state === 'WAITING_BREAKOUT') return 'wait'
  if (state === 'COOLDOWN' || state === 'PAUSED_RISK') return 'pause'
  return 'muted'
}

export function trendSideLabel(t: Translate, side: string | null | undefined): string {
  if (side === 'LONG') return t('bots.trend_side_long')
  if (side === 'SHORT') return t('bots.trend_side_short')
  return t('bots.trend_side_none')
}

const EXIT_REASON_KEYS: Record<string, string> = {
  stop: 'bots.trend_exit_stop',
  trail: 'bots.trend_exit_trail',
  channel: 'bots.trend_exit_channel',
  regime_flip: 'bots.trend_exit_regime_flip',
  risk_pause: 'bots.trend_exit_risk_pause',
  manual: 'bots.trend_exit_manual',
  liquidation: 'bots.trend_exit_liquidation',
}

export function trendExitReasonLabel(t: Translate, reason: string | null | undefined): string {
  if (!reason) return '—'
  const key = EXIT_REASON_KEYS[reason]
  return key ? t(key) : reason
}

const STOP_SOURCE_KEYS: Record<string, string> = {
  initial: 'bots.trend_stop_source_initial',
  pyramid: 'bots.trend_stop_source_pyramid',
  trail: 'bots.trend_stop_source_trail',
}

export function trendStopSourceLabel(t: Translate, source: string | null | undefined): string | null {
  if (!source) return null
  const key = STOP_SOURCE_KEYS[source]
  return key ? t(key) : source
}

export function trendPauseScopeLabel(t: Translate, scope: string | null | undefined): string | null {
  if (scope === 'daily') return t('bots.trend_pause_daily')
  if (scope === 'monthly') return t('bots.trend_pause_monthly')
  return scope || null
}

/**
 * Every known reason code (each has a `bots.trend_reason_<code>` message) with the params its message needs;
 * a decision without them falls back to the server text.
 */
const REASON_PARAMS: Record<string, string[]> = {
  warmup: [],
  no_regime: [],
  adx_low: ['adx', 'adx_min'],
  no_breakout: ['side', 'distance_pct', 'level'],
  volume_low: ['ratio', 'volume_mult'],
  cooldown: ['remaining'],
  risk_pause: ['until'],
  breakout: ['side', 'close', 'level', 'adx'],
  hold: [],
  channel: ['close', 'level'],
  regime_flip: ['ema_fast', 'ema_slow'],
  position_exists: ['size', 'side'],
  stale_signal: ['delay_min'],
  size_too_small: ['detail'],
  order_failed: [],
  not_started: [],
}

const PRICE_PARAMS = new Set(['close', 'level', 'ema_fast', 'ema_slow'])

function formatReasonParam(t: Translate, locale: string, name: string, value: unknown): string {
  if (name === 'side') return trendSideLabel(t, typeof value === 'string' ? value.toUpperCase() : null)
  if (name === 'until' && typeof value === 'string') return formatDateTime(value, locale)
  const number = toNumber(value)
  if (number == null) return value == null ? '' : String(value)
  if (PRICE_PARAMS.has(name)) return formatPrice(number, locale)
  if (name === 'distance_pct') return formatPercentValue(number, locale, true)
  if (name === 'size') return formatQuantity(Math.abs(number), locale)
  return formatCount(number, locale)
}

/**
 * A decision in the UI language from its stable `reason_code` and `reason_params`;
 * unknown codes or missing params fall back to the server's own text (`reason`).
 */
export function trendReasonText(
  t: Translate,
  locale: string,
  code: string | null | undefined,
  params: Record<string, unknown> | null | undefined,
  fallback?: string | null,
): string {
  const required = code ? REASON_PARAMS[code] : undefined
  const values = params ?? {}
  const complete = required?.every((name) => values[name] != null && values[name] !== '') ?? false

  if (code && required && complete) {
    const named: Record<string, string> = {}
    for (const name of required) named[name] = formatReasonParam(t, locale, name, values[name])
    return t(`bots.trend_reason_${code}`, named)
  }
  return fallback?.trim() || code || '—'
}

/** `+0.85R` / `−1.00R`; `—` when unknown. */
export function formatR(value: number | null | undefined, locale: string): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const rounded = Math.round(value * 100) / 100 || 0
  return `${new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2, signDisplay: 'exceptZero' }).format(rounded)}R`
}
