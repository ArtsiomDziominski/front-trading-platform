import type { MaybeRefOrGetter } from 'vue'
import type { TrendMarket, TrendMarketExchange, TrendMarketQuery } from '#shared/types/bot'
import { parseApiError } from '~/utils/parseApiError'

const DEBOUNCE_MS = 600
/** USDT-margined futures only: a partial symbol (`BTC`, `BTCUS`) is not sent at all. */
const SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/

export type TrendBadgeStatus = 'idle' | 'invalid' | 'unsupported' | 'loading' | 'ready' | 'error'

/**
 * Current trend of a pair for the trend create form (GET /market/trend), refetched with a debounce
 * whenever the query changes. `null` from the getter means "nothing to ask" (no symbol yet).
 * Exchanges other than Binance / OKX are not supported by the trend bot.
 */
export function useTrend(query: MaybeRefOrGetter<(Omit<TrendMarketQuery, 'exchange'> & { exchange: string }) | null>) {
  const { t } = useI18n()
  const { fetchMarketTrend } = useBots()

  const data = ref<TrendMarket | null>(null)
  const status = ref<TrendBadgeStatus>('idle')
  const error = ref<string | null>(null)

  let timer: ReturnType<typeof setTimeout> | null = null
  let requestId = 0

  function clearTimer() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  async function load(request: TrendMarketQuery) {
    const current = ++requestId
    status.value = 'loading'
    error.value = null
    try {
      const result = await fetchMarketTrend(request)
      if (current !== requestId) return
      data.value = result
      status.value = 'ready'
    } catch (e) {
      if (current !== requestId) return
      data.value = null
      error.value = parseApiError(e, t('bots.trend_badge_error'))
      status.value = 'error'
    }
  }

  const normalized = computed(() => {
    const value = toValue(query)
    if (!value) return null
    return { ...value, symbol: value.symbol.trim().toUpperCase() }
  })

  watch(() => JSON.stringify(normalized.value), () => {
    clearTimer()
    requestId += 1
    const value = normalized.value
    if (!value || !value.symbol) {
      data.value = null
      status.value = 'idle'
      return
    }
    if (value.exchange !== 'BINANCE' && value.exchange !== 'OKX') {
      data.value = null
      status.value = 'unsupported'
      return
    }
    if (!SYMBOL_PATTERN.test(value.symbol)) {
      data.value = null
      status.value = 'invalid'
      return
    }
    status.value = 'loading'
    // The badge is client-only: a server render would only leave a timer behind
    if (!import.meta.client) return
    const request = { ...value, exchange: value.exchange as TrendMarketExchange }
    timer = setTimeout(() => {
      timer = null
      void load(request)
    }, DEBOUNCE_MS)
  }, { immediate: true })

  function refresh() {
    const value = normalized.value
    if (!value || status.value === 'invalid' || status.value === 'unsupported' || status.value === 'idle') return
    clearTimer()
    void load({ ...value, exchange: value.exchange as TrendMarketExchange })
  }

  onScopeDispose(() => {
    clearTimer()
    requestId += 1
  })

  return { data, status, error, refresh }
}
