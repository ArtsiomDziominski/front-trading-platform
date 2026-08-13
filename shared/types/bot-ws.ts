import type { BotListOut } from './bot'

export type BotWsEventType =
  | 'bot_created'
  | 'bot_updated'
  | 'bot_stopped'
  | 'bot_closed'
  | 'bot_removed'
  | 'bot_error'
  | 'bot_grid_redeployed'
  | 'bot_config_updated'

export interface BotWsMessage {
  event: BotWsEventType
  bot_id: number
  bot?: BotListOut | null
}
