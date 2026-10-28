import type { SpotPrice, SpotPriceExchange } from '~~/shared/types/market'

const BINANCE_TICKER_URL = 'https://api.binance.com/api/v3/ticker/price'
const OKX_TICKER_URL = 'https://www.okx.com/api/v5/market/ticker'

/** USDT spot pairs only; anything else is never sent to the exchange. */
export const SPOT_SYMBOL_PATTERN = /^[A-Z0-9]{2,20}USDT$/

interface BinanceTickerPrice {
  symbol: string
  price: string
}

interface OkxTickerResponse {
  code: string
  data?: { instId: string, last: string }[]
}

function positivePrice(raw: string | undefined): number | null {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0 ? value : null
}

/** Last price of a USDT spot pair (public endpoints, no API key); `null` when the exchange has no such pair. */
export async function fetchSpotPrice(exchange: SpotPriceExchange, symbol: string): Promise<SpotPrice | null> {
  if (exchange === 'OKX') {
    const instId = `${symbol.slice(0, -4)}-USDT`
    const response = await $fetch<OkxTickerResponse>(OKX_TICKER_URL, {
      query: { instId },
      headers: { Accept: 'application/json' },
    })
    // OKX answers 200 with code 51001 for an unknown instrument
    const price = response.code === '0' ? positivePrice(response.data?.[0]?.last) : null
    return price == null ? null : { exchange, symbol, price }
  }

  try {
    const ticker = await $fetch<BinanceTickerPrice>(BINANCE_TICKER_URL, {
      query: { symbol },
      headers: { Accept: 'application/json' },
    })
    const price = positivePrice(ticker.price)
    return price == null ? null : { exchange, symbol, price }
  } catch (error) {
    // Binance answers 400 (code -1121) for an unknown symbol
    const status = (error as { statusCode?: number, response?: { status?: number } }).statusCode
      ?? (error as { response?: { status?: number } }).response?.status
    if (status === 400) return null
    throw error
  }
}
