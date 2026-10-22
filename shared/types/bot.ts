import type { ExchangeType } from '#shared/types/api-key'

export type BotType =
  | 'GRID_FUTURES'
  | 'GRID_SPOT'
  | 'DCA_FUTURES'
  | 'DCA_SPOT'
  | 'ANTI_MARTINGALE_FUTURES'
  | 'CUSTOM'

export type BotLifecycleStatus = 'ACTIVE' | 'STOPPED' | 'CLOSED'

export type EngineState = 'INIT' | 'RUNNING' | 'STOPPED' | 'RESTARTING' | 'ERROR'

export type PositionSide = 'LONG' | 'SHORT'

export type GridDirection = 'LONG' | 'SHORT'

export type VolumeMode = 'linear' | 'exponential' | 'fixed'

export enum TakeProfitMode {
  Off = 'off',
  Percent = 'percent',
  Amount = 'amount',
}

export enum StopLossMode {
  Off = 'off',
  Percent = 'percent',
}

export enum OrderSizeMode {
  /** `initial_amount` — entry size in the base coin (ETH for ETHUSDT). */
  Coin = 'coin',
  /** `initial_amount_usdt` — entry notional in USDT (quantity × price, not margin). */
  Usdt = 'usdt',
  /** `initial_amount_percent` — entry notional as % of the free USDT balance at the moment of the entry. */
  Percent = 'percent',
}

/** `legacy` — one entry size + `volume_mode`; `mixed` — every order sized on its own. Missing on old bots = legacy. */
export type GridSizingMode = 'legacy' | 'mixed'

/** `USDT` — fixed notional; `PERCENT` — % of the deposit fixed at the start of the cycle. */
export type GridOrderUnit = 'USDT' | 'PERCENT'

export type GridProgressionType = 'none' | 'arithmetic' | 'geometric'

export interface GridOrderSpec {
  /** Notional in USDT or % of the deposit (not margin: leverage does not multiply it). */
  size: string | number
  unit: GridOrderUnit
  /** Price step to the NEXT order, %; null = `grid_step_percent`. */
  step_percent?: string | number | null
}

export interface GridProgression {
  /** 1-based; always `fixed_orders_count + 1`. */
  start_order: number
  type: GridProgressionType
  start_value: string | number
  unit: GridOrderUnit
  /** Arithmetic: added to each next order. */
  increment?: string | number | null
  /** Geometric: each next order is multiplied by it. */
  ratio?: string | number | null
  step_percent?: string | number | null
}

export interface MixedGridSettings {
  /** Capital allocated to this bot; % orders are sized from it and it is compounded after every cycle. */
  deposit_usdt: string | number
  fixed_orders_count: number
  fixed_order_usdt?: string | number | null
  /** The fill recipe, kept so it can be re-applied; sizes always come from `orders`. */
  progression?: GridProgression | null
  /** All orders: #1 is the market entry, #2… are grid levels. */
  orders: GridOrderSpec[]
}

export interface GridCycleOrderSnapshot {
  number: number
  kind: 'entry' | 'grid'
  client_order_id: string
  size: string
  unit: GridOrderUnit
  step_percent: string | null
  notional_usdt: string
  price: string
  quantity: string
}

export interface GridCycleSettlement {
  config_version: number
  started_at: string
  closed_at: string
  base_deposit_usdt: string
  realized_pnl_usdt: string
  fees_usdt: string
  funding_usdt: string
  net_result_usdt: string
  deposit_after_usdt: string
  source: 'exchange_income' | 'orders_estimate' | 'unavailable'
}

/** `bots.cycle_state`, mixed grids only. */
export interface GridCycleState {
  /** Deposit the next cycle starts from (compounded). */
  deposit_usdt?: string
  deposit_source_usdt?: string
  cycle?: {
    config_version: number
    started_at: string
    closed_at: string | null
    settled: boolean
    base_deposit_usdt: string
    anchor_price: string
    total_notional_usdt: string
    config: Record<string, unknown>
    orders: GridCycleOrderSnapshot[]
  }
  history?: GridCycleSettlement[]
}

export interface GridFuturesConfig {
  symbol: string
  direction: GridDirection
  /**
   * Entry size in the base coin. Send exactly one of `initial_amount` / `initial_amount_usdt` / `initial_amount_percent`:
   * the unused one is `null` or omitted, never `0` or `""`.
   */
  initial_amount?: string | number | null
  /** Entry notional in USDT. Bots created before this field existed do not have the key. */
  initial_amount_usdt?: string | number | null
  /**
   * Entry notional as % of the free USDT balance (0…1000), taken when the entry is placed and then
   * fixed in USDT until the grid restarts. Bots created before this field existed do not have the key.
   */
  initial_amount_percent?: string | number | null
  grid_orders_count: number
  grid_step_percent: string | number
  volume_mode: VolumeMode
  start_price?: string | number | null
  auto_restart?: boolean
  /** Price shift from average entry, 0…100; null/0 = off. */
  take_profit_percent?: string | number | null
  /** Target unrealized PnL in USDT; null/0 = off. */
  take_profit_amount?: string | number | null
  /** Price shift from last filled grid level, 0…100; null/0 = off. */
  stop_loss_percent?: string | number | null
  /** Missing on bots created before the mixed mode = `legacy`. */
  sizing_mode?: GridSizingMode
  /** Only with `sizing_mode: 'mixed'`; then all `initial_amount*` are null and `grid_orders_count` = orders − 1. */
  mixed_grid?: MixedGridSettings | null
}

