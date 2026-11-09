import type { ExchangeType } from '#shared/types/api-key'

export type SupportedExchange = Exclude<ExchangeType, 'OTHER'>

export const EXCHANGE_IMAGES: Record<SupportedExchange, string> = {
  BINANCE: '/img/exchanges/binance.svg',
  BYBIT: '/img/exchanges/bybit.svg',
  OKX: '/img/exchanges/okx.svg',
}

/** Exchanges the bots trade on (spot and USDT perpetuals): the API accepts keys of these only. */
export const TRADING_EXCHANGES: readonly SupportedExchange[] = ['BINANCE', 'OKX', 'BYBIT']

export function isTradingExchange(exchange: string | null | undefined): exchange is SupportedExchange {
  return TRADING_EXCHANGES.includes(exchange as SupportedExchange)
}

const DISPLAY_NAMES: Record<SupportedExchange, string> = {
  BINANCE: 'Binance',
  BYBIT: 'Bybit',
  OKX: 'OKX',
}

export function exchangeDisplayName(exchange: SupportedExchange): string {
  return DISPLAY_NAMES[exchange] ?? exchange.charAt(0) + exchange.slice(1).toLowerCase()
}
