import type { ExchangeType } from '#shared/types/api-key'

export type BotType =
  | 'GRID_FUTURES'
  | 'GRID_SPOT'
  | 'DCA_FUTURES'
  | 'DCA_SPOT'
  | 'RECURRING_SPOT'
  | 'ANTI_MARTINGALE_FUTURES'
  | 'TREND_FUTURES'
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

export type TrendSignalTimeframe = '15m' | '30m' | '1h' | '2h'

export type TrendTrendTimeframe = '1h' | '2h' | '4h' | '6h' | '12h' | '1d'

/**
 * TREND_FUTURES: one pair, the side follows the EMA regime of the higher timeframe, entry on a Donchian breakout
 * of the signal timeframe (closed candles only), exchange stop, pyramiding, trailing stop, capital protection.
 * Every field but `symbol` is optional: the server fills its defaults. Decimals go as strings or numbers.
 */
export interface TrendFuturesConfig {
  symbol: string
  /** Server default: "1h". */
  signal_timeframe?: TrendSignalTimeframe
  /** Must be longer than `signal_timeframe`. Server default: "4h". */
  trend_timeframe?: TrendTrendTimeframe
  /** Server default: 50; must be less than `ema_slow`. */
  ema_fast?: number
  /** Server default: 200. */
  ema_slow?: number
  /** Server default: 14. */
  adx_period?: number
  /** ADX below it is a sideways market: no new entries. Server default: "20". */
  adx_min?: string | number
  /** Server default: 14. */
  atr_period?: number
  /** Entry channel, candles. Server default: 48. */
  donchian_entry?: number
  /** Exit channel, candles. Server default: 24. */
  donchian_exit?: number
  /** Volume filter multiplier; 0 = off. Server default: "0". */
  volume_mult?: string | number
  /** Server default: 20. */
  volume_sma_period?: number
  /** Risk of one unit, % of the capital, (0; 10]. Server default: "2". */
  risk_per_unit_pct?: string | number
  /** Stop distance in ATR. Server default: "2". */
  stop_atr?: string | number
  /** Pyramid step in ATR. Server default: "1". */
  add_step_atr?: string | number
  /** 1–10; 1 = no pyramiding. Server default: 4. */
  max_units?: number
  /** Trailing stop distance in ATR. Server default: "3". */
  trail_atr?: string | number
  /** Server default: true. */
  exit_on_regime_flip?: boolean
  /** Candles without entries after a stop-out. Server default: 4. */
  cooldown_bars?: number
  /** 0 = off. Server default: "10". */
  daily_stop_pct?: string | number
  /** 0 = off. Server default: "35". */
  monthly_stop_pct?: string | number
  /** Position notional cap, × capital. Server default: "8". */
  max_notional_x?: string | number
  /** 1–125, set on the exchange by the bot (cross). Server default: 10. */
  exchange_leverage?: number
  /** null = the account USDT balance when the bot starts. */
  capital_usdt?: string | number | null
  /** Stopping the bot: true closes the position at market, false leaves it with its exchange stop. Server default: false. */
  close_on_stop?: boolean
}

export type TrendState =
  | 'WARMUP'
  | 'WAITING_TREND'
  | 'WAITING_BREAKOUT'
  | 'IN_LONG'
  | 'IN_SHORT'
  | 'COOLDOWN'
  | 'PAUSED_RISK'

export type TrendReasonCode =
  | 'warmup'
  | 'no_regime'
  | 'adx_low'
  | 'no_breakout'
  | 'volume_low'
  | 'cooldown'
  | 'risk_pause'
  | 'breakout'
  | 'hold'
  | 'channel'
  | 'regime_flip'
  | 'position_exists'
  | 'stale_signal'
  | 'size_too_small'
  | 'not_started'

export type TrendExitReason = 'stop' | 'trail' | 'channel' | 'regime_flip' | 'risk_pause' | 'manual' | 'liquidation'

export type TrendStopSource = 'initial' | 'pyramid' | 'trail'

