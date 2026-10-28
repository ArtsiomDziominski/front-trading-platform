import type { MaybeRefOrGetter } from 'vue'
import type { SpotPrice, SpotPriceExchange } from '#shared/types/market'
import { getApiErrorStatus } from '~/utils/parseApiError'

const DEBOUNCE_MS = 600
/** Refreshes the preview price while the form is open. */
const REFRESH_MS = 30_000
/** USDT spot pairs only: a partial symbol (`BTC`, `BTCUS`) is not sent at all. */
const SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/

export type SpotPriceStatus = 'idle' | 'loading' | 'ready' | 'not_found' | 'error'

/**
 * Last spot price of a pair for the DCA create form preview (GET /api/spot-price, public exchange data),
 * refetched with a debounce whenever the pair or the exchange changes. Client-only: nothing runs on SSR.
 */
export function useSpotPrice(query: MaybeRefOrGetter<{ exchange: string, symbol: string } | null>) {
  const data = ref<SpotPrice | null>(null)
  const status = ref<SpotPriceStatus>('idle')

  let timer: ReturnType<typeof setTimeout> | null = null
  let refreshTimer: ReturnType<typeof setInterval> | null = null
  let requestId = 0

  const normalized = computed(() => {
    const value = toValue(query)
    if (!value) return null
    const symbol = value.symbol.trim().toUpperCase()
    if (!SYMBOL_PATTERN.test(symbol)) return null
    const exchange: SpotPriceExchange = value.exchange === 'OKX' ? 'OKX' : 'BINANCE'
    return { exchange, symbol }
  })

  function clearTimers() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    if (refreshTimer) {
      clearInterval(refreshTimer)
      refreshTimer = null
    }
  }

  async function load(request: { exchange: SpotPriceExchange, symbol: string }, quiet = false) {
    const current = ++requestId
    if (!quiet) status.value = 'loading'
    try {
      const result = await $fetch<SpotPrice>('/api/spot-price', { query: request })
      if (current !== requestId) return
      data.value = result
      status.value = 'ready'
    } catch (e) {
      if (current !== requestId) return
      // A background refresh keeps the last known price on a network blip
      if (quiet && data.value) return
      data.value = null
      status.value = getApiErrorStatus(e) === 404 ? 'not_found' : 'error'
    }
  }

  watch(() => JSON.stringify(normalized.value), () => {
    clearTimers()
    requestId += 1
    const value = normalized.value
    data.value = null
    if (!value) {
      status.value = 'idle'
      return
    }
    status.value = 'loading'
    if (!import.meta.client) return
    timer = setTimeout(() => {
      timer = null
      void load(value)
      refreshTimer = setInterval(() => void load(value, true), REFRESH_MS)
    }, DEBOUNCE_MS)
  }, { immediate: true })

  onScopeDispose(() => {
    clearTimers()
    requestId += 1
  })

  return { data, status }
}
