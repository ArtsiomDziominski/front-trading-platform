import type { BotEventOut, BotListItem, CandleOut } from '#shared/types/bot'
import { antiMartingaleLegIndex } from '~/utils/botEventType'
import { toNumber } from '~/utils/formatNumber'

/**
 * Anti-martingale state the bot page can show without a backend change, rebuilt from the
 * bot config, its 15m candles (`recent_candles`) and its event history.
 * Mirrors app/strategies/anti_martingale.py in the backend; values the engine does not
 * expose (trailing stop, add-on trigger prices) are marked approximate in the UI.
 */

export const AM_DEFAULTS = {
  breakoutLookbackHours: 99,
  emaFastPeriod: 50,
  emaSlowPeriod: 200,
  trailingStopPercent: 4,
} as const

export interface AmOrderLevel {
  index: number
  triggerPercent: number
  sizePercent: number
}

export interface AmConfigView {
  levels: AmOrderLevel[]
  breakoutLookbackHours: number
  /** 15m candles in the breakout window. */
  breakoutLookbackCandles: number
  emaFastPeriod: number
  emaSlowPeriod: number
  trailingStopPercent: number
  leverage: number | null
}

export function readAmConfig(config: Record<string, unknown>): AmConfigView {
  const rawOrders = Array.isArray(config.orders) ? config.orders : []
  const levels = rawOrders.flatMap((item, index) => {
    const row = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>
    const triggerPercent = toNumber(row.trigger_percent)
    const sizePercent = toNumber(row.size_percent)
    return triggerPercent == null || sizePercent == null ? [] : [{ index, triggerPercent, sizePercent }]
  })
  const lookbackHours = toNumber(config.breakout_lookback_hours) ?? AM_DEFAULTS.breakoutLookbackHours

  return {
    levels,
    breakoutLookbackHours: lookbackHours,
    breakoutLookbackCandles: Math.round(lookbackHours * 4),
    emaFastPeriod: toNumber(config.ema_fast_period) ?? AM_DEFAULTS.emaFastPeriod,
    emaSlowPeriod: toNumber(config.ema_slow_period) ?? AM_DEFAULTS.emaSlowPeriod,
    trailingStopPercent: toNumber(config.trailing_stop_percent) ?? AM_DEFAULTS.trailingStopPercent,
    leverage: toNumber(config.leverage),
  }
}

/** SMA-seeded EMA, one value per close; `null` until there are `period` closes (same as the engine). */
export function ema(closes: number[], period: number): (number | null)[] {
  const out: (number | null)[] = closes.map(() => null)
  if (period <= 0 || closes.length < period) return out

  let previous = closes.slice(0, period).reduce((sum, value) => sum + value, 0) / period
  out[period - 1] = previous
  const multiplier = 2 / (period + 1)
  for (let index = period; index < closes.length; index += 1) {
    previous = ((closes[index] ?? previous) - previous) * multiplier + previous
    out[index] = previous
  }
  return out
}

function payloadVersion(event: BotEventOut): number | null {
  return toNumber(event.payload?.config_version)
}

