import type { MaybeRefOrGetter } from 'vue'
import type { TrendChart, TrendDecision, TrendStats, TrendTrade } from '#shared/types/bot'
import { parseApiError } from '~/utils/parseApiError'

const REFRESH_DEBOUNCE_MS = 1500
export const TREND_CHART_LIMIT = 200
export const TREND_DECISIONS_LIMIT = 100
export const TREND_TRADES_LIMIT = 100

interface Resource<T> {
  data: Ref<T>
  loading: Ref<boolean>
  loaded: Ref<boolean>
  error: Ref<string | null>
}

function resource<T>(initial: T): Resource<T> {
  return {
    data: ref(initial) as Ref<T>,
    loading: ref(false),
    loaded: ref(false),
    error: ref<string | null>(null),
  }
}

/**
 * Trend bot page data that is not in GET /bots: chart, trades, stats and the decision journal.
 * None of it is pushed over the WebSocket, so the page calls `refresh()` when `bot.trend` moves
 * (a new closed candle, an entry, an add, a stop move); calls are debounced like the event feed.
 */
export function useTrendBotData(botId: MaybeRefOrGetter<number>) {
  const { t } = useI18n()
  const { fetchTrendChart, fetchTrendTrades, fetchTrendStats, fetchTrendDecisions } = useBots()

  const chart = resource<TrendChart | null>(null)
  const trades = resource<TrendTrade[]>([])
  const stats = resource<TrendStats | null>(null)
  const decisions = resource<TrendDecision[]>([])

  let requestId = 0
  let refreshTimer: ReturnType<typeof setTimeout> | null = null

  async function loadOne<T>(target: Resource<T>, request: () => Promise<T>, current: number) {
    target.loading.value = true
    try {
      const result = await request()
      if (current !== requestId) return
      target.data.value = result
      target.error.value = null
      target.loaded.value = true
    } catch (e) {
      if (current !== requestId) return
      // Keep the last good data on screen; the error says it may be stale
      target.error.value = parseApiError(e, t('bots.trend_load_error'))
      target.loaded.value = true
    } finally {
      if (current === requestId) target.loading.value = false
    }
  }

  async function load() {
    const id = toValue(botId)
    const current = ++requestId
    await Promise.all([
      loadOne(chart, () => fetchTrendChart(id, TREND_CHART_LIMIT), current),
      loadOne(trades, () => fetchTrendTrades(id, { limit: TREND_TRADES_LIMIT }), current),
      loadOne(stats, () => fetchTrendStats(id), current),
      loadOne(decisions, () => fetchTrendDecisions(id, { limit: TREND_DECISIONS_LIMIT }), current),
    ])
  }

  function refresh() {
    if (refreshTimer) clearTimeout(refreshTimer)
    refreshTimer = setTimeout(() => {
      refreshTimer = null
      void load()
    }, REFRESH_DEBOUNCE_MS)
  }

  watch(() => toValue(botId), () => {
    for (const item of [chart, trades, stats, decisions]) {
      item.loaded.value = false
      item.error.value = null
    }
    chart.data.value = null
    trades.data.value = []
    stats.data.value = null
    decisions.data.value = []
    void load()
  })

  onMounted(() => {
    void load()
  })

  onScopeDispose(() => {
    if (refreshTimer) clearTimeout(refreshTimer)
    requestId += 1
  })

  return { chart, trades, stats, decisions, load, refresh }
}
