export type BotType =
  | 'GRID_FUTURES'
  | 'GRID_SPOT'
  | 'DCA_FUTURES'
  | 'DCA_SPOT'
  | 'CUSTOM'

export type BotLifecycleStatus = 'ACTIVE' | 'STOPPED' | 'CLOSED'

export type EngineState = 'INIT' | 'RUNNING' | 'STOPPED' | 'RESTARTING' | 'ERROR'

export type PositionSide = 'LONG' | 'SHORT'

export type GridDirection = 'LONG' | 'SHORT'

export type VolumeMode = 'linear' | 'exponential' | 'fixed'

export interface GridFuturesConfig {
  symbol: string
  direction: GridDirection
  initial_amount: string | number
  grid_orders_count: number
  grid_step_percent: string | number
  volume_mode: VolumeMode
  start_price?: string | number | null
  auto_restart?: boolean
}

export interface BotCreate {
  api_key_id: number
  bot_type?: BotType
  config: GridFuturesConfig
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
}

export interface BotListItem extends BotListOut {
  exchange?: string
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
