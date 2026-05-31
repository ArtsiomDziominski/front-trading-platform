export type CreationSettingKey =
  | 'bot_type'
  | 'api_key_id'
  | 'symbol'
  | 'direction'
  | 'initial_amount'
  | 'grid_orders_count'
  | 'grid_step_percent'
  | 'volume_mode'
  | 'start_price'
  | 'auto_restart'

export interface CreationHistorySetting {
  key: CreationSettingKey
  value: string | number | boolean
}

const SETTING_ORDER: CreationSettingKey[] = [
  'bot_type',
  'api_key_id',
  'symbol',
  'direction',
  'initial_amount',
  'grid_orders_count',
  'grid_step_percent',
  'volume_mode',
  'start_price',
  'auto_restart',
]

function readConfig(payload: Record<string, unknown>): Record<string, unknown> {
  if (!payload.config || typeof payload.config !== 'object') return {}
  return payload.config as Record<string, unknown>
}

function readString(value: unknown): string | null {
  if (value == null) return null
  const text = String(value).trim()
  return text || null
}

function readNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const text = readString(value)
  if (!text) return null
  const parsed = Number(text)
  return Number.isFinite(parsed) ? parsed : null
}

export function extractCreationHistorySettings(
  payload: Record<string, unknown>,
  fallbackSymbol?: string | null,
): CreationHistorySetting[] {
  const config = readConfig(payload)
  const byKey = new Map<CreationSettingKey, CreationHistorySetting>()

  function set(key: CreationSettingKey, value: string | number | boolean | null | undefined) {
    if (value == null || value === '') return
    byKey.set(key, { key, value })
  }

  set('bot_type', readString(payload.bot_type))
  set('api_key_id', readNumber(payload.api_key_id))
  set('symbol', readString(config.symbol) ?? readString(fallbackSymbol))
  set('direction', readString(config.direction)?.toUpperCase() ?? null)
  set('initial_amount', readString(config.initial_amount))
  set('grid_orders_count', readNumber(config.grid_orders_count))
  set('grid_step_percent', readString(config.grid_step_percent))
  set('volume_mode', readString(config.volume_mode)?.toLowerCase() ?? null)
  set('start_price', readString(config.start_price))

  if (config.auto_restart != null) {
    set('auto_restart', Boolean(config.auto_restart))
  }

  return SETTING_ORDER.flatMap((key) => {
    const row = byKey.get(key)
    return row ? [row] : []
  })
}
