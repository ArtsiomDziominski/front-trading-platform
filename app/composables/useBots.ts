import { parseApiError } from '~/utils/parseApiError'
import { buildBotsWebSocketUrl } from '~/utils/wsUrl'
import type { ApiKeyOut } from '#shared/types/api-key'
import type { BotWsMessage } from '#shared/types/bot-ws'
import type { BotCreate, BotCreationLogOut, BotEventOut, BotLifecycleStatus, BotListItem, BotListOut, BotOut, BotsCloseAllResponse, BotsRemoveAllResponse, BotsStopAllResponse, LiquidationCheckOut, LiquidationCheckRequest } from '#shared/types/bot'

function enrichBot(bot: BotListOut, exchangeByKeyId: Map<number, ApiKeyOut['exchange']>): BotListItem {
  return {
    ...bot,
    exchange: exchangeByKeyId.get(bot.api_key_id),
  }
}

function enrichBots(bots: BotListOut[], apiKeys: ApiKeyOut[]): BotListItem[] {
  const exchangeByKeyId = new Map(apiKeys.map((key) => [key.id, key.exchange]))
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

  function applyBotFromOut(updated: BotOut) {
    if (updated.deleted_at) {
      bots.value = bots.value.filter((b) => b.id !== updated.id)
      return
    }

    const existing = bots.value.find((b) => b.id === updated.id)
    const listOut: BotListOut = {
      ...(existing ?? {}),
      ...updated,
      position_side: existing?.position_side ?? null,
      position_size: existing?.position_size ?? null,
      entry_price: existing?.entry_price ?? null,
      mark_price: existing?.mark_price ?? null,
      unrealized_pnl: existing?.unrealized_pnl ?? null,
      pnl_percent: existing?.pnl_percent ?? null,
    }

    const exchangeByKeyId = new Map(
      apiKeysCache.value.map((key) => [key.id, key.exchange]),
    )
    const enriched = enrichBot(listOut, exchangeByKeyId)
    const index = bots.value.findIndex((b) => b.id === enriched.id)

    if (!matchesFilter(listOut)) {
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

  function actionErrorFallback(): string {
    const i18n = nuxtApp.$i18n
    if (i18n && typeof i18n.t === 'function') {
      return i18n.t('bots.action_error')
    }
    return 'Action failed'
  }

  const actionLoading = useState<Record<number, string>>('user_bots_action_loading', () => ({}))
  const actionErrors = useState<Record<number, string | null>>('user_bots_action_errors', () => ({}))

  async function runBotAction(botId: number, actionKey: string, request: () => Promise<BotOut>) {
    actionLoading.value = { ...actionLoading.value, [botId]: actionKey }
    actionErrors.value = { ...actionErrors.value, [botId]: null }

    try {
      const result = await request()
      applyBotFromOut(result)
      return result
    } catch (e) {
      actionErrors.value = {
        ...actionErrors.value,
        [botId]: parseApiError(e, actionErrorFallback()),
      }
      throw e
    } finally {
      const nextLoading = { ...actionLoading.value }
      delete nextLoading[botId]
      actionLoading.value = nextLoading
    }
  }

  function stopBot(botId: number) {
    return runBotAction(botId, 'stop', () =>
      auth.authFetch<BotOut>(`${baseUrl}/bots/${botId}/stop`, { method: 'POST' }),
    )
  }

  function closeBot(botId: number) {
    return runBotAction(botId, 'close', () =>
      auth.authFetch<BotOut>(`${baseUrl}/bots/${botId}/close`, { method: 'POST' }),
    )
  }

  function redeployBotGrid(botId: number) {
    return runBotAction(botId, 'redeploy', () =>
      auth.authFetch<BotOut>(`${baseUrl}/bots/${botId}/redeploy-grid`, { method: 'POST' }),
    )
  }

  function removeBot(botId: number) {
    return runBotAction(botId, 'remove', () =>
      auth.authFetch<BotOut>(`${baseUrl}/bots/${botId}`, { method: 'DELETE' }),
    )
  }

  function isBotActionLoading(botId: number, actionKey?: string): boolean {
    const current = actionLoading.value[botId]
    if (!current) return false
    return actionKey ? current === actionKey : true
  }

  function getBotActionError(botId: number): string | null {
    return actionErrors.value[botId] ?? null
  }

  function clearBotActionError(botId: number) {
    if (actionErrors.value[botId]) {
      actionErrors.value = { ...actionErrors.value, [botId]: null }
    }
  }

  function applyBotMessage(message: BotWsMessage) {
    const botId = message.bot?.id ?? message.bot_id

    if (shouldRemoveBot(message)) {
      bots.value = bots.value.filter((b) => b.id !== botId)
      return
    }

    if (!message.bot) return

    const exchangeByKeyId = new Map(
      apiKeysCache.value.map((key) => [key.id, key.exchange]),
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

  const bulkActionLoading = useState<string | null>('user_bots_bulk_action_loading', () => null)
  const bulkActionError = useState<string | null>('user_bots_bulk_action_error', () => null)
  const bulkActionFailures = useState<{ action: string, items: { bot_id: number, detail: string }[] } | null>(
    'user_bots_bulk_action_failures',
    () => null,
  )

  function applyBulkBotsResult(botsUpdated: BotOut[]) {
    for (const bot of botsUpdated) {
      applyBotFromOut(bot)
    }
  }

  async function runBulkAction<T extends { failed: { bot_id: number, detail: string }[] }>(
    actionKey: string,
    request: () => Promise<T>,
    getUpdated: (response: T) => BotOut[],
  ) {
    bulkActionLoading.value = actionKey
    bulkActionError.value = null
    bulkActionFailures.value = null

    try {
      const response = await request()
      applyBulkBotsResult(getUpdated(response))

      if (response.failed.length > 0) {
        bulkActionFailures.value = { action: actionKey, items: response.failed }
      }

      return response
    } catch (e) {
      bulkActionError.value = parseApiError(e, actionErrorFallback())
      throw e
    } finally {
      bulkActionLoading.value = null
    }
  }

  function stopAllBots() {
    return runBulkAction(
      'stop-all',
      () => auth.authFetch<BotsStopAllResponse>(`${baseUrl}/bots/stop-all`, { method: 'POST' }),
      (response) => response.stopped,
    )
  }

  function closeAllBots() {
    return runBulkAction(
      'close-all',
      () => auth.authFetch<BotsCloseAllResponse>(`${baseUrl}/bots/close-all`, { method: 'POST' }),
      (response) => response.closed,
    )
  }

  function removeAllBots() {
    return runBulkAction(
      'remove-all',
      () => auth.authFetch<BotsRemoveAllResponse>(`${baseUrl}/bots/remove-all`, { method: 'POST' }),
      (response) => response.removed,
    )
  }

  function clearBulkActionFeedback() {
    bulkActionError.value = null
    bulkActionFailures.value = null
  }

  async function fetchCreationHistory(limit = 20) {
    return auth.authFetch<BotCreationLogOut[]>(`${baseUrl}/bots/creation-history`, {
      query: { limit },
    })
  }

  async function fetchBotHistory(botId?: number) {
    return auth.authFetch<BotEventOut[]>(`${baseUrl}/bots/history`, {
      query: botId != null ? { bot_id: botId } : undefined,
    })
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

  const liquidationChecking = useState<boolean>('user_bots_liquidation_checking', () => false)
  const liquidationError = useState<string | null>('user_bots_liquidation_error', () => null)

  function liquidationErrorFallback(): string {
    const i18n = nuxtApp.$i18n
    if (i18n && typeof i18n.t === 'function') {
      return i18n.t('bots.liquidation_check_error')
    }
    return 'Failed to check liquidation'
  }

  async function checkLiquidation(payload: LiquidationCheckRequest) {
    liquidationChecking.value = true
    liquidationError.value = null

    try {
      return await auth.authFetch<LiquidationCheckOut>(`${baseUrl}/bots/check-liquidation`, {
        method: 'POST',
        body: payload,
      })
    } catch (e) {
      liquidationError.value = parseApiError(e, liquidationErrorFallback())
      throw e
    } finally {
      liquidationChecking.value = false
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
    fetchCreationHistory,
    fetchBotHistory,
    createBot,
    liquidationChecking,
    liquidationError,
    checkLiquidation,
    subscribeBotsUpdates,
    stopBot,
    closeBot,
    redeployBotGrid,
    removeBot,
    isBotActionLoading,
    getBotActionError,
    clearBotActionError,
    bulkActionLoading,
    bulkActionError,
    bulkActionFailures,
    stopAllBots,
    closeAllBots,
    removeAllBots,
    clearBulkActionFeedback,
  }
}