/** `trend` field of a GET /bots item: TREND_FUTURES only, `null` for other types. Decimals arrive as numbers. */
export interface TrendBotStatus {
  /** Plain string on the server; the known values are `TrendState`. */
  state: string
  side: PositionSide | null
  trade_id: number | null
  units: number
  max_units: number
  entry_price: number | null
  avg_price: number | null
  stop_price: number | null
  initial_stop: number | null
  stop_source: string | null
  next_add_price: number | null
  /** Mark price to the stop, %. */
  distance_to_stop_pct: number | null
  /** Unrealized PnL in R (risk of the first unit). */
  current_r: number | null
  risk_usdt: number | null
  regime: PositionSide | null
  adx: number | null
  ema_fast: number | null
  ema_slow: number | null
  atr: number | null
  last_reason_code: string | null
  last_reason: string | null
  /** Numbers for `last_reason_code`, like `TrendDecision.reason_params`. */
  last_reason_params?: Record<string, unknown>
  last_evaluated_at: string | null
  cooldown_until: string | null
  paused_until: string | null
  /** daily | monthly */
  pause_reason: string | null
  capital: number | null
  equity: number | null
}

/** GET /bots/{id}/trades item: one position, newest first. */
export interface TrendTrade {
  id: number
  bot_id: number
  config_version: number
  symbol: string
  side: string
  /** OPEN | CLOSED */
  status: string
  opened_at: string
  closed_at: string | null
  entry_avg: number | null
  exit_avg: number | null
  qty_max: number | null
  units: number
  initial_stop: number | null
  risk_usdt: number | null
  pnl_gross: number | null
  /** Signed like the wallet: paid is negative. */
  fees: number | null
  funding: number | null
  pnl_net: number | null
  r_multiple: number | null
  /** Known values are `TrendExitReason`. */
  exit_reason: string | null
  /** Best move from the entry, %. */
  mfe: number | null
  /** Worst move from the entry, % (≤ 0). */
  mae: number | null
  entry_snapshot: Record<string, unknown> | null
}

/** enter | exit | hold | wait */
export type TrendAction = 'enter' | 'exit' | 'hold' | 'wait'

/** GET /bots/{id}/decisions item: the decision on one closed candle, newest first. */
export interface TrendDecision {
  id: number
  created_at: string
  candle_open: string | null
  candle_close: string | null
  state: string | null
  action: string | null
  side: string | null
  /** Stable code for i18n; the known values are `TrendReasonCode`. */
  reason_code: string | null
  /** Server-side Russian text, the fallback for unknown codes. */
  reason: string | null
  reason_params: Record<string, unknown>
  regime: string | null
  adx: number | null
  ema_fast: number | null
  ema_slow: number | null
  atr: number | null
  close: number | null
  entry_high: number | null
  entry_low: number | null
  exit_high: number | null
  exit_low: number | null
}

export interface TrendDecisionsQuery {
  from?: string
  to?: string
  limit?: number
}

export interface TrendMonthPnl {
  /** YYYY-MM, UTC, by the trade close date. */
  month: string
  pnl_net: number | null
}

/** GET /bots/{id}/stats: closed trades of a trend bot. */
export interface TrendStats {
  trades: number
  wins: number
  losses: number
  win_rate_pct: number | null
  pnl_net: number | null
  pnl_gross: number | null
  fees: number | null
  funding: number | null
  avg_r: number | null
  /** null when there is no losing trade. */
  profit_factor: number | null
  max_drawdown_usdt: number | null
  max_drawdown_pct: number | null
  /** Fees and funding paid, % of the sum of |pnl_gross|. */
  costs_share_pct: number | null
  pnl_by_month: TrendMonthPnl[]
  capital: number | null
  open_trade: TrendTrade | null
}

export type TrendMarketExchange = 'BINANCE' | 'OKX'

export interface TrendMarketQuery {
  exchange: TrendMarketExchange
  symbol: string
  signal_timeframe?: TrendSignalTimeframe
  trend_timeframe?: TrendTrendTimeframe
  ema_fast?: number
  ema_slow?: number
  adx_min?: string | number
  donchian_entry?: number
  donchian_exit?: number
}

