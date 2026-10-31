import type { BotType } from '#shared/types/bot'
import { BOT_TYPE_LABEL_KEYS } from '~/utils/botView'
import { dcaMaxFundsUsdt, readDcaLadderParams } from '~/utils/dcaSpot'
import { recurringIntervalLabel } from '~/utils/recurringSpot'

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
  | 'signal_timeframe'
  | 'trend_timeframe'
  | 'risk_per_unit_pct'
  | 'max_units'
  | 'capital_usdt'
  | 'exchange_leverage'
  | 'max_notional_x'
  | 'close_on_stop'
  | 'ema_fast'
  | 'ema_slow'
  | 'adx_period'
  | 'adx_min'
  | 'atr_period'
  | 'donchian_entry'
  | 'donchian_exit'
  | 'volume_mult'
  | 'volume_sma_period'
  | 'stop_atr'
  | 'add_step_atr'
  | 'trail_atr'
  | 'exit_on_regime_flip'
  | 'cooldown_bars'
  | 'daily_stop_pct'
  | 'monthly_stop_pct'
  | 'base_order_usdt'
  | 'safety_order_usdt'
  | 'safety_orders_count'
  | 'price_deviation_percent'
  | 'step_scale'
  | 'volume_scale'
  | 'dca_take_profit_percent'
  | 'trailing_take_profit_percent'
  | 'dca_stop_loss_percent'
  | 'dca_max_funds_usdt'
  | 'restart_delay_seconds'
  | 'recurring_amount_usdt'
  | 'recurring_interval_hours'
  | 'recurring_dip_ma_period'
  | 'recurring_dip_multiplier'
  | 'recurring_max_total_usdt'
  | 'grid_spot_range'
  | 'grid_spot_count'
  | 'grid_spot_order_usdt'
  | 'grid_spot_geometric'
  | 'grid_spot_stop_loss'
  | 'grid_spot_take_profit'

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
  'signal_timeframe',
  'trend_timeframe',
  'risk_per_unit_pct',
  'max_units',
  'capital_usdt',
  'exchange_leverage',
  'max_notional_x',
  'close_on_stop',
  'ema_fast',
  'ema_slow',
  'adx_period',
  'adx_min',
  'atr_period',
  'donchian_entry',
  'donchian_exit',
  'volume_mult',
  'volume_sma_period',
  'stop_atr',
  'add_step_atr',
  'trail_atr',
  'exit_on_regime_flip',
  'cooldown_bars',
  'daily_stop_pct',
  'monthly_stop_pct',
  'base_order_usdt',
  'safety_order_usdt',
  'safety_orders_count',
  'price_deviation_percent',
  'step_scale',
  'volume_scale',
  'dca_max_funds_usdt',
  'dca_take_profit_percent',
  'trailing_take_profit_percent',
  'dca_stop_loss_percent',
  'restart_delay_seconds',
  'recurring_amount_usdt',
  'recurring_interval_hours',
  'recurring_dip_ma_period',
  'recurring_dip_multiplier',
  'recurring_max_total_usdt',
  'grid_spot_range',
  'grid_spot_count',
  'grid_spot_order_usdt',
  'grid_spot_geometric',
  'grid_spot_stop_loss',
  'grid_spot_take_profit',
]

