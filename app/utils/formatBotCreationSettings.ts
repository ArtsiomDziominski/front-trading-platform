import type { BotType } from '#shared/types/bot'
import { BOT_TYPE_LABEL_KEYS } from '~/utils/botView'

export type CreationSettingKey =
  | 'bot_type'
  | 'api_key_id'
  | 'symbol'
  | 'direction'
  | 'initial_amount'
  | 'initial_amount_usdt'
  | 'initial_amount_percent'
  | 'mixed_deposit_usdt'
  | 'mixed_orders_summary'
  | 'grid_orders_count'
  | 'grid_step_percent'
  | 'volume_mode'
  | 'start_price'
  | 'auto_restart'
  | 'take_profit_percent'
  | 'take_profit_amount'
  | 'stop_loss_percent'
  | 'orders_summary'
  | 'breakout_lookback_hours'
  | 'ema_fast_period'
  | 'ema_slow_period'
  | 'trailing_stop_percent'
  | 'leverage'

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
  'initial_amount_usdt',
  'initial_amount_percent',
  'mixed_deposit_usdt',
  'mixed_orders_summary',
  'grid_orders_count',
  'grid_step_percent',
  'volume_mode',
  'start_price',
  'auto_restart',
  'take_profit_percent',
  'take_profit_amount',
  'stop_loss_percent',
  'orders_summary',
  'breakout_lookback_hours',
  'ema_fast_period',
  'ema_slow_period',
  'trailing_stop_percent',
  'leverage',
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

function readOrdersSummary(value: unknown): string | null {
  if (!Array.isArray(value) || !value.length) return null

  const parts = value.map((item) => {
    if (!item || typeof item !== 'object') return null
    const row = item as Record<string, unknown>
    const trigger = readString(row.trigger_percent)
    const size = readString(row.size_percent)
    if (trigger == null || size == null) return null
    return `${trigger}%→${size}%`
  })

  return parts.every((part) => part != null) ? parts.join(' · ') : null
}

/** Mixed grid orders in a line: `1 USDT ×4 · 5% · 10% · 15%` (equal neighbours collapsed). */
function readMixedOrdersSummary(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const orders = (value as { orders?: unknown }).orders
  if (!Array.isArray(orders) || !orders.length) return null

  const labels = orders.map((item) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const size = readString(row.size) ?? '?'
    return row.unit === 'PERCENT' ? `${size}%` : `${size} USDT`
  })
  const parts: string[] = []
  for (let index = 0; index < labels.length;) {
    let end = index
    while (end + 1 < labels.length && labels[end + 1] === labels[index]) end += 1
    const count = end - index + 1
    parts.push(count > 1 ? `${labels[index]} ×${count}` : String(labels[index]))
    index = end + 1
  }
  return parts.join(' · ')
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
  set('initial_amount_usdt', readString(config.initial_amount_usdt))
  set('initial_amount_percent', readString(config.initial_amount_percent))
  if (config.sizing_mode === 'mixed') {
    const mixed = (config.mixed_grid && typeof config.mixed_grid === 'object' ? config.mixed_grid : {}) as Record<string, unknown>
    set('mixed_deposit_usdt', readString(mixed.deposit_usdt))
    set('mixed_orders_summary', readMixedOrdersSummary(mixed))
  }
  set('grid_orders_count', readNumber(config.grid_orders_count))
  set('grid_step_percent', readString(config.grid_step_percent))
  set('volume_mode', readString(config.volume_mode)?.toLowerCase() ?? null)
  set('start_price', readString(config.start_price))

  if (config.auto_restart != null) {
    set('auto_restart', Boolean(config.auto_restart))
  }

  const takeProfitPercent = readNumber(config.take_profit_percent)
  if (takeProfitPercent != null && takeProfitPercent > 0) {
    set('take_profit_percent', takeProfitPercent)
  }

  const takeProfitAmount = readNumber(config.take_profit_amount)
  if (takeProfitAmount != null && takeProfitAmount > 0) {
    set('take_profit_amount', takeProfitAmount)
  }

  const stopLossPercent = readNumber(config.stop_loss_percent)
  if (stopLossPercent != null && stopLossPercent > 0) {
    set('stop_loss_percent', stopLossPercent)
  }

  set('orders_summary', readOrdersSummary(config.orders))
  set('breakout_lookback_hours', readNumber(config.breakout_lookback_hours))
  set('ema_fast_period', readNumber(config.ema_fast_period))
  set('ema_slow_period', readNumber(config.ema_slow_period))
  set('trailing_stop_percent', readString(config.trailing_stop_percent))
  set('leverage', readNumber(config.leverage))

  return SETTING_ORDER.flatMap((key) => {
    const row = byKey.get(key)
    return row ? [row] : []
  })
}

export const CREATION_SETTING_LABEL_KEYS: Record<CreationSettingKey, string> = {
  bot_type: 'bots.field_bot_type',
  api_key_id: 'bots.field_api_key',
  symbol: 'bots.field_symbol',
  direction: 'bots.field_direction',
  initial_amount: 'bots.field_initial_amount',
  initial_amount_usdt: 'bots.field_initial_amount_usdt',
  initial_amount_percent: 'bots.field_initial_amount_percent',
  grid_orders_count: 'bots.field_grid_orders',
  grid_step_percent: 'bots.field_grid_step',
  volume_mode: 'bots.field_volume_mode',
  start_price: 'bots.field_start_price',
  auto_restart: 'bots.field_auto_restart',
  take_profit_percent: 'bots.take_profit_value_percent',
  take_profit_amount: 'bots.take_profit_value_amount',
  stop_loss_percent: 'bots.stop_loss_value_percent',
  orders_summary: 'bots.field_orders_summary',
  breakout_lookback_hours: 'bots.field_breakout_lookback_hours',
  ema_fast_period: 'bots.field_ema_fast_period',
  ema_slow_period: 'bots.field_ema_slow_period',
  trailing_stop_percent: 'bots.field_trailing_stop_percent',
  leverage: 'bots.field_leverage',
  mixed_deposit_usdt: 'bots.mixed_deposit',
  mixed_orders_summary: 'bots.mixed_orders_summary',
}

type TranslateFn = (key: string, values?: Record<string, unknown>) => string

/** Display value of one setting: translated enums, `%` and `USDT` units. */
export function formatCreationSettingValue(setting: CreationHistorySetting, t: TranslateFn): string {
  switch (setting.key) {
    case 'bot_type': {
      const key = BOT_TYPE_LABEL_KEYS[setting.value as BotType]
      return key ? t(key) : String(setting.value)
    }
    case 'api_key_id':
      return `#${setting.value}`
    case 'direction':
      return setting.value === 'SHORT' ? t('bots.direction_short') : t('bots.direction_long')
    case 'volume_mode':
      if (setting.value === 'exponential') return t('bots.volume_exponential')
      if (setting.value === 'fixed') return t('bots.volume_fixed')
      return t('bots.volume_linear')
    case 'auto_restart':
      return setting.value ? t('common.yes') : t('common.no')
    case 'grid_step_percent':
    case 'initial_amount_percent':
    case 'take_profit_percent':
    case 'stop_loss_percent':
    case 'trailing_stop_percent':
      return `${setting.value}%`
    case 'take_profit_amount':
    case 'initial_amount_usdt':
    case 'mixed_deposit_usdt':
      return `${setting.value} USDT`
    default:
      return String(setting.value)
  }
}
