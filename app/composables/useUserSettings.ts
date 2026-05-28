import { parseApiError } from '~/utils/parseApiError'
import type {
  TelegramLinkCode,
  TelegramNotificationPrefsUpdate,
  UserSettings,
  UserSettingsUpdate,
} from '#shared/types/user-settings'

export const useUserSettings = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl
  const auth = useAuth()
  const nuxtApp = useNuxtApp()

  const settings = useState<UserSettings | null>('user_settings', () => null)
  const loading = useState<boolean>('user_settings_loading', () => false)
  const linkCodeLoading = useState<boolean>('telegram_link_code_loading', () => false)
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

  async function fetchSettings() {
    loading.value = true
    error.value = null

    try {
      const data = await auth.authFetch<UserSettings>(`${baseUrl}/user/settings`)
      settings.value = data
      return data
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
      settings.value = data

      if (auth.user.value) {
        auth.user.value = {
          ...auth.user.value,
          telegram_notifications_enabled: data.telegram_notifications_enabled,
        }
      }

      return data
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
    error,
    fetchSettings,
    updateSettings,
    requestLinkCode,
    sendTestMessage,
    buildPrefsUpdate,
  }
}
