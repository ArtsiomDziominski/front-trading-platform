import type { MarketSummaryItem } from '~~/shared/types/market'

const BINANCE_API = 'https://api.binance.com/api/v3'

const WATCHED_SYMBOLS = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'] as const

const SYMBOL_NAMES: Record<(typeof WATCHED_SYMBOLS)[number], string> = {
  BTCUSDT: 'Bitcoin / Tether',
  ETHUSDT: 'Ethereum / Tether',
  SOLUSDT: 'Solana / Tether',
}

interface BinanceTicker24hr {
  symbol: string
  lastPrice: string
  priceChangePercent: string
}

function formatPrice(value: string): string {
  const num = Number(value)
  if (!Number.isFinite(num)) return value

  const fractionDigits = num >= 100 ? 2 : num >= 1 ? 2 : 4

  return num.toLocaleString('en-US', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

function formatChange(percent: string): string {
  const num = Number(percent)
  if (!Number.isFinite(num)) return '0.00%'

  const sign = num > 0 ? '+' : num < 0 ? '' : '+'
  return `${sign}${num.toFixed(2)}%`
}

function mapTicker(ticker: BinanceTicker24hr): MarketSummaryItem | null {
  const symbol = ticker.symbol as (typeof WATCHED_SYMBOLS)[number]
  const name = SYMBOL_NAMES[symbol]

  if (!name) return null

  return {
    symbol,
    name,
    price: formatPrice(ticker.lastPrice),
    change: formatChange(ticker.priceChangePercent),
  }
}

export async function fetchBinanceMarketSummary(): Promise<MarketSummaryItem[]> {
  const symbols = encodeURIComponent(JSON.stringify(WATCHED_SYMBOLS))
  const url = `${BINANCE_API}/ticker/24hr?symbols=${symbols}`

  const tickers = await $fetch<BinanceTicker24hr[]>(url, {
    headers: { Accept: 'application/json' },
  })

  const bySymbol = new Map(
    tickers
      .map(mapTicker)
      .filter((item): item is MarketSummaryItem => item !== null)
      .map((item) => [item.symbol, item]),
  )

  return WATCHED_SYMBOLS
    .map((symbol) => bySymbol.get(symbol))
    .filter((item): item is MarketSummaryItem => item !== undefined)
}
