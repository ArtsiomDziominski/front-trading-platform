import type { MarketSummaryItem } from '~~/shared/types/market'

export function useMarketSummary() {
  const fetchResult = useFetch<MarketSummaryItem[]>('/api/market-summary')

  const market = computed<MarketSummaryItem[]>(() => fetchResult.data.value ?? [])

  return {
    market,
    status: fetchResult.status,
    error: fetchResult.error,
    refresh: fetchResult.refresh,
  }
}