function payloadText(event: BotEventOut, key: string): string | null {
  const value = event.payload?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const CANDLE_MS = 15 * 60_000
/** The engine reads at most this many 1m candles back for the post-entry high (loop.py, `limit=min(elapsed, 1500)`). */
const TRAILING_LOOKBACK_MS = 1500 * 60_000

/** The 15m candle whose interval contains `time`; candles are sorted by open time. */
export function candleContaining(candles: CandleOut[], time: string): CandleOut | null {
  const at = Date.parse(time)
  if (!Number.isFinite(at)) return null
  let low = 0
  let high = candles.length - 1
  while (low <= high) {
    const middle = (low + high) >> 1
    const candle = candles[middle]!
    const start = Date.parse(candle.timestamp)
    if (at < start) high = middle - 1
    else if (at >= start + CANDLE_MS) low = middle + 1
    else return candle
  }
  return null
}

export type AmLegStatus = 'filled' | 'placed' | 'rejected' | 'waiting' | 'cancelled'

export interface AmLegView extends AmOrderLevel {
  /** Add-on trigger: first entry fill × (1 + trigger %). Leg 0 is the breakout entry itself. */
  triggerPrice: number | null
  /** Order value in USDT: balance at cycle start × size %. */
  notionalUsdt: number | null
  status: AmLegStatus
  /** Leg 0: the first entry. Add-ons: the engine records the trigger, not the execution price. */
  fillPrice: number | null
  /** `fillPrice` is an estimate (always for add-ons, and for an entry rebuilt from other data). */
  fillApprox: boolean
  quantity: number | null
  rejectReason: string | null
}

interface PriceEstimate {
  price: number | null
  approx: boolean
}

export interface AmCycleView {
  configVersion: number
  startedAt: string
  closedAt: string | null
  startBalance: number | null
  /** Engine text: breakout close, level and EMA values at entry. */
  reason: string | null
  firstEntryPrice: number | null
  /** The engine rarely logs the market entry fill, so the price is usually rebuilt from an add-on or a candle. */
  firstEntryApprox: boolean
  /** Trigger price of the trailing stop that closed the cycle; the actual fill can differ on a gap. */
  exitPrice: number | null
}

export interface AmMarketView {
  /** Price the next 15m candle has to close above: the highest high of the breakout window. */
  breakoutLevel: number | null
  /** The window matches the engine's only when the exchange returned every candle of it. */
  breakoutWindowComplete: boolean
  lastClose: number | null
  lastCandleTime: string | null
  /** How far the last close is below the level, in % of the close; ≤ 0 means at or above it. */
  distanceToBreakoutPercent: number | null
  emaFast: (number | null)[]
  emaSlow: (number | null)[]
  lastEmaFast: number | null
  lastEmaSlow: number | null
  trendUp: boolean | null
}

export function deriveAmMarket(candles: CandleOut[], config: AmConfigView): AmMarketView {
  const closes = candles.map((candle) => candle.close)
  const emaFast = ema(closes, config.emaFastPeriod)
  const emaSlow = ema(closes, config.emaSlowPeriod)
  const last = candles.at(-1) ?? null
  const breakoutLevel = candles.length ? Math.max(...candles.map((candle) => candle.high)) : null
  const lastEmaFast = emaFast.at(-1) ?? null
  const lastEmaSlow = emaSlow.at(-1) ?? null

  return {
    breakoutLevel,
    breakoutWindowComplete: candles.length >= config.breakoutLookbackCandles,
    lastClose: last?.close ?? null,
    lastCandleTime: last?.timestamp ?? null,
    distanceToBreakoutPercent: breakoutLevel != null && last && last.close > 0
      ? ((breakoutLevel - last.close) / last.close) * 100
      : null,
    emaFast,
    emaSlow,
    lastEmaFast,
    lastEmaSlow,
    trendUp: lastEmaFast != null && lastEmaSlow != null ? lastEmaFast > lastEmaSlow : null,
  }
}


type LegFills = Map<number, { price: number | null, quantity: number | null }>

function fillsByVersion(events: BotEventOut[]): Map<number, LegFills> {
  const out = new Map<number, LegFills>()
  // Events come newest first: walk them oldest first so the first fill of a leg wins
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index]!
    if (event.event_type !== 'order_filled') continue
    const version = payloadVersion(event)
    const leg = antiMartingaleLegIndex(event.payload?.client_order_id)
    if (version == null || leg == null) continue
    const fills = out.get(version) ?? new Map()
    if (!fills.has(leg)) fills.set(leg, { price: toNumber(event.payload?.avg_price), quantity: toNumber(event.payload?.quantity) })
    out.set(version, fills)
  }
  return out
}

/**
 * First entry of a cycle. The engine marks the market entry filled when it places it and does not log it,
 * so after the rare logged fill the best source is an add-on: its recorded price is exactly
 * first entry × (1 + trigger %), up to tick rounding. Last resort: the open of the candle the cycle started in.
 */
function firstEntryEstimate(
  fills: LegFills | undefined,
  levels: AmOrderLevel[],
  startedAt: string | null,
  candles: CandleOut[],
): PriceEstimate {
  const entry = fills?.get(0)?.price
  if (entry != null) return { price: entry, approx: false }
  for (const level of levels) {
    if (level.index === 0) continue
    const addon = fills?.get(level.index)?.price
    if (addon != null) return { price: addon / (1 + level.triggerPercent / 100), approx: true }
  }
  const candle = startedAt ? candleContaining(candles, startedAt) : null
  return { price: candle?.open ?? null, approx: true }
}

/** Cycles from `cycle_started` / `cycle_closed` events, newest first. Events come newest first. */
export function deriveAmCycles(events: BotEventOut[], config: AmConfigView, candles: CandleOut[]): AmCycleView[] {
  const byVersion = new Map<number, AmCycleView>()
  const fills = fillsByVersion(events)

  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index]!
    const version = payloadVersion(event)
    if (version == null) continue

    if (event.event_type === 'cycle_started') {
      const entry = firstEntryEstimate(fills.get(version), config.levels, event.created_at, candles)
      byVersion.set(version, {
        configVersion: version,
        startedAt: event.created_at,
        closedAt: null,
        startBalance: toNumber(event.payload?.cycle_start_balance),
        reason: payloadText(event, 'reason'),
        firstEntryPrice: entry.price,
        firstEntryApprox: entry.approx,
        exitPrice: null,
      })
      continue
    }

    const cycle = byVersion.get(version)
    if (!cycle) continue

    if (event.event_type === 'cycle_closed') {
      cycle.closedAt = event.created_at
      cycle.exitPrice = toNumber(event.payload?.exit_price) ?? cycle.exitPrice
    } else if (event.event_type === 'exit_order_filled' && cycle.exitPrice == null) {
      cycle.exitPrice = toNumber(event.payload?.avg_price)
    }
  }

  return [...byVersion.values()].sort((a, b) => b.configVersion - a.configVersion)
}

