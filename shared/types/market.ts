export interface MarketSummaryItem {
  symbol: string
  name: string
  price: string
  change: `${'+' | '-'}${number}.${number}%`
}

