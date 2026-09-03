import { StopLossMode, type GridFuturesConfig } from '#shared/types/bot'
import { toNullableNumber } from '~/utils/takeProfit'

export type ParsedStopLoss = {
  mode: StopLossMode
  value: string
  percent: number | null
}

export function parseStopLoss(
  config: Record<string, unknown> | GridFuturesConfig | null | undefined,
): ParsedStopLoss {
  const percent = toNullableNumber(config?.stop_loss_percent)

  if (percent != null) {
    return { mode: StopLossMode.Percent, value: String(percent), percent }
  }

  return { mode: StopLossMode.Off, value: '', percent: null }
}

export function buildStopLossPayload(mode: StopLossMode, rawValue: string) {
  if (mode === StopLossMode.Off) {
    return { stop_loss_percent: null }
  }

  return { stop_loss_percent: toNullableNumber(rawValue.trim()) }
}

export function validateStopLoss(
  mode: StopLossMode,
  rawValue: string,
  t: (key: string) => string,
) {
  if (mode === StopLossMode.Off) return null

  const parsed = toNullableNumber(rawValue.trim())
  if (parsed == null || parsed <= 0) {
    return t('bots.error_stop_loss_required')
  }

  if (parsed > 100) {
    return t('bots.error_stop_loss_percent_max')
  }

  return null
}

export function isStopLossApiError(error: unknown) {
  const err = error as { data?: { detail?: unknown } }
  const detail = err?.data?.detail
  const blob = typeof detail === 'string'
    ? detail
    : Array.isArray(detail)
      ? JSON.stringify(detail)
      : ''

  return /stop_loss/i.test(blob)
}

export function formatStopLossBadge(
  config: Record<string, unknown> | GridFuturesConfig | null | undefined,
  t: (key: string, values?: Record<string, unknown>) => string,
) {
  const { mode, percent } = parseStopLoss(config)

  if (mode === StopLossMode.Percent && percent != null) {
    return t('bots.stop_loss_badge_percent', { value: percent })
  }

  return t('bots.stop_loss_badge_off')
}