/** GET /market/trend: the current trend of a pair, public data. */
export interface TrendMarket {
  exchange: ExchangeType
  symbol: string
  signal_timeframe: string
  trend_timeframe: string
  price: number | null
  regime: PositionSide | null
  /** ADX below the threshold: the bot would wait. */
  sideways: boolean
  /** WARMUP | WAITING_TREND | WAITING_BREAKOUT */
  state: string
  breakout: boolean
  reason_code: string
  reason: string
  reason_params: Record<string, unknown>
  distance_to_breakout_pct: number | null
  adx: number | null
  adx_min: number | null
  ema_fast: number | null
  ema_slow: number | null
  atr_signal: number | null
  atr_trend: number | null
  entry_high: number | null
  entry_low: number | null
  exit_high: number | null
  exit_low: number | null
  candle_close: string | null
}

export interface TrendChartPoint {
  timestamp: string
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  /** EMA of the higher timeframe at this candle (a step line). */
  ema_fast: number | null
  ema_slow: number | null
  /** Channels from the previous candles. */
  entry_high: number | null
  entry_low: number | null
  exit_high: number | null
  exit_low: number | null
}

/** entry | add | exit | stop_moved */
export interface TrendChartMarker {
  timestamp: string
  price: number | null
  kind: string
  side: string | null
  trade_id: number | null
  /** For `exit` — the exit reason; for `stop_moved` — the stop source. */
  label: string | null
}

/** GET /bots/{id}/trend-chart */
export interface TrendChart {
  symbol: string
  signal_timeframe: string
  trend_timeframe: string
  points: TrendChartPoint[]
  markers: TrendChartMarker[]
  /** Current stop of the open position. */
  stop_price: number | null
  stop_history: TrendChartMarker[]
}

/**
 * DCA_SPOT: classic spot DCA, long only, USDT pairs, no leverage. A market base order, then
 * `safety_orders_count` limit buys below the base fill price, one take-profit sell from the average price.
 * Decimals go as strings or numbers; the server stores them as strings.
 */
export interface DcaSpotConfig {
  /** Must end with USDT. */
  symbol: string
  /** Base (market) order, USDT, (0; 10 000 000]. */
  base_order_usdt: string | number
  /** First safety order, USDT, (0; 10 000 000]; the next ones grow by `volume_scale`. */
  safety_order_usdt: string | number
  /** 0–50. Server default: 5. */
  safety_orders_count: number
  /** Drop from the base fill price to safety order #1, %, (0; 50]. Server default: "1.5". */
  price_deviation_percent: string | number
  /** Each next step is the previous × this, [0.5; 5]. The deepest order must stay above −100 %. Server default: "1". */
  step_scale: string | number
  /** Each next safety order size is the previous × this, [0.5; 5]. Server default: "1". */
  volume_scale: string | number
  /** Take profit from the average price, %, (0; 100]. Server default: "1.5". */
  take_profit_percent: string | number
  /** null = fixed TP; else trailing distance from the high after the TP price is reached, (0; 50]. */
  trailing_take_profit_percent: string | number | null
  /** null = off; else (0; 100) below the average price, then the bot sells and stops. */
  stop_loss_percent: string | number | null
  /** Server default: true. */
  auto_restart: boolean
  /** Pause between cycles, 0–86400 s. Server default: 0. */
  restart_delay_seconds: number
}

export type DcaSpotPhase = 'starting' | 'open' | 'waiting_restart' | 'stopped'

/** State of one safety order of the current cycle. */
export type DcaSafetyOrderState = 'filled' | 'open' | 'pending' | 'rejected' | 'canceled'

export interface DcaSafetyOrderOut {
  /** 1-based safety order number. */
  index: number
  price: number | null
  /** Plain string on the server; the known values are `DcaSafetyOrderState`. */
  state: DcaSafetyOrderState | string
}

