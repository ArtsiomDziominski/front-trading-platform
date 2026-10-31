import { TREND_DEFAULTS } from '~/utils/trend'

/** TREND_SPOT helpers: server defaults (the futures trend defaults without leverage / risk pauses). */

export const TREND_SPOT_DEFAULTS = {
  signal_timeframe: TREND_DEFAULTS.signal_timeframe,
  trend_timeframe: TREND_DEFAULTS.trend_timeframe,
  ema_fast: TREND_DEFAULTS.ema_fast,
  ema_slow: TREND_DEFAULTS.ema_slow,
  adx_period: TREND_DEFAULTS.adx_period,
  adx_min: TREND_DEFAULTS.adx_min,
  atr_period: TREND_DEFAULTS.atr_period,
  donchian_entry: TREND_DEFAULTS.donchian_entry,
  donchian_exit: TREND_DEFAULTS.donchian_exit,
  volume_mult: TREND_DEFAULTS.volume_mult,
  volume_sma_period: TREND_DEFAULTS.volume_sma_period,
  risk_per_unit_pct: TREND_DEFAULTS.risk_per_unit_pct,
  stop_atr: TREND_DEFAULTS.stop_atr,
  add_step_atr: TREND_DEFAULTS.add_step_atr,
  max_units: TREND_DEFAULTS.max_units,
  trail_atr: TREND_DEFAULTS.trail_atr,
  exit_on_regime_flip: TREND_DEFAULTS.exit_on_regime_flip,
  cooldown_bars: TREND_DEFAULTS.cooldown_bars,
  max_position_pct: 100,
  capital_usdt: null as number | null,
}

/** Spot decision codes that the futures trend texts do not cover. */
export function trendSpotDecisionText(
  t: (key: string, params?: Record<string, unknown>) => string,
  code: string | null | undefined,
  fallback: string | null | undefined,
): string {
  if (code === 'short_regime') return t('bots.trend_spot_reason_short_regime')
  return fallback?.trim() || code || '—'
}
