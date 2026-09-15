import type { AntiMartingaleFuturesConfig, AntiMartingaleOrderLevel, BotCreate, GridDirection, GridFuturesConfig, VolumeMode } from '#shared/types/bot'
import { buildStopLossPayload, parseStopLoss } from '~/utils/stopLoss'
import { buildTakeProfitPayload, parseTakeProfit } from '~/utils/takeProfit'

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

function parseConfig(raw: unknown): GridFuturesConfig | null {
  if (!raw || typeof raw !== 'object') return null

  const config = raw as Record<string, unknown>
  const symbol = asString(config.symbol).trim().toUpperCase()
  const direction = config.direction
  const volumeMode = config.volume_mode

  if (symbol.length < 3) return null
  if (!GRID_DIRECTIONS.includes(direction as GridDirection)) return null
  if (!VOLUME_MODES.includes(volumeMode as VolumeMode)) return null
  if (!asString(config.initial_amount).trim()) return null
  if (!asString(config.grid_step_percent).trim()) return null

  const gridOrdersCount = Number(config.grid_orders_count)
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

  return {
    symbol,
    direction: direction as GridDirection,
    initial_amount: asString(config.initial_amount).trim(),
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
    : parseConfig(payload.config)
  if (!config) return null

  return {
    api_key_id: apiKeyId,
    ...(typeof botType === 'string' ? { bot_type: botType as BotCreate['bot_type'] } : {}),
    config,
  }
}