/** `dca` field of a GET /bots item: DCA_SPOT only, `null` for other types. Decimals arrive as numbers. */
export interface DcaSpotStatusOut {
  /** Plain string on the server; the known values are `DcaSpotPhase`. */
  phase: DcaSpotPhase | string
  cycle_no: number
  cycles_completed: number
  base_price: number | null
  avg_price: number | null
  qty: number | null
  invested_usdt: number | null
  safety_filled: number
  safety_total: number
  next_safety_price: number | null
  take_profit_price: number | null
  stop_loss_price: number | null
  trailing_active: boolean
  trailing_high: number | null
  realized_profit_usdt: number | null
  last_cycle_profit_usdt: number | null
  max_funds_usdt: number | null
  /** When the next cycle starts (phase `waiting_restart`). */
  restart_at: string | null
  /** Per-order state of the current cycle's safety orders; missing on older servers. */
  safety_orders?: DcaSafetyOrderOut[]
}

/**
 * RECURRING_SPOT: recurring buy (accumulator), USDT pairs. A market buy of `amount_usdt` every `interval_hours`,
 * × `dip_multiplier` while the price is below the moving average of `dip_ma_period` daily closes, until
 * `max_total_usdt` is spent. The bot never sells. Decimals go as strings or numbers; the server stores strings.
 */
export interface RecurringSpotConfig {
  /** Must end with USDT. */
  symbol: string
  /** One buy, USDT, (0; 10 000 000]. */
  amount_usdt: string | number
  /** 1–8760 h. Server default: 24. */
  interval_hours: number
  /** null = off; else 2–200 daily closes. */
  dip_ma_period: number | null
  /** [1; 10]. Server default: "2". */
  dip_multiplier: string | number
  /** null = no limit; else ≥ amount_usdt. */
  max_total_usdt: string | number | null
}

export type RecurringSpotPhase = 'active' | 'waiting_funds' | 'finished' | 'stopped'

/** `recurring` field of a GET /bots item: RECURRING_SPOT only. Decimals arrive as numbers. */
export interface RecurringSpotStatusOut {
  /** Plain string on the server; the known values are `RecurringSpotPhase`. */
  phase: RecurringSpotPhase | string
  buys_done: number
  qty: number | null
  avg_price: number | null
  invested_usdt: number | null
  fees_usdt: number | null
  budget_usdt: number | null
  budget_left_usdt: number | null
  next_buy_at: string | null
  next_buy_usdt: number | null
  last_buy_at: string | null
  last_buy_price: number | null
  last_buy_usdt: number | null
  last_buy_dip: boolean
  ma_price: number | null
  dip_active: boolean
  last_skip_reason: string | null
}

export type BotConfig = GridFuturesConfig | AntiMartingaleFuturesConfig | TrendFuturesConfig | DcaSpotConfig | RecurringSpotConfig

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
  /** TREND_FUTURES only: strategy state, side, R, stop; null for other types and in old caches. */
  trend?: TrendBotStatus | null
  /** DCA_SPOT only: cycle, safety orders, average and TP price, profit; null for other types and in old caches. */
  dca?: DcaSpotStatusOut | null
  /** RECURRING_SPOT only: buys, accumulated coins, next buy, budget; null for other types and in old caches. */
  recurring?: RecurringSpotStatusOut | null
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
  | 'trend_evaluated'
  | 'trend_entry'
  | 'trend_add'
  | 'trend_stop_moved'
  | 'trend_exit'
  | 'trend_regime_changed'
  | 'trend_risk_pause'
  | 'trend_exchange_ready'
  | 'dca_cycle_started'
  | 'dca_cycle_closed'
  | 'dca_entry_rejected'
  | 'dca_safety_rejected'
  | 'dca_safety_canceled'
  | 'dca_take_profit_replaced'
  | 'dca_take_profit_rejected'
  | 'dca_finished'
  | 'dca_stop_loss'
  | 'recurring_buy'
  | 'recurring_buy_skipped'
  | 'recurring_finished'
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
