import type { SpotPriceExchange } from '~~/shared/types/market'
import { fetchSpotPrice, SPOT_SYMBOL_PATTERN } from '~~/server/utils/spotPrice'

function readQuery(event: Parameters<typeof getQuery>[0]): { exchange: SpotPriceExchange, symbol: string } {
  const query = getQuery(event)
  const exchange: SpotPriceExchange = String(query.exchange ?? '').toUpperCase() === 'OKX' ? 'OKX' : 'BINANCE'
  const symbol = String(query.symbol ?? '').trim().toUpperCase()
  if (!SPOT_SYMBOL_PATTERN.test(symbol)) {
    throw createError({ statusCode: 400, statusMessage: 'symbol must be a USDT pair like BTCUSDT' })
  }
  return { exchange, symbol }
}

/** Current spot price for the DCA create form preview. */
export default defineCachedEventHandler(
  async (event) => {
    const { exchange, symbol } = readQuery(event)
    let result
    try {
      result = await fetchSpotPrice(exchange, symbol)
    } catch (error) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Failed to fetch the spot price from the exchange',
        cause: error,
      })
    }
    if (!result) {
      throw createError({ statusCode: 404, statusMessage: 'Unknown spot pair' })
    }
    return result
  },
  {
    maxAge: 10,
    swr: true,
    name: 'spot-price',
    getKey: (event) => {
      const query = getQuery(event)
      return `${String(query.exchange ?? '').toUpperCase()}:${String(query.symbol ?? '').toUpperCase()}`
    },
  },
)
