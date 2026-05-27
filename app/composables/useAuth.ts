import { parseApiError } from '~/utils/parseApiError'

export interface AuthUser {
  id: number
  email: string
  name: string | null
  role: 'USER' | 'VIP' | 'SUPPORT' | 'ADMIN' | 'SUPERADMIN'
  is_active: boolean
  telegram_notifications_enabled: boolean
}

export interface UserUpdatePayload {
  name?: string | null
  telegram_notifications_enabled?: boolean | null
}

interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
}

export interface TelegramAuthPayload {
  id: number
  first_name?: string | null
  last_name?: string | null
  username?: string | null
  photo_url?: string | null
  auth_date: number
  hash: string
}

interface GoogleAuthUrlResponse {
  url?: string
  authorization_url?: string
}

const cookieOptions = {
  sameSite: 'lax' as const,
  secure: !import.meta.dev,
}

export const useAuth = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl
  const nuxtApp = useNuxtApp()

  const accessToken = useCookie<string | null>('access_token', {
    maxAge: 60 * 15,
    ...cookieOptions,
  })

  const refreshToken = useCookie<string | null>('refresh_token', {
    maxAge: 60 * 60 * 24 * 30,
    ...cookieOptions,
  })

  const user = useState<AuthUser | null>('auth_user', () => null)
  const loading = useState<boolean>('auth_loading', () => false)
  const error = useState<string | null>('auth_error', () => null)

  const loggedIn = computed(() => !!user.value)

  function authHeaders(): Record<string, string> {
    if (!accessToken.value) return {}
    return { Authorization: `Bearer ${accessToken.value}` }
  }

  function authErrorFallback(): string {
    const i18n = nuxtApp.$i18n
    if (i18n && typeof i18n.t === 'function') {
      return i18n.t('auth.error_unknown')
    }
    return 'An error occurred'
  }

  function handleAuthError(e: unknown) {
    error.value = parseApiError(e, authErrorFallback())
    throw e
  }

  async function fetchUser() {
    if (!accessToken.value) {
      user.value = null
      return null
    }

    try {
      const data = await $fetch<AuthUser>(`${baseUrl}/user/me`, {
        headers: authHeaders(),
      })
      user.value = data
      return data
    } catch {
      const refreshed = await tryRefresh()
      if (refreshed) {
        try {
          const data = await $fetch<AuthUser>(`${baseUrl}/user/me`, {
            headers: authHeaders(),
          })
          user.value = data
          return data
        } catch {
          user.value = null
          return null
        }
      }
      user.value = null
      return null
    }
  }

  async function tryRefresh(): Promise<boolean> {
    if (!refreshToken.value) return false

    try {
      const data = await $fetch<TokenResponse>(`${baseUrl}/auth/refresh`, {
        method: 'POST',
        body: { refresh_token: refreshToken.value },
      })
      accessToken.value = data.access_token
      refreshToken.value = data.refresh_token
      return true
    } catch {
      clearTokens()
      return false
    }
  }

  function setTokens(data: TokenResponse) {
    accessToken.value = data.access_token
    refreshToken.value = data.refresh_token
  }

  function clearTokens() {
    accessToken.value = null
    refreshToken.value = null
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<TokenResponse>(`${baseUrl}/auth/login`, {
        method: 'POST',
        body: { email, password },
      })
      setTokens(data)
      await fetchUser()
    } catch (e) {
      handleAuthError(e)
    } finally {
      loading.value = false
    }
  }

  async function register(email: string, password: string, name?: string) {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<TokenResponse>(`${baseUrl}/auth/register`, {
        method: 'POST',
        body: { email, password, name: name || null },
      })
      setTokens(data)
      await fetchUser()
    } catch (e) {
      handleAuthError(e)
    } finally {
      loading.value = false
    }
  }

  async function startGoogleLogin() {
    if (!import.meta.client) return

    loading.value = true
    error.value = null

    try {
      const data = await $fetch<GoogleAuthUrlResponse>(`${baseUrl}/auth/google`)
      const url = data.url ?? data.authorization_url

      if (!url) {
        throw new Error('Missing Google auth URL')
      }

      window.location.href = url
    } catch (e) {
      handleAuthError(e)
    } finally {
      loading.value = false
    }
  }

  async function completeGoogleLogin(code: string, redirectUri: string) {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<TokenResponse>(`${baseUrl}/auth/google`, {
        method: 'POST',
        body: {
          code,
          redirect_uri: redirectUri,
        },
      })
      setTokens(data)
      await fetchUser()
    } catch (e) {
      handleAuthError(e)
    } finally {
      loading.value = false
    }
  }

  async function loginWithTelegram(payload: TelegramAuthPayload) {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<TokenResponse>(`${baseUrl}/auth/telegram`, {
        method: 'POST',
        body: payload,
      })
      setTokens(data)
      await fetchUser()
    } catch (e) {
      handleAuthError(e)
    } finally {
      loading.value = false
    }
  }

  async function requestPasswordReset(email: string) {
    loading.value = true
    error.value = null

    try {
      await $fetch(`${baseUrl}/auth/reset-password`, {
        method: 'POST',
        body: { email },
      })
    } catch (e) {
      handleAuthError(e)
    } finally {
      loading.value = false
    }
  }

  async function confirmPasswordReset(token: string, newPassword: string) {
    loading.value = true
    error.value = null

    try {
      await $fetch(`${baseUrl}/auth/reset-password/confirm`, {
        method: 'POST',
        body: { token, new_password: newPassword },
      })
    } catch (e) {
      handleAuthError(e)
    } finally {
      loading.value = false
    }
  }

  async function updateProfile(payload: UserUpdatePayload) {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<AuthUser>(`${baseUrl}/user/update`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: payload,
      })
      user.value = data
      return data
    } catch (e) {
      handleAuthError(e)
    } finally {
      loading.value = false
    }
  }

  function logout() {
    user.value = null
    clearTokens()
  }

  return {
    user,
    loading,
    error,
    loggedIn,
    login,
    register,
    logout,
    fetchUser,
    startGoogleLogin,
    completeGoogleLogin,
    loginWithTelegram,
    requestPasswordReset,
    confirmPasswordReset,
    updateProfile,
    authHeaders,
  }
}
