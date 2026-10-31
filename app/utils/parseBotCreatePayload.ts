import type { AntiMartingaleFuturesConfig, AntiMartingaleOrderLevel, BotCreate, DcaSpotConfig, GridSpotConfig, RecurringSpotConfig, TrendSpotConfig, GridDirection, GridFuturesConfig, TrendFuturesConfig, TrendSignalTimeframe, TrendTrendTimeframe, VolumeMode } from '#shared/types/bot'
import { buildMixedGridPayload, isMixedConfig, parseMixedGrid } from '~/utils/mixedGrid'
import { buildOrderSizePayload, parseOrderSize } from '~/utils/orderSize'
import { buildStopLossPayload, parseStopLoss } from '~/utils/stopLoss'
import { buildTakeProfitPayload, parseTakeProfit } from '~/utils/takeProfit'
import { DCA_SERVER_DEFAULTS } from '~/utils/dcaSpot'
import { RECURRING_SERVER_DEFAULTS } from '~/utils/recurringSpot'
import { GRID_SPOT_SERVER_DEFAULTS } from '~/utils/gridSpot'
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

/** Spot trend: the futures trend fields without leverage / risk pauses, plus the position ceiling. */
function parseTrendSpotConfig(raw: unknown): TrendSpotConfig | null {
  const parsed = parseTrendConfig(raw)
  if (!parsed) return null
  const config = raw as Record<string, unknown>
  const { daily_stop_pct: _daily, monthly_stop_pct: _monthly, max_notional_x: _notional, exchange_leverage: _leverage, close_on_stop: _close, ...rest } = parsed
  const result: TrendSpotConfig = { ...rest }
  const ceiling = asString(config.max_position_pct).trim()
  if (ceiling && Number.isFinite(Number(ceiling))) result.max_position_pct = ceiling
  return result
}

/** Spot DCA: both sizes are required; other fields fall back to the server defaults. */
function parseDcaSpotConfig(raw: unknown): DcaSpotConfig | null {
  if (!raw || typeof raw !== 'object') return null

  const config = raw as Record<string, unknown>
  const symbol = asString(config.symbol).trim().toUpperCase()
  if (symbol.length < 3) return null

  const decimal = (key: string, fallback: number | null): string | null => {
    const value = asString(config[key]).trim()
    if (value && Number.isFinite(Number(value))) return value
    return fallback == null ? null : String(fallback)
  }
  const integer = (key: string, fallback: number): number => {
    const value = Number(config[key])
    return config[key] != null && config[key] !== '' && Number.isInteger(value) ? value : fallback
  }
  const optionalPercent = (key: string): string | null => {
    const value = decimal(key, null)
    return value != null && Number(value) > 0 ? value : null
  }

  const baseOrder = decimal('base_order_usdt', null)
  const safetyOrder = decimal('safety_order_usdt', null)
  if (!baseOrder || !safetyOrder) return null

  return {
    symbol,
    base_order_usdt: baseOrder,
    safety_order_usdt: safetyOrder,
    safety_orders_count: integer('safety_orders_count', DCA_SERVER_DEFAULTS.safety_orders_count),
    price_deviation_percent: decimal('price_deviation_percent', DCA_SERVER_DEFAULTS.price_deviation_percent) ?? '',
    step_scale: decimal('step_scale', DCA_SERVER_DEFAULTS.step_scale) ?? '',
    volume_scale: decimal('volume_scale', DCA_SERVER_DEFAULTS.volume_scale) ?? '',
    take_profit_percent: decimal('take_profit_percent', DCA_SERVER_DEFAULTS.take_profit_percent) ?? '',
    trailing_take_profit_percent: optionalPercent('trailing_take_profit_percent'),
    stop_loss_percent: optionalPercent('stop_loss_percent'),
    auto_restart: typeof config.auto_restart === 'boolean' ? config.auto_restart : DCA_SERVER_DEFAULTS.auto_restart,
    restart_delay_seconds: integer('restart_delay_seconds', DCA_SERVER_DEFAULTS.restart_delay_seconds),
  }
}

/** Recurring buy: the amount is required; other fields fall back to the server defaults. */
function parseRecurringSpotConfig(raw: unknown): RecurringSpotConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const config = raw as Record<string, unknown>
  const symbol = asString(config.symbol).trim().toUpperCase()
  if (symbol.length < 3) return null
  const decimal = (key: string): string | null => {
    const value = asString(config[key]).trim()
    return value && Number.isFinite(Number(value)) ? value : null
  }
  const amount = decimal('amount_usdt')
  if (!amount) return null
  const interval = Number(config.interval_hours)
  const period = Number(config.dip_ma_period)
  const budget = decimal('max_total_usdt')
  return {
    symbol,
    amount_usdt: amount,
    interval_hours: Number.isInteger(interval) && interval > 0 ? interval : RECURRING_SERVER_DEFAULTS.interval_hours,
    dip_ma_period: config.dip_ma_period != null && Number.isInteger(period) && period > 0 ? period : null,
    dip_multiplier: decimal('dip_multiplier') ?? String(RECURRING_SERVER_DEFAULTS.dip_multiplier),
    max_total_usdt: budget != null && Number(budget) > 0 ? budget : null,
  }
}

/** Spot grid: the range and the cell size are required; other fields fall back to the server defaults. */
function parseGridSpotConfig(raw: unknown): GridSpotConfig | null {
  if (!raw || typeof raw !== 'object') return null
  const config = raw as Record<string, unknown>
  const symbol = asString(config.symbol).trim().toUpperCase()
  if (symbol.length < 3) return null
  const decimal = (key: string): string | null => {
    const value = asString(config[key]).trim()
    return value && Number.isFinite(Number(value)) ? value : null
  }
  const lower = decimal('lower_price')
  const upper = decimal('upper_price')
  const order = decimal('order_usdt')
  if (!lower || !upper || !order) return null
  const count = Number(config.grid_count)
  const positive = (key: string) => {
    const value = decimal(key)
    return value != null && Number(value) > 0 ? value : null
  }
  return {
    symbol,
    lower_price: lower,
    upper_price: upper,
    grid_count: Number.isInteger(count) && count > 0 ? count : GRID_SPOT_SERVER_DEFAULTS.grid_count,
    order_usdt: order,
    geometric: config.geometric === true,
    stop_loss_price: positive('stop_loss_price'),
    take_profit_price: positive('take_profit_price'),
  }
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
      : botType === 'DCA_SPOT'
        ? parseDcaSpotConfig(payload.config)
        : botType === 'RECURRING_SPOT'
          ? parseRecurringSpotConfig(payload.config)
          : botType === 'GRID_SPOT'
            ? parseGridSpotConfig(payload.config)
            : botType === 'TREND_SPOT'
              ? parseTrendSpotConfig(payload.config)
              : parseConfig(payload.config)
  if (!config) return null

  return {
    api_key_id: apiKeyId,
    ...(typeof botType === 'string' ? { bot_type: botType as BotCreate['bot_type'] } : {}),
    config,
  }
}
