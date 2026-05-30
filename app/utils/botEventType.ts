export type BotEventTone =
  | 'created'
  | 'updated'
  | 'stopped'
  | 'closed'
  | 'removed'
  | 'redeployed'
  | 'config'
  | 'error'
  | 'default'

type TranslateFn = (key: string) => string
type HasKeyFn = (key: string) => boolean

const EVENT_TYPE_I18N_KEYS: Record<string, string> = {
  bot_created: 'bots.event_type_bot_created',
  bot_updated: 'bots.event_type_bot_updated',
  bot_stopped: 'bots.event_type_bot_stopped',
  bot_closed: 'bots.event_type_bot_closed',
  bot_removed: 'bots.event_type_bot_removed',
  bot_error: 'bots.event_type_bot_error',
  bot_grid_redeployed: 'bots.event_type_bot_grid_redeployed',
  bot_config_updated: 'bots.event_type_bot_config_updated',
  grid_redeployed: 'bots.event_type_bot_grid_redeployed',
  config_updated: 'bots.event_type_bot_config_updated',
  active: 'bots.status_active',
  stopped: 'bots.status_stopped',
  closed: 'bots.status_closed',
  error: 'bots.status_error',
  init: 'bots.engine_state_init',
  running: 'bots.engine_state_running',
  restarting: 'bots.engine_state_restarting',
  created_ok: 'bots.creation_outcome_ok',
  exchange_error: 'bots.creation_outcome_exchange_error',
  validation_failed: 'bots.creation_outcome_validation_failed',
}

const PAYLOAD_FIELD_I18N_KEYS: Record<string, Record<string, string>> = {
  lifecycle_status: {
    active: 'bots.status_active',
    stopped: 'bots.status_stopped',
    closed: 'bots.status_closed',
  },
  engine_state: {
    init: 'bots.engine_state_init',
    running: 'bots.engine_state_running',
    stopped: 'bots.engine_state_stopped',
    restarting: 'bots.engine_state_restarting',
    error: 'bots.status_error',
  },
  outcome: {
    created_ok: 'bots.creation_outcome_ok',
    exchange_error: 'bots.creation_outcome_exchange_error',
    validation_failed: 'bots.creation_outcome_validation_failed',
  },
  bot_type: {
    grid_futures: 'bots.type_grid_futures',
    grid_spot: 'bots.type_grid_spot',
    dca_futures: 'bots.type_dca_futures',
    dca_spot: 'bots.type_dca_spot',
    custom: 'bots.type_custom',
  },
  event_type: EVENT_TYPE_I18N_KEYS,
}

export function normalizeBotEventType(value: string): string {
  return value.trim().toLowerCase().replace(/-/g, '_')
}

export function translateBotEventType(t: TranslateFn, te: HasKeyFn, eventType: string): string {
  const normalized = normalizeBotEventType(eventType)
  const mappedKey = EVENT_TYPE_I18N_KEYS[normalized]

  if (mappedKey && te(mappedKey)) {
    return t(mappedKey)
  }

  const dynamicKey = `bots.event_type_${normalized}`
  if (te(dynamicKey)) {
    return t(dynamicKey)
  }

  return eventType
}

export function botEventTypeTone(eventType: string): BotEventTone {
  const type = normalizeBotEventType(eventType)

  if (type.includes('created') || type === 'active' || type === 'running' || type === 'created_ok') {
    return 'created'
  }
  if (type.includes('redeploy') || type === 'restarting') return 'redeployed'
  if (type.includes('config')) return 'config'
  if (type.includes('stopped') || type === 'init') return 'stopped'
  if (type.includes('closed')) return 'closed'
  if (type.includes('removed')) return 'removed'
  if (type.includes('error') || type === 'exchange_error' || type === 'validation_failed') {
    return 'error'
  }
  if (type.includes('updated')) return 'updated'

  return 'default'
}

function translatePayloadValue(
  t: TranslateFn,
  te: HasKeyFn,
  field: string,
  value: unknown,
): unknown {
  if (value == null) return value

  if (typeof value === 'string') {
    const normalizedField = normalizeBotEventType(field)
    const normalizedValue = normalizeBotEventType(value)
    const fieldMap = PAYLOAD_FIELD_I18N_KEYS[normalizedField]

    if (fieldMap?.[normalizedValue]) {
      const key = fieldMap[normalizedValue]
      if (te(key)) return t(key)
    }

    if (normalizedField === 'event_type') {
      return translateBotEventType(t, te, value)
    }

    const statusKey = EVENT_TYPE_I18N_KEYS[normalizedValue]
    if (statusKey && te(statusKey)) {
      return t(statusKey)
    }
  }

  if (Array.isArray(value)) {
    return value.map((item) => translatePayloadValue(t, te, field, item))
  }

  if (typeof value === 'object') {
    return translateBotEventPayload(t, te, value as Record<string, unknown>)
  }

  return value
}

export function translateBotEventPayload(
  t: TranslateFn,
  te: HasKeyFn,
  payload: Record<string, unknown> | null,
): Record<string, unknown> | null {
  if (!payload) return null

  return Object.fromEntries(
    Object.entries(payload).map(([field, value]) => [field, translatePayloadValue(t, te, field, value)]),
  )
}

export function formatBotEventPayload(
  t: TranslateFn,
  te: HasKeyFn,
  payload: Record<string, unknown> | null,
): string {
  const translated = translateBotEventPayload(t, te, payload)
  if (!translated || !Object.keys(translated).length) return ''
  return JSON.stringify(translated, null, 2)
}
