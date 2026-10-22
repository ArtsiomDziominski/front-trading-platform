import type { AntiMartingaleFuturesConfig, AntiMartingaleOrderLevel, BotCreate, GridDirection, GridFuturesConfig, TrendFuturesConfig, TrendSignalTimeframe, TrendTrendTimeframe, VolumeMode } from '#shared/types/bot'
import { buildMixedGridPayload, isMixedConfig, parseMixedGrid } from '~/utils/mixedGrid'
import { buildOrderSizePayload, parseOrderSize } from '~/utils/orderSize'
import { buildStopLossPayload, parseStopLoss } from '~/utils/stopLoss'
import { buildTakeProfitPayload, parseTakeProfit } from '~/utils/takeProfit'
import { TREND_SIGNAL_TIMEFRAMES, TREND_TREND_TIMEFRAMES } from '~/utils/trend'

const GRID_DIRECTIONS: GridDirection[] = ['LONG', 'SHORT']
const VOLUME_MODES: VolumeMode[] = ['linear', 'exponential', 'fixed']

function asString(value: unknown): string {
  if (value == null) return ''
  return String(value)
}

function parseAntiMartingaleConfig(raw: unknown): AntiMartingaleFuturesConfig | null {
  if (!raw || typeof raw !== 'object') return null

  const config = raw as Record<string, unknown>
  const symbol = asString(config.symbol).trim().toUpperCase()
  if (symbol.length < 3) return null

  if (!Array.isArray(config.orders) || !config.orders.length) return null

  const orders: AntiMartingaleOrderLevel[] = []
  for (const item of config.orders) {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    const triggerPercent = asString(row.trigger_percent).trim()
    const sizePercent = asString(row.size_percent).trim()
    if (!triggerPercent || !sizePercent) return null
    orders.push({ trigger_percent: triggerPercent, size_percent: sizePercent })
  }

  const result: AntiMartingaleFuturesConfig = { symbol, orders }

  const breakoutLookbackHours = Number(config.breakout_lookback_hours)
  if (Number.isFinite(breakoutLookbackHours)) result.breakout_lookback_hours = breakoutLookbackHours

  const emaFastPeriod = Number(config.ema_fast_period)
  if (Number.isFinite(emaFastPeriod)) result.ema_fast_period = emaFastPeriod

  const emaSlowPeriod = Number(config.ema_slow_period)
  if (Number.isFinite(emaSlowPeriod)) result.ema_slow_period = emaSlowPeriod

  const trailingStopPercent = asString(config.trailing_stop_percent).trim()
  if (trailingStopPercent) result.trailing_stop_percent = trailingStopPercent

  const leverage = Number(config.leverage)
  if (Number.isFinite(leverage)) result.leverage = leverage

  return result
}

const TREND_INTEGER_FIELDS = [
  'ema_fast',
  'ema_slow',
  'adx_period',
  'atr_period',
  'donchian_entry',
  'donchian_exit',
  'volume_sma_period',
  'max_units',
  'cooldown_bars',
  'exchange_leverage',
] as const

const TREND_DECIMAL_FIELDS = [
  'adx_min',
  'volume_mult',
  'risk_per_unit_pct',
  'stop_atr',
  'add_step_atr',
  'trail_atr',
  'daily_stop_pct',
  'monthly_stop_pct',
  'max_notional_x',
  'capital_usdt',
] as const