export interface AntiMartingaleOrderLevel {
  /** For orders[0] this is always "0" — the initial entry fires on the breakout signal. */
  trigger_percent: string
  /** % of the balance at the start of the cycle. */
  size_percent: string
}

export interface AntiMartingaleFuturesConfig {
  symbol: string
  /** 1–10 levels; orders[0].trigger_percent is always "0". */
  orders: AntiMartingaleOrderLevel[]
  /** Breakout lookback window in hours. Server default: 99. */
  breakout_lookback_hours?: number
  /** Fast EMA period for the trend filter. Server default: 50. */
  ema_fast_period?: number
  /** Slow EMA period; must be greater than ema_fast_period. Server default: 200. */
  ema_slow_period?: number
  /** Trailing stop distance from the post-entry high, in percent. Server default: "4". */
  trailing_stop_percent?: string
  /** 1–125. Server default: 20. */
  leverage?: number
}

export type BotConfig = GridFuturesConfig | AntiMartingaleFuturesConfig

export interface BotCreate {
  api_key_id: number
  bot_type?: BotType
  config: BotConfig
}

export interface LiquidationCheckRequest {
  bot_type?: BotType
  config: BotConfig
  current_price?: number
  total_balance: number
  leverage: number
}

/** Closed 15-minute candle for the anti-martingale breakout window. */
export interface CandleOut {
  timestamp: string
  open: number
  high: number
  low: number
  close: number
}

export interface LiquidationCheckOut {
  liquidation_price: number
  avg_entry_price: number
  total_base_quantity: number
}

export interface BotOut {
  id: number
  user_id: number
  api_key_id: number
  bot_type: BotType
  symbol: string
  lifecycle_status: BotLifecycleStatus
  engine_state: EngineState
  engine_error: string | null
  config: Record<string, unknown>
  config_version: number
  /** Mixed grids: deposit, the frozen snapshot of the current cycle and finished cycles. */
  cycle_state?: GridCycleState | null
  /** Missing in old caches — treat as false. */
  favorite?: boolean
  created_at: string
  updated_at: string | null
  deleted_at?: string | null
}

/** Response item for GET /bots */
export interface BotListOut extends BotOut {
  position_side: PositionSide | null
  position_size: number | null
  entry_price: number | null
  mark_price: number | null
  unrealized_pnl: number | null
  pnl_percent: number | null
  /** null for grid bots; closed 15m candles for the breakout window for anti-martingale bots. */
  recent_candles?: CandleOut[] | null
}

export interface BotListItem extends BotListOut {
  exchange?: ExchangeType
}

export interface BotBulkActionFailure {
  bot_id: number
  detail: string
}

export interface BotsStopAllResponse {
  stopped: BotOut[]
  failed: BotBulkActionFailure[]
}

export interface BotsCloseAllResponse {
  closed: BotOut[]
  failed: BotBulkActionFailure[]
}

export interface BotsRemoveAllResponse {
  removed: BotOut[]
  failed: BotBulkActionFailure[]
}

export type BotCreationOutcome = 'VALIDATION_FAILED' | 'EXCHANGE_ERROR' | 'CREATED_OK'

export interface BotCreationLogOut {
  id: number
  user_id: number
  bot_id: number | null
  request_payload: Record<string, unknown>
  outcome: BotCreationOutcome
  lifecycle_status: BotLifecycleStatus | null
  engine_state: EngineState | null
  error_message: string | null
  symbol: string | null
  bot_type: BotType | null
  api_key_id: number | null
  created_at: string
  exchange_ok: boolean
  favorite?: boolean
}

export type BotEventSource = 'user' | 'auto'

export type BotEventType =
  | 'created'
  | 'stopped'
  | 'close_completed'
  | 'grid_redeployed'
  | 'grid_recreated'
  | 'take_profit_filled'
  | 'stop_loss_filled'
  | 'order_filled'
  | 'config_updated'
  | 'removed_from_tracking'
  | 'cycle_started'
  | 'addon_placed'
  | 'addon_rejected'
  | 'entry_rejected'
  | 'exit_order_filled'
  | 'cycle_closed'
  | 'grid_cycle_started'
  | 'grid_cycle_settled'
  | 'grid_size_resolved'
  | 'error'

export interface BotEventOut {
  id: number
  bot_id: number
  event_type: string
  payload: Record<string, unknown> | null
  created_at: string
  exchange: ExchangeType
  symbol: string
}

export interface HistoryClearResult {
  deleted: number
}

export interface BotHistoryFilters {
  bot_id?: number
  created_from?: string
  created_to?: string
  exchange?: ExchangeType
}

export interface BotHistoryQuery extends BotHistoryFilters {
  skip?: number
  limit?: number
}
