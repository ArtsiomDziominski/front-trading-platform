import type { MaybeRefOrGetter } from 'vue'
import type { BotEventOut } from '#shared/types/bot'
import { parseApiError } from '~/utils/parseApiError'

/**
 * Newest events of one bot for its page: the feed and the rebuilt current cycle. 500 is the server's
 * maximum; an engine in error logs about one event a minute, which would push a smaller page past the cycle start.
 */
export const BOT_PAGE_EVENTS_LIMIT = 500

const REFRESH_DEBOUNCE_MS = 1500

/**
 * Events are not pushed over the WebSocket, so the page calls `refresh()` when the bot's own
 * fields change (status, version, position); calls are debounced because ticks come every few seconds.
 */
export function useBotEvents(botId: MaybeRefOrGetter<number>) {
  const { t } = useI18n()
  const { fetchBotHistory } = useBots()

  const events = ref<BotEventOut[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const error = ref<string | null>(null)

  let requestId = 0
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  async function load() {
    const id = toValue(botId)
    const current = ++requestId
    loading.value = true
    error.value = null

    try {
      const page = await fetchBotHistory({ bot_id: id, limit: BOT_PAGE_EVENTS_LIMIT })
      if (current !== requestId) return
      events.value = page
      loaded.value = true
    } catch (e) {
      if (current !== requestId) return
      error.value = parseApiError(e, t('bots.event_history_load_error'))
    } finally {
      if (current === requestId) loading.value = false
    }
  }

  function refresh() {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      refreshTimer = null
      void load()
    }, REFRESH_DEBOUNCE_MS)
  }

  watch(() => toValue(botId), () => {
    events.value = []
    loaded.value = false
    void load()
  })

  onScopeDispose(() => {
    if (refreshTimer) clearTimeout(refreshTimer)
    requestId += 1
  })

  return { events, loading, loaded, error, load, refresh }
}
