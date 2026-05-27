import type { MarketSummaryItem } from '~~/shared/types/market'

const summary: MarketSummaryItem[] = [
  {
    symbol: 'BTCUSDT',
    name: 'Bitcoin / Tether',
    price: '104,820.00',
    change: '+1.42%',
  },
  {
    symbol: 'ETHUSDT',
    name: 'Ethereum / Tether',
    price: '5,730.50',
    change: '+0.86%',
  },
  {
    symbol: 'SOLUSDT',
    name: 'Solana / Tether',
    price: '212.18',
    change: '-0.34%',
  },
]

export default defineEventHandler(() => summary)

