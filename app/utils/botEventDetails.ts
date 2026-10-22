import type { BotEventOut } from '#shared/types/bot'
import {
  antiMartingaleLegIndex,
  isStopLossClose,
  isTakeProfitClose,
  normalizeBotEventType,
} from '~/utils/botEventType'
import {
  formatCount,
  formatDateTime,
  formatPercentValue,
  formatPrice,
  formatQuantity,
  formatUsdt,
  toNumber,
} from '~/utils/formatNumber'
import {
  formatR,
  trendExitReasonLabel,
  trendPauseScopeLabel,
  trendReasonText,
  trendSideLabel,
  trendStopSourceLabel,
} from '~/utils/trend'

export type BotEventDetailTone = 'up' | 'down' | 'muted'

export interface BotEventDetail {
  label?: string
  value: string
  tone?: BotEventDetailTone
  /** Free text (engine reason) rendered on its own line instead of as a chip. */
  note?: boolean
}

type Translate = (key: string, params?: Record<string, unknown>) => string
type Payload = Record<string, unknown>

function text(payload: Payload, key: string): string | null {
  const value = payload[key]
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed || null
}

function signTone(value: number): BotEventDetailTone | undefined {
  if (value > 0) return 'up'
  if (value < 0) return 'down'
  return undefined
}

/**
 * Payload of a bot event as short label/value chips for the feed.
 * Numbers in payloads are decimal strings or null; missing fields are skipped.
 * `error` events return nothing: the feed renders their message itself.
 */
