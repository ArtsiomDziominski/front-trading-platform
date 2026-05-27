import type { MarketSummaryItem } from '~~/shared/types/market'

export const useMarketSummary = () =>
  useFetch<MarketSummaryItem[]>('/api/market-summary', {
    default: () => [],
  })

