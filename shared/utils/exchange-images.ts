import type { ExchangeType } from '#shared/types/api-key'

export type SupportedExchange = Exclude<ExchangeType, 'OTHER'>

export const EXCHANGE_IMAGES: Record<SupportedExchange, string> = {
  BINANCE: '/img/exchanges/binance.svg',
  BYBIT: '/img/exchanges/bybit.svg',
  OKX: '/img/exchanges/okx.svg',
}

export function exchangeDisplayName(exchange: SupportedExchange): string {
  return exchange.charAt(0) + exchange.slice(1).toLowerCase()
}
