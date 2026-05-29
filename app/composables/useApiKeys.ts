import { parseApiError } from '~/utils/parseApiError'
import type { ApiKeyCreate, ApiKeyOut } from '#shared/types/api-key'

export const useApiKeys = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl
  const auth = useAuth()
  const nuxtApp = useNuxtApp()

  const keys = useState<ApiKeyOut[]>('user_api_keys', () => [])
  const loading = useState<boolean>('user_api_keys_loading', () => false)
  const creating = useState<boolean>('user_api_keys_creating', () => false)
  const deletingId = useState<number | null>('user_api_keys_deleting_id', () => null)
  const error = useState<string | null>('user_api_keys_error', () => null)

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

  async function fetchKeys() {
    loading.value = true
    error.value = null

    try {
      const data = await auth.authFetch<ApiKeyOut[]>(`${baseUrl}/api-keys`)
      keys.value = data
      return data
    } catch (e) {
      handleError(e)
    } finally {
      loading.value = false
    }
  }

  async function createKey(payload: ApiKeyCreate) {
    creating.value = true
    error.value = null

    try {
      const created = await auth.authFetch<ApiKeyOut>(`${baseUrl}/api-keys`, {
        method: 'POST',
        body: payload,
      })
      keys.value = [...keys.value, created]
      return created
    } catch (e) {
      handleError(e)
    } finally {
      creating.value = false
    }
  }

  async function deleteKey(keyId: number) {
    deletingId.value = keyId
    error.value = null

    try {
      await auth.authFetch(`${baseUrl}/api-keys/${keyId}`, {
        method: 'DELETE',
      })
      keys.value = keys.value.filter((key) => key.id !== keyId)
    } catch (e) {
      handleError(e)
    } finally {
      deletingId.value = null
    }
  }

  return {
    keys,
    loading,
    creating,
    deletingId,
    error,
    fetchKeys,
    createKey,
    deleteKey,
  }
}
