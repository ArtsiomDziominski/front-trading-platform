/** Bot backtests (POST /backtests, GET /backtests/{id}); see the backend's docs/ru/frontend-backtests.md. */

export type BacktestPeriod = '1m' | '3m' | '6m' | '1y' | '2y'
export type BacktestTimeframe = '1h' | '2h' | '4h' | '6h' | '12h' | '1d'
export type BacktestStatus = 'pending' | 'running' | 'done' | 'failed'

export interface BacktestCreate {
  bot_type?: 'BILATERAL_FUTURES'
  /** The user's bot: its pair, exchange and config. */
  bot_id?: number
  /** Without `bot_id`: pair, exchange and bot config (e.g. from the create form). */
  symbol?: string
  exchange?: 'BINANCE' | 'OKX'
  config?: Record<string, unknown>
  /** Default: the config's signal_timeframe. */
  timeframe?: BacktestTimeframe
  period?: BacktestPeriod
  /** Default 1000. */
  capital_usdt?: number
  /** false: fixed capital, profit withdrawn; true: compounding. */
  reinvest?: boolean
  /** Only look up a saved result (404 when there is none), never start a computation. */
  cached_only?: boolean
}

export interface BacktestSideStats {
  trades: number
  wins: number
  pnl_net: number
}

export interface BacktestSummary {
  pnl_net: number | null
  return_pct: number | null
  trades: number
  wins: number
  losses: number
  win_rate_pct: number | null
  profit_factor: number | null
  avg_r: number | null
  gross_win: number | null
  gross_loss: number | null
  /** Fees and slippage, negative. */
  fees: number | null
  /** Paid funding, negative. */
  funding: number | null
  best_trade: number | null
  worst_trade: number | null
  /** On the curve with the open position marked at candle closes. */
  max_drawdown_usdt: number | null
  max_drawdown_pct: number | null
  closed_max_drawdown_usdt: number | null
  buy_hold_pct: number | null
  price_start: number | null
  price_end: number | null
  by_side: Partial<Record<'LONG' | 'SHORT', BacktestSideStats>>
  risk_pauses: number
}

export interface BacktestTrade {
  side: 'LONG' | 'SHORT'
  opened_at: string
  closed_at: string
  entry: number | null
  exit: number | null
  qty: number | null
  notional: number | null
  units: number
  initial_stop: number | null
  risk_usdt: number | null
  pnl_gross: number | null
  fees: number | null
  funding: number | null
  pnl_net: number | null
  pnl_pct: number | null
  r_multiple: number | null
  mfe_pct: number | null
  mae_pct: number | null
  /** stop | trail | regime_flip | risk_pause | end (still open at the end, marked to market) */
  exit_reason: string
}

export interface BacktestResult {
  summary: BacktestSummary
  period: {
    start: string
    end: string
    first_candle: string | null
    last_candle_close: string | null
    candles: number
    warmup_candles: number
  }
  assumptions: {
    capital_usdt: number
    reinvest: boolean
    fee_pct: number
    slippage_pct: number
    funding_pct_8h: number
    engine_version: number
  }
  monthly: { month: string, pnl_net: number | null }[]
  /** Cumulative PnL at candle closes (open position marked), up to 400 points. */
  equity: { t: string, pnl: number | null }[]
  trades: BacktestTrade[]
  open_position: {
    side: 'LONG' | 'SHORT'
    opened_at: string
    entry: number | null
    mark: number | null
    qty: number | null
    stop: number | null
    pnl_net: number | null
  } | null
  risk_pauses: { scope: 'daily' | 'monthly', at: string, until: string, loss_pct: number | null }[]
}

export interface BacktestOut {
  id: number
  status: BacktestStatus
  /** Served from a saved result, nothing was computed. */
  cached: boolean
  bot_type: string
  exchange: string
  symbol: string
  timeframe: BacktestTimeframe
  period: BacktestPeriod
  start_at: string
  end_at: string
  params: Record<string, unknown>
  error: string | null
  requested_at: string | null
  started_at: string | null
  finished_at: string | null
  duration_ms: number | null
  result: BacktestResult | null
}