const TREND_NUMERIC_KEYS = [
  'risk_per_unit_pct',
  'max_units',
  'capital_usdt',
  'exchange_leverage',
  'max_notional_x',
  'ema_fast',
  'ema_slow',
  'adx_period',
  'adx_min',
  'atr_period',
  'donchian_entry',
  'donchian_exit',
  'volume_mult',
  'volume_sma_period',
  'stop_atr',
  'add_step_atr',
  'trail_atr',
  'cooldown_bars',
  'daily_stop_pct',
  'monthly_stop_pct',
] as const satisfies readonly CreationSettingKey[]

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

  if (payload.bot_type === 'TREND_FUTURES') {
    set('signal_timeframe', readString(config.signal_timeframe))
    set('trend_timeframe', readString(config.trend_timeframe))
    for (const key of TREND_NUMERIC_KEYS) set(key, readString(config[key]))
    if (typeof config.close_on_stop === 'boolean') set('close_on_stop', config.close_on_stop)
    if (typeof config.exit_on_regime_flip === 'boolean') set('exit_on_regime_flip', config.exit_on_regime_flip)
  }

  // Spot DCA: its TP / SL have their own meaning (from the average price, and the SL stops the bot), so own keys
  if (payload.bot_type === 'DCA_SPOT') {
    byKey.delete('take_profit_percent')
    byKey.delete('stop_loss_percent')
    set('base_order_usdt', readString(config.base_order_usdt))
    set('safety_order_usdt', readString(config.safety_order_usdt))
    set('safety_orders_count', readNumber(config.safety_orders_count))
    set('price_deviation_percent', readString(config.price_deviation_percent))
    set('step_scale', readString(config.step_scale))
    set('volume_scale', readString(config.volume_scale))
    const params = readDcaLadderParams(config)
    if (params) set('dca_max_funds_usdt', Math.round(dcaMaxFundsUsdt(params) * 100) / 100)
    set('dca_take_profit_percent', readString(config.take_profit_percent))
    const trailing = readNumber(config.trailing_take_profit_percent)
    set('trailing_take_profit_percent', trailing != null && trailing > 0 ? readString(config.trailing_take_profit_percent) : 'off')
    const stopLoss = readNumber(config.stop_loss_percent)
    set('dca_stop_loss_percent', stopLoss != null && stopLoss > 0 ? readString(config.stop_loss_percent) : 'off')
    if (config.auto_restart !== false) set('restart_delay_seconds', readNumber(config.restart_delay_seconds))
  }

  if (payload.bot_type === 'RECURRING_SPOT') {
    set('recurring_amount_usdt', readString(config.amount_usdt))
    set('recurring_interval_hours', readNumber(config.interval_hours))
    const period = readNumber(config.dip_ma_period)
    set('recurring_dip_ma_period', period != null && period > 0 ? period : 'off')
    if (period != null && period > 0) set('recurring_dip_multiplier', readString(config.dip_multiplier))
    const budget = readNumber(config.max_total_usdt)
    set('recurring_max_total_usdt', budget != null && budget > 0 ? readString(config.max_total_usdt) : 'off')
  }

  if (payload.bot_type === 'GRID_SPOT') {
    const lower = readString(config.lower_price)
    const upper = readString(config.upper_price)
    if (lower != null && upper != null) set('grid_spot_range', `${lower} – ${upper}`)
    set('grid_spot_count', readNumber(config.grid_count))
    set('grid_spot_order_usdt', readString(config.order_usdt))
    set('grid_spot_geometric', config.geometric === true ? 'on' : 'off')
    const sl = readNumber(config.stop_loss_price)
    set('grid_spot_stop_loss', sl != null && sl > 0 ? readString(config.stop_loss_price) : 'off')
    const tp = readNumber(config.take_profit_price)
    set('grid_spot_take_profit', tp != null && tp > 0 ? readString(config.take_profit_price) : 'off')
  }

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
  signal_timeframe: 'bots.trend_field_signal_timeframe',
  trend_timeframe: 'bots.trend_field_trend_timeframe',
  risk_per_unit_pct: 'bots.trend_field_risk_per_unit_pct',
  max_units: 'bots.trend_field_max_units',
  capital_usdt: 'bots.trend_field_capital_usdt',
  exchange_leverage: 'bots.trend_field_exchange_leverage',
  max_notional_x: 'bots.trend_field_max_notional_x',
  close_on_stop: 'bots.trend_field_close_on_stop',
  ema_fast: 'bots.trend_field_ema_fast',
  ema_slow: 'bots.trend_field_ema_slow',
  adx_period: 'bots.trend_field_adx_period',
  adx_min: 'bots.trend_field_adx_min',
  atr_period: 'bots.trend_field_atr_period',
  donchian_entry: 'bots.trend_field_donchian_entry',
  donchian_exit: 'bots.trend_field_donchian_exit',
  volume_mult: 'bots.trend_field_volume_mult',
  volume_sma_period: 'bots.trend_field_volume_sma_period',
  stop_atr: 'bots.trend_field_stop_atr',
  add_step_atr: 'bots.trend_field_add_step_atr',
  trail_atr: 'bots.trend_field_trail_atr',
  exit_on_regime_flip: 'bots.trend_field_exit_on_regime_flip',
  cooldown_bars: 'bots.trend_field_cooldown_bars',
  daily_stop_pct: 'bots.trend_field_daily_stop_pct',
  monthly_stop_pct: 'bots.trend_field_monthly_stop_pct',
  base_order_usdt: 'bots.dca_field_base_order',
  safety_order_usdt: 'bots.dca_field_safety_order',
  safety_orders_count: 'bots.dca_field_safety_count',
  price_deviation_percent: 'bots.dca_field_deviation',
  step_scale: 'bots.dca_field_step_scale',
  volume_scale: 'bots.dca_field_volume_scale',
  dca_take_profit_percent: 'bots.dca_field_take_profit',
  trailing_take_profit_percent: 'bots.dca_field_trailing',
  dca_stop_loss_percent: 'bots.dca_field_stop_loss',
  dca_max_funds_usdt: 'bots.dca_max_funds',
  restart_delay_seconds: 'bots.dca_field_restart_delay',
  recurring_amount_usdt: 'bots.recurring_field_amount',
  recurring_interval_hours: 'bots.recurring_field_interval',
  recurring_dip_ma_period: 'bots.recurring_field_ma_period',
  recurring_dip_multiplier: 'bots.recurring_field_multiplier',
  recurring_max_total_usdt: 'bots.recurring_field_budget',
  grid_spot_range: 'bots.grid_spot_group_range',
  grid_spot_count: 'bots.grid_spot_field_count',
  grid_spot_order_usdt: 'bots.grid_spot_field_order',
  grid_spot_geometric: 'bots.grid_spot_field_geometric',
  grid_spot_stop_loss: 'bots.grid_spot_field_stop_loss',
  grid_spot_take_profit: 'bots.grid_spot_field_take_profit',
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
    case 'close_on_stop':
    case 'exit_on_regime_flip':
      return setting.value ? t('common.yes') : t('common.no')
    case 'risk_per_unit_pct':
    case 'daily_stop_pct':
    case 'monthly_stop_pct':
      return `${setting.value}%`
    case 'capital_usdt':
      return `${setting.value} USDT`
    case 'exchange_leverage':
    case 'max_notional_x':
      return `${setting.value}×`
    case 'stop_atr':
    case 'add_step_atr':
    case 'trail_atr':
      return `${setting.value} ATR`
    case 'volume_mult':
      return Number(setting.value) === 0 ? t('bots.trend_volume_filter_off') : `${setting.value}×`
    case 'trailing_take_profit_percent':
    case 'dca_stop_loss_percent':
      return setting.value === 'off' ? t('bots.value_off') : `${setting.value}%`
    case 'price_deviation_percent':
    case 'dca_take_profit_percent':
      return `${setting.value}%`
    case 'step_scale':
    case 'volume_scale':
      return `${setting.value}×`
    case 'base_order_usdt':
    case 'safety_order_usdt':
    case 'dca_max_funds_usdt':
      return `${setting.value} USDT`
    case 'restart_delay_seconds':
      return t('bots.dca_seconds_value', { n: setting.value })
    case 'recurring_amount_usdt':
      return `${setting.value} USDT`
    case 'recurring_max_total_usdt':
      return setting.value === 'off' ? t('bots.recurring_no_limit') : `${setting.value} USDT`
    case 'recurring_interval_hours':
      return recurringIntervalLabel(t, Number(setting.value))
    case 'recurring_dip_ma_period':
      return setting.value === 'off' ? t('bots.value_off') : t('bots.recurring_days', { n: setting.value })
    case 'recurring_dip_multiplier':
      return `${setting.value}×`
    case 'grid_spot_order_usdt':
      return `${setting.value} USDT`
    case 'grid_spot_geometric':
      return setting.value === 'on' ? t('bots.grid_spot_geometric_on') : t('bots.grid_spot_geometric_off')
    case 'grid_spot_stop_loss':
    case 'grid_spot_take_profit':
      return setting.value === 'off' ? t('bots.value_off') : String(setting.value)
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
