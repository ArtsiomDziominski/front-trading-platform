import type { BotCreate, GridDirection, GridFuturesConfig, VolumeMode } from '#shared/types/bot'

const GRID_DIRECTIONS: GridDirection[] = ['LONG', 'SHORT']
const VOLUME_MODES: VolumeMode[] = ['linear', 'exponential', 'fixed']

function asString(value: unknown): string {
  if (value == null) return ''
  return String(value)
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

  return {
    symbol,
    direction: direction as GridDirection,
    initial_amount: asString(config.initial_amount).trim(),
    grid_orders_count: gridOrdersCount,
    grid_step_percent: asString(config.grid_step_percent).trim(),
    volume_mode: volumeMode as VolumeMode,
    auto_restart: Boolean(config.auto_restart),
    ...(startPrice ? { start_price: startPrice } : {}),
  }
}

export function parseBotCreatePayload(payload: Record<string, unknown>): BotCreate | null {
  const apiKeyId = payload.api_key_id
  if (typeof apiKeyId !== 'number') return null

  const config = parseConfig(payload.config)
  if (!config) return null

  const botType = payload.bot_type
  return {
    api_key_id: apiKeyId,
    ...(typeof botType === 'string' ? { bot_type: botType as BotCreate['bot_type'] } : {}),
    config,
  }
}