/** Only the fields TrendFuturesConfig knows; anything the server would reject is dropped, not guessed. */
function parseTrendConfig(raw: unknown): TrendFuturesConfig | null {
  if (!raw || typeof raw !== 'object') return null

  const config = raw as Record<string, unknown>
  const symbol = asString(config.symbol).trim().toUpperCase()
  if (symbol.length < 3) return null

  const result: TrendFuturesConfig = { symbol }
  const target = result as unknown as Record<string, unknown>

  if (TREND_SIGNAL_TIMEFRAMES.includes(config.signal_timeframe as TrendSignalTimeframe)) {
    result.signal_timeframe = config.signal_timeframe as TrendSignalTimeframe
  }
  if (TREND_TREND_TIMEFRAMES.includes(config.trend_timeframe as TrendTrendTimeframe)) {
    result.trend_timeframe = config.trend_timeframe as TrendTrendTimeframe
  }

  for (const key of TREND_INTEGER_FIELDS) {
    if (config[key] == null || config[key] === '') continue
    const value = Number(config[key])
    if (Number.isFinite(value)) target[key] = value
  }
  for (const key of TREND_DECIMAL_FIELDS) {
    const value = asString(config[key]).trim()
    if (value && Number.isFinite(Number(value))) target[key] = value
  }
  if (typeof config.exit_on_regime_flip === 'boolean') result.exit_on_regime_flip = config.exit_on_regime_flip
  if (typeof config.close_on_stop === 'boolean') result.close_on_stop = config.close_on_stop

  return result
}

function parseConfig(raw: unknown): GridFuturesConfig | null {
  if (!raw || typeof raw !== 'object') return null

  const config = raw as Record<string, unknown>
  const symbol = asString(config.symbol).trim().toUpperCase()
  const direction = config.direction
  const volumeMode = config.volume_mode

  if (symbol.length < 3) return null
  if (!GRID_DIRECTIONS.includes(direction as GridDirection)) return null
  if (!VOLUME_MODES.includes(volumeMode as VolumeMode)) return null
  if (!asString(config.grid_step_percent).trim()) return null

  // Mixed sizes: the order table replaces the single size field
  const mixed = isMixedConfig(config) ? parseMixedGrid(config.mixed_grid) : null
  // Old entries only have `initial_amount`; newer ones carry one of the size fields with the others `null`
  const orderSize = parseOrderSize(config)
  if (!mixed && !orderSize.value) return null

  const gridOrdersCount = mixed ? mixed.orders.length - 1 : Number(config.grid_orders_count)
  if (!Number.isFinite(gridOrdersCount) || gridOrdersCount < 1 || gridOrdersCount > 500) {
    return null
  }

  const startPriceRaw = config.start_price
  const startPrice = startPriceRaw == null || startPriceRaw === ''
    ? undefined
    : asString(startPriceRaw).trim()

  const takeProfit = parseTakeProfit(config)
  const takeProfitFields = buildTakeProfitPayload(takeProfit.mode, takeProfit.value)
  const stopLoss = parseStopLoss(config)
  const stopLossFields = buildStopLossPayload(stopLoss.mode, stopLoss.value)

  const sizeFields = mixed
    ? {
        initial_amount: null,
        initial_amount_usdt: null,
        initial_amount_percent: null,
        sizing_mode: 'mixed' as const,
        mixed_grid: buildMixedGridPayload(mixed),
      }
    : buildOrderSizePayload(orderSize.mode, orderSize.value)

  return {
    symbol,
    direction: direction as GridDirection,
    ...sizeFields,
    grid_orders_count: gridOrdersCount,
    grid_step_percent: asString(config.grid_step_percent).trim(),
    volume_mode: volumeMode as VolumeMode,
    auto_restart: Boolean(config.auto_restart),
    take_profit_percent: takeProfitFields.take_profit_percent,
    take_profit_amount: takeProfitFields.take_profit_amount,
    stop_loss_percent: stopLossFields.stop_loss_percent,
    ...(startPrice ? { start_price: startPrice } : {}),
  }
}

export function parseBotCreatePayload(payload: Record<string, unknown>): BotCreate | null {
  const apiKeyId = payload.api_key_id
  if (typeof apiKeyId !== 'number') return null

  const botType = payload.bot_type

  const config = botType === 'ANTI_MARTINGALE_FUTURES'
    ? parseAntiMartingaleConfig(payload.config)
    : botType === 'TREND_FUTURES'
      ? parseTrendConfig(payload.config)
      : parseConfig(payload.config)
  if (!config) return null

  return {
    api_key_id: apiKeyId,
    ...(typeof botType === 'string' ? { bot_type: botType as BotCreate['bot_type'] } : {}),
    config,
  }
}
