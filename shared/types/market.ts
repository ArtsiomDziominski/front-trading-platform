export interface MarketSummaryItem {
  symbol: string
  name: string
  price: string
  change: string
}


export type SpotPriceExchange = 'BINANCE' | 'OKX'

/** GET /api/spot-price: last spot price of a USDT pair from the exchange's public API. */
export interface SpotPrice {
  exchange: SpotPriceExchange
  symbol: string
  price: number
}
