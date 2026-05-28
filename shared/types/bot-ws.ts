import type { BotListOut } from './bot'

export type BotWsEventType =
  | 'bot_created'
  | 'bot_updated'
  | 'bot_stopped'
  | 'bot_closed'
  | 'bot_removed'
  | 'bot_error'

export interface BotWsMessage {
  event: BotWsEventType
  bot_id: number
  bot?: BotListOut | null
}
