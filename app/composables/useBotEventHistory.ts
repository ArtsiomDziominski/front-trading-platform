import type { BotEventOut, BotHistoryFilters } from '#shared/types/bot'
import { BOT_HISTORY_PAGE_SIZE } from '~/utils/botHistory'

export function useBotEventHistory() {
  const { t } = useI18n()
  const { fetchBotHistory, clearBotHistory } = useBots()

  const events = ref<BotEventOut[]>([])
  const loading = ref(false)
  const loadingMore = ref(false)
  const clearing = ref(false)
  const error = ref<string | null>(null)
  const hasMore = ref(false)
  const deletedCount = ref<number | null>(null)
  const skip = ref(0)
  const activeFilters = ref<BotHistoryFilters>({})

  async function load(filters: BotHistoryFilters, append = false) {
    if (append) {
      loadingMore.value = true
    } else {
      loading.value = true
      skip.value = 0
    }

    error.value = null
    activeFilters.value = filters

    try {
      const page = await fetchBotHistory({
        ...filters,
        skip: append ? skip.value : 0,
        limit: BOT_HISTORY_PAGE_SIZE,
      })
      events.value = append ? [...events.value, ...page] : page
      hasMore.value = page.length === BOT_HISTORY_PAGE_SIZE
      skip.value = (append ? skip.value : 0) + page.length
    } catch {
      error.value = t('bots.event_history_load_error')
      if (!append) events.value = []
    } finally {
      loading.value = false
      loadingMore.value = false
    }
  }

  function loadMore() {
    if (loading.value || loadingMore.value || !hasMore.value) return
    return load(activeFilters.value, true)
  }

  async function clear(filters: BotHistoryFilters) {
    clearing.value = true
    error.value = null

    try {
      const result = await clearBotHistory(filters)
      await load(filters)
      deletedCount.value = result.deleted
      return result
    } catch {
      error.value = t('bots.event_history_clear_error')
      throw new Error('clear failed')
    } finally {
      clearing.value = false
    }
  }

  return {
    events,
    loading,
    loadingMore,
    clearing,
    error,
    hasMore,
    deletedCount,
    load,
    loadMore,
    clear,
  }
}
