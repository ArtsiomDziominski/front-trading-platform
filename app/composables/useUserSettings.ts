import { parseApiError } from '~/utils/parseApiError'
import type {
  TelegramLinkCode,
  TelegramNotificationPrefsUpdate,
  UserSettings,
  UserSettingsUpdate,
} from '#shared/types/user-settings'

function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n) || n === 0) return null
  return n
}

function normalizeSettings(data: UserSettings): UserSettings {
  return {
    ...data,
    telegram_profit_alert_percent: toNullableNumber(data.telegram_profit_alert_percent),
    telegram_profit_alert_usd: toNullableNumber(data.telegram_profit_alert_usd),
  }
}

export const useUserSettings = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl
  const auth = useAuth()
  const nuxtApp = useNuxtApp()

  const settings = useState<UserSettings | null>('user_settings', () => null)
  const loading = useState<boolean>('user_settings_loading', () => false)
  const linkCodeLoading = useState<boolean>('telegram_link_code_loading', () => false)
  const unlinkLoading = useState<boolean>('telegram_unlink_loading', () => false)
  const error = useState<string | null>('user_settings_error', () => null)

  function errorFallback(): string {
    const i18n = nuxtApp.$i18n
    if (i18n && typeof i18n.t === 'function') {
      return i18n.t('auth.error_unknown')
    }
    return 'An error occurred'
  }

  function handleError(e: unknown) {
    error.value = parseApiError(e, errorFallback())
    throw e
  }

  function applySettings(data: UserSettings) {
    const normalized = normalizeSettings(data)
    settings.value = normalized

    if (auth.user.value) {
      auth.user.value = {
        ...auth.user.value,
        telegram_notifications_enabled: normalized.telegram_notifications_enabled,
      }
    }

    return normalized
  }

  async function fetchSettings() {
    loading.value = true
    error.value = null

    try {
      const data = await auth.authFetch<UserSettings>(`${baseUrl}/user/settings`)
      return applySettings(data)
    } catch (e) {
      handleError(e)
    } finally {
      loading.value = false
    }
  }

  async function updateSettings(payload: UserSettingsUpdate) {
    loading.value = true
    error.value = null

    try {
      const data = await auth.authFetch<UserSettings>(`${baseUrl}/user/settings`, {
        method: 'PATCH',
        body: payload,
      })
      return applySettings(data)
    } catch (e) {
      handleError(e)
    } finally {
      loading.value = false
    }
  }

  async function requestLinkCode(): Promise<TelegramLinkCode | undefined> {
    linkCodeLoading.value = true
    error.value = null

    try {
      return await auth.authFetch<TelegramLinkCode>(`${baseUrl}/user/telegram/link-code`, {
        method: 'POST',
      })
    } catch (e) {
      handleError(e)
    } finally {
      linkCodeLoading.value = false
    }
  }

  async function sendTestMessage(message: string) {
    loading.value = true
    error.value = null

    try {
      await auth.authFetch(`${baseUrl}/user/telegram/send`, {
        method: 'POST',
        body: { message },
      })
    } catch (e) {
      handleError(e)
    } finally {
      loading.value = false
    }
  }

  async function unlinkTelegram(): Promise<UserSettings | undefined> {
    unlinkLoading.value = true
    error.value = null

    try {
      const data = await auth.authFetch<UserSettings>(`${baseUrl}/user/telegram`, {
        method: 'DELETE',
      })
      return applySettings(data)
    } catch (e) {
      handleError(e)
    } finally {
      unlinkLoading.value = false
    }
  }

  function buildPrefsUpdate(
    items: { id: keyof TelegramNotificationPrefsUpdate & string, enabled: boolean }[],
  ): TelegramNotificationPrefsUpdate {
    const prefs: TelegramNotificationPrefsUpdate = {}
    for (const item of items) {
      prefs[item.id] = item.enabled
    }
    return prefs
  }

  return {
    settings,
    loading,
    linkCodeLoading,
    unlinkLoading,
    error,
    fetchSettings,
    updateSettings,
    requestLinkCode,
    sendTestMessage,
    unlinkTelegram,
    buildPrefsUpdate,
  }
}
