import { TakeProfitMode, type GridFuturesConfig } from '#shared/types/bot'

export type ParsedTakeProfit = {
  mode: TakeProfitMode
  value: string
  percent: number | null
  amount: number | null
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n === 0) return null
  return n
}

export function parseTakeProfit(
  config: Record<string, unknown> | GridFuturesConfig | null | undefined,
): ParsedTakeProfit {
  const percent = toNullableNumber(config?.take_profit_percent)
  const amount = toNullableNumber(config?.take_profit_amount)

  if (percent != null && amount == null) {
    return { mode: TakeProfitMode.Percent, value: String(percent), percent, amount: null }
  }

  if (amount != null && percent == null) {
    return { mode: TakeProfitMode.Amount, value: String(amount), percent: null, amount }
  }

  return { mode: TakeProfitMode.Off, value: '', percent: null, amount: null }
}

export function buildTakeProfitPayload(mode: TakeProfitMode, rawValue: string) {
  if (mode === TakeProfitMode.Off) {
    return {
      take_profit_percent: null,
      take_profit_amount: null,
    }
  }

  const parsed = toNullableNumber(rawValue.trim())

  return {
    take_profit_percent: mode === TakeProfitMode.Percent ? parsed : null,
    take_profit_amount: mode === TakeProfitMode.Amount ? parsed : null,
  }
}

export function validateTakeProfit(
  mode: TakeProfitMode,
  rawValue: string,
  t: (key: string) => string,
) {
  if (mode === TakeProfitMode.Off) return null

  const parsed = toNullableNumber(rawValue.trim())
  if (parsed == null || parsed <= 0) {
    return t('bots.error_take_profit_required')
  }

  if (mode === TakeProfitMode.Percent && parsed > 100) {
    return t('bots.error_take_profit_percent_max')
  }

  return null
}

export function isTakeProfitApiError(error: unknown) {
  const err = error as { data?: { detail?: unknown } }
  const detail = err?.data?.detail
  const blob = typeof detail === 'string'
    ? detail
    : Array.isArray(detail)
      ? JSON.stringify(detail)
      : ''

  return /take_profit/i.test(blob)
}

export function formatTakeProfitBadge(
  config: Record<string, unknown> | GridFuturesConfig | null | undefined,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  const { mode, percent, amount } = parseTakeProfit(config)

  if (mode === TakeProfitMode.Percent && percent != null) {
    return t('bots.take_profit_badge_percent', { value: percent })
  }

  if (mode === TakeProfitMode.Amount && amount != null) {
    return t('bots.take_profit_badge_amount', { value: amount })
  }

  return t('bots.take_profit_badge_off')
}
