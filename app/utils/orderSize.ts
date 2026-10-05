import { OrderSizeMode, type GridFuturesConfig } from '#shared/types/bot'
import { getApiErrorStatus, parseApiError } from '~/utils/parseApiError'
import { toNullableNumber } from '~/utils/takeProfit'

export type ParsedOrderSize = {
  mode: OrderSizeMode
  value: string
}

type ConfigLike = Record<string, unknown> | GridFuturesConfig | null | undefined

/** Longest first, so `ETHFDUSD` is not cut at `USD`. */
const QUOTE_SUFFIXES = ['FDUSD', 'USDT', 'USDC', 'BUSD', 'USD']

const SIZE_FIELD_PATTERN = /initial_amount/i

/** A size field counts as set only when it is a number greater than zero. */
function readAmount(value: unknown): string | null {
  const parsed = toNullableNumber(value)
  if (parsed == null || parsed <= 0) return null

  const text = typeof value === 'string' ? value.trim() : String(parsed)
  // The API may echo a Decimal as "100.00000000"
  return /^\d+\.\d+$/.test(text) ? text.replace(/0+$/, '').replace(/\.$/, '') : text
}

/**
 * Reads the order size from a bot config: `initial_amount_usdt` wins when set,
 * otherwise `initial_amount`. Bots created before the USDT mode have no `initial_amount_usdt` key.
 */
export function parseOrderSize(config: ConfigLike): ParsedOrderSize {
  const usdt = readAmount(config?.initial_amount_usdt)
  if (usdt != null) return { mode: OrderSizeMode.Usdt, value: usdt }

  const coin = readAmount(config?.initial_amount)
  if (coin != null) return { mode: OrderSizeMode.Coin, value: coin }

  return { mode: OrderSizeMode.Coin, value: '' }
}

/** Exactly one field carries the size, the other one is an explicit `null` (never `0` or `""`). */
export function buildOrderSizePayload(mode: OrderSizeMode, rawValue: string) {
  const value = rawValue.trim() || null

  return {
    initial_amount: mode === OrderSizeMode.Coin ? value : null,
    initial_amount_usdt: mode === OrderSizeMode.Usdt ? value : null,
  }
}

/**
 * Brings a stored config into the shape the API accepts back on `PATCH /bots/{id}`:
 * one size field set, the other one `null`. A config with both or neither is left to the API to judge.
 */
export function normalizeOrderSizeFields(config: Record<string, unknown>): Record<string, unknown> {
  const hasCoin = readAmount(config.initial_amount) != null
  const hasUsdt = readAmount(config.initial_amount_usdt) != null

  if (hasCoin === hasUsdt) return config

  return {
    ...config,
    initial_amount: hasCoin ? config.initial_amount : null,
    initial_amount_usdt: hasUsdt ? config.initial_amount_usdt : null,
  }
}

/** The only check the client can do — exchange minimums are unknown until the API answers. */
export function validateOrderSize(rawValue: string, t: (key: string) => string) {
  const parsed = toNullableNumber(rawValue.trim())

  return parsed == null || parsed <= 0 ? t('bots.error_order_size_positive') : null
}

/** `ETHUSDT` → `ETH`; null when the quote currency cannot be told apart. */
export function baseCoinFromSymbol(symbol: string): string | null {
  const normalized = symbol.trim().toUpperCase()
  const quote = QUOTE_SUFFIXES.find((suffix) => normalized.endsWith(suffix))
  const base = quote ? normalized.slice(0, -quote.length) : ''

  return base || null
}

export function formatOrderSizeBadge(
  config: ConfigLike,
  symbol: string,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  const { mode, value } = parseOrderSize(config)
  if (!value) return null

  if (mode === OrderSizeMode.Usdt) {
    return t('bots.order_size_badge_usdt', { value })
  }

  return t('bots.order_size_badge_coin', { value, coin: baseCoinFromSymbol(symbol) ?? '' }).trim()
}

function isOrderSizeDetailItem(item: unknown): boolean {
  if (typeof item === 'string') return SIZE_FIELD_PATTERN.test(item)
  if (!item || typeof item !== 'object') return false

  // Only `loc` / `msg`: the echoed `input` of a 422 holds the whole config and always names these fields
  const { loc, msg } = item as { loc?: unknown, msg?: unknown }
  const inLoc = Array.isArray(loc) && loc.some((part) => typeof part === 'string' && SIZE_FIELD_PATTERN.test(part))

  return inLoc || (typeof msg === 'string' && SIZE_FIELD_PATTERN.test(msg))
}

function readErrorDetail(error: unknown): unknown {
  return (error as { data?: { detail?: unknown } } | null)?.data?.detail
}

/**
 * 422: the size fields are the problem (both set, none, `<= 0`, not a number).
 * 400 in USDT mode: the amount is below the exchange minimum, the bot was not created.
 */
export function isOrderSizeApiError(error: unknown, mode: OrderSizeMode) {
  const status = getApiErrorStatus(error)

  if (status === 400) return mode === OrderSizeMode.Usdt
  if (status !== 422) return false

  const detail = readErrorDetail(error)
  if (Array.isArray(detail)) return detail.some(isOrderSizeDetailItem)

  return isOrderSizeDetailItem(detail)
}

export function parseOrderSizeApiError(error: unknown, fallback: string): string {
  const detail = readErrorDetail(error)
  if (!Array.isArray(detail)) return parseApiError(error, fallback)

  const messages = detail
    .filter(isOrderSizeDetailItem)
    .map((item) => (typeof item === 'string' ? item : (item as { msg?: unknown })?.msg))
    .filter((message): message is string => typeof message === 'string' && message.length > 0)
    .map((message) => message.replace(/^value error,\s*/i, ''))

  return messages.length > 0 ? [...new Set(messages)].join(', ') : fallback
}
