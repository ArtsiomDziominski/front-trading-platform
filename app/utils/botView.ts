import type { BotListItem, BotType, GridCycleState } from '#shared/types/bot'
import type { SupportedExchange } from '#shared/utils/exchange-images'
import { EXCHANGE_IMAGES } from '#shared/utils/exchange-images'
import { isMixedCycleInProgress } from '~/utils/mixedGrid'

/** What the list card and the bot page need to know about one bot, derived from `GET /bots` fields. */

export type BotDirection = 'LONG' | 'SHORT'

export const BOT_TYPE_LABEL_KEYS: Record<BotType, string> = {
  GRID_FUTURES: 'bots.type_grid_futures',
  GRID_SPOT: 'bots.type_grid_spot',
  DCA_FUTURES: 'bots.type_dca_futures',
  DCA_SPOT: 'bots.type_dca_spot',
  RECURRING_SPOT: 'bots.type_recurring_spot',
  TREND_SPOT: 'bots.type_trend_spot',
  ANTI_MARTINGALE_FUTURES: 'bots.type_anti_martingale_futures',
  TREND_FUTURES: 'bots.type_trend_futures',
  CUSTOM: 'bots.type_custom',
}

/**
 * The grid config the engine trades on: a running mixed-grid cycle keeps its frozen copy,
 * and settings saved meanwhile only apply from the next cycle.
 */
export function effectiveGridConfig(
  bot: Pick<BotListItem, 'config' | 'cycle_state' | 'config_version' | 'lifecycle_status'>,
): Record<string, unknown> {
  if (bot.lifecycle_status === 'ACTIVE' && isMixedCycleInProgress(bot)) {
    const frozen = (bot.cycle_state as GridCycleState | null | undefined)?.cycle?.config
    if (frozen) return frozen
  }
  return bot.config
}

/**
 * Grid bots trade the configured direction; anti-martingale and spot DCA bots are long only; trend bots pick the side
 * themselves (see `trendBotSide`), so for them this is the side of the open position, else LONG.
 * `position_side` is not used for grid bots: the server keeps the last side even when the position is flat.
 */
export function botDirection(
  bot: Pick<BotListItem, 'bot_type' | 'config' | 'position_side' | 'cycle_state' | 'config_version' | 'lifecycle_status' | 'trend'>,
): BotDirection {
  if (bot.bot_type === 'ANTI_MARTINGALE_FUTURES' || isSpotBot(bot)) return 'LONG'
  if (bot.bot_type === 'TREND_FUTURES') return trendBotSide(bot) ?? 'LONG'
  const direction = effectiveGridConfig(bot).direction
  if (direction === 'LONG' || direction === 'SHORT') return direction
  return bot.position_side === 'SHORT' ? 'SHORT' : 'LONG'
}

/** Side of a trend bot's open position; `null` when it is flat (it then has no direction of its own). */
export function trendBotSide(bot: Pick<BotListItem, 'bot_type' | 'trend' | 'lifecycle_status'>): BotDirection | null {
  if (bot.bot_type !== 'TREND_FUTURES' || bot.lifecycle_status === 'CLOSED') return null
  const side = bot.trend?.side
  return side === 'LONG' || side === 'SHORT' ? side : null
}

/** Spot bots buy coins: no leverage, no liquidation, the market badge says "Spot". */
export function isSpotBot(bot: Pick<BotListItem, 'bot_type'>): boolean {
  return bot.bot_type === 'DCA_SPOT' || bot.bot_type === 'GRID_SPOT' || bot.bot_type === 'RECURRING_SPOT' || bot.bot_type === 'TREND_SPOT'
}

/**
 * The server reports size 0 (and PnL 0) when flat, so only a non-zero size means an open position.
 * A closed bot's position was market-closed, but its last snapshot is never cleared: treat it as flat.
 */
export function isInPosition(bot: Pick<BotListItem, 'position_size' | 'lifecycle_status'>): boolean {
  if (bot.lifecycle_status === 'CLOSED') return false
  return bot.position_size != null && Number.isFinite(bot.position_size) && bot.position_size !== 0
}

/** Positions of stopped bots are no longer refreshed by the server, so their PnL is frozen. */
export function hasLivePosition(bot: Pick<BotListItem, 'position_size' | 'lifecycle_status'>): boolean {
  return bot.lifecycle_status === 'ACTIVE' && isInPosition(bot)
}