export interface AmCurrentCycleView {
  cycle: AmCycleView | null
  /** First entry fill: from the logged fill, the position average while no add-on has filled, or an estimate. */
  firstEntryPrice: number | null
  firstEntryApprox: boolean
  legs: AmLegView[]
  /** Highest price since the entry, from closed 15m candles and the mark price. */
  highestPrice: number | null
  /** ≈ highest × (1 − trailing %); `null` when the bot is not active (stopping cancels the stop order). */
  trailingStopPrice: number | null
  /** A cycle is open: the bot holds a position, or the cycle started and the bot was not closed since. */
  active: boolean
  /** Stopped with a position: the stop cancelled the add-on and trailing stop orders. */
  ordersCancelled: boolean
}

/**
 * The open cycle: the engine bumps `config_version` when a cycle starts, so it is the
 * `cycle_started` of the bot's current version that has no `cycle_closed` yet.
 */
export function deriveAmCurrentCycle(
  bot: Pick<BotListItem, 'config_version' | 'entry_price' | 'mark_price' | 'position_size' | 'lifecycle_status'>,
  config: AmConfigView,
  candles: CandleOut[],
  events: BotEventOut[],
  cycles: AmCycleView[],
): AmCurrentCycleView {
  const live = bot.lifecycle_status === 'ACTIVE'
  const inPosition = bot.lifecycle_status !== 'CLOSED' && bot.position_size != null && bot.position_size !== 0
  const versionCycle = cycles.find((item) => item.configVersion === bot.config_version) ?? null
  const cycle = versionCycle && !versionCycle.closedAt ? versionCycle : null

  const fills: LegFills = fillsByVersion(events).get(bot.config_version) ?? new Map()
  const placed = new Set<number>()
  const rejected = new Map<number, string | null>()
  for (const event of events) {
    if (payloadVersion(event) !== bot.config_version) continue
    if (event.event_type === 'addon_placed') {
      const leg = toNumber(event.payload?.order_index)
      if (leg != null) placed.add(leg)
    } else if (event.event_type === 'addon_rejected') {
      const leg = toNumber(event.payload?.order_index)
      if (leg != null && !rejected.has(leg)) rejected.set(leg, payloadText(event, 'reason'))
    }
  }

  const active = inPosition || (Boolean(cycle) && bot.lifecycle_status !== 'CLOSED')
  const addonFilled = [...fills.keys()].some((leg) => leg > 0)
  let first: PriceEstimate = { price: null, approx: false }
  if (active) {
    const logged = fills.get(0)?.price
    if (logged != null) first = { price: logged, approx: false }
    // While only the entry has filled, the position average is the entry price
    else if (!addonFilled && inPosition && bot.entry_price != null) first = { price: bot.entry_price, approx: false }
    else first = firstEntryEstimate(fills, config.levels, cycle?.startedAt ?? null, candles)
  }

  const legs: AmLegView[] = config.levels.map((level) => {
    const fill = active ? fills.get(level.index) : undefined
    // Leg 0 is the market entry that opened the cycle, so it is filled whenever a cycle is open
    const filled = Boolean(fill) || (active && level.index === 0)
    let status: AmLegStatus = 'waiting'
    if (active) {
      if (filled) status = 'filled'
      else if (rejected.has(level.index)) status = 'rejected'
      else if (!live) status = 'cancelled'
      else if (placed.has(level.index)) status = 'placed'
    }
    return {
      ...level,
      triggerPrice: active && first.price != null && level.index > 0
        ? first.price * (1 + level.triggerPercent / 100)
        : null,
      notionalUsdt: active && cycle?.startBalance != null ? (cycle.startBalance * level.sizePercent) / 100 : null,
      status,
      fillPrice: level.index === 0 ? (active ? first.price : null) : fill?.price ?? null,
      fillApprox: level.index === 0 ? first.approx : true,
      quantity: fill?.quantity ?? null,
      rejectReason: active ? rejected.get(level.index) ?? null : null,
    }
  })

  let highestPrice: number | null = null
  if (active && inPosition) {
    const since = cycle ? Date.parse(cycle.startedAt) : Number.NaN
    const last = candles.at(-1)
    const lastClose = last ? Date.parse(last.timestamp) + CANDLE_MS : Number.NaN
    const candidates = [first.price, bot.mark_price]
    if (!addonFilled) candidates.push(bot.entry_price)
    for (const candle of candles) {
      const start = Date.parse(candle.timestamp)
      // A candle that closed after the entry may have printed the high after it; the engine forgets highs older than 1500 min
      if (Number.isFinite(since) && start + CANDLE_MS > since && start >= lastClose - TRAILING_LOOKBACK_MS) {
        candidates.push(candle.high)
      }
    }
    const values = candidates.filter((value): value is number => value != null && Number.isFinite(value))
    highestPrice = values.length ? Math.max(...values) : null
  }

  return {
    cycle,
    firstEntryPrice: first.price,
    firstEntryApprox: first.approx,
    legs,
    highestPrice,
    trailingStopPrice: live && highestPrice != null ? highestPrice * (1 - config.trailingStopPercent / 100) : null,
    active,
    ordersCancelled: inPosition && !live,
  }
}
