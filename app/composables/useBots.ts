import { parseApiError } from '~/utils/parseApiError'
import { buildBotsWebSocketUrl } from '~/utils/wsUrl'
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotWsMessage } from '#shared/types/bot-ws'
import type { BotCreate, BotLifecycleStatus, BotListItem, BotListOut, BotOut } from '#shared/types/bot'

function formatExchange(exchange: ApiKeyOut['exchange']): string {
  if (exchange === 'OTHER') return 'Other'
  return exchange.charAt(0) + exchange.slice(1).toLowerCase()
}

function enrichBot(bot: BotListOut, exchangeByKeyId: Map<number, string>): BotListItem {
  return {
    ...bot,
    exchange: exchangeByKeyId.get(bot.api_key_id),
  }
}

function enrichBots(bots: BotListOut[], apiKeys: ApiKeyOut[]): BotListItem[] {
  const exchangeByKeyId = new Map(apiKeys.map((key) => [key.id, formatExchange(key.exchange)]))
  return bots.map((bot) => enrichBot(bot, exchangeByKeyId))
}

const WS_RECONNECT_BASE_MS = 2000
const WS_RECONNECT_MAX_MS = 30000

let socket: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let reconnectAttempt = 0

export const useBots = () => {
  const config = useRuntimeConfig()
  const baseUrl = config.public.apiBaseUrl
  const auth = useAuth()
  const nuxtApp = useNuxtApp()
  const accessToken = useCookie<string | null>('access_token')

  const bots = useState<BotListItem[]>('user_bots', () => [])
  const loading = useState<boolean>('user_bots_loading', () => false)
  const creating = useState<boolean>('user_bots_creating', () => false)
  const error = useState<string | null>('user_bots_error', () => null)
  const createError = useState<string | null>('user_bots_create_error', () => null)
  const apiKeysCache = useState<ApiKeyOut[]>('user_bots_api_keys', () => [])
  const lifecycleFilter = useState<BotLifecycleStatus[] | undefined>('user_bots_lifecycle_filter', () => undefined)
  const wsSubscribers = useState('user_bots_ws_subscribers', () => 0)
  const wsConnected = useState('user_bots_ws_connected', () => false)

  function errorFallback(): string {
    const i18n = nuxtApp.$i18n
    if (i18n && typeof i18n.t === 'function') {
      return i18n.t('bots.load_error')
    }
    return 'Failed to load bots'
  }

  function createErrorFallback(): string {
    const i18n = nuxtApp.$i18n
    if (i18n && typeof i18n.t === 'function') {
      return i18n.t('bots.create_error')
    }
    return 'Failed to create bot'
  }

  function matchesFilter(bot: BotListOut): boolean {
    if (!lifecycleFilter.value?.length) return true
    return lifecycleFilter.value.includes(bot.lifecycle_status)
  }

  function shouldRemoveBot(message: BotWsMessage): boolean {
    if (message.event === 'bot_removed') return true
    return Boolean(message.bot?.deleted_at)
  }

  function applyBotMessage(message: BotWsMessage) {
    const botId = message.bot?.id ?? message.bot_id

    if (shouldRemoveBot(message)) {
      bots.value = bots.value.filter((b) => b.id !== botId)
      return
    }

    if (!message.bot) return

    const exchangeByKeyId = new Map(
      apiKeysCache.value.map((key) => [key.id, formatExchange(key.exchange)]),
    )
    const enriched = enrichBot(message.bot, exchangeByKeyId)
    const index = bots.value.findIndex((b) => b.id === enriched.id)

    if (!matchesFilter(message.bot)) {
      if (index >= 0) {
        bots.value = bots.value.filter((b) => b.id !== enriched.id)
      }
      return
    }

    if (index >= 0) {
      const next = [...bots.value]
      next[index] = enriched
      bots.value = next
    } else {
      bots.value = [...bots.value, enriched]
    }
  }

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
  }

  function scheduleReconnect() {
    if (!import.meta.client || wsSubscribers.value <= 0) return
    clearReconnectTimer()
    const delay = Math.min(WS_RECONNECT_BASE_MS * 2 ** reconnectAttempt, WS_RECONNECT_MAX_MS)
    reconnectAttempt++
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      openSocket()
    }, delay)
  }

  async function openSocket() {
    if (!import.meta.client || wsSubscribers.value <= 0) return

    let token = accessToken.value
    if (!token) {
      const ok = await auth.ensureSession()
      if (!ok) return
      token = accessToken.value
    }
    if (!token) return

    if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
      return
    }

    socket?.close()
    socket = new WebSocket(buildBotsWebSocketUrl(baseUrl, token))

    socket.onopen = () => {
      reconnectAttempt = 0
      wsConnected.value = true
    }

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as BotWsMessage
        if (data?.event && typeof data.bot_id === 'number') {
          applyBotMessage(data)
        }
      } catch {
        // ignore malformed frames
      }
    }

    socket.onclose = () => {
      socket = null
      wsConnected.value = false
      scheduleReconnect()
    }

    socket.onerror = () => {
      socket?.close()
    }
  }

  function closeSocket() {
    clearReconnectTimer()
    reconnectAttempt = 0
    socket?.close()
    socket = null
    wsConnected.value = false
  }

  function subscribeBotsUpdates(): () => void {
    if (!import.meta.client) {
      return () => {}
    }

    wsSubscribers.value++
    openSocket()

    return () => {
      wsSubscribers.value = Math.max(0, wsSubscribers.value - 1)
      if (wsSubscribers.value === 0) {
        closeSocket()
      }
    }
  }

  async function fetchApiKeys() {
    const keys = await auth.authFetch<ApiKeyOut[]>(`${baseUrl}/api-keys`)
    apiKeysCache.value = keys
    return keys
  }

  async function fetchBots(lifecycleStatus?: BotLifecycleStatus[]) {
    lifecycleFilter.value = lifecycleStatus
    loading.value = true
    error.value = null

    try {
      const query = lifecycleStatus?.length
        ? { lifecycle_status: lifecycleStatus }
        : undefined

      const [list, apiKeys] = await Promise.all([
        auth.authFetch<BotListOut[]>(`${baseUrl}/bots`, { query }),
        fetchApiKeys(),
      ])

      bots.value = enrichBots(list, apiKeys)
      return bots.value
    } catch (e) {
      error.value = parseApiError(e, errorFallback())
      bots.value = []
      return []
    } finally {
      loading.value = false
    }
  }

  async function createBot(payload: BotCreate) {
    creating.value = true
    createError.value = null

    try {
      return await auth.authFetch<BotOut>(`${baseUrl}/bots`, {
        method: 'POST',
        body: payload,
      })
    } catch (e) {
      createError.value = parseApiError(e, createErrorFallback())
      throw e
    } finally {
      creating.value = false
    }
  }

  return {
    bots,
    loading,
    creating,
    error,
    createError,
    wsConnected,
    fetchBots,
    fetchApiKeys,
    createBot,
    subscribeBotsUpdates,
  }
}
