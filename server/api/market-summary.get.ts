import { fetchBinanceMarketSummary } from '~~/server/utils/binanceMarket'

export default defineCachedEventHandler(
  async () => {
    try {
      return await fetchBinanceMarketSummary()
    } catch (error) {
      throw createError({
        statusCode: 502,
        statusMessage: 'Failed to fetch market data from Binance',
        cause: error,
      })
    }
  },
  {
    maxAge: 30,
    swr: true,
    name: 'market-summary',
  },
)