export function botEventDetails(
  event: Pick<BotEventOut, 'event_type' | 'payload'>,
  t: Translate,
  locale: string,
): BotEventDetail[] {
  const payload: Payload = event.payload ?? {}
  const details: BotEventDetail[] = []

  const num = (key: string) => toNumber(payload[key])
  // Cents, so a value that prints as 0.00 is neither "-0.00" nor coloured as a loss
  const cents = (value: number) => Math.round(value * 100) / 100 || 0
  const usdt = (value: number, signed = false) => `${formatUsdt(cents(value), locale, signed)}\u00A0USDT`

  const pushPrice = (key: string, labelKey: string) => {
    const value = num(key)
    if (value != null) details.push({ label: t(labelKey), value: formatPrice(value, locale) })
  }
  const pushQuantity = () => {
    const value = num('quantity')
    if (value != null) details.push({ label: t('bots.event_detail_quantity'), value: formatQuantity(value, locale) })
  }
  const pushUsdt = (key: string, labelKey: string, signed = false) => {
    const value = num(key)
    if (value != null) details.push({ label: t(labelKey), value: usdt(value, signed) })
  }
  const pushLeg = (leg: number | null) => {
    if (leg != null && leg >= 1) details.push({ value: t('bots.event_detail_addon_leg', { n: leg }) })
  }
  /** `labelKey` may be a plain label (e.g. "ADX") when `translate` is false. */
  const pushNumber = (key: string, labelKey: string, format: (value: number, locale: string) => string, translate = true) => {
    const value = num(key)
    if (value != null) details.push({ label: translate ? t(labelKey) : labelKey, value: format(value, locale) })
  }
  const pushTrendSide = () => {
    const side = text(payload, 'side')?.toUpperCase()
    if (side === 'LONG') details.push({ value: 'LONG', tone: 'up' })
    else if (side === 'SHORT') details.push({ value: 'SHORT', tone: 'down' })
  }
  const pushReason = () => {
    const reason = text(payload, 'reason')
    if (reason) details.push({ value: reason, tone: 'muted', note: true })
  }

  switch (normalizeBotEventType(event.event_type)) {
    case 'order_filled': {
      const side = text(payload, 'side')
      if (side?.toLowerCase() === 'buy') details.push({ value: t('bots.event_detail_side_buy'), tone: 'up' })
      else if (side?.toLowerCase() === 'sell') details.push({ value: t('bots.event_detail_side_sell'), tone: 'down' })
      else if (side) details.push({ value: side })

      // Older anti-martingale fills were logged with `kind: "addon"`; grid ids never match the leg pattern
      const leg = payload.kind === 'order' || payload.kind === 'addon' ? antiMartingaleLegIndex(payload.client_order_id) : null
      pushLeg(leg)
      pushQuantity()
      // The engine records an add-on's trigger price, not the exchange fill price.
      pushPrice('avg_price', leg != null && leg >= 1 ? 'bots.event_detail_trigger_price' : 'bots.event_detail_price')
      break
    }

    case 'exit_order_filled':
      pushQuantity()
      // Like add-ons, the exit row keeps the trailing stop's trigger price
      pushPrice('avg_price', 'bots.event_detail_trigger_price')
      break

    case 'cycle_started':
      pushUsdt('cycle_start_balance', 'bots.event_detail_start_balance')
      pushReason()
      break

    case 'cycle_closed': {
      const exit = num('exit_price')
      if (exit != null) details.push({ label: t('bots.event_detail_exit_price'), value: `≈\u00A0${formatPrice(exit, locale)}` })
      break
    }

    case 'addon_placed':
    case 'addon_rejected': {
      const index = num('order_index')
      pushLeg(index != null && Number.isInteger(index) ? index : null)
      pushReason()
      break
    }

    case 'entry_rejected':
      pushReason()
      break

    case 'grid_cycle_started': {
      pushUsdt('base_deposit_usdt', 'bots.mixed_base_deposit')
      pushUsdt('total_notional_usdt', 'bots.mixed_total_notional')
      const count = num('orders_count')
      if (count != null) details.push({ label: t('bots.mixed_total_orders'), value: formatCount(count, locale) })
      break
    }

    case 'grid_cycle_settled': {
      const net = num('net_result_usdt')
      if (net != null) {
        details.push({ label: t('bots.event_detail_net_result'), value: usdt(net, true), tone: signTone(cents(net)) })
      }
      pushUsdt('realized_pnl_usdt', 'bots.pnl', true)
      pushUsdt('fees_usdt', 'bots.event_detail_fees')
      pushUsdt('funding_usdt', 'bots.event_detail_funding', true)

      const before = num('base_deposit_usdt')
      const after = num('deposit_after_usdt')
      if (before != null && after != null) {
        details.push({
          label: t('bots.event_detail_deposit'),
          value: `${formatUsdt(before, locale)} → ${usdt(after)}`,
        })
      }
      else if (after != null) {
        details.push({ label: t('bots.event_detail_deposit_after'), value: usdt(after) })
      }

      const startedAt = text(payload, 'started_at')
      if (startedAt) details.push({ label: t('bots.event_detail_cycle_start'), value: formatDateTime(startedAt, locale) })

      if (payload.source === 'orders_estimate') {
        details.push({ value: t('bots.event_detail_source_estimate'), tone: 'muted' })
      }
      else if (payload.source === 'unavailable') {
        details.push({ value: t('bots.event_detail_source_unavailable'), tone: 'muted' })
      }
      break
    }

    case 'grid_size_resolved': {
      pushUsdt('initial_amount_usdt', 'bots.event_detail_entry_amount')
      const percent = num('initial_amount_percent')
      const balance = num('free_balance')
      if (percent != null && balance != null) {
        details.push({
          value: t('bots.event_detail_percent_of_balance', {
            percent: formatPercentValue(percent, locale),
            balance: usdt(balance),
          }),
          tone: 'muted',
        })
      }
      else if (percent != null) {
        details.push({ label: t('bots.order_size_mode_percent'), value: formatPercentValue(percent, locale) })
      }
      else if (balance != null) {
        details.push({ label: t('bots.event_detail_free_balance'), value: usdt(balance) })
      }
      break
    }

    case 'config_updated':
      if (payload.applies_from === 'next_cycle') {
        details.push({ value: t('bots.event_detail_applies_next_cycle'), tone: 'muted' })
      }
      break

    case 'take_profit_filled':
      if (typeof payload.auto_restart === 'boolean') {
        details.push({
          label: t('bots.field_auto_restart'),
          value: t(payload.auto_restart ? 'common.yes' : 'common.no'),
        })
      }
      break

    // auto_restart never applies after a stop-loss, so only the removal is worth showing.
    case 'stop_loss_filled':
      if (payload.removed_from_tracking === true) {
        details.push({ value: t('bots.event_type_removed_from_tracking'), tone: 'muted' })
      }
      break

    case 'trend_entry':
      pushTrendSide()
      pushPrice('price', 'bots.event_detail_price')
      pushNumber('qty', 'bots.event_detail_quantity', formatQuantity)
      pushPrice('stop', 'bots.trend_event_stop')
      pushUsdt('risk_usdt', 'bots.trend_event_risk')
      pushPrice('level', 'bots.trend_event_level')
      pushNumber('adx', 'ADX', formatCount, false)
      break

    case 'trend_add': {
      pushTrendSide()
      const unit = num('unit')
      if (unit != null) details.push({ value: t('bots.trend_event_unit', { n: formatCount(unit, locale) }) })
      pushPrice('price', 'bots.event_detail_price')
      pushNumber('qty', 'bots.event_detail_quantity', formatQuantity)
      pushNumber('total_qty', 'bots.trend_event_total_qty', formatQuantity)
      pushPrice('avg_price', 'bots.trend_event_avg_price')
      pushPrice('stop', 'bots.trend_event_stop')
      if (payload.capped === true) details.push({ value: t('bots.trend_event_capped'), tone: 'muted' })
      break
    }

    case 'trend_stop_moved': {
      pushTrendSide()
      const from = num('from')
      const to = num('to')
      if (from != null && to != null) {
        details.push({ label: t('bots.trend_event_stop'), value: `${formatPrice(from, locale)} → ${formatPrice(to, locale)}` })
      }
      else if (to != null) {
        details.push({ label: t('bots.trend_event_stop'), value: formatPrice(to, locale) })
      }
      const source = trendStopSourceLabel(t, text(payload, 'source'))
      if (source) details.push({ value: source, tone: 'muted' })
      break
    }

    case 'trend_exit': {
      pushTrendSide()
      const reason = text(payload, 'reason')
      if (reason) details.push({ label: t('bots.trend_event_exit_reason'), value: trendExitReasonLabel(t, reason) })
      pushPrice('exit_price', 'bots.event_detail_exit_price')
      const net = num('pnl_net')
      if (net != null) details.push({ label: t('bots.trend_event_pnl_net'), value: usdt(net, true), tone: signTone(cents(net)) })
      const r = num('r_multiple')
      if (r != null) details.push({ label: 'R', value: formatR(r, locale), tone: signTone(r) })
      pushUsdt('fees', 'bots.event_detail_fees', true)
      pushUsdt('funding', 'bots.event_detail_funding', true)
      pushNumber('units', 'bots.trend_units', formatCount)
      break
    }

    case 'trend_regime_changed': {
      const from = text(payload, 'from')
      const to = text(payload, 'to')
      details.push({
        label: t('bots.trend_event_regime'),
        value: `${trendSideLabel(t, from)} → ${trendSideLabel(t, to)}`,
        tone: to === 'LONG' ? 'up' : to === 'SHORT' ? 'down' : undefined,
      })
      pushPrice('ema_fast', 'bots.trend_event_ema_fast')
      pushPrice('ema_slow', 'bots.trend_event_ema_slow')
      pushNumber('adx', 'ADX', formatCount, false)
      break
    }

    case 'trend_risk_pause': {
      const scope = trendPauseScopeLabel(t, text(payload, 'scope'))
      if (scope) details.push({ value: scope, tone: 'down' })
      const loss = num('loss_pct')
      const limit = num('limit_pct')
      if (loss != null) {
        details.push({
          label: t('bots.trend_event_loss'),
          value: limit != null
            ? `${formatPercentValue(loss, locale)} / ${formatPercentValue(limit, locale)}`
            : formatPercentValue(loss, locale),
        })
      }
      const until = text(payload, 'until')
      if (until) details.push({ label: t('bots.trend_event_until'), value: formatDateTime(until, locale) })
      pushUsdt('equity', 'bots.trend_equity')
      break
    }

    case 'trend_exchange_ready': {
      const leverage = num('leverage')
      if (leverage != null) details.push({ label: t('bots.field_leverage'), value: `${formatCount(leverage, locale)}×` })
      const marginMode = text(payload, 'margin_mode')
      if (marginMode) details.push({ label: t('bots.trend_event_margin_mode'), value: marginMode })
      const positionMode = text(payload, 'position_mode')
      if (positionMode) details.push({ label: t('bots.trend_event_position_mode'), value: positionMode })
      pushUsdt('capital', 'bots.trend_capital')
      break
    }

    case 'trend_evaluated': {
      const code = text(payload, 'reason_code')
      const params = payload.reason_params && typeof payload.reason_params === 'object'
        ? payload.reason_params as Record<string, unknown>
        : null
      const reason = trendReasonText(t, locale, code, params, text(payload, 'reason'))
      if (reason) details.push({ value: reason, tone: 'muted', note: true })
      break
    }

    // Take-profit and stop-loss closes already say so in the title.
    case 'close_completed':
      if (!isStopLossClose(payload) && !isTakeProfitClose(payload) && payload.source === 'user') {
        details.push({ value: t('bots.event_detail_closed_manually'), tone: 'muted' })
      }
      break
  }

  return details
}
