export type TelegramNotificationId =
  | 'bot_created'
  | 'bot_stopped'
  | 'bot_closed'
  | 'bot_grid_redeployed'
  | 'bot_removed'
  | 'bot_config_updated'
  | 'profit_alert'

/** @deprecated Use TelegramNotificationId */
export type TelegramNotificationType = TelegramNotificationId

export type TelegramNotificationPrefs = Record<TelegramNotificationId, boolean>

export type TelegramNotificationPrefsUpdate = {
  [K in TelegramNotificationId]?: boolean | null
}

export interface TelegramNotificationItem {
  id: TelegramNotificationId
  label: string
  enabled: boolean
}

export interface UserSettings {
  telegram_linked: boolean
  telegram_notifications_enabled: boolean
  telegram_notification_prefs: TelegramNotificationPrefs
  telegram_notifications: TelegramNotificationItem[]
  /** ROE % threshold; null = off */
  telegram_profit_alert_percent: number | null
  /** Unrealized PnL USDT threshold; null = off */
  telegram_profit_alert_usd: number | null
}

export interface UserSettingsUpdate {
  telegram_notifications_enabled?: boolean | null
  telegram_notification_prefs?: TelegramNotificationPrefsUpdate | null
  telegram_profit_alert_percent?: number | null
  telegram_profit_alert_usd?: number | null
}

export interface TelegramLinkCode {
  code?: string
  link_code?: string
  expires_at?: string
  expires_in?: number
  bot_username?: string
}
