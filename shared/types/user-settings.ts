export type TelegramNotificationType =
  | 'bot_created'
  | 'bot_stopped'
  | 'bot_closed'
  | 'bot_grid_redeployed'
  | 'bot_removed'
  | 'bot_config_updated'

export interface TelegramNotificationPrefs {
  bot_created: boolean
  bot_stopped: boolean
  bot_closed: boolean
  bot_grid_redeployed: boolean
  bot_removed: boolean
  bot_config_updated: boolean
}

export type TelegramNotificationPrefsUpdate = {
  [K in keyof TelegramNotificationPrefs]?: boolean | null
}

export interface TelegramNotificationItem {
  id: TelegramNotificationType
  label: string
  enabled: boolean
}

export interface UserSettings {
  telegram_linked: boolean
  telegram_notifications_enabled: boolean
  telegram_notification_prefs: TelegramNotificationPrefs
  telegram_notifications: TelegramNotificationItem[]
}

export interface UserSettingsUpdate {
  telegram_notifications_enabled?: boolean | null
  telegram_notification_prefs?: TelegramNotificationPrefsUpdate | null
}

export interface TelegramLinkCode {
  code?: string
  link_code?: string
  expires_at?: string
  expires_in?: number
  bot_username?: string
}
