import type { BilateralSignalTimeframe } from '#shared/types/bot'
import { toNumber } from '~/utils/formatNumber'
import { TREND_TIMEFRAME_MINUTES } from '~/utils/trend'

/** BILATERAL_FUTURES helpers: config defaults and the saved config with them filled in. */

export const BILATERAL_SIGNAL_TIMEFRAMES: BilateralSignalTimeframe[] = ['1h', '2h', '4h', '6h', '12h', '1d']

/** Server defaults of `BilateralFuturesConfig` (python-trading-bot: docs/ru/frontend-bilateral-futures.md). */
export const BILATERAL_DEFAULTS = {
  signal_timeframe: '4h' as BilateralSignalTimeframe,
  bf_window: 40,
  bf_time_sigma: 12,
  bf_range_sigma: 1.5,
  bf_reversal: 1.5,
  bf_spike_rejection: true,
  atr_period: 14,
  risk_per_unit_pct: 2,
  stop_atr: 3,
  max_units: 1,
  add_step_atr: 1,
  trail_atr: 50,
  /** A saved config without the field behaves as `false`; the create form starts with `BILATERAL_FORM_TRAIL_WAIT_FLIP`. */
  trail_wait_flip: false,
  cooldown_bars: 1,
  daily_stop_pct: 10,
  monthly_stop_pct: 35,
  max_notional_x: 3,
  exchange_leverage: 5,
  capital_usdt: null as number | null,
  close_on_stop: false,
}

export type BilateralConfigView = typeof BILATERAL_DEFAULTS

/** Candles the bot reads before it trusts the filter side: the window plus a settle window (server side). */
export const BILATERAL_SETTLE_BARS = 300

/** `trail_atr` at this value turns trailing off in practice: only a filter flip or the stop closes the position. */
export const BILATERAL_TRAIL_OFF_ATR = 50

/** New bots wait for a filter flip after a trailing exit; on the backtest that cut needless re-entries. */
export const BILATERAL_FORM_TRAIL_WAIT_FLIP = true

/** Trailing is on when `trail_atr` is below 50 ATR. */
export function bilateralTrailOn(trailAtr: number | null | undefined): boolean {
  return trailAtr != null && Number.isFinite(trailAtr) && trailAtr > 0 && trailAtr < BILATERAL_TRAIL_OFF_ATR
}

export function isBilateralBot(bot: { bot_type?: string | null }): boolean {
  return bot.bot_type === 'BILATERAL_FUTURES'
}

export function readBilateralConfig(config: Record<string, unknown> | null | undefined): BilateralConfigView {
  const raw = config ?? {}
  const num = (key: keyof BilateralConfigView, fallback: number) => toNumber(raw[key]) ?? fallback
  const bool = (key: keyof BilateralConfigView, fallback: boolean) => (typeof raw[key] === 'boolean' ? raw[key] as boolean : fallback)
  const signal = typeof raw.signal_timeframe === 'string' && raw.signal_timeframe in TREND_TIMEFRAME_MINUTES
    ? raw.signal_timeframe as BilateralSignalTimeframe
    : BILATERAL_DEFAULTS.signal_timeframe
  return {
    signal_timeframe: signal,
    bf_window: num('bf_window', BILATERAL_DEFAULTS.bf_window),
    bf_time_sigma: num('bf_time_sigma', BILATERAL_DEFAULTS.bf_time_sigma),
    bf_range_sigma: num('bf_range_sigma', BILATERAL_DEFAULTS.bf_range_sigma),
    bf_reversal: num('bf_reversal', BILATERAL_DEFAULTS.bf_reversal),
    bf_spike_rejection: bool('bf_spike_rejection', BILATERAL_DEFAULTS.bf_spike_rejection),
    atr_period: num('atr_period', BILATERAL_DEFAULTS.atr_period),
    risk_per_unit_pct: num('risk_per_unit_pct', BILATERAL_DEFAULTS.risk_per_unit_pct),
    stop_atr: num('stop_atr', BILATERAL_DEFAULTS.stop_atr),
    max_units: num('max_units', BILATERAL_DEFAULTS.max_units),
    add_step_atr: num('add_step_atr', BILATERAL_DEFAULTS.add_step_atr),
    trail_atr: num('trail_atr', BILATERAL_DEFAULTS.trail_atr),
    trail_wait_flip: bool('trail_wait_flip', BILATERAL_DEFAULTS.trail_wait_flip),
    cooldown_bars: num('cooldown_bars', BILATERAL_DEFAULTS.cooldown_bars),
    daily_stop_pct: num('daily_stop_pct', BILATERAL_DEFAULTS.daily_stop_pct),
    monthly_stop_pct: num('monthly_stop_pct', BILATERAL_DEFAULTS.monthly_stop_pct),
    max_notional_x: num('max_notional_x', BILATERAL_DEFAULTS.max_notional_x),
    exchange_leverage: num('exchange_leverage', BILATERAL_DEFAULTS.exchange_leverage),
    capital_usdt: toNumber(raw.capital_usdt),
    close_on_stop: bool('close_on_stop', BILATERAL_DEFAULTS.close_on_stop),
  }
}