export type BotStatusKey =
  | 'error'
  | 'closed'
  | 'stopped'
  | 'starting'
  | 'restarting'
  | 'engine_stopped'
  | 'waiting_breakout'
  | 'running'

export interface BotStatusView {
  key: BotStatusKey
  labelKey: string
  /** Running states get the pulsing dot. */
  live: boolean
  tone: 'live' | 'muted' | 'warning' | 'error'
}

const STATUS_VIEWS: Record<BotStatusKey, BotStatusView> = {
  error: { key: 'error', labelKey: 'bots.status_error', live: false, tone: 'error' },
  closed: { key: 'closed', labelKey: 'bots.status_closed', live: false, tone: 'muted' },
  stopped: { key: 'stopped', labelKey: 'bots.status_stopped', live: false, tone: 'muted' },
  starting: { key: 'starting', labelKey: 'bots.status_starting', live: true, tone: 'warning' },
  restarting: { key: 'restarting', labelKey: 'bots.engine_state_restarting', live: true, tone: 'warning' },
  engine_stopped: { key: 'engine_stopped', labelKey: 'bots.engine_state_stopped', live: false, tone: 'warning' },
  waiting_breakout: { key: 'waiting_breakout', labelKey: 'bots.status_waiting_breakout', live: true, tone: 'live' },
  running: { key: 'running', labelKey: 'bots.engine_state_running', live: true, tone: 'live' },
}

/**
 * One status for a bot: the engine error wins, then the lifecycle (stopped / closed),
 * then the engine state of an active bot. An active anti-martingale bot without a position
 * is waiting for the breakout signal.
 */
export function botStatusView(
  bot: Pick<BotListItem, 'bot_type' | 'lifecycle_status' | 'engine_state' | 'position_size'>,
): BotStatusView {
  if (bot.engine_state === 'ERROR') return STATUS_VIEWS.error
  if (bot.lifecycle_status === 'CLOSED') return STATUS_VIEWS.closed
  if (bot.lifecycle_status === 'STOPPED') return STATUS_VIEWS.stopped
  if (bot.engine_state === 'INIT') return STATUS_VIEWS.starting
  if (bot.engine_state === 'RESTARTING') return STATUS_VIEWS.restarting
  if (bot.engine_state === 'STOPPED') return STATUS_VIEWS.engine_stopped
  if (bot.bot_type === 'ANTI_MARTINGALE_FUTURES' && !isInPosition(bot)) return STATUS_VIEWS.waiting_breakout
  return STATUS_VIEWS.running
}

export function engineErrorText(bot: Pick<BotListItem, 'engine_state' | 'engine_error'>): string | null {
  if (bot.engine_state !== 'ERROR') return null
  return bot.engine_error?.trim() || null
}

export function supportedExchange(bot: Pick<BotListItem, 'exchange'>): SupportedExchange | null {
  const exchange = bot.exchange
  return exchange && exchange in EXCHANGE_IMAGES ? exchange as SupportedExchange : null
}

export type PnlTone = 'up' | 'down' | 'flat'

export function pnlTone(value: number | null | undefined): PnlTone {
  if (value == null || value === 0) return 'flat'
  return value > 0 ? 'up' : 'down'
}

export interface BotsSummary {
  total: number
  /** Active bots whose engine is not in error. */
  running: number
  /** Active bots with an open position; stopped bots' snapshots are frozen and not counted. */
  inPosition: number
  /** Engine in error: these need the user. */
  attention: number
  /** Sum of unrealized PnL of those positions, `null` when nothing is open. */
  unrealizedPnl: number | null
}

export function summarizeBots(bots: BotListItem[]): BotsSummary {
  let running = 0
  let inPosition = 0
  let attention = 0
  let unrealizedPnl: number | null = null

  for (const bot of bots) {
    if (bot.engine_state === 'ERROR') attention += 1
    else if (bot.lifecycle_status === 'ACTIVE') running += 1

    if (hasLivePosition(bot)) {
      inPosition += 1
      if (bot.unrealized_pnl != null) unrealizedPnl = (unrealizedPnl ?? 0) + bot.unrealized_pnl
    }
  }

  return { total: bots.length, running, inPosition, attention, unrealizedPnl }
}
